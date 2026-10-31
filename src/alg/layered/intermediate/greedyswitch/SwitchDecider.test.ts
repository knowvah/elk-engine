// SPDX-License-Identifier: EPL-2.0
// Unit cases of SwitchDecider (mission 7c, T7), decided by hand from SwitchDecider.java:124-250; the greedy-switch rows
// (GreedySwitchHeuristic.test.ts) prove the class on the oracle's graphs. The parent-graph counters
// (`countCrossingsCausedByPortSwitch`, `initParentCrossingsCounters`) need a nested graph and are U until 7h.
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { Random } from '../../../../java/util/Random.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { GraphInfoHolder } from '../../p3order/GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { CrossingMatrixFiller } from './CrossingMatrixFiller.js';
import { SwitchDecider } from './SwitchDecider.js';
import { SwitchDeciderCrossingCountSide as CrossingCountSide } from './SwitchDeciderCrossingCountSide.js';

interface Fixture {
  decider: SwitchDecider;
  order: LNode[][];
  u: LNode;
  l: LNode;
}

/** Layers [a, b] | [u, l] with the west edges b-u and a-l (u above l is the crossed order), or a-u and b-l. */
function crossingFixture(oneSided: boolean, tweak: (u: LNode, l: LNode) => void = () => {}, crossed = true): Fixture {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  graph.setProperty(InternalProperties.RANDOM, new Random(1));
  const leftLayer = addLayer(graph);
  const freeLayer = addLayer(graph);
  const make = (layer: typeof leftLayer, side: PortSide): { node: LNode; port: ReturnType<typeof addPort> } => {
    const node = addNode(graph);
    node.setLayer(layer);
    const port = addPort(node, side);
    node.cachePortSides();
    return { node, port };
  };
  const a = make(leftLayer, PortSide.EAST);
  const b = make(leftLayer, PortSide.EAST);
  const u = make(freeLayer, PortSide.WEST);
  const l = make(freeLayer, PortSide.WEST);
  connect(crossed ? b.port : a.port, u.port);
  connect(crossed ? a.port : b.port, l.port);
  tweak(u.node, l.node);
  const order = [
    [a.node, b.node],
    [u.node, l.node],
  ];
  const type = oneSided ? CrossMinType.ONE_SIDED_GREEDY_SWITCH : CrossMinType.TWO_SIDED_GREEDY_SWITCH;
  const holder = new GraphInfoHolder(graph, type, []);
  u.node.id = 0;
  l.node.id = 1;
  const filler = new CrossingMatrixFiller(type, order, 1, CrossingCountSide.WEST);
  const decider = new SwitchDecider(1, order, filler, holder.portPositions(), { graphData: holder, oneSided });
  return { decider, order, u: u.node, l: l.node };
}

describe('SwitchDecider', () => {
  // the list default of IN_LAYER_SUCCESSOR_CONSTRAINTS needs the ElkReflect registrations
  beforeAll(() => LayoutMetaDataService.initElkReflect());

  it('rejects a free layer index outside the graph with the Java IndexOutOfBoundsException (java:68-70)', () => {
    const { order, u } = crossingFixture(true);
    const holder = new GraphInfoHolder(u.getGraph()!, CrossMinType.ONE_SIDED_GREEDY_SWITCH, []);
    const filler = new CrossingMatrixFiller(CrossMinType.ONE_SIDED_GREEDY_SWITCH, order, 1, CrossingCountSide.WEST);
    const create = (): SwitchDecider =>
      new SwitchDecider(2, order, filler, holder.portPositions(), { graphData: holder, oneSided: true });
    expect(create).toThrow(IndexOutOfBoundsException);
    expect(create).toThrow('Greedy SwitchDecider: Free layer not in graph.');
  });

  it('switches the crossed pair and keeps the uncrossed one, one-sided and two-sided', () => {
    for (const oneSided of [true, false]) {
      // index 0 is u, index 1 is l: u above l crosses once, so the switch reduces crossings
      expect(crossingFixture(oneSided).decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
      // the uncrossed order would get a crossing from a switch
      expect(crossingFixture(oneSided, () => {}, false).decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    }
  });

  it('does not switch nodes that are in each other successor constraints (java:180-186)', () => {
    const { decider } = crossingFixture(true, (u, l) =>
      u.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [l]),
    );
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('does not switch nodes of different layout units when one belongs to a multi-node unit (java:188-216)', () => {
    const { decider } = crossingFixture(true, (u) => {
      u.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, addNode(u.getGraph()!));
    });
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('lets a long edge dummy leave its layout unit (java:189-191)', () => {
    const { decider } = crossingFixture(true, (u, l) => {
      u.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, addNode(u.getGraph()!));
      l.setType(NodeType.LONG_EDGE);
    });
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
  });

  it('does not switch a node with edges on its northern side with a lower node (java:200-211)', () => {
    const { decider } = crossingFixture(true, (u) => {
      const north = addPort(u, PortSide.NORTH);
      connect(north, addPort(addNode(u.getGraph()!), PortSide.SOUTH));
      u.getPorts().sort((x, y) => x.getSide().ordinal() - y.getSide().ordinal());
      u.cachePortSides();
    });
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('does not switch a port dummy side with a node that has southern edges, even without edges (java:218-227)', () => {
    const { decider } = crossingFixture(true, (u, l) => {
      const south = addPort(l, PortSide.SOUTH);
      south.setProperty(InternalProperties.PORT_DUMMY, u);
      l.getPorts().sort((x, y) => x.getSide().ordinal() - y.getSide().ordinal());
      l.cachePortSides();
    });
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('does not switch a normal node with a north-south port dummy (java:233-244)', () => {
    const { decider } = crossingFixture(true, (u) => u.setType(NodeType.NORTH_SOUTH_PORT));
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(1, 0)).toBe(false);
  });

  it('notifies its in-layer counters of a switch without changing the verdict on the cross-layer edges', () => {
    const { decider, order, u, l } = crossingFixture(true);
    decider.notifyOfSwitch(u, l);
    order[1]!.reverse();
    // after the switch l is index 0: l above u does not cross
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });
});
