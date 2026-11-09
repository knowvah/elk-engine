// SPDX-License-Identifier: EPL-2.0
// Proof of the property writers of JsonDebugUtil and of the Java `Object.toString()` emulation (decision G3a): the forms of
// `String.valueOf` that appear as property values. The recorded `logged` rows (`DebugUtilLogged.test.ts`) prove the same
// forms against the oracle for the values the layered pipeline stores at slot 0 (enums, KVector, ElkPadding, lists, maps,
// `Layout Algorithm: ...`, `java.util.Random@...`, `...Spacings@...`); the cases below pin the forms the first slot does not
// reach, from the Javadoc of `AbstractCollection`, `AbstractMap` and `Object.toString()`.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../core/math/KVector.js';
import { KVectorChain } from '../../core/math/KVectorChain.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { Random } from '../../java/util/Random.js';
import { Property } from '../../graph/properties/Property.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { LGraph } from './graph/LGraph.js';
import { NodeType } from './graph/LNodeNodeType.js';
import { javaToString } from './JsonDebugUtilJavaString.js';
import { getValueRepresentation, writeProperties } from './JsonDebugUtilProperties.js';
import { JsonDebugUtilWriter } from './JsonDebugUtilWriter.js';
import { InternalProperties } from './options/InternalProperties.js';
import { Spacings } from './options/Spacings.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const STRING_KEYS: HashStrategy<string> = { hash: (k) => k.length, equals: (a, b) => a === b };
const hex = (o: object): string => identityHashCode(o).toString(16);

describe('javaToString', () => {
  it('prints Integer and Double as Java does, nested numbers by their int-ness', () => {
    expect(javaToString(3)).toBe('3');
    expect(javaToString(1, true)).toBe('1.0');
    expect(javaToString(1.5)).toBe('1.5');
    expect(javaToString([1, 2.5])).toBe('[1, 2.5]');
  });

  it('prints booleans, strings and null (a nested element) as Java does', () => {
    expect([javaToString(true), javaToString('x'), javaToString(null), javaToString(undefined)]).toEqual([
      'true',
      'x',
      'null',
      'null',
    ]);
    expect(javaToString(['a', null])).toBe('[a, null]');
  });

  it('prints List, Set and Map in iteration order: [a, b] and {k=v, ...}', () => {
    expect(javaToString(['a', 'b'])).toBe('[a, b]');
    expect(javaToString([])).toBe('[]');
    expect(javaToString(new Set(['a', 'b']))).toBe('[a, b]');
    expect(
      javaToString(
        new Map([
          ['k', 1],
          ['j', 2],
        ]),
      ),
    ).toBe('{k=1, j=2}');
    expect(javaToString(new Map())).toBe('{}');
    const hashSet = new JavaHashSet<string>(STRING_KEYS);
    hashSet.add('a');
    expect(javaToString(hashSet)).toBe('[a]');
    const hashMap = new JavaHashMap<string, string>(STRING_KEYS);
    hashMap.put('k', 'v');
    expect(javaToString(hashMap)).toBe('{k=v}');
    expect(javaToString(new LinkedList<string>(['x', 'y']))).toBe('[x, y]');
  });

  it('uses the ported toString of enums, KVector, KVectorChain and EnumSet', () => {
    expect(javaToString(NodeType.LONG_EDGE)).toBe('LONG_EDGE');
    expect(javaToString(new KVector(1, 2))).toBe('(1.0,2.0)');
    expect(javaToString(new KVectorChain(new KVector(1, 2), new KVector(3, 4)))).toBe('(1.0,2.0; 3.0,4.0)');
    expect(javaToString(EnumSet.of(NodeType.LABEL, NodeType.NORMAL))).toBe('[NORMAL, LABEL]');
  });

  it('prints a class without toString as <class name>@<hex identity hash>', () => {
    const random = new Random(1n);
    expect(javaToString(random)).toBe(`java.util.Random@${hex(random)}`);
    const spacings = new Spacings(new LGraph());
    expect(javaToString(spacings)).toBe(`org.eclipse.elk.alg.layered.options.Spacings@${hex(spacings)}`);
    class Unlisted {}
    const unlisted = new Unlisted();
    expect(javaToString(unlisted)).toBe(`Unlisted@${hex(unlisted)}`);
  });
});

describe('getValueRepresentation', () => {
  it('prints the processors property by simple class name', () => {
    class First {}
    class Second {}
    const processors = InternalProperties.PROCESSORS;
    expect(getValueRepresentation(processors, [new First(), new Second()])).toBe('[First, Second]');
    expect(getValueRepresentation(processors, [])).toBe('[]');
  });

  it('prints a Double-typed internal property and layout option with a fraction, an int property without', () => {
    expect(getValueRepresentation(InternalProperties.MAX_EDGE_THICKNESS, 1)).toBe('1.0');
    expect(getValueRepresentation(CoreOptions.SPACING_NODE_NODE, 20)).toBe('20.0');
    expect(getValueRepresentation(InternalProperties.MODEL_ORDER, 3)).toBe('3');
    expect(getValueRepresentation(new Property<number>('unregistered.number'), 7)).toBe('7');
  });

  it('escapes line breaks in the value', () => {
    expect(getValueRepresentation(new Property<string>('s'), 'a\nb')).toBe('a\\nb');
  });
});

describe('writeProperties', () => {
  it('writes an empty property map as an opener and a closer at the indentation', () => {
    const writer = new JsonDebugUtilWriter();
    writeProperties(writer, new LGraph().getAllProperties(), 1);
    expect(writer.toString()).toBe('  "properties": {\n  }');
  });

  it('writes one line per property with the id, the quote-escaped value, and commas between the lines', () => {
    const graph = new LGraph();
    graph.setProperty(new Property<string>('quoted'), 'say "x"');
    graph.setProperty(new Property<number>('count'), 4);
    const writer = new JsonDebugUtilWriter();
    writeProperties(writer, graph.getAllProperties(), 0);
    const lines = writer.toString().split('\n');
    expect(lines[0]).toBe('"properties": {');
    expect(lines.at(-1)).toBe('}');
    const entries = lines.slice(1, -1);
    // a comma ends every line but the last, whichever property comes last
    expect(entries.map((entry) => entry.endsWith(','))).toEqual([true, false]);
    expect(entries.map((entry) => entry.replace(/,$/, '')).sort()).toEqual([
      '  "count": "4"',
      '  "quoted": "say \\"x\\""',
    ]);
  });
});
