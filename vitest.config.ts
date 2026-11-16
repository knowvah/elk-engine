// SPDX-License-Identifier: EPL-2.0
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The package name resolves to the proposed entry module until the maintainer accepts the export surface
// (docs/architecture/public-api.md, "On acceptance"); tsconfig.json `paths` holds the same mapping.
const PACKAGE_ENTRY = fileURLToPath(new URL('./test/public-api/candidate-index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@knowvah/elk-engine': PACKAGE_ENTRY },
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**', 'tools/melk/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'json-summary', 'cobertura'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
