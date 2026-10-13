// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

import { ContentAlignment } from './ContentAlignment.js';

const NAMES = ['V_TOP', 'V_CENTER', 'V_BOTTOM', 'H_LEFT', 'H_CENTER', 'H_RIGHT'];

const names = (s: EnumSet<ContentAlignment>): string[] => [...s].map((c) => c.name());

describe('ContentAlignment', () => {
  it('declares the constants in Java order', () => {
    expect(ContentAlignment.values().map((c) => c.name())).toEqual(NAMES);
    expect(ContentAlignment.values().map((c) => c.ordinal())).toEqual(NAMES.map((_n, i) => i));
    expect(ContentAlignment.values()[0]?.toString()).toBe(NAMES[0]);
  });

  it('valueOf resolves by name and throws the Java message for an unknown name', () => {
    for (const n of NAMES) {
      expect(ContentAlignment.valueOf(n).name()).toBe(n);
    }
    expect(() => ContentAlignment.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => ContentAlignment.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.ContentAlignment.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    const last = ContentAlignment.values()[NAMES.length - 1] as ContentAlignment;
    const first = ContentAlignment.values()[0] as ContentAlignment;
    expect(last.compareTo(first)).toBe(NAMES.length - 1);
    expect(first.compareTo(last)).toBe(1 - NAMES.length);
    expect(first.compareTo(first)).toBe(0);
  });

  it.each([
    ['centerCenter', ['V_CENTER', 'H_CENTER']],
    ['topLeft', ['V_TOP', 'H_LEFT']],
    ['bottomRight', ['V_BOTTOM', 'H_RIGHT']],
    ['topCenter', ['V_TOP', 'H_CENTER']],
  ] as const)('%s holds its two members and returns a fresh set per call', (factory, members) => {
    const set = ContentAlignment[factory]();
    expect(names(set)).toEqual(members);
    expect(ContentAlignment[factory]()).not.toBe(set);
    expect(ContentAlignment[factory]().equals(set)).toBe(true);
  });
});
