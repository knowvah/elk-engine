// SPDX-License-Identifier: EPL-2.0
// Structural cases only; the counter is proven on the oracle rows by the order replay (mission 7c, T7/T8).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import { addLayer, addNode, addPort } from '../../../../../test/helpers/lgraph-builders.js';
import { HyperedgeCrossingsCounter } from './HyperedgeCrossingsCounter.js';
import { HyperedgeCrossingsCounterHyperedge } from './HyperedgeCrossingsCounterHyperedge.js';
import { HyperedgeCrossingsCounterHyperedgeCorner } from './HyperedgeCrossingsCounterHyperedgeCorner.js';
import { HyperedgeCrossingsCounterHyperedgeCornerType as Type } from './HyperedgeCrossingsCounterHyperedgeCornerType.js';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { orderDump } from '../../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderExpected } from '../../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';

describe('HyperedgeCrossingsCounter', () => {
  it('counts 0 crossings between two layers without edges', () => {
    const graph = new LGraph();
    const left = addLayer(graph);
    const right = addLayer(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    a.setLayer(left);
    b.setLayer(right);
    addPort(a, PortSide.EAST);
    addPort(b, PortSide.WEST);
    const counter = new HyperedgeCrossingsCounter(new Int32Array(2), [false, false], new Int32Array(2));
    expect(counter.countCrossings([a], [b])).toBe(0);
  });
});

describe('HyperedgeCrossingsCounterHyperedge.compareTo', () => {
  const hyperedge = (upperLeft: number, upperRight: number): HyperedgeCrossingsCounterHyperedge => {
    const he = new HyperedgeCrossingsCounterHyperedge();
    he.upperLeft = upperLeft;
    he.upperRight = upperRight;
    return he;
  };

  it('orders by upperLeft first (HyperedgeCrossingsCounter.java:82-91)', () => {
    expect(hyperedge(1, 9).compareTo(hyperedge(2, 0))).toBe(-1);
    expect(hyperedge(3, 0).compareTo(hyperedge(2, 9))).toBe(1);
  });

  it('orders by upperRight when upperLeft is equal', () => {
    expect(hyperedge(2, 1).compareTo(hyperedge(2, 5))).toBe(-1);
    expect(hyperedge(2, 7).compareTo(hyperedge(2, 5))).toBe(1);
  });

  it('treats a full tie as 0: the identity-hash tie-break is constant under the oracle flag (-XX:hashCode=2)', () => {
    const a = hyperedge(2, 5);
    const b = hyperedge(2, 5);
    expect(a.compareTo(a)).toBe(0);
    expect(a.compareTo(b)).toBe(0);
    expect(b.compareTo(a)).toBe(0);
  });
});

describe('HyperedgeCrossingsCounterHyperedgeCorner.compareTo', () => {
  const he = new HyperedgeCrossingsCounterHyperedge();
  const corner = (position: number, opposite: number, type: Type, owner = he) =>
    new HyperedgeCrossingsCounterHyperedgeCorner(owner, position, opposite, type);

  it('orders by position, then by opposite position (HyperedgeCrossingsCounter.java:119-129)', () => {
    expect(corner(1, 9, Type.UPPER).compareTo(corner(2, 0, Type.UPPER))).toBe(-1);
    expect(corner(3, 0, Type.UPPER).compareTo(corner(2, 9, Type.UPPER))).toBe(1);
    expect(corner(2, 1, Type.UPPER).compareTo(corner(2, 4, Type.UPPER))).toBe(-1);
    expect(corner(2, 5, Type.UPPER).compareTo(corner(2, 4, Type.UPPER))).toBe(1);
  });

  it('orders UPPER before LOWER of the same hyperedge and equal corners as 0', () => {
    expect(corner(2, 4, Type.UPPER).compareTo(corner(2, 4, Type.LOWER))).toBe(-1);
    expect(corner(2, 4, Type.LOWER).compareTo(corner(2, 4, Type.UPPER))).toBe(1);
    expect(corner(2, 4, Type.UPPER).compareTo(corner(2, 4, Type.UPPER))).toBe(0);
  });

  it('treats corners of different hyperedges as equal when position and opposite tie (-XX:hashCode=2)', () => {
    const other = new HyperedgeCrossingsCounterHyperedge();
    const a = corner(2, 4, Type.UPPER, he);
    const b = corner(2, 4, Type.LOWER, other);
    // The hyperedge identity-hash tie-break returns 0 and, unlike same-hyperedge corners, the type is not consulted.
    expect(a.compareTo(b)).toBe(0);
    expect(b.compareTo(a)).toBe(0);
  });
});

describe('HyperedgeCrossingsCounterHyperedgeCornerType', () => {
  it('has UPPER and LOWER in declaration order', () => {
    expect(Type.values().map((t) => t.name())).toEqual(['UPPER', 'LOWER']);
    expect(Type.valueOf('LOWER')).toBe(Type.LOWER);
    expect(Type.UPPER.ordinal()).toBe(0);
    expect(Type.LOWER.toString()).toBe('LOWER');
    expect(() => Type.valueOf('MIDDLE')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.p3order.counting.HyperedgeCrossingsCounter.HyperedgeCorner.Type.MIDDLE',
    );
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

describe('HyperedgeCrossingsCounter on the site rows', () => {
  it('merges two hyperedges joined by an edge', () => {
    // oracle: sites/Hyperedges/merge; HyperedgeCrossingsCounter.java:241-250
    const result = replaySite('sites/Hyperedges/merge');
    expect(result.layers).toEqual([['g0/n5', 'g0/n1', 'g0/n0'], ['g0/n3', 'new/n0', 'g0/n2'], ['g0/n4']]);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p3', 'g0/n2/p2', 'g0/n2/p0', 'g0/n2/p1']);
  });

  it('merges hyperedges across two layers and orders them by their upper left position', () => {
    // oracle: sites/Hyperedges/mergeAcross; HyperedgeCrossingsCounter.java:83,241-250
    const result = replaySite('sites/Hyperedges/mergeAcross');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n1', 'g0/n2']]);
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p2', 'g0/n0/p0', 'g0/n0/p1']);
  });

  it('adds an edge inside an existing hyperedge without merging', () => {
    // oracle: sites/Hyperedges/sameHyperedge; HyperedgeCrossingsCounter.java:241-243
    const result = replaySite('sites/Hyperedges/sameHyperedge');
    expect(result.layers).toEqual([
      ['g0/n1', 'g0/n0'],
      ['g0/n3', 'g0/n2'],
      ['g0/n4', 'g0/n5'],
    ]);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p3', 'g0/n2/p0', 'g0/n2/p1']);
  });

  it('sorts the corners of hyperedges with equal upper left positions', () => {
    // oracle: sites/Hyperedges/corners; HyperedgeCrossingsCounter.java:241-250
    const result = replaySite('sites/Hyperedges/corners');
    expect(result.layers).toEqual([
      ['g0/n0', 'g0/n1'],
      ['g0/n2', 'new/n0', 'new/n1', 'g0/n3'],
      ['g0/n4', 'g0/n5'],
    ]);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p2', 'g0/n3/p0', 'g0/n3/p1']);
  });

  it('skips the ports of a hyperedge that lie in neither of the two counted layers', () => {
    // oracle: sites/Hyperedges/neitherLayer; HyperedgeCrossingsCounter.java:266-273
    const result = replaySite('sites/Hyperedges/neitherLayer');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n1'], ['g0/n2']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p1', 'g0/n1/p0']);
  });

  it('ranks the north input ports of a node ahead of its other input ports (seed 1)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed1; HyperedgeCrossingsCounter.java:179,202
    const result = replaySite('sites/NorthSouth/inputRanks/seed1');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n1', 'g0/n2']]);
  });

  it('ranks the north input ports of a node ahead of its other input ports (seed 2)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed2; HyperedgeCrossingsCounter.java:179,202
    const result = replaySite('sites/NorthSouth/inputRanks/seed2');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n2', 'g0/n1']]);
  });
});
