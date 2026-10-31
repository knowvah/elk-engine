// SPDX-License-Identifier: EPL-2.0
// Structural cases only; the counter is proven on the oracle rows by the order replay (mission 7c, T7/T8).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { AllCrossingsCounter } from './AllCrossingsCounter.js';
import { init } from './IInitializable.js';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { orderDump } from '../../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderExpected } from '../../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';

/** Two layers of `leftCount` and `rightCount` nodes, each with one east respectively west port, no edges. */
function edgelessLayers(leftCount: number, rightCount: number): LNode[][] {
  const graph = new LGraph();
  const left = addLayer(graph);
  const right = addLayer(graph);
  const make = (layer: typeof left, side: PortSide): LNode => {
    const node = addNode(graph);
    node.setLayer(layer);
    addPort(node, side);
    return node;
  };
  return [
    Array.from({ length: leftCount }, () => make(left, PortSide.EAST)),
    Array.from({ length: rightCount }, () => make(right, PortSide.WEST)),
  ];
}

describe('AllCrossingsCounter', () => {
  it('answers 0 for an empty order without being initialised', () => {
    expect(new AllCrossingsCounter([]).countAllCrossings([])).toBe(0);
  });

  it('numbers the ports in traversal order during init', () => {
    const order = edgelessLayers(2, 1);
    init([new AllCrossingsCounter(order)], order);
    const ids = order.flat().map((node) => node.getPorts().map((port) => port.id));
    expect(ids).toEqual([[0], [1], [2]]);
  });

  it('counts 0 crossings in an order whose layers have no edges', () => {
    const order = edgelessLayers(2, 2);
    const counter = new AllCrossingsCounter(order);
    init([counter], order);
    expect(counter.countAllCrossings(order)).toBe(0);
  });

  it('counts 0 crossings with a north/south port dummy in the layer and no edges to it', () => {
    const order = edgelessLayers(1, 1);
    const graph = new LGraph();
    const dummy = addNode(graph, NodeType.NORTH_SOUTH_PORT);
    dummy.setLayer(order[0]![0]!.getLayer());
    order[0]!.push(dummy);
    const counter = new AllCrossingsCounter(order);
    init([counter], order);
    expect(counter.countAllCrossings(order)).toBe(0);
  });

  it('initAtEdgeLevel only counts an edge at its source port', () => {
    const order = edgelessLayers(1, 1);
    const edge = connect(order[0]![0]!.getPorts()[0]!, order[1]![0]!.getPorts()[0]!);
    const counter = new AllCrossingsCounter(order);
    // a between-layer edge is not an in-layer edge: nothing is counted for either end
    counter.initAtEdgeLevel(0, 0, 0, 0, edge, order);
    counter.initAtEdgeLevel(1, 0, 0, 0, edge, order);
    expect(Reflect.get(counter, 'inLayerEdgeCounts')).toEqual(Int32Array.of(0, 0));
  });
});

/** The `sites/` rows recorded for the branches the generic replay leaves untaken (T11). */
const SITE_ROWS = loadOrderRows(`${repoRoot()}/test/golden/refs/java/layered-order.json`).filter((row) =>
  row.id.startsWith('sites/'),
);

const siteFactories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      default:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
    }
  },
};

/** Replays the site row `id` with the real processors and phases and dumps the result in the recorder's shape. */
function replaySite(id: string): OrderExpected {
  const row = SITE_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return orderDump(runSteps(row, siteFactories), importRow(row).importDump);
}

describe('AllCrossingsCounter on the site rows', () => {
  it('records no hyperedge flag for a north port with several edges (seed 1)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed1; AllCrossingsCounter.java:105-108
    const result = replaySite('sites/NorthSouth/inputRanks/seed1');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n1', 'g0/n2']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1', 'g0/n1/p2']);
  });

  it('records no hyperedge flag for a north port with several edges (seed 2)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed2; AllCrossingsCounter.java:105-108
    const result = replaySite('sites/NorthSouth/inputRanks/seed2');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n2', 'g0/n1']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1', 'g0/n1/p2']);
  });
});
