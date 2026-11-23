# ShopFlow

Event-driven e-commerce backend: three NestJS services (order, inventory, payment) that talk only through Kafka. The design and the week-by-week build plan are in `docs/plan.md`; tick items there as they are finished.

Follow the conventions below for every change. They are written for both people and AI agents.

@docs/engineering-conventions.md

## Commands

```bash
npm run infra:up                   # Postgres, Kafka, topics, AKHQ (Docker)
npm run migration:run:inventory    # apply migrations
npm run start:dev                  # inventory-service; add `-- order-service` for others
npm run typecheck && npm run lint && npm test
```

## Working agreements

- Edit `docs/plan.md` with a script (for example `sed` or Python), not the editor tools. The editor's format-on-save reflows every table in it.
- Do not commit or push unless asked.
