// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import { AssertionError } from './AssertionError.js';
import { assertionsEnabled, devAssert, setAssertionsEnabled } from './DevAssert.js';
import { Exception } from './Exception.js';

/** Runs `body` with the switch at `enabled`, then restores the state the suite setup chose. */
function withAssertions<T>(enabled: boolean, body: () => T): T {
  const before = assertionsEnabled();
  setAssertionsEnabled(enabled);
  try {
    return body();
  } finally {
    setAssertionsEnabled(before);
  }
}

/** The error `body` throws; fails the test when it returns normally. */
function thrownBy(body: () => void): unknown {
  try {
    body();
  } catch (e) {
    return e;
  }
  throw new Error('expected a throw');
}

describe('the assertion switch', () => {
  it('reads back what was set', () => {
    expect(withAssertions(false, () => assertionsEnabled())).toBe(false);
    expect(withAssertions(true, () => assertionsEnabled())).toBe(true);
  });

  it('is restored by the helper of this file', () => {
    const before = assertionsEnabled();
    withAssertions(!before, () => undefined);
    expect(assertionsEnabled()).toBe(before);
  });
});

describe('devAssert, assertions disabled (a JVM without -ea)', () => {
  it('calls neither thunk and does not throw, whatever the check would return', () => {
    const failing = vi.fn(() => false);
    const passing = vi.fn(() => true);
    const detail = vi.fn(() => 'detail');
    withAssertions(false, () => {
      expect(devAssert(failing, detail)).toBeUndefined();
      expect(devAssert(passing, detail)).toBeUndefined();
      expect(devAssert(failing)).toBeUndefined();
    });
    expect(failing).toHaveBeenCalledTimes(0);
    expect(passing).toHaveBeenCalledTimes(0);
    expect(detail).toHaveBeenCalledTimes(0);
  });

  it('does not run a check that would throw (JLS 14.10: a disabled assert evaluates nothing)', () => {
    const throwing = vi.fn((): boolean => {
      throw new TypeError('null dereference');
    });
    withAssertions(false, () => devAssert(throwing));
    expect(throwing).toHaveBeenCalledTimes(0);
  });
});

describe('devAssert, assertions enabled (-ea)', () => {
  it('evaluates the check once and leaves the detail alone when the check holds', () => {
    const check = vi.fn(() => true);
    const detail = vi.fn(() => 'detail');
    expect(withAssertions(true, () => devAssert(check, detail))).toBeUndefined();
    expect(check).toHaveBeenCalledTimes(1);
    expect(detail).toHaveBeenCalledTimes(0);
  });

  it('throws an AssertionError with the detail as its message when the check fails', () => {
    const detail = vi.fn(() => 'value was 3');
    const e = thrownBy(() => withAssertions(true, () => devAssert(() => false, detail)));
    expect(e instanceof AssertionError).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof Exception).toBe(false);
    expect((e as AssertionError).name).toBe('AssertionError');
    expect((e as AssertionError).message).toBe('value was 3');
    expect(detail).toHaveBeenCalledTimes(1);
  });

  it('converts a non-string detail with String(), as the Java string conversion of the detail expression', () => {
    const e = thrownBy(() =>
      withAssertions(true, () =>
        devAssert(
          () => false,
          () => 42,
        ),
      ),
    );
    expect((e as AssertionError).message).toBe('42');
  });

  it('throws an AssertionError with an empty message when there is no detail', () => {
    const e = thrownBy(() => withAssertions(true, () => devAssert(() => false)));
    expect(e instanceof AssertionError).toBe(true);
    expect((e as AssertionError).message).toBe('');
  });

  it('is not caught by a ported catch (Exception e)', () => {
    const portedCatch = (): string => {
      try {
        devAssert(
          () => false,
          () => 'm',
        );
        return 'no throw';
      } catch (e) {
        if (e instanceof Exception) return 'caught';
        throw e;
      }
    };
    const e = thrownBy(() => withAssertions(true, portedCatch));
    expect(e instanceof AssertionError).toBe(true);
    expect((e as AssertionError).message).toBe('m');
  });

  it('lets an error of the check itself through, as Java evaluates the expression', () => {
    const e = thrownBy(() =>
      withAssertions(true, () =>
        devAssert((): boolean => {
          throw new TypeError('null dereference');
        }),
      ),
    );
    expect(e instanceof TypeError).toBe(true);
    expect((e as TypeError).message).toBe('null dereference');
  });
});
