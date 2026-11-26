// SPDX-License-Identifier: EPL-2.0
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The package name resolves to the entry module, as tsconfig.json `paths` does, so tests and examples import it the
// way a consumer does.
const PACKAGE_ENTRY = fileURLToPath(new URL('./src/index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@knowvah/elk-engine': PACKAGE_ENTRY },
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    passWithNoTests: true,
    // Ported JUnit tests have no timeout (plain `@Test`), and some run seconds under coverage, so vitest's 5 s default
    // fails them as the suite grows (`NetworkSimplexTest.testDeltas`, 4.2 s on CI before; #164). 60 s is the explicit
    // timeout the suite's slow tests already pass, and still stops a hang.
    testTimeout: 60_000,
    // Java `assert` statements are enabled for the suite, as in ELK's Tycho build (dev-assert D4).
    setupFiles: ['test/setup/dev-assertions.ts'],
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
