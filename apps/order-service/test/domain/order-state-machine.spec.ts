import { OrderStatus } from '../../src/domain/enums.js';
import { OrderStateMachine } from '../../src/domain/order-state-machine.js';
import { InvalidOrderStateException } from '../../src/exceptions/invalid-order-state.exception.js';

const { PENDING, AWAITING_PAYMENT, CONFIRMED, FAILED, CANCELLED, REFUNDED } = OrderStatus;
const ORDER_ID = '0b5a1f9e-3c2d-4e8f-9a7b-6c5d4e3f2a1b';

// Copied from docs/plan.md, section 3.1, on purpose: the test does not read the
// table from the class, so a wrong change to the class fails here.
const ALLOWED_MOVES: readonly [OrderStatus, OrderStatus][] = [
  [PENDING, AWAITING_PAYMENT],
  [PENDING, FAILED],
  [PENDING, CANCELLED],
  [AWAITING_PAYMENT, CONFIRMED],
  [AWAITING_PAYMENT, CANCELLED],
  [CONFIRMED, CANCELLED],
  [CANCELLED, REFUNDED],
];

const STATUSES = Object.values(OrderStatus);
const isAllowed = (from: OrderStatus, to: OrderStatus): boolean =>
  ALLOWED_MOVES.some(([a, b]) => a === from && b === to);

/** Every from/to pair (6 × 6 = 36), including staying in the same status. */
const ALL_MOVES = STATUSES.flatMap((from) =>
  STATUSES.map((to) => [from, to, isAllowed(from, to)] as const),
);
const BLOCKED_MOVES = ALL_MOVES.filter(([, , allowed]) => !allowed).map(
  ([from, to]) => [from, to] as const,
);

describe('OrderStateMachine', () => {
  const machine = new OrderStateMachine();

  it('covers every pair of statuses', () => {
    expect(ALL_MOVES).toHaveLength(36);
    expect(BLOCKED_MOVES).toHaveLength(36 - ALLOWED_MOVES.length);
  });

  describe('canMove', () => {
    it.each(ALL_MOVES)('%s → %s is allowed: %s', (from, to, allowed) => {
      expect(machine.canMove(from, to)).toBe(allowed);
    });
  });

  describe('assertCanMove', () => {
    it.each(ALLOWED_MOVES)('lets %s → %s through', (from, to) => {
      expect(() => machine.assertCanMove(ORDER_ID, from, to)).not.toThrow();
    });

    it.each(BLOCKED_MOVES)(
      'throws INVALID_ORDER_STATE for %s → %s, naming the order and both statuses',
      (from, to) => {
        const attempt = () => machine.assertCanMove(ORDER_ID, from, to);

        expect(attempt).toThrow(InvalidOrderStateException);
        expect(attempt).toThrow(
          expect.objectContaining({
            code: 'INVALID_ORDER_STATE',
            kind: 'conflict',
            details: { orderId: ORDER_ID, from, to },
          }) as Error,
        );
      },
    );
  });

  describe('nextStatuses', () => {
    it.each([
      [PENDING, [AWAITING_PAYMENT, FAILED, CANCELLED]],
      [AWAITING_PAYMENT, [CONFIRMED, CANCELLED]],
      [CONFIRMED, [CANCELLED]],
      [FAILED, []],
      [CANCELLED, [REFUNDED]],
      [REFUNDED, []],
    ] as const)('lists where %s can go', (from, next) => {
      expect([...machine.nextStatuses(from)].sort()).toEqual([...next].sort());
    });
  });

  describe('isFinal', () => {
    it.each([
      [PENDING, false],
      [AWAITING_PAYMENT, false],
      [CONFIRMED, false],
      [FAILED, true],
      [CANCELLED, false],
      [REFUNDED, true],
    ] as const)('%s is final: %s', (status, final) => {
      expect(machine.isFinal(status)).toBe(final);
    });
  });

  // The order journeys from docs/plan.md, sections 5.1 and 5.3, played move by move.
  describe('order journeys', () => {
    const journeyIsAllowed = (steps: readonly OrderStatus[]): boolean =>
      steps.slice(1).every((to, i) => machine.canMove(steps[i] ?? to, to));

    it.each([
      ['happy path', [PENDING, AWAITING_PAYMENT, CONFIRMED]],
      ['out of stock', [PENDING, FAILED]],
      ['payment fails', [PENDING, AWAITING_PAYMENT, CANCELLED]],
      [
        'customer cancels after paying',
        [PENDING, AWAITING_PAYMENT, CONFIRMED, CANCELLED, REFUNDED],
      ],
      ['customer cancels before paying', [PENDING, AWAITING_PAYMENT, CANCELLED]],
      ['customer cancels during the stock check', [PENDING, CANCELLED]],
      ['refund after cancelling mid-payment', [PENDING, AWAITING_PAYMENT, CANCELLED, REFUNDED]],
    ] as const)('allows the %s journey', (_journey, steps) => {
      expect(journeyIsAllowed(steps)).toBe(true);
    });

    it('rejects a PaymentCompleted that arrives after the order was cancelled', () => {
      expect(machine.canMove(CANCELLED, CONFIRMED)).toBe(false);
    });

    it('never lets a failed or refunded order be cancelled', () => {
      expect(machine.canMove(FAILED, CANCELLED)).toBe(false);
      expect(machine.canMove(REFUNDED, CANCELLED)).toBe(false);
    });

    it('never skips payment: PENDING cannot jump to CONFIRMED', () => {
      expect(machine.canMove(PENDING, CONFIRMED)).toBe(false);
    });

    it('never refunds an order that was not cancelled first', () => {
      expect(machine.canMove(CONFIRMED, REFUNDED)).toBe(false);
      expect(machine.canMove(AWAITING_PAYMENT, REFUNDED)).toBe(false);
    });
  });
});
