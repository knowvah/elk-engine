// SPDX-License-Identifier: EPL-2.0
// Port of BasicModelOrderTest (`test` only checks that no error occurs): every `models/*` row whose prefix ends in
// BF_MODEL_ORDER or DF_MODEL_ORDER replays without error (mission 7b, T8).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p2layers/BasicModelOrderTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const allRows = loadRows(ROWS_FILE);

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/** A row's last replayed entry, spelled like a prefix entry (`NAME` or `PHASE/STRATEGY`). */
function lastEntry(row: PhaseRow): string | undefined {
  if (row.prefix !== null) {
    return row.prefix.at(-1);
  }
  const ran = row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase');
  const last = ran.at(-1);
  return last === undefined ? undefined : last.slice(1).join('/');
}

function replay(row: PhaseRow): LGraph {
  return row.steps === null ? runPrefix(row, factories) : runSteps(row, factories);
}

const MODEL_ORDER_LAYERERS: ReadonlySet<string> = new Set(['P2_LAYERING/BF_MODEL_ORDER', 'P2_LAYERING/DF_MODEL_ORDER']);
const rows = allRows.filter((row) => row.group === 'models' && MODEL_ORDER_LAYERERS.has(lastEntry(row) ?? ''));

describe('BasicModelOrderTest on the replayed models rows', () => {
  it('covers the 27 BF and the 27 DF models rows', () => {
    expect(rows.filter((row) => lastEntry(row) === 'P2_LAYERING/BF_MODEL_ORDER')).toHaveLength(27);
    expect(rows.filter((row) => lastEntry(row) === 'P2_LAYERING/DF_MODEL_ORDER')).toHaveLength(27);
  });

  it.each(rows.map((row) => [row.id, row] as const))(
    '%s: replays without error and leaves no layerless node',
    (_id, row) => {
      expect(replay(row).getLayerlessNodes()).toEqual([]);
    },
  );
});
