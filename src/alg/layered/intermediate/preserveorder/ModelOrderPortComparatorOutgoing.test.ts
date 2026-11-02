// SPDX-License-Identifier: EPL-2.0
// ModelOrderPortComparatorOutgoing: the arms the T11 site rows reach (mission 7c, T12b). Expectations are the recorded
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

describe('ModelOrderPortComparatorOutgoing on the site rows', () => {
  it('orders output ports by the model order of their first edge', () => {
    // oracle: sites/ModelOrder/ports/sameSource; ModelOrderPortComparator.java:230-275
    const result = replaySite('sites/ModelOrder/ports/sameSource');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1', 'g0/n0/p2', 'g0/n0/p3']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
  });

  it('orders output ports to one target node by port model order', () => {
    // oracle: sites/ModelOrder/portModelOrder; ModelOrderPortComparator.java:244
    const result = replaySite('sites/ModelOrder/portModelOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
  });

  it('orders output ports across layers by the target node model order', () => {
    // oracle: sites/ModelOrder/ports/notPreviousLayer; ModelOrderPortComparator.java:241-244
    const result = replaySite('sites/ModelOrder/ports/notPreviousLayer');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p2', 'g0/n3/p1', 'g0/n3/p0']);
  });

  it('orders output ports whose targets are long-edge dummies of one node', () => {
    // oracle: sites/ModelOrder/feedback/sameNode; ModelOrderPortComparator.java:244, :273
    const result = replaySite('sites/ModelOrder/feedback/sameNode');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p2', 'g0/n0/p1']);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p1', 'g0/n5/p0']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p2', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p2', 'g0/n3/p0']);
    expect(result.ports['g0/n6']).toEqual(['g0/n6/p1', 'g0/n6/p2', 'g0/n6/p0']);
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p0', 'g0/n4/p1']);
  });

  it('prefers the target node model order for feedback dummies', () => {
    // oracle: sites/ModelOrder/feedback/mixed; ModelOrderPortComparator.java:241 prefersTargetNodeModelOrder
    const result = replaySite('sites/ModelOrder/feedback/mixed');
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p0', 'g0/n3/p2', 'g0/n3/p3', 'g0/n3/p1']);
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p0', 'g0/n4/p1']);
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p1', 'g0/n1/p2', 'g0/n1/p0']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
  });

  it('orders the output ports of nodes with north and south ports', () => {
    // oracle: sites/ModelOrder/northSouth; ModelOrderPortComparator.java:231
    const result = replaySite('sites/ModelOrder/northSouth');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p1', 'g0/n0/p0', 'g0/n0/p2', 'g0/n0/p3']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p1', 'g0/n1/p2', 'g0/n1/p5', 'g0/n1/p3', 'g0/n1/p4', 'g0/n1/p0']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p0']);
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p3', 'g0/n4/p2', 'g0/n4/p0', 'g0/n4/p1']);
  });

  it('orders output ports of nodes next to external port dummies', () => {
    // oracle: sites/ModelOrder/externalPorts; ModelOrderPortComparator.java:275
    const result = replaySite('sites/ModelOrder/externalPorts');
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p1', 'g0/n4/p0']);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p1', 'g0/n5/p0']);
    expect(result.ports['g0/n6']).toEqual(['g0/n6/p1', 'g0/n6/p0']);
    expect(result.ports['g0/n7']).toEqual(['g0/n7/p1', 'g0/n7/p2', 'g0/n7/p0']);
    expect(result.ports['g0/n8']).toEqual(['g0/n8/p2', 'g0/n8/p1', 'g0/n8/p0']);
  });
});
