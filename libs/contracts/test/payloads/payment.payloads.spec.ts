import { createEvent } from '../../src/create-event.js';
import { EventType } from '../../src/enums.js';
import { aPayload, FROM_REQUEST } from '../builders/events.builder.js';
import { problemFields } from '../helpers/problem-fields.js';

const { PAYMENT_COMPLETED, PAYMENT_FAILED, PAYMENT_REFUNDED } = EventType;

const problemsWith = (eventType: EventType, overrides: Record<string, unknown>): string[] =>
  problemFields(() => createEvent(eventType, aPayload(eventType, overrides), FROM_REQUEST));

describe('payment event payloads', () => {
  it.each(['INSUFFICIENT_BALANCE', 'LIMIT_EXCEEDED', 'DECLINED', 'A', `A${'_'.repeat(63)}`])(
    'PaymentFailed accepts the reason %s',
    (reason) => {
      const payload = aPayload(PAYMENT_FAILED, { reason });

      expect(() => createEvent(PAYMENT_FAILED, payload, FROM_REQUEST)).not.toThrow();
    },
  );

  it.each([
    [
      PAYMENT_COMPLETED,
      'a paymentId that is not a UUID',
      { paymentId: 'pay_1' },
      ['payload.paymentId'],
    ],
    [PAYMENT_COMPLETED, 'an amount of 1e-7 rupees', { amount: 1e-7 }, ['payload.amount']],
    [
      PAYMENT_COMPLETED,
      'an amount too large to store',
      { amount: 10_000_000_000 },
      ['payload.amount'],
    ],
    [PAYMENT_FAILED, 'a reason in words', { reason: 'Insufficient balance' }, ['payload.reason']],
    [PAYMENT_FAILED, 'an empty reason', { reason: '' }, ['payload.reason']],
    [
      PAYMENT_FAILED,
      'a reason of 65 characters',
      { reason: `A${'_'.repeat(64)}` },
      ['payload.reason'],
    ],
    [PAYMENT_FAILED, 'a reason that is not a string', { reason: 402 }, ['payload.reason']],
    [PAYMENT_REFUNDED, 'a negative amount', { amount: -1079.09 }, ['payload.amount']],
    [PAYMENT_REFUNDED, 'a missing paymentId', { paymentId: undefined }, ['payload.paymentId']],
  ])('%s rejects %s', (eventType, _case, overrides, fields) => {
    expect(problemsWith(eventType, overrides)).toEqual(fields);
  });
});
