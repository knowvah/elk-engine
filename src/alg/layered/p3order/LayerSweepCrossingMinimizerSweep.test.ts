// SPDX-License-Identifier: EPL-2.0
// The hierarchical sweep of LayerSweepCrossingMinimizer (java:450-503; mission 7c, T7) on a hand-built nested graph:
// no oracle row nests graphs, so `sweepInHierarchicalNodes`, `sweepInHierarchicalNode` and the recursion of
// `countCurrentNumberOfCrossings` are U for the rows until 7h. The checks are the invariants the Java guarantees
// whatever the random sweep direction is: the layout is a permutation of the input, the ports of the host node are a
// permutation of its ports, and every graph that was swept holds a best copy of its order.
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { HierarchyHandling } from '../../../core/options/HierarchyHandling.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { Random } from '../../../java/util/Random.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayerSweepCrossingMinimizer } from './LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import {
  countCurrentNumberOfCrossings,
  countCurrentNumberOfCrossingsNodePortOrder,
} from './LayerSweepCrossingMinimizerCounting.js';

beforeAll(() => LayoutMetaDataService.initElkReflect());

interface Nested {
  root: LGraph;
  child: LGraph;
  host: LNode;
  hostPorts: LPort[];
  childNodes: LNode[];
  /** The external dummies of the east ports in layer 2 and of the west ports in layer 0, in their input order. */
  eastDummies: LNode[];
  westDummies: LNode[];
}

function seededGraph(): LGraph {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  graph.setProperty(InternalProperties.RANDOM, new Random(1));
  graph.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
  return graph;
}

/**
 * A root graph with one host node H in its only layer; H has two hierarchical west ports and two hierarchical east
 * ports. Its nested graph has the external dummies of the west ports in layer 0, two normal nodes in layer 1 (each fed
 * by one west dummy and feeding one east dummy) and the external dummies of the east ports in layer 2.
 */
function nested(crossed: 'none' | 'east' | 'west' = 'none', bottomUpWithExternalPorts = false): Nested {
  const root = seededGraph();
  root.id = 0;
  const host = addNode(root);
  host.setLayer(addLayer(root));
  const sides = [PortSide.EAST, PortSide.EAST, PortSide.WEST, PortSide.WEST];
  const hostPorts = sides.map((side) => addPort(host, side));
  hostPorts.forEach((port) => port.setProperty(InternalProperties.INSIDE_CONNECTIONS, true));
  host.cachePortSides();

  const child = seededGraph();
  if (bottomUpWithExternalPorts) {
    // the chain's quotient is -1, which the boundary -1 reaches: the child is swept bottom-up (LayerSweepTypeDecider.java:134)
    child.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.EXTERNAL_PORTS));
    child.setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1);
  }
  child.setParentNode(host);
  host.setNestedGraph(child);
  const layers = [addLayer(child), addLayer(child), addLayer(child)];
  const dummy = (layer: number, origin: LPort, side: PortSide): { node: LNode; port: LPort } => {
    const node = addNode(child, NodeType.EXTERNAL_PORT);
    node.setLayer(layers[layer]!);
    node.setProperty(InternalProperties.ORIGIN, origin);
    origin.setProperty(InternalProperties.PORT_DUMMY, node);
    const port = addPort(node, side);
    node.cachePortSides();
    return { node, port };
  };
  const normal = (): { node: LNode; west: LPort; east: LPort } => {
    const node = addNode(child);
    node.setLayer(layers[1]!);
    const east = addPort(node, PortSide.EAST);
    const west = addPort(node, PortSide.WEST);
    node.cachePortSides();
    return { node, west, east };
  };
  const [w1, w2] = [dummy(0, hostPorts[2]!, PortSide.EAST), dummy(0, hostPorts[3]!, PortSide.EAST)];
  const [n1, n2] = [normal(), normal()];
  const [e1, e2] = [dummy(2, hostPorts[0]!, PortSide.WEST), dummy(2, hostPorts[1]!, PortSide.WEST)];
  connect(w1.port, (crossed === 'west' ? n2 : n1).west);
  connect(w2.port, (crossed === 'west' ? n1 : n2).west);
  connect(n1.east, (crossed === 'east' ? e2 : e1).port);
  connect(n2.east, (crossed === 'east' ? e1 : e2).port);
  return {
    root,
    child,
    host,
    hostPorts,
    childNodes: [w1.node, w2.node, n1.node, n2.node, e1.node, e2.node],
    eastDummies: [e1.node, e2.node],
    westDummies: [w1.node, w2.node],
  };
}

/** A root graph with a host node (two east ports, so that the child is not sent bottom-up for having few ports). */
function hostPlain(): { root: LGraph; host: LNode } {
  const root = seededGraph();
  root.id = 0;
  const host = addNode(root);
  host.setLayer(addLayer(root));
  addPort(host, PortSide.EAST);
  addPort(host, PortSide.EAST);
  host.cachePortSides();
  return { root, host };
}

describe('the hierarchical sweep (hand-built nested graph; U for the rows until 7h)', () => {
  it('sweeps into a deterministic child, keeps every node and port, and holds a best copy for both graphs', () => {
    const { root, child, host, hostPorts, childNodes } = nested();
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.MEDIAN);
    phase.process(root, new NullElkProgressMonitor());

    const holders = phase.getGraphData()!;
    expect(holders.map((holder) => holder.lGraph())).toEqual([root, child]);
    // the root is swept bottom-up, the child from within the root's sweep (hierarchical)
    expect(holders.map((holder) => holder.dontSweepInto())).toEqual([true, false]);
    expect(holders.map((holder) => holder.currentlyBestNodeAndPortOrder() !== null)).toEqual([true, true]);
    expect(
      child
        .getLayers()
        .flatMap((layer) => layer.getNodes())
        .sort((a, b) => a.id - b.id),
    ).toHaveLength(6);
    expect(new Set(child.getLayers().flatMap((layer) => layer.getNodes()))).toEqual(new Set(childNodes));
    expect(new Set(host.getPorts())).toEqual(new Set(hostPorts));
  });

  it('sweeps a child with crossed east dummies: the root greedy port distributor and the child switch run (exercise)', () => {
    // The resulting orders are algorithmic outcomes: an oracle row of mission 7h proves them (L4, U until 7h). Here only
    // the invariants the Java guarantees are asserted: every port and dummy survives as a permutation and both graphs
    // hold a best copy.
    const { root, child, host, hostPorts, eastDummies } = nested('east');
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
    phase.process(root, new NullElkProgressMonitor());
    expect(phase.getGraphData()!.map((holder) => holder.dontSweepInto())).toEqual([true, false]);
    expect(new Set(host.getPorts())).toEqual(new Set(hostPorts));
    expect(new Set(child.getLayers()[2]!.getNodes())).toEqual(new Set(eastDummies));
    expect(phase.getGraphData()!.map((holder) => holder.currentlyBestNodeAndPortOrder() !== null)).toEqual([
      true,
      true,
    ]);
  });

  it('sweeps a child with crossed west dummies: the child greedy switch meets a parent port counter (exercise)', () => {
    // As above: the orders are 7h's to prove; only the permutation invariants are asserted here.
    const { root, child, host, hostPorts, westDummies } = nested('west');
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
    phase.process(root, new NullElkProgressMonitor());
    expect(new Set(child.getLayers()[0]!.getNodes())).toEqual(new Set(westDummies));
    expect(new Set(host.getPorts())).toEqual(new Set(hostPorts));
    expect(phase.getGraphData()!.map((holder) => holder.currentlyBestNodeAndPortOrder() !== null)).toEqual([
      true,
      true,
    ]);
  });

  it('starts the sweep of a child without external port dummies with the heuristic of the child (java:491-497)', () => {
    const host = hostPlain();
    const child = seededGraph();
    child.setParentNode(host.host);
    host.host.setNestedGraph(child);
    const layers = [addLayer(child), addLayer(child)];
    const nodes = layers.map((layer) => {
      const node = addNode(child);
      node.setLayer(layer);
      return { node, port: addPort(node, layer === layers[0] ? PortSide.EAST : PortSide.WEST) };
    });
    connect(nodes[0]!.port, nodes[1]!.port);
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.MEDIAN);
    phase.process(host.root, new NullElkProgressMonitor());
    expect(phase.getGraphData()!.map((holder) => holder.dontSweepInto())).toEqual([true, false]);
    expect(child.getLayers().map((layer) => layer.getNodes())).toEqual(nodes.map(({ node }) => [node]));
  });

  it('fixes the port order of the parent node after a bottom-up child with external ports (java:162-171)', () => {
    const { root, child, host, hostPorts } = nested('none', true);
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER);
    phase.process(root, new NullElkProgressMonitor());
    expect(phase.getGraphData()!.map((holder) => [holder.lGraph(), holder.dontSweepInto()])).toEqual([
      [root, true],
      [child, true],
    ]);
    expect(host.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
    expect(new Set(host.getPorts())).toEqual(new Set(hostPorts));
  });

  it('counts the crossings of a graph hierarchically: its own plus those of every child swept into (java:392-411)', () => {
    const { root } = nested();
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.MEDIAN);
    phase.process(root, new NullElkProgressMonitor());
    const holders = phase.getGraphData()!;
    const own = holders.map((holder) => holder.crossCounter().countAllCrossings(holder.currentNodeOrder()));
    expect(countCurrentNumberOfCrossings(holders, holders[0]!)).toBe(own[0]! + own[1]!);
    expect(countCurrentNumberOfCrossings(holders, holders[1]!)).toBe(own[1]);
    // with no model order considered the node/port-order variant adds the same child count (java:415-446)
    expect(countCurrentNumberOfCrossingsNodePortOrder(holders, holders[0]!)).toBe(own[0]! + own[1]!);
  });
});
