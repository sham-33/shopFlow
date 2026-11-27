# ShopFlow Engineering Conventions

How code in this repo is written: structure, HTTP endpoints, errors, data access, money, tests and style. It follows the team's NestJS repos (`ams`, `analytics`, `payment`), and is stricter where noted. The design itself is in [plan.md](plan.md).

## Stack notes

NestJS 12 packages are ESM only, so this repo is ESM too. This is why it differs from the older team repos:

- Relative imports end in `.js`: `import { AppModule } from './app.module.js'`.
- Use `import.meta.dirname`, never `__dirname`.
- Tests run on **Vitest**, not Jest. The API is the same apart from `vi.fn()` and `vi.spyOn()`.
- TypeScript is pinned to `~6.0` because typescript-eslint does not support 7 yet.
- TypeORM is 1.x. Its CLI runs through `tsx` (see [Database and migrations](#database-and-migrations)).

## Project structure

Each app is organised by layer. Tests live in `test/`, which mirrors `src/`.

```
apps/<service>/
├── src/
│   ├── main.ts               # create the app, setupApp(app), listen
│   ├── app.module.ts         # CommonModule.forRoot(...), DatabaseModule, feature modules
│   ├── config/               # database.config.ts; data-source.ts (migration CLI only)
│   ├── constants.ts          # fixed values: port, service name, limits, timeouts
│   ├── constants/errors.ts   # ERRORS: every error code this service returns
│   ├── controllers/          # HTTP only
│   ├── decorators/           # custom parameter and validation decorators, e.g. @IdempotencyKey()
│   ├── services/             # business rules
│   ├── domain/               # enums, state machines, strategies: pure rules, no HTTP or database
│   ├── repository/           # <name>.repository.ts (interface + token), typeorm-<name>.repository.ts
│   ├── entities/             # TypeORM tables
│   ├── dto/                  # request and response classes
│   ├── mappers/              # DTO <-> service values and entities
│   ├── exceptions/           # one DomainException subclass per error
│   ├── modules/              # database.module.ts and one module per feature
│   └── migrations/
└── test/                     # same folders as src/, e.g. test/services/products.service.spec.ts

libs/common/                  # imported as @app/common by every service
├── src/                      # errors, validation, trimming, logging, correlation IDs, pagination, money, setupApp
└── test/

libs/contracts/               # imported as @app/contracts: the events every service sends and reads
├── src/                      # enums, topics, envelope, payloads/, EVENT_DEFINITIONS, createEvent, parseEvent
└── test/
```

Code used by one service lives in that service. Code that two or more services need goes in a `libs/` library.

## Checklist: new or changed HTTP endpoint

1. **Error codes**: add any new code to `src/constants/errors.ts` first, then an exception class in `exceptions/`.
2. **DTOs**: request and response classes in `dto/`, with class-validator rules and Swagger `@ApiProperty` (description and example).
3. **Controller**: thin. Swagger `@ApiOperation` and one `@ApiResponse` per status code.
4. **Service**: the rules. Plain values and entities in and out, money in paise, no HTTP types.
5. **Repository**: add a method to the interface and the TypeORM class. Take an optional `EntityManager`.
6. **Migration** if the schema changes (never `synchronize`).
7. **Tests** in `test/`: the service's rules and edge cases, plus at least one controller test per endpoint.

## Controllers

- Version every controller: `@Controller({ path: 'products', version: '1' })`. With `setupApp()` this serves `/api/v1/products`.
- Validate path IDs with `ParseIdPipe` from `@app/common`. A bad ID fails with the catalog code `INVALID_ID`. Do not use Nest's `ParseUUIDPipe`.
- Read the DTO, call one service method, map the result with a mapper, return a response DTO. No rules, no queries.
- Never return a TypeORM entity. Always map it to a response DTO.
- Set `@HttpCode(HttpStatus.OK)` on POST actions that do not create anything (for example `restock`).

## DTOs and validation

- One class per request or response shape, in `dto/`. Their limits (SKU pattern, max price) come from `src/constants.ts`.
- Global pipes, in order:
  1. `TrimStringsPipe` trims every string in bodies and query strings (except `password`), so DTOs do not trim.
  2. `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform`. Unknown fields are rejected with a 400. This is stricter than `ams`, on purpose.
- For PATCH DTOs, use `@ValidateIf((_, value) => value !== undefined)` instead of `@IsOptional()`, because `@IsOptional()` also lets `null` through.
- List endpoints extend `PaginationQueryDto` (`?page=&limit=`, at most 100 per page) and return `Page<T>`: `{ items, meta: { page, limit, totalItems, totalPages } }`.

## Error handling

### The catalog

Every error code a client can receive is listed once:

- `COMMON_ERRORS` in `libs/common` (`VALIDATION_FAILED`, `INVALID_ID`, `UNIQUE_VIOLATION`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`).
- `ERRORS` in each service's `src/constants/errors.ts`.

```ts
export const ERRORS = {
  PRODUCT_NOT_FOUND: {
    code: 'PRODUCT_NOT_FOUND',
    kind: 'not_found',
    message: 'Product not found',
  },
} as const satisfies Record<string, DomainErrorDefinition>;
```

Codes are part of the API: never rename or reuse one. Keys and codes are `SCREAMING_SNAKE_CASE` and match.

### Throwing

Services throw a `DomainException` subclass that takes a catalog entry. Specific values go in `details`, not the message:

```ts
export class ProductNotFoundException extends DomainException {
  constructor(productId: string) {
    super(ERRORS.PRODUCT_NOT_FOUND, { details: { productId } });
  }
}
```

Do not throw Nest's `HttpException` from services, so the business rules stay free of HTTP.

### What the client gets

`AllExceptionsFilter` (global) maps the kind to a status:

| Kind            | Status |
| --------------- | ------ |
| `invalid_input` | 400    |
| `not_found`     | 404    |
| `conflict`      | 409    |
| `unprocessable` | 422    |

```json
{
  "statusCode": 404,
  "code": "PRODUCT_NOT_FOUND",
  "error": "Not Found",
  "message": "Product not found",
  "details": { "productId": "33444446-505d-4aaf-b42a-5cbc575a9783" },
  "path": "/api/v1/products/33444446-505d-4aaf-b42a-5cbc575a9783",
  "timestamp": "2026-11-23T11:35:57.258Z",
  "correlationId": "c-91ab"
}
```

- The code is also sent in an `X-Error-Code` header.
- Nest's own errors (unknown route, malformed JSON) use the status name as the code, for example `NOT_FOUND` or `BAD_REQUEST`.
- Any other error object, such as a failed health check, is passed on in `details`.
- A Postgres unique violation the service did not check for becomes a 409 `UNIQUE_VIOLATION`, and is logged as a warning because it means a missing check.
- Anything else becomes a 500 `INTERNAL_ERROR` with a generic message. The real error and its stack go to the log only.

## Services and data access

- Services depend on a repository **interface** and its `Symbol` token, never on TypeORM:
  ```ts
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}
  ```
  The module binds the token: `{ provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository }`.
- Every repository method takes an optional `EntityManager`, so a caller can put several calls (and an outbox event) in one transaction: `dataSource.transaction(async (manager) => { ... })`.
- Change counters with one conditional SQL `UPDATE` (`available_qty = available_qty + :n`), never read-modify-write.
- Rows with a `@VersionColumn` (orders, wallets) change through one conditional update in the repository: `UPDATE … WHERE id = :id AND version = :expected`, returning false when no row changed. TypeORM's `save()` increments the version but never checks it, so never use `save()` to change such a row. The service turns false into a 409 (`ORDER_CHANGED_CONCURRENTLY`).
- Keep services small and focused. Split by subdomain rather than growing one large file.
- Log with `private readonly logger = new Logger(ClassName.name)`. Never log personal data.

## Money

- Postgres stores money as `numeric(12,2)` rupees.
- Code handles it as whole **paise** (`pricePaise: 49950`), through `paiseTransformer` on the column.
- APIs and events carry rupees as a JSON number with at most 2 decimals. Convert with `rupeesToPaise` and `paiseToRupees`.
- Never do money math in floating point (`price * 100`, `parseFloat`).

## Database and migrations

- Each service's `config/database.config.ts` calls `createDatabaseConfig({ localDatabase, entities })` from `@app/common`. It reads `TYPEORM_HOST`, `TYPEORM_PORT`, `TYPEORM_USERNAME`, `TYPEORM_PASSWORD` and `TYPEORM_DATABASE` through `readEnv()`. Outside production they default to the local Docker Postgres. In production a missing one stops the service.
- List entities explicitly in `config/database.config.ts`. No `dist/**/*.entity` globs: the build bundles each app into one file.
- Give every `@Column` an explicit `type`, and wrap relation properties in `Relation<T>`. The migration CLI runs through `tsx`, which does not emit decorator metadata.
- Name constraints (`pk_products`, `uq_products_sku`, `fk_stock_product`, `chk_…`) so errors and schemas are readable.
- Store enum values (statuses, payment methods) in a `varchar` column limited by a CHECK built with `sqlIn()` from `@app/common`: `@Check('chk_orders_status', sqlIn('status', Object.values(OrderStatus)))`. Not Postgres enum types, which are awkward to change in a migration. The TypeScript enums live in `src/domain/enums.ts` (those that also travel in events are re-exported from `@app/contracts`); never rename a value.
- A CHECK only rejects a row when its expression is false, and anything compared with NULL is NULL. On nullable columns, say `IS NOT NULL` explicitly: `"amount_off" IS NOT NULL AND "amount_off" > 0`.
- Index every foreign-key column (`idx_order_items_order_id`); Postgres does not do it automatically.
- Columns are `snake_case` (`@Column({ name: 'available_qty' })`), properties `camelCase`.
- Generate a migration after changing an entity, read the SQL, run it, and commit both. Never edit a migration that has been run or committed.

```bash
npm run migration:generate:inventory -- apps/inventory-service/src/migrations/AddSomething
npm run migration:run:inventory
```

## Logging and correlation IDs

- Logs are JSON lines from pino, named after the service.
- Each request gets a correlation ID from the `X-Correlation-Id` header, or a new UUID. It is returned in the same header, added to every log line of the request, and readable anywhere with `getCorrelationId()`.
- Kafka consumers (Week 3) will restore it from the event envelope with `runWithCorrelationId()`.

## Events and contracts

Every event is defined once, in `libs/contracts`. Services never declare their own event shapes, topic names or event enums.

- Every message has the same envelope: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `aggregateId`, `correlationId`, `causationId`, `producer` and `payload`.
- `EVENT_DEFINITIONS` gives each event type its topic, producer, version, payload class and message key. Its type requires an entry for every `EventType`.
- Write events with `createEvent(type, payload, context)`. It fills in the ID, time, version, producer and key, and validates the event, so a bad event fails in the service that writes it. For an event caused by another one, pass `causedBy(incoming)` as the context.
- Read events with `parseEvent(message.value)`. It returns `AnyEvent`; checking `eventType` narrows the payload. Anything that breaks the contract throws `InvalidEventError`. Retrying cannot fix such a message, so it goes straight to the dead-letter topic.
- Readers ignore fields they do not know (the tolerant reader rule), so a producer can add fields without breaking older consumers. Within one version, only add fields, and make them optional so that events written before the change still pass. Renaming or removing a field, or changing its type, needs a new version.
- Money in payloads is rupees, validated with `@IsRupees()`.
- To add an event: add its `EventType` value, its payload class in `payloads/<area>.payloads.ts`, and its entry in `EVENT_DEFINITIONS`. Then add a sample to `test/builders/events.builder.ts` and a row to the catalog in `test/event-definitions.spec.ts`. A new topic also goes in `docker/kafka/create-topics.sh`; a test checks that.

## Swagger

`setupApp()` serves Swagger UI at `/docs` and the OpenAPI JSON at `/docs-json`. It is on outside production; `SWAGGER_ENABLED=true` or `false` overrides that.

- **Controllers:** `@ApiTags`, plus `@ApiOperation({ summary, description })` and one `@ApiResponse` per status code on every endpoint. Use the shared response helpers rather than repeating error descriptions.
- **DTO fields:** `@ApiProperty` (or `@ApiPropertyOptional`) with a description and a realistic example, plus the same limits the validators enforce (`minimum`, `maxLength`, `pattern`).
- **Errors:** one `@ApiErrorResponse(status, ...catalog entries)` per status, listing every code the endpoint can return, for example:
  ```ts
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.INVALID_ID, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.PRODUCT_NOT_FOUND)
  ```
  Put the 500 `INTERNAL_ERROR` response on the controller class, so it covers every endpoint.
- **Path IDs:** `@ApiParam({ name: 'id', description, format: 'uuid' })`.
- **List responses:** a concrete class such as `ProductPageResponseDto` (items plus `PageMetaDto`), because Swagger cannot describe the generic `Page<T>`.

## Health checks

- `GET /health/live` returns 200 while the process runs. Kubernetes restarts the pod if it fails.
- `GET /health/ready` returns 200 when every dependency the service needs answers within its timeout, and 503 otherwise. Kubernetes only sends traffic to ready pods.
- Both sit outside `/api` and are left out of the request log. Services with a database import `HealthModule` from `@app/common` after their `DatabaseModule`.
- Readiness checks the database today. Add Kafka when the service starts using it (Week 3). Never put slow or optional dependencies in liveness: a failing liveness probe restarts the pod.

## Testing

- Vitest:
  - `npm test` runs the unit tests (`*.spec.ts`).
  - `npm run test:cov` runs them with the coverage gate.
  - `npm run test:int` runs the integration tests (`*.int-spec.ts`).
- Tests live in `test/`, mirroring `src/`, and import code through relative `../src/...` paths.
- The bar, taken from the team's code reviews. `npm run test:cov` fails below it:
  - At least 80% lines and statements, 70% branches and 75% functions.
  - Coverage counts everything in `apps/*/src` and `libs/*/src` except wiring and declarations: `main.ts`, modules, entities, DTOs, constants and migrations. The TypeORM repository classes are also excluded; integration tests cover them against real Postgres. Never exclude a file just to pass.
  - At least one controller test per endpoint, covering success and each documented error status.
  - Edge cases are tested: empty lists, zero and falsy values, missing rows, duplicates, limits.
  - No `(service as any).privateMethod()`. Test through public methods.
  - No skipped or `.only` tests, and no open handles when the run ends.
- How the tests are written:
  - **Services:** construct the service directly with a mocked repository: `vi.fn<ProductRepository['findById']>()`, typed with `Mocked<ProductRepository>`.
  - **Controllers:** run the real HTTP stack with `setupApp()` and supertest, mocking only the service. Routing, the `/api/v1` prefix, trimming, validation, `ParseIdPipe` and the error filter are then tested for real.
  - **Test data:** builders in `test/builders/`, for example `aProduct({ active: false }, { availableQty: 0 })`.
  - **Environment variables:** set them with `vi.stubEnv()` and undo with `vi.unstubAllEnvs()`. Never assign to `process.env`.
- Name tests as behaviour: `it('returns 404 when the product does not exist')`. Use `it.each` tables for many cases.

## Code style

- Prettier (same settings as `ams`): single quotes, trailing commas, width 100, 2 spaces. ESLint and Prettier run on staged files before each commit, followed by a full typecheck.
- ESLint uses typescript-eslint's type-aware rules. Stricter than `ams`:
  - `any` is not allowed;
  - every promise must be awaited or handled;
  - every class member says `public`, `private` or `protected` (constructors stay unmarked).
- tsconfig is `strict`, plus `noUncheckedIndexedAccess`, `noImplicitOverride` and `noImplicitReturns`. Only `strictPropertyInitialization` is off, because DTOs and entities are filled in by libraries.
- Fixed values go in the app's `src/constants.ts`, named in `SCREAMING_SNAKE_CASE` with the unit in the name (`READINESS_DATABASE_TIMEOUT_MS`) and a one-line comment. This covers the port, service name, Swagger text, limits, timeouts and pool sizes. Do not write a bare number or module-level constant in another file. Exceptions: error codes (`src/constants/errors.ts`), injection tokens (next to their interface) and helper functions.
- Comments explain why, not what.

## Naming

| Item              | Convention                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Files             | `kebab-case` with a role suffix: `products.controller.ts`, `create-product.dto.ts`, `product.entity.ts` |
| Classes           | `PascalCase` with the role: `ProductsService`, `CreateProductDto`, `ProductNotFoundException`           |
| API paths         | `/api/v1/` plus plural `kebab-case` nouns: `/api/v1/products/:id/restock`                               |
| DB tables/columns | `snake_case`                                                                                            |
| Error codes       | `SCREAMING_SNAKE_CASE`                                                                                  |
| Injection tokens  | `SCREAMING_SNAKE_CASE` symbols: `PRODUCT_REPOSITORY`                                                    |

## Do not

- Return a TypeORM entity from a controller.
- Throw `HttpException` from a service, or an error code that is not in a catalog.
- Use `any`, `parseFloat` on money, or floating-point money math.
- Turn on TypeORM `synchronize`, or edit a migration that has already run.
- Use entity globs, or `__dirname`.
- Read-modify-write a counter (stock, balance). Use one conditional `UPDATE`.
- Exclude a file from coverage to pass the threshold.
