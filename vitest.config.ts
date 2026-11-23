import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases in tsconfig.json, including the ones that
  // `nest g library` adds (for example `@app/common`).
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    passWithNoTests: true,
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
