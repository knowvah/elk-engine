// SPDX-License-Identifier: EPL-2.0
// Unit cases of MedianHeuristic (mission 7c, T6). The recorded final state of the MedianLayerSweep rows is a fixed
// point of the heuristic (every weight is 1.0 in the oracle's final nodes); the other cases are the Java formulas.
// The sweep that reaches that state is T7's replay.
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { elementAt } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { loadOrderRows, type OrderExpected } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import { Random } from '../../../java/util/Random.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InvertedPortProcessor } from '../intermediate/InvertedPortProcessor.js';
import { LongEdgeSplitter } from '../intermediate/LongEdgeSplitter.js';
import { PortListSorter } from '../intermediate/PortListSorter.js';
import { PortSideProcessor } from '../intermediate/PortSideProcessor.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { MedianHeuristic } from './MedianHeuristic.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';

const ROW_ID = 'scenarios/MedianLayerSweep/crossing';
const SEED = 1;
/** `Double.MIN_VALUE` and `Double.MAX_VALUE` never move: the running min/max of `calculateMedians` start there. */
const UNCONNECTED_WEIGHT = (Number.MAX_VALUE + Number.MIN_VALUE) / 2.0;

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

const row = loadOrderRows(`${repoRoot()}/test/golden/refs/java/layered-order.json`).find((r) => r.id === ROW_ID)!;

/** The row's graph as it enters P3: its steps without the P3 phase and the dump. */
function preP3Graph(): LGraph {
  const steps = row.steps!.filter(
    ([op, phase]) => op !== 'dump' && !(op === 'runPhase' && phase === 'P3_NODE_ORDERING'),
  );
  return runSteps({ ...row, steps }, factories);
}

/** Layer ids as `LayerSweepTypeDecider.initAtLayerLevel` assigns them (LayerSweepTypeDecider.java:226). */
function numberLayers(order: LNode[][]): void {
  order.forEach((layer, l) => {
    layer[0]!.getLayer()!.id = l;
  });
}

/** Exposes the protected comparator. */
class Probe extends MedianHeuristic {
  compareWeights(n1: LNode, n2: LNode): number {
    return this.weightComparator(n1, n2);
  }
}

const weightOf = (node: LNode): number => node.getProperty(InternalProperties.WEIGHT);

describe('MedianHeuristic', () => {
  it('is deterministic, never improves for sure, and draws nothing from the seeded generator on construction', () => {
    const random = new Random(SEED);
    const heuristic = new MedianHeuristic(random);
    expect([heuristic.isDeterministic(), heuristic.alwaysImproves()]).toEqual([true, false]);
    expect(random.nextDouble()).toBe(new Random(SEED).nextDouble());
  });

  it.each([
    ['forward', true],
    ['backward', false],
  ])('sorts the first layer of a %s sweep by random weights and numbers the nodes from 1', (_name, forward) => {
    const order = preP3Graph().toNodeArray();
    numberLayers(order);
    const firstIndex = forward ? 0 : order.length - 1;
    const before = [...order[firstIndex]!];
    expect(new MedianHeuristic(new Random(SEED)).setFirstLayerOrder(order, forward)).toBe(false);
    const draws = new Random(SEED);
    const keyed = before.map((node) => ({ node, key: draws.nextDouble() }));
    expect(order[firstIndex]).toEqual([...keyed].sort((a, b) => a.key - b.key).map((entry) => entry.node));
    expect(order[firstIndex]!.map(weightOf)).toEqual(before.map((_, i) => i + 1));
  });

  it('keeps the oracle final state of the MedianLayerSweep row: equal weights give an unchanged order', () => {
    const graph = preP3Graph();
    const order = graph.toNodeArray();
    numberLayers(order);
    const recorded = row.expected.layers.map((layer) => layer.map((path) => elementAt(graph, path) as LNode));
    recorded.forEach((layer, l) => {
      order[l]!.splice(0, order[l]!.length, ...layer);
      layer.forEach((node, n) => {
        const entry = row.expected.changed.find((changed) => changed.path === row.expected.layers[l]![n]);
        node.setProperty(
          InternalProperties.WEIGHT,
          Number((entry!.props['medianHeuristic.weight'] as { v: string }).v),
        );
      });
    });
    const heuristic = new MedianHeuristic(new Random(SEED));
    for (let l = 1; l < order.length; l++) {
      expect(heuristic.minimizeCrossings(order, l, true, false)).toBe(false);
    }
    for (let l = order.length - 2; l >= 0; l--) {
      expect(heuristic.minimizeCrossings(order, l, false, false)).toBe(false);
    }
    expect(order).toEqual(recorded);
    expect(order.flat().map(weightOf)).toEqual(order.flat().map(() => 1));
  });

  /** Layers of one node each in the order given, connected by edges from the east to the west port. */
  function layers(counts: readonly number[]): { order: LNode[][]; graph: LGraph } {
    const graph = new LGraph();
    const order = counts.map((count) => {
      const layer = addLayer(graph);
      return Array.from({ length: count }, () => {
        const node = addNode(graph);
        node.setLayer(layer);
        addPort(node, PortSide.WEST);
        addPort(node, PortSide.EAST);
        return node;
      });
    });
    numberLayers(order);
    return { order, graph };
  }

  const link = (source: LNode, target: LNode): void => {
    connect(source.getPorts()[1]!, target.getPorts()[0]!);
  };

  it('takes the median element of the sorted weights of the connected nodes of the reference layer', () => {
    const { order } = layers([3, 1]);
    const weights = [5, 1, 3];
    order[0]!.forEach((node, i) => {
      node.setProperty(InternalProperties.WEIGHT, weights[i]!);
      link(node, order[1]![0]!);
    });
    new MedianHeuristic(new Random(SEED)).minimizeCrossings(order, 1, true, false);
    expect(weightOf(order[1]![0]!)).toBe([...weights].sort((a, b) => a - b)[Math.trunc(weights.length / 2)]);
  });

  it('takes the upper median of an even number of connected nodes, using incoming and outgoing edges', () => {
    const { order } = layers([1, 1, 1]);
    order[0]![0]!.setProperty(InternalProperties.WEIGHT, 5);
    order[2]![0]!.setProperty(InternalProperties.WEIGHT, 1);
    link(order[0]![0]!, order[1]![0]!);
    link(order[1]![0]!, order[2]![0]!);
    const heuristic = new MedianHeuristic(new Random(SEED));
    // forward: the reference layer is the one before; backward: the one after
    heuristic.minimizeCrossings(order, 1, true, false);
    expect(weightOf(order[1]![0]!)).toBe(5);
    heuristic.minimizeCrossings(order, 1, false, false);
    expect(weightOf(order[1]![0]!)).toBe(1);
  });

  it('gives a node without neighbours in the reference layer the constant average of the initial extremes', () => {
    const { order } = layers([1, 2]);
    order[0]![0]!.setProperty(InternalProperties.WEIGHT, 2);
    link(order[0]![0]!, order[1]![0]!);
    new MedianHeuristic(new Random(SEED)).minimizeCrossings(order, 1, true, false);
    expect(order[1]!.map(weightOf)).toEqual([2, UNCONNECTED_WEIGHT]);
    // ... so that the unconnected node sorts behind the connected one
    expect(order[1]!.map((node) => node.getPorts()[0]!.getIncomingEdges().length)).toEqual([1, 0]);
  });

  it('sorts a layer stably by weight and writes it back', () => {
    const { order } = layers([1, 3]);
    const [x, y, z] = order[1] as [LNode, LNode, LNode];
    order[0]![0]!.setProperty(InternalProperties.WEIGHT, 4);
    link(order[0]![0]!, y);
    // x and z have no neighbour in the reference layer: both get the average and keep their relative order behind y
    new MedianHeuristic(new Random(SEED)).minimizeCrossings(order, 1, true, true);
    expect(order[1]).toEqual([y, x, z]);
  });

  describe('weightComparator', () => {
    const { order } = layers([3]);
    const [a, b, c] = order[0] as [LNode, LNode, LNode];
    a.setProperty(InternalProperties.WEIGHT, 1);
    b.setProperty(InternalProperties.WEIGHT, 2);
    const probe = new Probe(new Random(SEED));

    it.each([
      ['both weights set, first smaller', a, b, doubleCompare(1, 2)],
      ['both weights set, first greater', b, a, doubleCompare(2, 1)],
      ['both weights set, equal', a, a, 0],
      ['the first has no weight', c, a, 1],
      ['the second has no weight', a, c, -1],
      ['neither has a weight', c, c, 1],
    ])('answers for %s', (_name, n1, n2, expected) => {
      expect(probe.compareWeights(n1, n2)).toBe(expected);
    });
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

describe('MedianHeuristic on the site rows', () => {
  it('sweeps forward first when the first draw of the sweep stream is true', () => {
    // oracle: sites/Median/forwardFirst; MedianHeuristic.java:63
    const result = replaySite('sites/Median/forwardFirst');
    expect(result.layers).toEqual([['g0/n1', 'g0/n0'], ['g0/n3', 'g0/n2'], ['g0/n4']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p1', 'g0/n1/p0']);
  });
});
