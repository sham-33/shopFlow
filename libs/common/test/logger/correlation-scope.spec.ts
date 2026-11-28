import { PinoLogger } from 'nestjs-pino';
import {
  CORRELATION_ID_LOG_FIELD,
  getCorrelationId,
} from '../../src/correlation/correlation-id.js';
import { CorrelationScope } from '../../src/logger/correlation-scope.js';
import { createLoggerParams } from '../../src/logger/logger.params.js';

type LogLine = Record<string, unknown>;

describe('CorrelationScope', () => {
  const lines: LogLine[] = [];
  // The real pino logger, writing to memory instead of stdout.
  const logger = new PinoLogger({
    pinoHttp: [
      { level: 'info' },
      {
        write: (line: string) => {
          lines.push(JSON.parse(line) as LogLine);
        },
      },
    ],
  });
  const scope = new CorrelationScope(logger);

  /** The message and correlation ID of each line, in order. */
  const logged = (): [unknown, unknown][] =>
    lines.map((line) => [line.msg, line[CORRELATION_ID_LOG_FIELD]]);

  beforeEach(() => {
    lines.length = 0;
  });

  it('makes the ID the current correlation ID inside the work, and only there', async () => {
    let inside: string | undefined;

    await scope.run('journey-7', async () => {
      await Promise.resolve();
      inside = getCorrelationId();
    });

    expect(inside).toBe('journey-7');
    expect(getCorrelationId()).toBeUndefined();
  });

  it('puts the ID on every line logged inside, across awaits, as the HTTP logger does for a request', async () => {
    await scope.run('journey-7', async () => {
      logger.info('reserving');
      await new Promise((resolve) => setTimeout(resolve, 1));
      logger.info('reserved');
    });
    logger.info('relay idle');

    expect(logged()).toEqual([
      ['reserving', 'journey-7'],
      ['reserved', 'journey-7'],
      ['relay idle', undefined],
    ]);
  });

  it('keeps two journeys handled at the same time apart', async () => {
    const step = (id: string): Promise<void> =>
      scope.run(id, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        logger.info(`step of ${id}`);
      });

    await Promise.all([step('journey-a'), step('journey-b')]);

    expect(logged()).toEqual(
      expect.arrayContaining([
        ['step of journey-a', 'journey-a'],
        ['step of journey-b', 'journey-b'],
      ]),
    );
  });

  it('returns what the work returns and passes on its error', async () => {
    const failure = new Error('handler failed');

    expect(scope.run('journey-7', () => 42)).toBe(42);
    await expect(scope.run('journey-7', () => Promise.reject(failure))).rejects.toBe(failure);
  });

  it('uses the same log field as HTTP request lines, so one search finds the whole journey', () => {
    const { pinoHttp } = createLoggerParams('order-service') as {
      pinoHttp: { customAttributeKeys: { reqId: string } };
    };

    expect(pinoHttp.customAttributeKeys.reqId).toBe(CORRELATION_ID_LOG_FIELD);
    expect(CORRELATION_ID_LOG_FIELD).toBe('correlationId');
  });
});
