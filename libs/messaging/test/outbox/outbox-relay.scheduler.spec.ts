import { Logger } from '@nestjs/common';
import { OUTBOX_CLEANUP_INTERVAL_MS, OUTBOX_RELAY_INTERVAL_MS } from '../../src/constants.js';
import type { OutboxRelay } from '../../src/outbox/outbox-relay.js';
import { OutboxRelayScheduler } from '../../src/outbox/outbox-relay.scheduler.js';

describe('OutboxRelayScheduler', () => {
  let relayBatch: ReturnType<typeof vi.fn<OutboxRelay['relayBatch']>>;
  let cleanup: ReturnType<typeof vi.fn<OutboxRelay['cleanup']>>;
  let scheduler: OutboxRelayScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    relayBatch = vi.fn<OutboxRelay['relayBatch']>().mockResolvedValue(0);
    cleanup = vi.fn<OutboxRelay['cleanup']>().mockResolvedValue(0);
    scheduler = new OutboxRelayScheduler({ relayBatch, cleanup } as unknown as OutboxRelay);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not run before it starts', async () => {
    await vi.advanceTimersByTimeAsync(OUTBOX_RELAY_INTERVAL_MS * 3);

    expect(relayBatch).not.toHaveBeenCalled();
  });

  it('relays a batch every 500 ms once started', async () => {
    scheduler.onApplicationBootstrap();

    await vi.advanceTimersByTimeAsync(OUTBOX_RELAY_INTERVAL_MS * 3);

    expect(OUTBOX_RELAY_INTERVAL_MS).toBe(500);
    expect(relayBatch).toHaveBeenCalledTimes(3);
  });

  it('never runs two batches at once: a tick during a slow batch is skipped', async () => {
    let finish: (count: number) => void = () => undefined;
    relayBatch.mockReturnValueOnce(new Promise<number>((resolve) => (finish = resolve)));
    scheduler.onApplicationBootstrap();

    await vi.advanceTimersByTimeAsync(OUTBOX_RELAY_INTERVAL_MS * 4);
    expect(relayBatch).toHaveBeenCalledTimes(1);

    finish(0);
    await vi.advanceTimersByTimeAsync(OUTBOX_RELAY_INTERVAL_MS);
    expect(relayBatch).toHaveBeenCalledTimes(2);
  });

  it('keeps relaying after a batch fails', async () => {
    relayBatch.mockRejectedValueOnce(new Error('kafka down'));
    scheduler.onApplicationBootstrap();

    await vi.advanceTimersByTimeAsync(OUTBOX_RELAY_INTERVAL_MS * 2);

    expect(relayBatch).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Could not relay outbox events; will try again',
      expect.stringContaining('kafka down'),
    );
  });

  it('relays again straight away while batches come back full', async () => {
    relayBatch.mockResolvedValueOnce(100).mockResolvedValueOnce(100).mockResolvedValue(3);
    scheduler.onApplicationBootstrap();

    await vi.advanceTimersByTimeAsync(OUTBOX_RELAY_INTERVAL_MS);

    expect(relayBatch).toHaveBeenCalledTimes(3);
  });

  it('cleans up published events once a day, and keeps going after a failure', async () => {
    // Capture the daily callback instead of advancing fake time by days, which
    // would run the 500 ms relay hundreds of thousands of times.
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    cleanup.mockRejectedValueOnce(new Error('database busy'));
    scheduler.onApplicationBootstrap();
    const daily = setIntervalSpy.mock.calls.find(([, ms]) => ms === OUTBOX_CLEANUP_INTERVAL_MS);

    expect(OUTBOX_CLEANUP_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
    expect(daily).toBeDefined();
    const runCleanup = daily?.[0] as () => void;
    runCleanup();
    await vi.advanceTimersByTimeAsync(0);
    runCleanup();
    await vi.advanceTimersByTimeAsync(0);

    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Could not delete old outbox events',
      expect.stringContaining('database busy'),
    );
  });

  it('stops everything when the app shuts down', async () => {
    scheduler.onApplicationBootstrap();
    scheduler.onModuleDestroy();

    await vi.advanceTimersByTimeAsync(OUTBOX_CLEANUP_INTERVAL_MS);

    expect(relayBatch).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });
});
