// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { DEFAULT_CHECK_TYPE } from './Check.js';
import { CheckMode } from './CheckMode.js';
import { CheckType } from './CheckType.js';

describe('CheckType', () => {
  it('lists the constants in declaration order', () => {
    expect(CheckType.values().map((t) => [t.name(), t.ordinal(), t.toString()])).toEqual([
      ['FAST', 0, 'FAST'],
      ['NORMAL', 1, 'NORMAL'],
      ['EXPENSIVE', 2, 'EXPENSIVE'],
    ]);
  });

  it('is FAST by default, the @Check default', () => {
    expect(DEFAULT_CHECK_TYPE).toBe(CheckType.FAST);
  });
});

describe('CheckMode', () => {
  it('checks the types each mode names', () => {
    const table = (mode: CheckMode): boolean[] => CheckType.values().map((t) => mode.shouldCheck(t));

    expect(table(CheckMode.FAST_ONLY)).toEqual([true, false, false]);
    expect(table(CheckMode.NORMAL_ONLY)).toEqual([false, true, false]);
    expect(table(CheckMode.EXPENSIVE_ONLY)).toEqual([false, false, true]);
    expect(table(CheckMode.NORMAL_AND_FAST)).toEqual([true, true, false]);
    expect(table(CheckMode.ALL)).toEqual([true, true, true]);
  });

  it('prints the checked types', () => {
    expect(
      [
        CheckMode.FAST_ONLY,
        CheckMode.NORMAL_ONLY,
        CheckMode.EXPENSIVE_ONLY,
        CheckMode.NORMAL_AND_FAST,
        CheckMode.ALL,
      ].map(String),
    ).toEqual(['FAST', 'NORMAL', 'EXPENSIVE', 'NORMAL|FAST', 'ALL']);
  });

  it('reads the mode from a context, ALL when absent', () => {
    expect(CheckMode.getCheckMode(null)).toBe(CheckMode.ALL);
    expect(CheckMode.getCheckMode(new Map())).toBe(CheckMode.ALL);
    expect(CheckMode.getCheckMode(new Map([[CheckMode.KEY, null]]))).toBe(CheckMode.ALL);
    expect(CheckMode.getCheckMode(new Map([[CheckMode.KEY, CheckMode.NORMAL_ONLY]]))).toBe(CheckMode.NORMAL_ONLY);
  });

  it('rejects a context value of another type', () => {
    expect(() => CheckMode.getCheckMode(new Map([[CheckMode.KEY, 3]]))).toThrow(
      new IllegalArgumentException('Context object for key check.mode should be of Type CheckMode but was number'),
    );
  });
});
