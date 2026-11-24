// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE, checkStackDepth } from './StackDepth.js';

/** V8's own stack exhaustion, for the class and message the shim must raise. */
function nativeOverflow(): unknown {
  const recurse = (): number => recurse() + 1;
  try {
    recurse();
  } catch (error) {
    return error;
  }
  return null;
}

describe('StackDepth (java.lang.StackOverflowError for an explicit-stack loop: V8 RangeError, AD-16b)', () => {
  it('is 100,000 activations deep', () => {
    expect(MAX_STACK_DEPTH).toBe(100_000);
  });

  it('returns for every depth up to the limit', () => {
    expect(checkStackDepth(0)).toBeUndefined();
    expect(checkStackDepth(1)).toBeUndefined();
    expect(checkStackDepth(MAX_STACK_DEPTH)).toBeUndefined();
  });

  it('throws the RangeError of V8 stack exhaustion one activation beyond the limit', () => {
    const native = nativeOverflow();
    expect(native).toBeInstanceOf(RangeError);
    expect((native as RangeError).message).toBe(STACK_OVERFLOW_MESSAGE);
    expect(() => checkStackDepth(MAX_STACK_DEPTH + 1)).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
    expect(() => checkStackDepth(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });

  it('ends a loop that models a recursion without end, as the recursion ends in stack exhaustion', () => {
    const run = (): number => {
      let depth = 0;
      for (;;) checkStackDepth(++depth);
    };
    expect(run).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
  });
});
