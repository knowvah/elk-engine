// SPDX-License-Identifier: EPL-2.0
// Unit cases of BarycenterHeuristic (mission 7c, T6): graphs are built from the pre-P3 steps of layered-order.json
// rows or by the structural builders; the sweep that proves the oracle orders is T7's replay. Expectations are the
// Java formulas, a verbatim recursive twin of `calculateBarycenter` (C7) and the values the Java defines (L4).
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../core/options/PortSide.js';
import * as Float32 from '../../../java/lang/Float32.js';
import { ClassCastException } from '../../../java/lang/ClassCastException.js';
import { Random } from '../../../java/util/Random.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InvertedPortProcessor } from '../intermediate/InvertedPortProcessor.js';
import { LongEdgeSplitter } from '../intermediate/LongEdgeSplitter.js';
import { PortListSorter } from '../intermediate/PortListSorter.js';
import { PortSideProcessor } from '../intermediate/PortSideProcessor.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { PortType } from '../options/PortType.js';
import { BarycenterHeuristic } from './BarycenterHeuristic.js';
import type { BarycenterHeuristicBarycenterState } from './BarycenterHeuristicBarycenterState.js';
import { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import { init } from './counting/IInitializable.js';
import { LayerTotalPortDistributor } from './LayerTotalPortDistributor.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';
import type { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const SEED = 1;
const RANDOM_AMOUNT = Float32.fromDouble(0.07);
/** The processors of the row prefixes that are ported (T4a); rows that run another one are not used here. */
const AVAILABLE = new Set(['LONG_EDGE_SPLITTER', 'PORT_SIDE_PROCESSOR', 'INVERTED_PORT_PROCESSOR', 'PORT_LIST_SORTER']);

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      default:
        throw new Error(`processor ${name} is not available to this test`);
    }
  },
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

const allRows = loadOrderRows(ROWS_FILE);

function isP3(op: string, phase: unknown): boolean {
  return op === 'runPhase' && phase === 'P3_NODE_ORDERING';
}

/** The step rows of the LayerSweep scenarios whose steps before P3 only run ported processors. */
const sweepRows: readonly OrderRow[] = allRows.filter(
  (row) =>
    row.id.startsWith('scenarios/LayerSweep/') &&
    row.steps !== null &&
    row.steps.every(([op, name]) => op !== 'runProcessor' || AVAILABLE.has(name as string)) &&
    row.steps.every(([op, name]) => op !== 'layers' && (!isP3(op, name) || op === 'runPhase')),
);

/** The graph of a step row as it enters P3: the row's steps without the P3 phase and the dump. */
function preP3Graph(id: string): LGraph {
  const row = allRows.find((candidate) => candidate.id === id)!;
  const steps = row.steps!.filter(([op, phase]) => op !== 'dump' && !isP3(op, phase));
  return runSteps({ ...row, steps }, factories);
}

interface Setup {
  readonly order: LNode[][];
  readonly distributor: AbstractBarycenterPortDistributor;
  readonly resolver: ForsterConstraintResolver;
  readonly heuristic: Probe;
}

/** The BARYCENTER branch of `GraphInfoHolder`'s constructor (GraphInfoHolder.java:100-105, 120) on `order`. */
function setupOn(order: LNode[][], distributorOf: (layers: number) => AbstractBarycenterPortDistributor): Setup {
  const distributor = distributorOf(order.length);
  const resolver = new ForsterConstraintResolver(order);
  const heuristic = new Probe(resolver, new Random(SEED), distributor, order);
  init([distributor, resolver, heuristic], order);
  return { order, distributor, resolver, heuristic };
}

const nodeRelative = (layers: number): AbstractBarycenterPortDistributor => new NodeRelativePortDistributor(layers);
const layerTotal = (layers: number): AbstractBarycenterPortDistributor => new LayerTotalPortDistributor(layers);

/** Exposes the protected members and holds the verbatim recursive twin of `calculateBarycenter` (C7). */
class Probe extends BarycenterHeuristic {
  states(node: LNode): BarycenterHeuristicBarycenterState {
    return this.stateOf(node);
  }

  production(nodes: LNode[], forward: boolean): void {
    this.calculateBarycenters(nodes, forward);
  }

  fillIn(nodes: LNode[], preOrdered: boolean): void {
    this.fillInUnknownBarycenters(nodes, preOrdered);
  }

  randomizeProbe(nodes: LNode[]): void {
    this.randomizeBarycenters(nodes);
  }

  portRanksOf(): Float32Array {
    return this.portRanks;
  }

  /** `BarycenterHeuristic.java:191-199` with the recursive `calculateBarycenter` below. */
  twin(nodes: LNode[], forward: boolean): void {
    for (const node of nodes) {
      this.stateOf(node).visited = false;
    }
    for (const node of nodes) {
      this.twinOne(node, forward);
    }
  }

  /** `BarycenterHeuristic.java:218-283`, recursion kept. */
  private twinOne(node: LNode, forward: boolean): void {
    if (this.stateOf(node).visited) {
      return;
    } else {
      this.stateOf(node).visited = true;
    }
    this.stateOf(node).degree = 0;
    this.stateOf(node).summedWeight = 0.0;
    this.stateOf(node).barycenter = null;
    for (const freePort of node.getPorts()) {
      const portIterable = forward ? freePort.getPredecessorPorts() : freePort.getSuccessorPorts();
      for (const fixedPort of portIterable) {
        const fixedNode = fixedPort.getNode()!;
        if (fixedNode.getLayer() === node.getLayer()) {
          if (fixedNode !== node) {
            this.twinOne(fixedNode, forward);
            this.stateOf(node).degree += this.stateOf(fixedNode).degree;
            this.stateOf(node).summedWeight += this.stateOf(fixedNode).summedWeight;
          }
        } else {
          this.stateOf(node).summedWeight += this.portRanks[fixedPort.id]!;
          this.stateOf(node).degree++;
        }
      }
    }
    const barycenterAssociates: LNode[] | null = node.getProperty(InternalProperties.BARYCENTER_ASSOCIATES);
    if (barycenterAssociates !== null) {
      for (const associate of barycenterAssociates) {
        if (node.getLayer() === associate.getLayer()) {
          this.twinOne(associate, forward);
          this.stateOf(node).degree += this.stateOf(associate).degree;
          this.stateOf(node).summedWeight += this.stateOf(associate).summedWeight;
        }
      }
    }
    if (this.stateOf(node).degree > 0) {
      this.stateOf(node).summedWeight += Float32.sub(
        Float32.mul(this.random.nextFloat(), RANDOM_AMOUNT),
        Float32.div(RANDOM_AMOUNT, 2),
      );
      this.stateOf(node).barycenter = this.stateOf(node).summedWeight / this.stateOf(node).degree;
    }
  }
}

/** The state of every node, layer by layer, as plain values. */
function snapshot(setup: Setup): unknown[] {
  return setup.order.flatMap((layer) =>
    layer.map((node) => {
      const { degree, summedWeight, barycenter, visited } = setup.heuristic.states(node);
      return { degree, summedWeight, barycenter, visited };
    }),
  );
}

/** Computes the fixed layer's port ranks the way `minimizeCrossings` does before the barycenters. */
function rankFixedLayer(setup: Setup, freeLayer: number, forward: boolean): void {
  setup.distributor.calculatePortRanks(
    setup.order[forward ? freeLayer - 1 : freeLayer + 1]!,
    forward ? PortType.OUTPUT : PortType.INPUT,
  );
}

describe('BarycenterHeuristic: calculateBarycenter as an explicit stack (C7)', () => {
  it('finds the LayerSweep rows whose graphs this test can build', () => {
    expect(sweepRows.length).toBeGreaterThanOrEqual(10);
  });

  it.each(sweepRows.map((row) => [row.id] as const))('equals the recursive twin on %s, both directions', (id) => {
    const production = setupOn(preP3Graph(id).toNodeArray(), layerTotal);
    const twin = setupOn(preP3Graph(id).toNodeArray(), layerTotal);
    for (const forward of [true, false]) {
      for (let l = 0; l < production.order.length; l++) {
        const isStart = forward ? l === 0 : l === production.order.length - 1;
        if (!isStart) {
          rankFixedLayer(production, l, forward);
          rankFixedLayer(twin, l, forward);
          production.heuristic.production(production.order[l]!, forward);
          twin.heuristic.twin(twin.order[l]!, forward);
        }
      }
      expect(snapshot(production)).toEqual(snapshot(twin));
    }
  });

  /** A layer of three nodes with a barycenter associate, a self-loop and an in-layer edge between two of them. */
  function associateLayer(): Setup {
    const graph = new LGraph();
    const fixed = addLayer(graph);
    const free = addLayer(graph);
    const source = addNode(graph);
    source.setLayer(fixed);
    const sourcePort = addPort(source, PortSide.EAST);
    const nodes = [0, 1, 2].map(() => {
      const node = addNode(graph);
      node.setLayer(free);
      return node;
    });
    const west = nodes.map((node) => addPort(node, PortSide.WEST));
    const east = nodes.map((node) => addPort(node, PortSide.EAST));
    connect(sourcePort, west[0]!);
    connect(east[1]!, west[1]!); // a self-loop: ignored
    connect(east[1]!, west[2]!); // an in-layer edge from node 1 to node 2
    nodes[0]!.setProperty(InternalProperties.BARYCENTER_ASSOCIATES, [nodes[2]!, source]);
    return setupOn(graph.toNodeArray(), nodeRelative);
  }

  it('equals the twin with barycenter associates, a self-loop and an in-layer edge', () => {
    const production = associateLayer();
    const twin = associateLayer();
    rankFixedLayer(production, 1, true);
    rankFixedLayer(twin, 1, true);
    production.heuristic.production(production.order[1]!, true);
    twin.heuristic.twin(twin.order[1]!, true);
    expect(snapshot(production)).toEqual(snapshot(twin));
    // node 0 collected the rank of its fixed port and, through the associate in its layer, the state of node 2
    const states = production.order[1]!.map((node) => production.heuristic.states(node));
    expect(states[0]!.degree).toBe(states[2]!.degree + 1);
    expect(states[1]!.barycenter).toBeNull();
  });

  /** Layer one holds `source`; layer two holds a chain n0 -> n1 -> ... -> n(count-1) of in-layer edges, n0 fed by it. */
  function chainSetup(count: number): Setup {
    const graph = new LGraph();
    const fixed = addLayer(graph);
    const free = addLayer(graph);
    const source = addNode(graph);
    source.setLayer(fixed);
    const sourcePort = addPort(source, PortSide.EAST);
    let previousEast = sourcePort;
    for (let i = 0; i < count; i++) {
      const node = addNode(graph);
      node.setLayer(free);
      connect(previousEast, addPort(node, PortSide.WEST));
      previousEast = addPort(node, PortSide.EAST);
    }
    return setupOn(graph.toNodeArray(), nodeRelative);
  }

  it('calculates the barycenters of an in-layer chain of 5,000 nodes without recursion', () => {
    const count = 5000;
    const setup = chainSetup(count);
    const chain = setup.order[1]!;
    rankFixedLayer(setup, 1, true);
    // the last node first: the Java recursion would run count deep before the first node finishes
    setup.heuristic.production([...chain].reverse(), true);
    const draws = new Random(SEED);
    const rank = setup.heuristic.portRanksOf()[chain[0]!.getPorts()[0]!.getIncomingEdges()[0]!.getSource()!.id]!;
    let summedWeight = rank;
    chain.forEach((node, i) => {
      // post-order: the first node finishes first, each later one adds its own perturbation to its predecessor's sum
      summedWeight += Float32.sub(Float32.mul(draws.nextFloat(), RANDOM_AMOUNT), Float32.div(RANDOM_AMOUNT, 2));
      const state = setup.heuristic.states(node);
      expect(state.degree, `degree of node ${String(i)}`).toBe(1);
      expect(state.summedWeight, `summed weight of node ${String(i)}`).toBe(summedWeight);
      expect(state.barycenter, `barycenter of node ${String(i)}`).toBe(summedWeight / 1);
    });
  });
});

describe('BarycenterHeuristic: contracts of the Java constants', () => {
  it('reports that it is neither always improving nor deterministic', () => {
    const { heuristic } = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    expect([heuristic.alwaysImproves(), heuristic.isDeterministic()]).toEqual([false, false]);
  });

  it('wires the port ranks of the distributor and the states of the resolver after the traversal', () => {
    const { heuristic, distributor, resolver, order } = setupOn(
      preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(),
      nodeRelative,
    );
    expect(heuristic.portRanksOf()).toBe(distributor.getPortRanks());
    expect(heuristic.states(order[0]![0]!)).toBe(resolver.getBarycenterStates()[0]![0]);
    expect(order.map((layer) => layer[0]!.getLayer()!.id)).toEqual(order.map((_, l) => l));
  });

  it('gives a node without fixed neighbours no barycenter and a node with one its rank plus the perturbation', () => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    rankFixedLayer(setup, 1, true);
    const probe = new Random(SEED);
    setup.heuristic.production(setup.order[0]!, true);
    expect(setup.order[0]!.map((node) => setup.heuristic.states(node).barycenter)).toEqual(
      setup.order[0]!.map(() => null),
    );
    setup.heuristic.production(setup.order[1]!, true);
    const first = setup.heuristic.states(setup.order[1]![0]!);
    const ports = setup.order[1]![0]!.getPorts();
    const ranks = ports.flatMap((port) =>
      [...port.getPredecessorPorts()].map((p) => setup.heuristic.portRanksOf()[p.id]!),
    );
    const perturbation = Float32.sub(Float32.mul(probe.nextFloat(), RANDOM_AMOUNT), Float32.div(RANDOM_AMOUNT, 2));
    expect(first.degree).toBe(ranks.length);
    expect(first.barycenter).toBe(ranks.reduce((sum, rank) => sum + rank, 0 + perturbation) / ranks.length);
  });
});

describe('BarycenterHeuristic: fillInUnknownBarycenters and randomizeBarycenters', () => {
  /** Two layers of `count` edge-less nodes in the second one. */
  function plainLayer(count: number): Setup {
    const graph = new LGraph();
    addLayer(graph);
    const layer = addLayer(graph);
    const first = addNode(graph);
    first.setLayer(graph.getLayers()[0]!);
    addPort(first, PortSide.EAST);
    for (let i = 0; i < count; i++) {
      const node = addNode(graph);
      node.setLayer(layer);
      addPort(node, PortSide.WEST);
    }
    return setupOn(graph.toNodeArray(), nodeRelative);
  }

  it('fills the unknown barycenters of a pre-ordered layer from the neighbouring known values', () => {
    const { heuristic, order } = plainLayer(3);
    const nodes = order[1]!;
    heuristic.states(nodes[1]!).barycenter = 2;
    heuristic.fillIn(nodes, true);
    const nextAfterFirst = 2;
    const lastBefore = 2;
    const nextAfterLast = lastBefore + 1; // no later known value: lastValue + 1
    expect(nodes.map((node) => heuristic.states(node).barycenter)).toEqual([
      (-1 + nextAfterFirst) / 2,
      2,
      (lastBefore + nextAfterLast) / 2,
    ]);
    expect(nodes.map((node) => [heuristic.states(node).degree, heuristic.states(node).summedWeight])).toEqual([
      [1, (-1 + nextAfterFirst) / 2],
      [0, 0],
      [1, (lastBefore + nextAfterLast) / 2],
    ]);
  });

  it('places the unknown barycenters of an unordered layer randomly within the known maximum', () => {
    const { heuristic, order } = plainLayer(3);
    const nodes = order[1]!;
    heuristic.states(nodes[0]!).barycenter = 4;
    heuristic.fillIn(nodes, false);
    const draws = new Random(SEED);
    const maxBary = Math.max(0, 4) + 2;
    const expected = [4, draws.nextFloat() * maxBary - 1, draws.nextFloat() * maxBary - 1];
    expect(nodes.map((node) => heuristic.states(node).barycenter)).toEqual(expected);
    expect(heuristic.states(nodes[1]!).summedWeight).toBe(expected[1]);
    expect(heuristic.states(nodes[2]!).degree).toBe(1);
  });

  it('draws one double per node when randomizing and sets weight and degree', () => {
    const { heuristic, order } = plainLayer(2);
    const nodes = order[1]!;
    heuristic.randomizeProbe(nodes);
    const draws = new Random(SEED);
    const expected = [draws.nextDouble(), draws.nextDouble()];
    expect(nodes.map((node) => heuristic.states(node).barycenter)).toEqual(expected);
    expect(nodes.map((node) => heuristic.states(node).summedWeight)).toEqual(expected);
    expect(nodes.map((node) => heuristic.states(node).degree)).toEqual([1, 1]);
  });
});

describe('BarycenterHeuristic: setFirstLayerOrder and minimizeCrossings', () => {
  it.each([
    ['forward', true, 0],
    ['backward', false, 3],
  ])('orders the first layer of a %s sweep by the random barycenters', (_name, forward, layerIndex) => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/layered10').toNodeArray(), nodeRelative);
    const before = [...setup.order[layerIndex]!];
    expect(setup.heuristic.setFirstLayerOrder(setup.order, forward)).toBe(false);
    const draws = new Random(SEED);
    const keyed = before.map((node) => ({ node, key: draws.nextDouble() }));
    const expected = [...keyed].sort((a, b) => a.key - b.key).map((entry) => entry.node);
    expect(setup.order[layerIndex]).toEqual(expected);
  });

  it('keeps the nodes of a free layer sorted by their barycenters and answers false', () => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/layered10').toNodeArray(), layerTotal);
    setup.heuristic.setFirstLayerOrder(setup.order, true);
    expect(setup.heuristic.minimizeCrossings(setup.order, 1, true, true)).toBe(false);
    const barycenters = setup.order[1]!.map((node) => setup.heuristic.states(node).barycenter!);
    expect(barycenters).toEqual([...barycenters].sort((a, b) => a - b));
    expect(new Set(setup.order[1]!).size).toBe(setup.order[1]!.length);
  });

  it('does not rank a fixed layer for the first layer of the sweep', () => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    setup.distributor.getPortRanks().fill(7);
    setup.heuristic.minimizeCrossings(setup.order, 0, true, true);
    expect([...setup.distributor.getPortRanks()].every((rank) => rank === 7)).toBe(true);
  });

  it('treats an external port dummy layer as pre-ordered even in the first sweep', () => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    setup.order[0]![0]!.setType(NodeType.EXTERNAL_PORT);
    // the first layer of a forward sweep has no predecessors: every barycenter is unknown and filled in pre-ordered
    setup.heuristic.minimizeCrossings(setup.order, 0, true, true);
    let lastValue = -1;
    const expected = setup.order[0]!.map(() => {
      lastValue = (lastValue + (lastValue + 1)) / 2;
      return lastValue;
    });
    expect(setup.order[0]!.map((node) => setup.heuristic.states(node).barycenter)).toEqual(expected);
  });

  it('places unknown barycenters randomly in the first sweep of a layer that is not an external port layer', () => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    const nodes = [...setup.order[0]!];
    setup.heuristic.minimizeCrossings(setup.order, 0, true, true);
    const draws = new Random(SEED);
    const maxBary = 0 + 2;
    const expected = nodes.map(() => draws.nextFloat() * maxBary - 1);
    expect(nodes.map((node) => setup.heuristic.states(node).barycenter)).toEqual(expected);
  });

  it('throws a ClassCastException when the model order option asks for the model order heuristic', () => {
    const setup = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    setup.order[1]![0]!.getGraph()!.setProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, true);
    expect(() => setup.heuristic.minimizeCrossings(setup.order, 1, true, false)).toThrow(ClassCastException);
  });

  it('describes a state with every field', () => {
    const { heuristic, order } = setupOn(preP3Graph('scenarios/LayerSweep/crossing').toNodeArray(), nodeRelative);
    const state = heuristic.states(order[0]![0]!);
    state.degree = 2;
    state.summedWeight = 1.5;
    expect(state.toString()).toBe(
      `BarycenterState [node=${order[0]![0]!.toString()}, summedWeight=1.5, degree=2, barycenter=null, visited=false]`,
    );
    state.barycenter = 0.75;
    expect(state.toString()).toContain('barycenter=0.75, visited=false]');
  });
});
