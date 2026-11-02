// SPDX-License-Identifier: EPL-2.0
// ModelOrderPortComparatorIncoming: the arms the T11 site rows reach (mission 7c, T12b). Expectations are the recorded
// layered-order.json rows (L4); the whole dump is proven by the order replay.
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { orderDump } from '../../../../../test/helpers/layered-order-replay-dump.js';
import {
  loadOrderRows,
  type OrderExpected,
  type OrderRow,
} from '../../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';

const SITE_ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const SITE_PHASE_CYCLE = 'P1_CYCLE_BREAKING';
const SITE_PHASE_LAYERING = 'P2_LAYERING';

const siteFactories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) =>
    phase === SITE_PHASE_CYCLE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : phase === SITE_PHASE_LAYERING
        ? LayeringStrategy.valueOf(strategy).create()
        : CrossingMinimizationStrategy.valueOf(strategy).create(),
};

let siteRows: OrderRow[] | undefined;

/** Replays a T11 site row through the 7c classes and dumps the layers and ports (the order replay's dump). */
function replaySite(id: string): OrderExpected {
  siteRows ??= loadOrderRows(SITE_ROWS_FILE);
  const row = siteRows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`site row ${id} is not in layered-order.json`);
  }
  return orderDump(runSteps(row, siteFactories), importRow(row).importDump);
}

describe('ModelOrderPortComparatorIncoming on the site rows', () => {
  it('orders input ports fed by two ports of one source node by the source port order', () => {
    // oracle: sites/ModelOrder/ports/sameSource; ModelOrderPortComparator.java:158 compareOnSameSourceNode
    const result = replaySite('sites/ModelOrder/ports/sameSource');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1', 'g0/n0/p2', 'g0/n0/p3']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
  });

  it('orders the input ports of a node fed by one source node', () => {
    // oracle: sites/ModelOrder/ports/sameTarget; ModelOrderPortComparator.java:158 compareOnSameSourceNode
    const result = replaySite('sites/ModelOrder/ports/sameTarget');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p1', 'g0/n1/p0']);
  });

  it('orders input ports of one source node by port model order', () => {
    // oracle: sites/ModelOrder/portModelOrder; ModelOrderPortComparator.java:158 compareOnSameSourceNode
    const result = replaySite('sites/ModelOrder/portModelOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
  });

  it('orders input ports whose sources sit two layers back', () => {
    // oracle: sites/ModelOrder/ports/notPreviousLayer; ModelOrderPortComparator.java:200 compareByPreviousLayer
    const result = replaySite('sites/ModelOrder/ports/notPreviousLayer');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p2', 'g0/n3/p1', 'g0/n3/p0']);
  });

  it('returns no decision for input ports without port model order', () => {
    // oracle: sites/ModelOrder/ports/notPreviousLayer/noPortModelOrder; ModelOrderPortComparator.java:200 compareByPreviousLayer
    const result = replaySite('sites/ModelOrder/ports/notPreviousLayer/noPortModelOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p2', 'g0/n3/p0']);
  });

  it('orders input ports fed by same-layer long-edge dummies', () => {
    // oracle: sites/ModelOrder/feedback/sameNode; ModelOrderPortComparator.java:174 compareLongEdgeSources
    const result = replaySite('sites/ModelOrder/feedback/sameNode');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p2', 'g0/n0/p1']);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p1', 'g0/n5/p0']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p2', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p2', 'g0/n3/p0']);
    expect(result.ports['g0/n6']).toEqual(['g0/n6/p1', 'g0/n6/p2', 'g0/n6/p0']);
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p0', 'g0/n4/p1']);
  });

  it('orders input ports of processor-created edges fed by long-edge dummies', () => {
    // oracle: sites/ModelOrder/feedback/noEdgeOrder; ModelOrderPortComparator.java:174 compareLongEdgeSources
    const result = replaySite('sites/ModelOrder/feedback/noEdgeOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p2', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p0', 'g0/n3/p1', 'g0/n3/p2']);
  });
});
