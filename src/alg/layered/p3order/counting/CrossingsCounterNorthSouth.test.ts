// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { orderDump } from '../../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderExpected } from '../../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';

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

describe('CrossingsCounterNorthSouth on the site rows', () => {
  it('leaves external port dummies out of the north-south positions of their layer', () => {
    // oracle: sites/ExternalPorts/northSouth; CrossingsCounter.java:524-545 (no case for EXTERNAL_PORT)
    const result = replaySite('sites/ExternalPorts/northSouth');
    expect(result.layers).toEqual([['g0/n0'], ['new/n0', 'new/n1', 'g0/n4'], ['g0/n5'], ['g0/n1', 'new/n2']]);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p2', 'g0/n5/p4', 'g0/n5/p0', 'g0/n5/p1', 'g0/n5/p3']);
  });
});
