// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderExpected } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';

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

describe('LayerTotalPortDistributor on the site rows', () => {
  it('ranks the north input ports ahead of the others in one layer-wide range (seed 1)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed1; LayerTotalPortDistributor.java:51,61
    const result = replaySite('sites/NorthSouth/inputRanks/seed1');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n1', 'g0/n2']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1', 'g0/n1/p2']);
  });
});
