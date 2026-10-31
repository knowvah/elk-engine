// SPDX-License-Identifier: EPL-2.0
// ModelOrderNodeComparatorPreviousLayer: the arms the T11 site rows reach (mission 7c, T12b). Expectations are the recorded
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

describe('ModelOrderNodeComparatorPreviousLayer on the site rows', () => {
  it('orders helper dummies against the previous layer through the helper-dummy rule', () => {
    // oracle: sites/ModelOrder/feedback/sameNode; ModelOrderNodeComparator.java:168-230
    const result = replaySite('sites/ModelOrder/feedback/sameNode');
    expect(result.layers).toEqual([
      ['new/n0', 'g0/n0'],
      ['g0/n5', 'new/n1', 'new/n2', 'new/n3'],
      ['new/n4', 'new/n5', 'g0/n1', 'new/n6', 'new/n7', 'new/n8', 'new/n9'],
      ['new/n10', 'new/n11', 'g0/n2'],
      ['new/n12', 'g0/n3', 'new/n13', 'new/n14', 'new/n15'],
      ['g0/n6', 'new/n16', 'new/n17'],
      ['g0/n4'],
    ]);
  });

  it('orders a connected dummy against an unconnected one', () => {
    // oracle: sites/ModelOrder/feedback/mixed; ModelOrderNodeComparator.java:220-244
    const result = replaySite('sites/ModelOrder/feedback/mixed');
    expect(result.layers).toEqual([
      ['g0/n3', 'new/n0', 'g0/n4'],
      ['new/n1', 'g0/n0', 'new/n2', 'g0/n1', 'new/n3', 'new/n4'],
      ['g0/n2'],
    ]);
  });

  it('orders nodes with only unconnected ports by the previous-layer block', () => {
    // oracle: sites/ModelOrder/ports/unconnected; ModelOrderNodeComparator.java:142-230
    const result = replaySite('sites/ModelOrder/ports/unconnected');
    expect(result.layers).toEqual([
      ['g0/n0', 'new/n0'],
      ['g0/n1', 'new/n1'],
    ]);
  });

  it('records the helper-dummy decision as a bigger/smaller association', () => {
    // oracle: sites/ModelOrder/zeroCrossings/afterSweep; ModelOrderNodeComparator.java:222-230
    const result = replaySite('sites/ModelOrder/zeroCrossings/afterSweep');
    expect(result.layers).toEqual([['g0/n0'], ['new/n0', 'g0/n1', 'g0/n2', 'new/n1'], ['g0/n3']]);
  });
});
