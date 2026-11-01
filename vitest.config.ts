import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';

createRequire(import.meta.url)('./scripts/check-engines.js');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'dist-electron', 'dist-ts', 'benchmark/results/**', 'benchmark/archives/**'],
    pool: 'forks',
  },
});
