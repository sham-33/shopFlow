#!/usr/bin/env bash
# Creates every ShopFlow topic (docs/plan.md, section 4.1). Safe to re-run:
# existing topics are left as they are.
set -euo pipefail

BOOTSTRAP_SERVER="${BOOTSTRAP_SERVER:-kafka:19092}"
REPLICATION_FACTOR="${REPLICATION_FACTOR:-1}"
KAFKA_TOPICS=/opt/kafka/bin/kafka-topics.sh

create_topic() {
  local name="$1" partitions="$2"
  shift 2
  echo "Creating ${name} (partitions=${partitions}${*:+, $*})"
  "$KAFKA_TOPICS" --bootstrap-server "$BOOTSTRAP_SERVER" --create --if-not-exists \
    --topic "$name" --partitions "$partitions" \
    --replication-factor "$REPLICATION_FACTOR" "$@"
}

# Business event topics, keyed by orderId (products.events by productId).
create_topic orders.events 3
create_topic inventory.events 3
create_topic payments.events 3
# Compacted: Kafka keeps the latest message per product, so a new consumer
# can rebuild its product copy by reading the whole topic.
create_topic products.events 3 --config cleanup.policy=compact

# Per-service retry and dead-letter topics.
for service in order-service inventory-service payment-service; do
  create_topic "${service}.retry" 3
  create_topic "${service}.dlt" 1
done

echo "Topics now in the cluster:"
"$KAFKA_TOPICS" --bootstrap-server "$BOOTSTRAP_SERVER" --list
