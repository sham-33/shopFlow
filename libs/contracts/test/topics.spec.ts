import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ServiceName } from '../src/enums.js';
import { deadLetterTopic, retryTopic, Topic } from '../src/topics.js';

const CREATE_TOPICS_SCRIPT = readFileSync(
  join(import.meta.dirname, '../../../docker/kafka/create-topics.sh'),
  'utf8',
).split('\n');

describe('topics', () => {
  it('names the business topics as docs/plan.md, section 4.1 does', () => {
    expect(Object.values(Topic).sort()).toEqual([
      'inventory.events',
      'orders.events',
      'payments.events',
      'products.events',
    ]);
  });

  it.each([
    [ServiceName.ORDER, 'order-service.retry', 'order-service.dlt'],
    [ServiceName.INVENTORY, 'inventory-service.retry', 'inventory-service.dlt'],
    [ServiceName.PAYMENT, 'payment-service.retry', 'payment-service.dlt'],
  ])('names the retry and dead-letter topics of %s', (service, retry, deadLetter) => {
    expect(retryTopic(service)).toBe(retry);
    expect(deadLetterTopic(service)).toBe(deadLetter);
  });

  // Auto-creation is off in the broker, so a topic missing from the script
  // fails only at runtime. These tests catch it first.
  describe('docker/kafka/create-topics.sh', () => {
    const creates = (topic: string): string | undefined =>
      CREATE_TOPICS_SCRIPT.find((line) => line.startsWith(`create_topic ${topic} `));

    it.each(Object.values(Topic))('creates %s', (topic) => {
      expect(creates(topic)).toBeDefined();
    });

    it('creates products.events with log compaction', () => {
      expect(creates(Topic.PRODUCTS)).toContain('cleanup.policy=compact');
    });

    it('creates a retry and a dead-letter topic for every service', () => {
      const loop = CREATE_TOPICS_SCRIPT.find((line) => line.startsWith('for service in '));
      const services = loop?.replace('for service in ', '').replace('; do', '').split(' ');

      expect(services?.sort()).toEqual(Object.values(ServiceName).sort());
      expect(CREATE_TOPICS_SCRIPT).toContainEqual(
        expect.stringContaining('create_topic "${service}.retry"'),
      );
      expect(CREATE_TOPICS_SCRIPT).toContainEqual(
        expect.stringContaining('create_topic "${service}.dlt"'),
      );
    });
  });
});
