// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { assertionsEnabled } from '../../src/java/lang/DevAssert.js';
import { DEV_ASSERTIONS_ENV, DEV_ASSERTIONS_OFF } from './dev-assertions.js';

/**
 * Guard for the suite setup (dev-assert D4): the suite runs with Java's `assert` statements enabled, as ELK's Tycho
 * build runs its JUnit tests (`build/pom.xml`, `enableAssertions`), unless `ELK_DEV_ASSERTIONS=off` asks for the
 * production default. A vitest config that drops the setup file fails here.
 */
describe('suite setup: dev assertions', () => {
  it('names its switch', () => {
    expect(DEV_ASSERTIONS_ENV).toBe('ELK_DEV_ASSERTIONS');
    expect(DEV_ASSERTIONS_OFF).toBe('off');
  });

  it('enables assertions unless ELK_DEV_ASSERTIONS=off', () => {
    expect(assertionsEnabled()).toBe(process.env[DEV_ASSERTIONS_ENV] !== DEV_ASSERTIONS_OFF);
  });
});
