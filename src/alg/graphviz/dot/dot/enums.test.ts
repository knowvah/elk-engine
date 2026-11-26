// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AttributeType } from './AttributeType.js';
import { EdgeOperator } from './EdgeOperator.js';
import { GraphType } from './GraphType.js';

// Expected values: the constant declarations of EdgeOperator.java, GraphType.java and AttributeType.java
// (`NAME(value, "name", "literal")`, the `*_VALUE` ints and the `VALUES_ARRAY` order).

interface Enumerator {
  name(): string;
  getValue(): number;
  getName(): string;
  getLiteral(): string;
  toString(): string;
}

interface EnumClass {
  readonly VALUES: readonly Enumerator[];
  get(literal: string): Enumerator | null;
  get(value: number): Enumerator | null;
  getByName(name: string): Enumerator | null;
}

/** [enum, rows of [constant, Java name(), value, name, literal, *_VALUE]]. */
const TABLES: ReadonlyArray<
  readonly [string, EnumClass, ReadonlyArray<readonly [Enumerator, string, number, string, string, number]>]
> = [
  [
    'EdgeOperator',
    EdgeOperator,
    [
      [EdgeOperator.DIRECTED, 'DIRECTED', 0, 'directed', '->', EdgeOperator.DIRECTED_VALUE],
      [EdgeOperator.UNDIRECTED, 'UNDIRECTED', 1, 'undirected', '--', EdgeOperator.UNDIRECTED_VALUE],
    ],
  ],
  [
    'GraphType',
    GraphType,
    [
      [GraphType.GRAPH, 'GRAPH', 0, 'graph', 'graph', GraphType.GRAPH_VALUE],
      [GraphType.DIGRAPH, 'DIGRAPH', 1, 'digraph', 'digraph', GraphType.DIGRAPH_VALUE],
    ],
  ],
  [
    'AttributeType',
    AttributeType,
    [
      [AttributeType.GRAPH, 'GRAPH', 0, 'graph', 'graph', AttributeType.GRAPH_VALUE],
      [AttributeType.NODE, 'NODE', 1, 'node', 'node', AttributeType.NODE_VALUE],
      [AttributeType.EDGE, 'EDGE', 2, 'edge', 'edge', AttributeType.EDGE_VALUE],
    ],
  ],
];

describe.each(TABLES)('%s', (_label, enumClass, rows) => {
  it('lists VALUES in declaration order', () => {
    expect(enumClass.VALUES).toEqual(rows.map((row) => row[0]));
  });

  it.each(rows)(
    '%s has the generated name(), value, name and literal',
    (constant, javaName, value, name, literal, valueConst) => {
      expect(constant.name()).toBe(javaName);
      expect(constant.getValue()).toBe(value);
      expect(valueConst).toBe(value);
      expect(constant.getName()).toBe(name);
      expect(constant.getLiteral()).toBe(literal);
      expect(constant.toString()).toBe(literal);
    },
  );

  it.each(rows)('%s is found by literal, by name and by value', (constant, _javaName, value, name, literal) => {
    expect(enumClass.get(literal)).toBe(constant);
    expect(enumClass.getByName(name)).toBe(constant);
    expect(enumClass.get(value)).toBe(constant);
  });

  it('returns null for an unknown literal, name or value', () => {
    expect(enumClass.get('x')).toBeNull();
    expect(enumClass.getByName('x')).toBeNull();
    expect(enumClass.get(rows.length)).toBeNull();
    expect(enumClass.get(-1)).toBeNull();
  });
});

describe('EdgeOperator lookups', () => {
  it('get(String) matches the literal, not the name, and getByName the name, not the literal', () => {
    expect(EdgeOperator.get('->')).toBe(EdgeOperator.DIRECTED);
    expect(EdgeOperator.get('->')?.getValue()).toBe(0);
    expect(EdgeOperator.get('->')?.getName()).toBe('directed');
    expect(EdgeOperator.get('directed')).toBeNull();
    expect(EdgeOperator.getByName('--')).toBeNull();
    expect(EdgeOperator.get('x')).toBeNull();
  });
});
