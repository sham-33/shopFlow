# ShopFlow

An event-driven e-commerce backend: three NestJS services (Order, Inventory, Payment) that talk to each other only through Apache Kafka. The full design and build plan is in [docs/plan.md](docs/plan.md).

## Requirements

- Node.js 24 (`nvm use` picks it up from `.nvmrc`)
- Docker with Compose v2

## Getting started

```bash
npm install          # also installs the Git pre-commit hook
npm run infra:up     # Postgres, Kafka, topic creation, AKHQ
npm run migration:run:inventory
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

## Database migrations

The schema changes only through TypeORM migrations; `synchronize` is off. Each service's migrations live in `apps/<service>/src/migrations/`.

```bash
npm run migration:run:inventory       # apply pending migrations
npm run migration:revert:inventory    # undo the last one

# after changing an entity, generate a migration from the difference:
npm run migration:generate:inventory -- apps/inventory-service/src/migrations/AddSomething
```

Services connect with `TYPEORM_HOST`, `TYPEORM_PORT`, `TYPEORM_USERNAME`, `TYPEORM_PASSWORD` and `TYPEORM_DATABASE`. Outside production each one defaults to the local Docker Postgres; in production the service refuses to start if any is missing.

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

## Project layout

Each app is organised by layer, and its tests live in a `test/` folder that mirrors `src/`:

```
apps/<service>/
├── src/
│   ├── main.ts, app.module.ts
│   ├── config/        database settings; data-source.ts for the migration CLI
│   ├── controllers/   HTTP only
│   ├── services/      business rules
│   ├── repository/    database access behind an interface
│   ├── entities/      TypeORM tables
│   ├── dto/           request and response shapes
│   ├── modules/       database.module.ts and one module per feature
│   └── migrations/
└── test/              same folders as src/, e.g. test/services/products.service.spec.ts
```

Code shared by every service lives in `libs/common` (imported as `@app/common`), with its tests in `libs/common/test/`.

## Stack notes

NestJS 12 packages are ESM only, so this repo is ESM too:

- Relative imports end in `.js` (`import { AppModule } from './app.module.js'`).
- Use `import.meta.dirname` instead of `__dirname`.
- Tests run on Vitest, whose API matches Jest's: use `vi.fn()` and `vi.spyOn()` where Jest would use `jest.fn()` and `jest.spyOn()`.
