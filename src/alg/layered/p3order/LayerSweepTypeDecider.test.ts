// SPDX-License-Identifier: EPL-2.0
// Unit cases of LayerSweepTypeDecider (mission 7c, T7), decided by hand from LayerSweepTypeDecider.java:66-136: on the
// root graphs of the oracle rows it only reaches `rootNode()` (every LayerSweepCrossingMinimizer row passes through
// it), the other branches need a nested graph and are U for the rows until 7h. Each nested graph below is built by hand
// with the counts worked out in the comment of its case.
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { Random } from '../../../java/util/Random.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { LayerSweepTypeDeciderNodeInfo as NodeInfo } from './LayerSweepTypeDeciderNodeInfo.js';

beforeAll(() => LayoutMetaDataService.initElkReflect());

interface Host {
  rootHolder: GraphInfoHolder;
  host: LNode;
  east: LPort[];
  west: LPort[];
}

/** A root graph holding one host node with the given numbers of east and west ports, and the root's holder. */
function hostWith(eastPorts: number, westPorts: number): Host {
  const root = new LGraph();
  root.id = 0;
  root.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  root.setProperty(InternalProperties.RANDOM, new Random(1));
  const host = addNode(root);
  host.setLayer(addLayer(root));
  const east = Array.from({ length: eastPorts }, () => addPort(host, PortSide.EAST));
  const west = Array.from({ length: westPorts }, () => addPort(host, PortSide.WEST));
  host.cachePortSides();
  return { rootHolder: new GraphInfoHolder(root, CrossMinType.BARYCENTER, []), host, east, west };
}

class Child {
  readonly graph = new LGraph();
  private readonly layers: Layer[] = [];

  constructor(host: LNode) {
    this.graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    this.graph.setProperty(InternalProperties.RANDOM, new Random(1));
    this.graph.setParentNode(host);
    host.setNestedGraph(this.graph);
  }

  /** A node of `type` in layer `index`, with one port per side given (sides in clockwise order). */
  node(index: number, type: NodeType, sides: readonly PortSide[], origin?: LPort): { node: LNode; ports: LPort[] } {
    while (this.layers.length <= index) {
      this.layers.push(addLayer(this.graph));
    }
    const node = addNode(this.graph, type);
    node.setLayer(this.layers[index]!);
    const ports = sides.map((side) => addPort(node, side));
    node.cachePortSides();
    if (origin !== undefined) {
      node.setProperty(InternalProperties.ORIGIN, origin);
    }
    return { node, ports };
  }

  holder(type: CrossMinType, rootHolder: GraphInfoHolder): GraphInfoHolder {
    return new GraphInfoHolder(this.graph, type, [rootHolder]);
  }
}

/**
 * The child of a host with two east ports: external dummies W (origin: a west port) and E (origin: an east port) with a
 * normal node N between them, W -> N -> E. Count (java:80-136): W has hierarchical influence 1, its edge makes
 * pathsToHierarchical 1 and N influence 1; N's edge makes it 2 and gives E influence 1 and connectedEdges 2; E is
 * eastern, so pathsToHierarchical += 2 = 4. pathsToRandom is 0: (0 - 4) / 4 = -1.
 */
function chain(host: Host): Child {
  const child = new Child(host.host);
  const w = child.node(0, NodeType.EXTERNAL_PORT, [PortSide.EAST], host.west[0]);
  const n = child.node(1, NodeType.NORMAL, [PortSide.EAST, PortSide.WEST]);
  const e = child.node(2, NodeType.EXTERNAL_PORT, [PortSide.WEST], host.east[0]);
  connect(w.ports[0]!, n.ports[1]!);
  connect(n.ports[0]!, e.ports[0]!);
  return child;
}

describe('LayerSweepTypeDecider on a root graph', () => {
  it('sweeps bottom-up: the root has no parent (java:182-184)', () => {
    const { rootHolder } = hostWith(2, 1);
    expect(rootHolder.dontSweepInto()).toBe(true);
  });

  it('sweeps bottom-up when the sweepiness boundary is below -1, whatever the graph (java:186-188)', () => {
    const host = hostWith(2, 1);
    const child = chain(host);
    child.graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -2);
    expect(child.holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
  });
});

describe('LayerSweepTypeDecider on a nested graph (hand-built; U for the rows until 7h)', () => {
  it('sweeps into a chain of hierarchical paths: -1 is below the default boundary 0.1', () => {
    const host = hostWith(2, 1);
    expect(chain(host).holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(false);
  });

  it('compares with >=: the boundary -1 equals the normalised -1 of the chain, so it goes bottom-up', () => {
    const host = hostWith(2, 1);
    const child = chain(host);
    child.graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1);
    expect(child.holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
  });

  it('sweeps bottom-up when the parent node has a fixed port order (java:140-142)', () => {
    const host = hostWith(2, 1);
    host.host.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    expect(chain(host).holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
  });

  it('sweeps bottom-up when the parent node has fewer than two ports on both east and west (java:177-180)', () => {
    const host = hostWith(1, 1);
    expect(chain(host).holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
    // two west ports are enough to go on: the && of the two sides is false
    const wide = hostWith(1, 2);
    expect(chain(wide).holder(CrossMinType.BARYCENTER, wide.rootHolder).dontSweepInto()).toBe(false);
  });

  it('never counts paths for a deterministic heuristic, which sweeps into the graph (java:72-74)', () => {
    const host = hostWith(2, 1);
    expect(chain(host).holder(CrossMinType.MEDIAN, host.rootHolder).dontSweepInto()).toBe(false);
  });

  it('sweeps bottom-up when no path was counted: the quotient is +Infinity (java:132-134)', () => {
    const host = hostWith(2, 1);
    const child = new Child(host.host);
    child.node(0, NodeType.NORMAL, []);
    expect(child.holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
  });

  it('sweeps bottom-up on random paths only: N1 -> N2 counts 2 random paths, quotient 1 (java:94-122)', () => {
    // N1 has no west port (random influence 1; its edge: pathsToRandom 1; N2 gets influence 1 and connectedEdges 1);
    // N2 has no east port, so pathsToRandom += its connectedEdges: 2. (2 - 0) / 2 = 1 >= 0.1
    const host = hostWith(2, 1);
    const child = new Child(host.host);
    const n1 = child.node(0, NodeType.NORMAL, [PortSide.EAST]);
    const n2 = child.node(1, NodeType.NORMAL, [PortSide.WEST]);
    connect(n1.ports[0]!, n2.ports[0]!);
    expect(child.holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
  });

  describe('with a north-south port dummy', () => {
    /**
     * Layer 0: external dummy W, normal node N (north port with PORT_DUMMY D, west port fed by W), dummy D; layer 1: M
     * fed by D. Count: W: pathsToHierarchical 1, N influence 1/connected 1. N: no east port, pathsToRandom += 1; its
     * north port's dummy: pathsToHierarchical 2, D gets influence 1/connected 2. D is a north-south dummy: handled after
     * the layer: pathsToHierarchical 3, M gets influence 1/connected 3. M has no east port: pathsToRandom += 3, so 4.
     * 4 random and 3 hierarchical paths: the quotient is 1/7 = 0.1428...
     */
    function withDummy(host: Host): Child {
      const child = new Child(host.host);
      const w = child.node(0, NodeType.EXTERNAL_PORT, [PortSide.EAST], host.west[0]);
      const n = child.node(0, NodeType.NORMAL, [PortSide.NORTH, PortSide.WEST]);
      const d = child.node(0, NodeType.NORTH_SOUTH_PORT, [PortSide.EAST]);
      const m = child.node(1, NodeType.NORMAL, [PortSide.WEST]);
      n.ports[0]!.setProperty(InternalProperties.PORT_DUMMY, d.node);
      connect(w.ports[0]!, n.ports[1]!);
      connect(d.ports[0]!, m.ports[0]!);
      return child;
    }

    it('sweeps bottom-up for the default boundary 0.1, which the quotient 1/7 reaches', () => {
      const host = hostWith(2, 1);
      expect(withDummy(host).holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(true);
    });

    it('sweeps into the graph for the boundary 0.15, which the quotient 1/7 does not reach', () => {
      const host = hostWith(2, 1);
      const child = withDummy(host);
      child.graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.15);
      expect(child.holder(CrossMinType.BARYCENTER, host.rootHolder).dontSweepInto()).toBe(false);
    });
  });
});

describe('LayerSweepTypeDeciderNodeInfo', () => {
  it('transfers the three counters of another node by adding them', () => {
    const target = new NodeInfo();
    target.connectedEdges = 1;
    const source = new NodeInfo();
    source.connectedEdges = 2;
    source.hierarchicalInfluence = 3;
    source.randomInfluence = 4;
    target.transfer(source);
    expect([target.connectedEdges, target.hierarchicalInfluence, target.randomInfluence]).toEqual([3, 3, 4]);
  });

  it('prints its counters as the Java toString does (java:171-175)', () => {
    expect(new NodeInfo().toString()).toBe('NodeInfo [connectedEdges=0, hierarchicalInfluence=0, randomInfluence=0]');
  });
});
