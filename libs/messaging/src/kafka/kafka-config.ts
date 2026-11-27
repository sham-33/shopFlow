import { readEnv } from '@app/common';
import { LOCAL_KAFKA_BROKERS } from '../constants.js';

/** Broker addresses from KAFKA_BROKERS (comma-separated). Required in production. */
export function readKafkaBrokers(): string[] {
  return readEnv('KAFKA_BROKERS', { devDefault: LOCAL_KAFKA_BROKERS })
    .split(',')
    .map((broker) => broker.trim())
    .filter((broker) => broker !== '');
}
