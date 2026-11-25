import type {
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import {
  HealthController,
  READINESS_DATABASE_TIMEOUT_MS,
} from '../../src/health/health.controller.js';

const HEALTHY: HealthCheckResult = {
  status: 'ok',
  info: {},
  error: {},
  details: {},
};

describe('HealthController', () => {
  const check = vi.fn<HealthCheckService['check']>();
  const withTimeout = vi.fn();
  const pingCheck = vi.fn(() => ({ withTimeout }));
  let controller: HealthController;

  beforeEach(() => {
    vi.resetAllMocks();
    pingCheck.mockReturnValue({ withTimeout });
    check.mockResolvedValue(HEALTHY);
    controller = new HealthController(
      { check } as unknown as HealthCheckService,
      { pingCheck } as unknown as TypeOrmHealthIndicator,
    );
  });

  describe('GET /health/live', () => {
    it('checks nothing external, so it only fails if the process is stuck', async () => {
      await expect(controller.live()).resolves.toBe(HEALTHY);

      expect(check).toHaveBeenCalledWith([]);
      expect(pingCheck).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready', () => {
    it('pings the database with the readiness timeout', async () => {
      const attempt = { key: 'database' };
      withTimeout.mockReturnValue(attempt);

      await expect(controller.ready()).resolves.toBe(HEALTHY);

      expect(pingCheck).toHaveBeenCalledWith('database');
      expect(withTimeout).toHaveBeenCalledWith(READINESS_DATABASE_TIMEOUT_MS);
      expect(check).toHaveBeenCalledWith([attempt]);
    });

    it('passes on the 503 that Terminus throws when the database is down', async () => {
      const down = new Error('Service Unavailable');
      check.mockRejectedValue(down);

      await expect(controller.ready()).rejects.toBe(down);
    });
  });
});
