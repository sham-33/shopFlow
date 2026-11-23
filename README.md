# ShopFlow

An event-driven e-commerce backend: three NestJS services (Order, Inventory, Payment) that talk to each other only through Apache Kafka. The full design and build plan is in [docs/plan.md](docs/plan.md).

## Requirements

- Node.js 24 (`nvm use` picks it up from `.nvmrc`)
- Docker with Compose v2

## Getting started

```bash
npm install          # also installs the Git pre-commit hook
npm run infra:up     # Postgres, Kafka, topic creation, AKHQ
npm run start:dev    # inventory-service in watch mode
```

Start another service with `npm run start:dev -- order-service` (or `payment-service`).

## Local infrastructure

| What      | Where                 | Notes                                                                             |
| --------- | --------------------- | --------------------------------------------------------------------------------- |
| Postgres  | `localhost:5433`      | User and password `shopflow`; databases `orders_db`, `inventory_db`, `payment_db` |
| Kafka     | `localhost:9092`      | Single KRaft node; other containers use `kafka:19092`                             |
| AKHQ      | http://localhost:8080 | Browse topics, messages and consumer groups                                       |
| Order     | `localhost:3001`      |                                                                                   |
| Inventory | `localhost:3002`      |                                                                                   |
| Payment   | `localhost:3003`      |                                                                                   |

Copy `.env.example` to `.env` to change ports or credentials.

Topics are created by the `kafka-init` container from [docker/kafka/create-topics.sh](docker/kafka/create-topics.sh). Auto-creation is turned off in the broker, so add new topics to that script. The databases are created by [docker/postgres/init](docker/postgres/init) on the first start only; run `docker compose down -v` to wipe all data and start fresh.

## Scripts

| Script               | What it does                               |
| -------------------- | ------------------------------------------ |
| `npm run build`      | Build every app into `dist/apps/<service>` |
| `npm run lint`       | ESLint with type-aware rules               |
| `npm run format`     | Prettier on the whole repo                 |
| `npm run typecheck`  | `tsc` over all apps, libs and tests        |
| `npm test`           | Unit tests (`*.spec.ts`)                   |
| `npm run test:int`   | Integration tests (`*.int-spec.ts`)        |
| `npm run infra:down` | Stop the Docker stack (data is kept)       |

The pre-commit hook runs ESLint and Prettier on staged files, then `typecheck`.

## Stack notes

NestJS 12 packages are ESM only, so this repo is ESM too:

- Relative imports end in `.js` (`import { AppModule } from './app.module.js'`).
- Use `import.meta.dirname` instead of `__dirname`.
- Tests run on Vitest, whose API matches Jest's: use `vi.fn()` and `vi.spyOn()` where Jest would use `jest.fn()` and `jest.spyOn()`.
