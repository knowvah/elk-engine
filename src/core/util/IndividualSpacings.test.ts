// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { MapPropertyHolder } from '../../graph/properties/MapPropertyHolder.js';
import { Property } from '../../graph/properties/Property.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { CoreOptions } from '../options/CoreOptions.js';
import type { GraphAdapters } from './adapters/GraphAdapters.js';
import { IndividualSpacings } from './IndividualSpacings.js';

const NODE_NODE_ID = 'org.eclipse.elk.spacing.nodeNode';
const EDGE_EDGE_ID = 'org.eclipse.elk.spacing.edgeEdge';
const FORMAT_MESSAGE = 'The given string does not match the expected format for individual spacings.';

function parsed(text: string): IndividualSpacings {
  const spacings = new IndividualSpacings();
  spacings.parse(text);
  return spacings;
}

function causeOf(text: string): Error {
  try {
    parsed(text);
  } catch (e) {
    expect(e).toBeInstanceOf(IllegalArgumentException);
    expect((e as Error).message).toBe(FORMAT_MESSAGE);
    return (e as Error).cause as Error;
  }
  throw new Error('parse did not throw');
}

beforeEach(() => {
  LayoutMetaDataService.unload();
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('IndividualSpacings construction', () => {
  it('starts empty and copies an empty container', () => {
    expect(new IndividualSpacings().getAllProperties().isEmpty()).toBe(true);
    expect(new IndividualSpacings(new IndividualSpacings()).toString()).toBe('');
  });

  it('fails to copy a non-empty container, as the Java (putAll on Collections.emptyMap())', () => {
    const source = new IndividualSpacings();
    source.setProperty(CoreOptions.SPACING_NODE_NODE, 3);
    expect(() => new IndividualSpacings(source)).toThrow(UnsupportedOperationException);
  });
});

describe('IndividualSpacings parse and toString', () => {
  it('parses an option id with its value and round-trips through toString', () => {
    const spacings = parsed(`${NODE_NODE_ID}:5.0`);
    expect(spacings.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(5);
    expect(spacings.toString()).toBe(`${NODE_NODE_ID}:5.0`);
    expect(parsed(spacings.toString()).toString()).toBe(spacings.toString());
  });

  it('resolves option suffixes and joins several options with the separator', () => {
    const spacings = parsed(`spacing.nodeNode:5.5;,;spacing.edgeEdge:2`);
    expect(spacings.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(5.5);
    expect(spacings.getProperty(CoreOptions.SPACING_EDGE_EDGE)).toBe(2);
    const text = spacings.toString();
    expect(text.split(';,;').sort()).toEqual([`${EDGE_EDGE_ID}:2.0`, `${NODE_NODE_ID}:5.5`]);
    expect(parsed(text).toString()).toBe(text);
  });

  it('does nothing for a null or empty string', () => {
    const spacings = new IndividualSpacings();
    spacings.parse('');
    spacings.parse(null as unknown as string);
    expect(spacings.getAllProperties().isEmpty()).toBe(true);
  });

  it('prints values of other properties by their JavaScript text', () => {
    const spacings = new IndividualSpacings();
    spacings.setProperty(new Property<number>('p.count'), 3);
    spacings.setProperty(new Property<boolean>('p.flag'), true);
    expect(spacings.toString().split(';,;').sort()).toEqual(['p.count:3', 'p.flag:true']);
  });

  it('wraps an unknown option id with the Java messages', () => {
    const cause = causeOf('no.such.option:1');
    expect(cause).toBeInstanceOf(IllegalArgumentException);
    expect(cause.message).toBe('Invalid option id: no.such.option');
  });

  it('wraps a value the option cannot parse', () => {
    const cause = causeOf(`${NODE_NODE_ID}:abc`);
    expect(cause).toBeInstanceOf(IllegalArgumentException);
    expect(cause.message).toBe('Invalid option value: abc');
  });

  it('wraps a missing value and a missing id as index errors', () => {
    const missingValue = causeOf(NODE_NODE_ID);
    expect(missingValue).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(missingValue.message).toBe('Index 1 out of bounds for length 1');
    const missingId = causeOf(':');
    expect(missingId).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(missingId.message).toBe('Index 0 out of bounds for length 0');
  });
});

describe('IndividualSpacings.getIndividualOrInherited', () => {
  const NODE_NODE = CoreOptions.SPACING_NODE_NODE;

  function child(): { parent: ElkNode; node: ElkNode } {
    const parent = ElkGraphUtil.createGraph();
    return { parent, node: ElkGraphUtil.createNode(parent) };
  }

  it('prefers the override set on an ElkNode, then the parent value, then null', () => {
    const { parent, node } = child();
    parent.setProperty(NODE_NODE, 7);
    expect(IndividualSpacings.getIndividualOrInherited(node, NODE_NODE)).toBe(7);

    const spacings = new IndividualSpacings();
    spacings.setProperty(NODE_NODE, 3);
    node.setProperty(CoreOptions.SPACING_INDIVIDUAL, spacings);
    expect(IndividualSpacings.getIndividualOrInherited(node, NODE_NODE)).toBe(3);
    expect(IndividualSpacings.getIndividualOrInherited(node, CoreOptions.SPACING_EDGE_EDGE)).toBe(
      CoreOptions.SPACING_EDGE_EDGE.getDefault(),
    );
    // a node without a parent has nothing to inherit from
    expect(IndividualSpacings.getIndividualOrInherited(parent, NODE_NODE)).toBeNull();
    expect(
      IndividualSpacings.getIndividualOrInherited(ElkGraphUtil.createGraph(), new Property<number>('x')),
    ).toBeNull();
  });

  function adapter(holder: MapPropertyHolder, graph: MapPropertyHolder | null): GraphAdapters.NodeAdapter<unknown> {
    return {
      getGraph: () => graph,
      hasProperty: (property: Property<unknown>) => holder.hasProperty(property),
      getProperty: <P>(property: Property<P>) => holder.getProperty(property),
    } as unknown as GraphAdapters.NodeAdapter<unknown>;
  }

  it('prefers the override on a NodeAdapter, then the graph value, then the property default', () => {
    const node = new MapPropertyHolder();
    const graph = new MapPropertyHolder();
    graph.setProperty(NODE_NODE, 9);
    expect(IndividualSpacings.getIndividualOrInherited(adapter(node, graph), NODE_NODE)).toBe(9);

    const spacings = new IndividualSpacings();
    spacings.setProperty(NODE_NODE, 4);
    node.setProperty(CoreOptions.SPACING_INDIVIDUAL, spacings);
    expect(IndividualSpacings.getIndividualOrInherited(adapter(node, graph), NODE_NODE)).toBe(4);
    expect(IndividualSpacings.getIndividualOrInherited(adapter(new MapPropertyHolder(), null), NODE_NODE)).toBe(
      NODE_NODE.getDefault(),
    );
  });
});
