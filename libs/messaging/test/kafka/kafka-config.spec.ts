import { readKafkaBrokers } from '../../src/kafka/kafka-config.js';

describe('readKafkaBrokers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the local Docker Kafka outside production', () => {
    vi.stubEnv('KAFKA_BROKERS', '');
    vi.stubEnv('NODE_ENV', 'development');

    expect(readKafkaBrokers()).toEqual(['localhost:9092']);
  });

  it('splits a comma-separated list and trims it', () => {
    vi.stubEnv('KAFKA_BROKERS', 'kafka-0:9092, kafka-1:9092 ,kafka-2:9092');

    expect(readKafkaBrokers()).toEqual(['kafka-0:9092', 'kafka-1:9092', 'kafka-2:9092']);
  });

  it('refuses to start in production without it', () => {
    vi.stubEnv('KAFKA_BROKERS', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => readKafkaBrokers()).toThrow(/KAFKA_BROKERS/);
  });
});
