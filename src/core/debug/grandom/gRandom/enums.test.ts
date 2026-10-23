// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ConstraintType } from './ConstraintType.js';
import { FlowType } from './FlowType.js';
import { Form } from './Form.js';
import { Formats } from './Formats.js';
import { Side } from './Side.js';

interface Enumerator {
  getName(): string;
  getLiteral(): string;
  getValue(): number;
  toString(): string;
}
interface EnumClass {
  readonly VALUES: readonly Enumerator[];
  get(literal: string): Enumerator | null;
  getByName(name: string): Enumerator | null;
  getByValue(value: number): Enumerator | null;
}

const TABLES: ReadonlyArray<readonly [string, EnumClass, ReadonlyArray<readonly [string, string]>]> = [
  [
    'Formats',
    Formats,
    [
      ['elkt', 'elkt'],
      ['elkg', 'elkg'],
    ],
  ],
  [
    'Form',
    Form,
    [
      ['trees', 'trees'],
      ['custom', 'graphs'],
      ['bipartite', 'bipartite graphs'],
      ['biconnected', 'biconnected graphs'],
      ['triconnected', 'triconnected graphs'],
      ['acyclic', 'acyclic graphs'],
    ],
  ],
  [
    'Side',
    Side,
    [
      ['north', 'north'],
      ['east', 'east'],
      ['south', 'south'],
      ['west', 'west'],
    ],
  ],
  [
    'FlowType',
    FlowType,
    [
      ['incoming', 'incoming'],
      ['outgoing', 'outgoing'],
    ],
  ],
  [
    'ConstraintType',
    ConstraintType,
    [
      ['free', 'free'],
      ['side', 'side'],
      ['position', 'position'],
      ['order', 'order'],
      ['ratio', 'ratio'],
    ],
  ],
];

describe.each(TABLES)('%s', (_label, cls, rows) => {
  it('lists name, literal and value in declaration order', () => {
    expect(cls.VALUES.map((e) => [e.getName(), e.getLiteral(), e.getValue()])).toEqual(
      rows.map(([name, literal], index) => [name, literal, index]),
    );
  });

  it.each(rows.map((row, index) => [...row, index] as const))('looks up %s / %s / %i', (name, literal, index) => {
    const constant = cls.VALUES[index];
    expect(cls.get(literal)).toBe(constant);
    expect(cls.getByName(name)).toBe(constant);
    expect(cls.getByValue(index)).toBe(constant);
    expect(constant?.toString()).toBe(literal);
  });

  it('returns null for unknown keys', () => {
    expect(cls.get('nope')).toBeNull();
    expect(cls.getByName('nope')).toBeNull();
    expect(cls.getByValue(99)).toBeNull();
  });
});

describe('enum constants', () => {
  it('exposes the named constants and *_VALUE ints', () => {
    expect(Form.CUSTOM.getLiteral()).toBe('graphs');
    expect(Form.get('acyclic graphs')).toBe(Form.ACYCLIC);
    expect(Form.getByName('bipartite')).toBe(Form.BIPARTITE);
    expect(Form.ACYCLIC_VALUE).toBe(5);
    expect(Formats.ELKG_VALUE).toBe(1);
    expect(Side.WEST_VALUE).toBe(3);
    expect(FlowType.OUTGOING_VALUE).toBe(1);
    expect(ConstraintType.RATIO_VALUE).toBe(4);
  });
});
