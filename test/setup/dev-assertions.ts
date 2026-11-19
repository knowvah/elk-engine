// SPDX-License-Identifier: EPL-2.0
import { setAssertionsEnabled } from '../../src/java/lang/DevAssert.js';

/** Environment variable of the suite's assertion switch. Test code may read the environment; `src/` may not. */
export const DEV_ASSERTIONS_ENV = 'ELK_DEV_ASSERTIONS';

/** The one value that turns the assertions off, to prove that a disabled `devAssert` changes nothing. */
export const DEV_ASSERTIONS_OFF = 'off';

/**
 * Vitest setup file (`vitest.config.ts`, `test.setupFiles`): runs before each test file, in that file's module
 * graph. The suite runs with Java's `assert` statements enabled, as ELK's Tycho build runs its JUnit tests
 * (`build/pom.xml`, `<enableAssertions>true`); the library default stays disabled, as a JVM without `-ea`.
 */
setAssertionsEnabled(process.env[DEV_ASSERTIONS_ENV] !== DEV_ASSERTIONS_OFF);
