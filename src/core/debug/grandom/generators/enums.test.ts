// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { FileFormat } from './FileFormat.js';
import { GraphType } from './GraphType.js';

interface EnumClass {
  values(): readonly { name(): string; ordinal(): number; toString(): string; compareTo(o: never): number }[];
  valueOf(name: string): unknown;
}

const TABLES: readonly (readonly [string, EnumClass, readonly string[]])[] = [
  ['FileFormat', FileFormat, ['XMI', 'XTEXT']],
  [
    'GraphType',
    GraphType,
    ['CUSTOM', 'TREE', 'BICONNECTED', 'TRICONNECTED', 'ACYCLIC_NO_TRANSITIVE_EDGES', 'BIPARTITE'],
  ],
  ['EdgeDetermination', EdgeDetermination, ['ABSOLUTE', 'OUTGOING', 'RELATIVE', 'DENSITY']],
];

describe.each(TABLES)('%s', (className, cls, names) => {
  it('declares the constants in Java order with ordinals', () => {
    expect(cls.values().map((c) => c.name())).toEqual([...names]);
    expect(cls.values().map((c) => c.ordinal())).toEqual(names.map((_, i) => i));
    expect(cls.values().map((c) => c.toString())).toEqual([...names]);
  });
  it('valueOf resolves each name and throws the Java message otherwise', () => {
    for (const c of cls.values()) expect(cls.valueOf(c.name())).toBe(c);
    expect(() => cls.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => cls.valueOf('FOO')).toThrow(
      `No enum constant org.eclipse.elk.core.debug.grandom.generators.GeneratorOptions.${className}.FOO`,
    );
  });
  it('compareTo is by ordinal', () => {
    const [first, , last] = [cls.values()[0]!, 0, cls.values().at(-1)!];
    expect(first.compareTo(last as never)).toBe(-(names.length - 1));
    expect(last.compareTo(first as never)).toBe(names.length - 1);
  });
});
