import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases in tsconfig.json, including the ones that
  // `nest g library` adds (for example `@app/common`).
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    passWithNoTests: true,
    // `npm run test:cov` fails when unit coverage drops below the team bar
    // (docs/engineering-conventions.md, Testing).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/*/src/**/*.ts', 'libs/*/src/**/*.ts'],
      exclude: [
        // Wiring and declarations, as in the team's jest-unit.json.
        '**/main.ts',
        '**/index.ts',
        '**/*.module.ts',
        '**/*.entity.ts',
        '**/*.dto.ts',
        '**/*.query.ts',
        '**/constants.ts',
        '**/constants/**',
        '**/migrations/**',
        // Entry point of the TypeORM CLI only.
        '**/config/data-source.ts',
        // Database adapters: tested against real Postgres by the integration
        // tests (*.int-spec.ts), not by mocked unit tests.
        '**/typeorm-*.repository.ts',
      ],
      thresholds: { lines: 80, statements: 80, branches: 70, functions: 75 },
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['{apps,libs}/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['{apps,libs}/**/*.int-spec.ts'],
        },
      },
    ],
  },
});
