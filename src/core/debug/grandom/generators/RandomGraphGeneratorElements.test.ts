// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { Random } from '../../../../java/util/Random.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import { PortSide } from '../../../options/PortSide.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';
import {
  createClique,
  createIndependentSet,
  createNode,
  createPort,
  distributePorts,
} from './RandomGraphGeneratorElements.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 42n;
const SIDE_COUNT = 4;
const SIDES = [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST] as const;

type Setting = readonly [IProperty<never>, unknown];

function makeGenerator(...settings: Setting[]): RandomGraphGenerator {
  const options = new GeneratorOptions();
  for (const [property, value] of settings) {
    options.setProperty(property as IProperty<unknown>, value);
  }
  const gen = new RandomGraphGenerator(new Random(SEED));
  gen.options = options;
  return gen;
}

function setting<T>(property: IProperty<T>, value: T): Setting {
  return [property as IProperty<never>, value];
}

function newParent(): ElkNode {
  return ElkGraphUtil.createGraph();
}

describe('createNode', () => {
  it('numbers ids n<k> and labels N<k> and sizes nodes by floatVal draws on the shared Random', () => {
    const width = RandVal.minMax(10, 50);
    const height = RandVal.minMax(20, 60);
    const gen = makeGenerator(
      setting(GeneratorOptions.CREATE_NODE_LABELS, true),
      setting(GeneratorOptions.SET_NODE_SIZE, true),
      setting(GeneratorOptions.NODE_WIDTH, width),
      setting(GeneratorOptions.NODE_HEIGHT, height),
    );
    const parallel = new Random(SEED);
    const expected = [
      [width.floatVal(parallel), height.floatVal(parallel)],
      [width.floatVal(parallel), height.floatVal(parallel)],
    ];
    const parent = newParent();

    const n0 = createNode(gen, parent);
    const n1 = createNode(gen, parent);

    expect([n0.getIdentifier(), n1.getIdentifier()]).toEqual(['n0', 'n1']);
    expect([n0.getLabels().get(0).getText(), n1.getLabels().get(0).getText()]).toEqual(['N0', 'N1']);
    expect([n0.getWidth(), n0.getHeight()]).toEqual(expected[0]);
    expect([n1.getWidth(), n1.getHeight()]).toEqual(expected[1]);
    expect(parent.getChildren().toArray()).toEqual([n0, n1]);
    expect(gen.nodeLabelCounter).toBe(2);
  });

  it('creates no label and no size when the options are off and leaves port constraints unset', () => {
    const gen = makeGenerator(
      setting(GeneratorOptions.CREATE_NODE_LABELS, false),
      setting(GeneratorOptions.SET_NODE_SIZE, false),
    );
    const node = createNode(gen, newParent());
    expect(node.getLabels().size()).toBe(0);
    expect([node.getWidth(), node.getHeight()]).toEqual([0, 0]);
    expect(node.hasProperty(CoreOptions.PORT_CONSTRAINTS)).toBe(false);
    expect(node.hasProperty(CoreOptions.HYPERNODE)).toBe(false);
    // no draw at all: hypernode chance 0 skips nextFloat, exact sizes consume nothing
    expect(gen.random.nextInt()).toBe(new Random(SEED).nextInt());
  });

  it('sets the port constraints unless they are UNDEFINED', () => {
    const gen = makeGenerator(setting(GeneratorOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER));
    const node = createNode(gen, newParent());
    expect(node.getProperty(CoreOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
  });

  it('draws nextFloat before the sizes and marks a hypernode when the draw is below the chance', () => {
    const width = RandVal.minMax(10, 50);
    const gen = makeGenerator(
      setting(GeneratorOptions.HYPERNODE_CHANCE, Math.fround(1.0)),
      setting(GeneratorOptions.NODE_WIDTH, width),
    );
    const parallel = new Random(SEED);
    parallel.nextFloat();
    const expectedWidth = width.floatVal(parallel);

    const node = createNode(gen, newParent());

    expect(node.getProperty(CoreOptions.HYPERNODE)).toBe(true);
    expect(node.getWidth()).toBe(expectedWidth);
  });

  it('does not mark a hypernode when the draw is not below the chance', () => {
    const chance = Math.fround(0.5);
    const gen = makeGenerator(setting(GeneratorOptions.HYPERNODE_CHANCE, chance));
    const draw = new Random(SEED).nextFloat();
    expect(draw).toBeGreaterThanOrEqual(chance); // fixes the seed assumption of this test
    const node = createNode(gen, newParent());
    expect(node.hasProperty(CoreOptions.HYPERNODE)).toBe(false);
  });
});

describe('createIndependentSet and createClique', () => {
  it('creates n unconnected nodes in the parent', () => {
    const gen = makeGenerator();
    const parent = newParent();
    const nodes = createIndependentSet(gen, parent, 3);
    expect(nodes.map((node) => node.getIdentifier())).toEqual(['n0', 'n1', 'n2']);
    expect(parent.getChildren().toArray()).toEqual(nodes);
    expect(nodes.every((node) => node.getOutgoingEdges().isEmpty() && node.getIncomingEdges().isEmpty())).toBe(true);
  });

  it('creates an empty set for n = 0', () => {
    expect(createIndependentSet(makeGenerator(), newParent(), 0)).toEqual([]);
  });

  it('creates n(n-1)/2 edges, one from each node to each later node', () => {
    const gen = makeGenerator();
    const parent = newParent();
    const nodes = createClique(gen, parent, 4);
    expect(parent.getContainedEdges().size()).toBe(6);
    expect(nodes.map((node) => node.getOutgoingEdges().size())).toEqual([3, 2, 1, 0]);
    expect(nodes.map((node) => node.getIncomingEdges().size())).toEqual([0, 1, 2, 3]);
    const pairs = parent
      .getContainedEdges()
      .toArray()
      .map((edge) => [edge.getSources().get(0), edge.getTargets().get(0)]);
    expect(pairs).toEqual([
      [nodes[0], nodes[1]],
      [nodes[0], nodes[2]],
      [nodes[0], nodes[3]],
      [nodes[1], nodes[2]],
      [nodes[1], nodes[3]],
      [nodes[2], nodes[3]],
    ]);
  });

  it('creates no edge for a single node', () => {
    const parent = newParent();
    createClique(makeGenerator(), parent, 1);
    expect(parent.getContainedEdges().size()).toBe(0);
    expect(parent.getChildren().size()).toBe(1);
  });
});

describe('createPort', () => {
  it('numbers ids p<k> and labels P<k> and sizes ports by floatVal draws', () => {
    const width = RandVal.minMax(2, 6);
    const height = RandVal.minMax(3, 9);
    const gen = makeGenerator(
      setting(GeneratorOptions.CREATE_PORT_LABELS, true),
      setting(GeneratorOptions.SET_PORT_SIZE, true),
      setting(GeneratorOptions.PORT_WIDTH, width),
      setting(GeneratorOptions.PORT_HEIGHT, height),
    );
    const parallel = new Random(SEED);
    const expected = [width.floatVal(parallel), height.floatVal(parallel)];
    const node = newParent();

    const p0 = createPort(gen, node, true);
    const p1 = createPort(gen, node, false);

    expect([p0.getIdentifier(), p1.getIdentifier()]).toEqual(['p0', 'p1']);
    expect([p0.getLabels().get(0).getText(), p1.getLabels().get(0).getText()]).toEqual(['P0', 'P1']);
    expect([p0.getWidth(), p0.getHeight()]).toEqual(expected);
    expect(node.getPorts().toArray()).toEqual([p0, p1]);
    expect(p0.getParent()).toBe(node);
    expect(gen.portLabelCounter).toBe(2);
  });

  it('has no label, no size and no side without those options or fixed sides', () => {
    const gen = makeGenerator(
      setting(GeneratorOptions.SET_PORT_SIZE, false),
      setting(GeneratorOptions.PORT_CONSTRAINTS, PortConstraints.FREE),
    );
    const port = createPort(gen, newParent(), true);
    expect(port.getLabels().size()).toBe(0);
    expect([port.getWidth(), port.getHeight()]).toEqual([0, 0]);
    expect(port.hasProperty(CoreOptions.PORT_SIDE)).toBe(false);
    expect(gen.random.nextInt()).toBe(new Random(SEED).nextInt());
  });

  it.each([
    ['north', 0],
    ['east', 1],
    ['south', 2],
    ['west', 3],
  ] as const)('puts an outgoing port on the %s side when only that probability is set', (_name, index) => {
    const gen = makeGenerator(
      setting(GeneratorOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE),
      setting(GeneratorOptions.OUTGOING_NORTH_SIDE, index === 0 ? 1 : 0),
      setting(GeneratorOptions.OUTGOING_EAST_SIDE, index === 1 ? 1 : 0),
      setting(GeneratorOptions.OUTGOING_SOUTH_SIDE, index === 2 ? 1 : 0),
      setting(GeneratorOptions.OUTGOING_WEST_SIDE, index === SIDE_COUNT - 1 ? 1 : 0),
    );
    const port = createPort(gen, newParent(), true);
    expect(port.getProperty(CoreOptions.PORT_SIDE)).toBe(SIDES[index]);
  });

  it('uses the incoming probabilities for target ports', () => {
    const gen = makeGenerator(
      setting(GeneratorOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE),
      setting(GeneratorOptions.INCOMING_NORTH_SIDE, 0),
      setting(GeneratorOptions.INCOMING_EAST_SIDE, 0),
      setting(GeneratorOptions.INCOMING_SOUTH_SIDE, 1),
      setting(GeneratorOptions.INCOMING_WEST_SIDE, 0),
      // the outgoing defaults would put the port east or west
      setting(GeneratorOptions.OUTGOING_NORTH_SIDE, 0),
      setting(GeneratorOptions.OUTGOING_SOUTH_SIDE, 0),
    );
    const port = createPort(gen, newParent(), false);
    expect(port.getProperty(CoreOptions.PORT_SIDE)).toBe(PortSide.SOUTH);
  });

  it('draws one nextInt over the probability sum and maps it to the cumulative north/east/south/west bands', () => {
    // defaults (outgoing): north 10, east 75, south 10, west 5 => bands [0,10) [10,85) [85,95) [95,100)
    const gen = makeGenerator(setting(GeneratorOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE));
    const parallel = new Random(SEED);
    const node = newParent();
    const bands: ReadonlyArray<readonly [number, PortSide]> = [
      [10, PortSide.NORTH],
      [85, PortSide.EAST],
      [95, PortSide.SOUTH],
      [100, PortSide.WEST],
    ];
    for (let i = 0; i < 40; i++) {
      const p = parallel.nextInt(100);
      const expectedSide = (bands.find(([limit]) => p < limit) as readonly [number, PortSide])[1];
      const port: ElkPort = createPort(gen, node, true);
      expect(port.getProperty(CoreOptions.PORT_SIDE)).toBe(expectedSide);
    }
  });
});

describe('distributePorts', () => {
  function portOn(node: ElkNode, side: PortSide): ElkPort {
    const port = ElkGraphUtil.createPort(node);
    port.setDimensions(4, 4);
    port.setProperty(CoreOptions.PORT_SIDE, side);
    return port;
  }

  it('grows the node to fit its ports and spreads them evenly along each side', () => {
    const gen = makeGenerator(
      setting(GeneratorOptions.PORT_WIDTH, RandVal.exact(4)),
      setting(GeneratorOptions.PORT_HEIGHT, RandVal.exact(4)),
    );
    const node = newParent();
    node.setDimensions(10, 10);
    const north0 = portOn(node, PortSide.NORTH);
    const north1 = portOn(node, PortSide.NORTH);
    const east = portOn(node, PortSide.EAST);
    const south = portOn(node, PortSide.SOUTH);
    const west = portOn(node, PortSide.WEST);

    distributePorts(gen, node);

    // width: (2 + 1) * (4 + 7) = 33; height: (1 + 1) * (4 + 7) = 22
    expect([node.getWidth(), node.getHeight()]).toEqual([33, 22]);
    // north: delta 33 / 3 = 11, x = pos - width / 2, y = -height
    expect([north0.getX(), north0.getY()]).toEqual([9, -4]);
    expect([north1.getX(), north1.getY()]).toEqual([20, -4]);
    // east: delta 22 / 2 = 11, x = node width, y = pos - height / 2
    expect([east.getX(), east.getY()]).toEqual([33, 9]);
    // south: delta 33 / 2 = 16.5, x = 16.5 - 2, y = node height
    expect([south.getX(), south.getY()]).toEqual([14.5, 22]);
    // west: delta 22 / 2 = 11, x = -width, y = 11 - 2
    expect([west.getX(), west.getY()]).toEqual([-4, 9]);
  });

  it('does not shrink a node that is already large enough and ignores ports without a side', () => {
    const gen = makeGenerator(
      setting(GeneratorOptions.PORT_WIDTH, RandVal.exact(4)),
      setting(GeneratorOptions.PORT_HEIGHT, RandVal.exact(4)),
    );
    const node = newParent();
    node.setDimensions(100, 80);
    const sideless = ElkGraphUtil.createPort(node);
    sideless.setLocation(5, 6);
    const north = portOn(node, PortSide.NORTH);

    distributePorts(gen, node);

    expect([node.getWidth(), node.getHeight()]).toEqual([100, 80]);
    expect([sideless.getX(), sideless.getY()]).toEqual([5, 6]);
    expect([north.getX(), north.getY()]).toEqual([48, -4]);
  });

  it('computes the required extent in float arithmetic', () => {
    // floatVal(0.1) = 0.10000000149011612; the float sum with 7.0f is 7.099999904632568, not the double
    // sum 7.100000001490116; one port on a side needs twice that (exact in binary).
    const gen = makeGenerator(
      setting(GeneratorOptions.PORT_WIDTH, RandVal.exact(0.1)),
      setting(GeneratorOptions.PORT_HEIGHT, RandVal.exact(0.1)),
    );
    const node = newParent();
    ElkGraphUtil.createPort(node).setProperty(CoreOptions.PORT_SIDE, PortSide.NORTH);

    distributePorts(gen, node);

    expect(node.getWidth()).toBe(14.199999809265137);
    expect(node.getHeight()).toBe(7.099999904632568);
  });

  it('draws the port width before the height', () => {
    const width = RandVal.minMax(1, 3);
    const height = RandVal.minMax(1, 3);
    const gen = makeGenerator(
      setting(GeneratorOptions.PORT_WIDTH, width),
      setting(GeneratorOptions.PORT_HEIGHT, height),
    );
    const parallel = new Random(SEED);
    const w = width.floatVal(parallel);
    const h = height.floatVal(parallel);
    const node = newParent();
    ElkGraphUtil.createPort(node).setProperty(CoreOptions.PORT_SIDE, PortSide.NORTH);
    ElkGraphUtil.createPort(node).setProperty(CoreOptions.PORT_SIDE, PortSide.WEST);

    distributePorts(gen, node);

    // one port each on the north and west side: (1 + 1) * (size + 7.0f) in float arithmetic
    const separated = (size: number): number => Math.fround(Math.fround(size + 7) * 2);
    expect(node.getWidth()).toBe(separated(w));
    expect(node.getHeight()).toBe(separated(h));
  });
});
