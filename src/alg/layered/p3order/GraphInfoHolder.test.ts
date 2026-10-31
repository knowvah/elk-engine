// SPDX-License-Identifier: EPL-2.0
// Unit cases of GraphInfoHolder (mission 7c, T7) from GraphInfoHolder.java:80-288. The root-graph path is also proved
// by every replay of LayerSweepCrossingMinimizer.test.ts; the child-graph path (`childGraphs`, `parentGraphData`) is
// built by hand here, as no oracle row nests graphs (U until 7h).
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { Random } from '../../../java/util/Random.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { GreedySwitchHeuristic } from '../intermediate/greedyswitch/GreedySwitchHeuristic.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { BarycenterHeuristic } from './BarycenterHeuristic.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { MedianHeuristic } from './MedianHeuristic.js';
import { ModelOrderBarycenterHeuristic } from './ModelOrderBarycenterHeuristic.js';
import { SweepCopy } from './SweepCopy.js';

beforeAll(() => LayoutMetaDataService.initElkReflect());

interface Fixture {
  graph: LGraph;
  order: LNode[][];
}

/** Layers [a, b] | [u, l] with the edges b-u and a-l (four ports in all); `RANDOM` is seeded with 1. */
function crossing(graphProperties: EnumSet<GraphProperties> = EnumSet.noneOf(GraphProperties)): Fixture {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, graphProperties);
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
  connect(b.port, u.port);
  connect(a.port, l.port);
  return {
    graph,
    order: [
      [a.node, b.node],
      [u.node, l.node],
    ],
  };
}

describe('GraphInfoHolder: the heuristic chosen by the CrossMinType (java:100-116)', () => {
  it('BARYCENTER builds the barycenter heuristic, which is random and not always improving', () => {
    const holder = new GraphInfoHolder(crossing().graph, CrossMinType.BARYCENTER, []);
    expect(holder.crossMinimizer().constructor).toBe(BarycenterHeuristic);
    expect([holder.crossMinDeterministic(), holder.crossMinAlwaysImproves()]).toEqual([false, false]);
  });

  it('BARYCENTER with CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER builds the model-order barycenter heuristic', () => {
    const { graph } = crossing();
    graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, true);
    const holder = new GraphInfoHolder(graph, CrossMinType.BARYCENTER, []);
    expect(holder.crossMinimizer().constructor).toBe(ModelOrderBarycenterHeuristic);
  });

  it('MEDIAN builds the median heuristic, which is deterministic and not always improving', () => {
    const holder = new GraphInfoHolder(crossing().graph, CrossMinType.MEDIAN, []);
    expect(holder.crossMinimizer()).toBeInstanceOf(MedianHeuristic);
    expect([holder.crossMinDeterministic(), holder.crossMinAlwaysImproves()]).toEqual([true, false]);
  });

  it('the greedy types build the greedy switch heuristic with the matching improvement flag', () => {
    const oneSided = new GraphInfoHolder(crossing().graph, CrossMinType.ONE_SIDED_GREEDY_SWITCH, []);
    const twoSided = new GraphInfoHolder(crossing().graph, CrossMinType.TWO_SIDED_GREEDY_SWITCH, []);
    expect(oneSided.crossMinimizer()).toBeInstanceOf(GreedySwitchHeuristic);
    expect(twoSided.crossMinimizer()).toBeInstanceOf(GreedySwitchHeuristic);
    expect([oneSided.crossMinAlwaysImproves(), twoSided.crossMinAlwaysImproves()]).toEqual([false, true]);
  });
});

describe('GraphInfoHolder: a root graph', () => {
  it('has no parent, sweeps bottom-up, and keeps the node order of the graph', () => {
    const { graph, order } = crossing();
    const holder = new GraphInfoHolder(graph, CrossMinType.BARYCENTER, []);
    expect(holder.lGraph()).toBe(graph);
    expect(holder.currentNodeOrder()).toEqual(order);
    expect([holder.hasParent(), holder.parent(), holder.parentGraphData()]).toEqual([false, null, null]);
    expect(holder.dontSweepInto()).toBe(true);
    expect(holder.childGraphs()).toEqual([]);
    expect(holder.hasExternalPorts()).toBe(false);
  });

  it('reads the EXTERNAL_PORTS graph property', () => {
    const { graph } = crossing(EnumSet.of(GraphProperties.EXTERNAL_PORTS));
    expect(new GraphInfoHolder(graph, CrossMinType.BARYCENTER, []).hasExternalPorts()).toBe(true);
  });

  it('sizes the port position array to the number of ports', () => {
    const holder = new GraphInfoHolder(crossing().graph, CrossMinType.MEDIAN, []);
    expect(holder.portPositions().length).toBe(4);
  });

  it('prints its node order as Arrays.deepToString does', () => {
    const { graph, order } = crossing();
    const holder = new GraphInfoHolder(graph, CrossMinType.MEDIAN, []);
    const names = order.map((layer) => `[${layer.map((node) => node.toString()).join(', ')}]`);
    expect(holder.toString()).toBe(`[${names.join(', ')}]`);
  });

  it('initialises the layer and node ids the counters index by', () => {
    const { graph, order } = crossing();
    new GraphInfoHolder(graph, CrossMinType.MEDIAN, []);
    expect(graph.getLayers().map((layer) => layer.id)).toEqual([0, 1]);
    expect(order.map((layer) => layer.map((node) => node.id))).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it('answers the best sweep from the current copy when the heuristic is deterministic, else from the best copy', () => {
    const median = new GraphInfoHolder(crossing().graph, CrossMinType.MEDIAN, []);
    const barycenter = new GraphInfoHolder(crossing().graph, CrossMinType.BARYCENTER, []);
    expect([median.getBestSweep(), barycenter.getBestSweep()]).toEqual([null, null]);
    for (const holder of [median, barycenter]) {
      const current = new SweepCopy(holder.currentNodeOrder());
      const best = new SweepCopy(holder.currentNodeOrder());
      holder.setCurrentlyBestNodeAndPortOrder(current);
      holder.setBestNodeNPortOrder(best);
      expect(holder.currentlyBestNodeAndPortOrder()).toBe(current);
      expect(holder.bestNodeNPortOrder()).toBe(best);
    }
    expect(median.getBestSweep()).toBe(median.currentlyBestNodeAndPortOrder());
    expect(barycenter.getBestSweep()).toBe(barycenter.bestNodeNPortOrder());
  });

  it('counts crossings with its own counter and distributes ports with its own distributor', () => {
    const holder = new GraphInfoHolder(crossing().graph, CrossMinType.MEDIAN, []);
    expect(holder.crossCounter().countAllCrossings(holder.currentNodeOrder())).toBe(1);
    expect(holder.portDistributor().distributePortsWhileSweeping(holder.currentNodeOrder(), 0, true)).toBe(false);
  });
});

describe('GraphInfoHolder: a graph nested in a node (hand-built; U until 7h)', () => {
  it('collects the nested graph of a node as a child graph, and the child finds its parent holder', () => {
    const { graph: root } = crossing();
    root.id = 0;
    const host = root.getLayers()[1]!.getNodes()[0]!;
    const child = new LGraph();
    child.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    child.setProperty(InternalProperties.RANDOM, new Random(1));
    child.setParentNode(host);
    host.setNestedGraph(child);
    const rootHolder = new GraphInfoHolder(root, CrossMinType.MEDIAN, []);
    expect(rootHolder.childGraphs()).toEqual([child]);

    const childHolder = new GraphInfoHolder(child, CrossMinType.MEDIAN, [rootHolder]);
    expect(childHolder.hasParent()).toBe(true);
    expect(childHolder.parent()).toBe(host);
    expect(childHolder.parentGraphData()).toBe(rootHolder);
    // the host node has no ports, so the type decider sends the child bottom-up (LayerSweepTypeDecider.java:177-180)
    expect(childHolder.dontSweepInto()).toBe(true);
  });
});
