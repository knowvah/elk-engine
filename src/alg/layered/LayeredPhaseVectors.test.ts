// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-phases.json (mission 7b, T8; recorded by
// tools/vectors/LayeredPhaseVectors.java from the source-built oracle) through the whole 7b set the way the pipeline
// uses it: processors by `IntermediateProcessorStrategy` name, phases by `CycleBreakingStrategy` / `LayeringStrategy`.
// Model rows replay their recorded `prefix`; step rows interpret their `steps`. Numbers within 1e-6 (AD-4), everything
// else exactly (the comparators of test/helpers/layered-phase-replay-compare.ts).
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { readFileSync } from 'node:fs';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../test/helpers/layered-phase-replay-dump.js';
import { runPrefix, runSteps, type Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, ROW_GROUPS, type PhaseRow } from '../../../test/helpers/layered-phase-replay-rows.js';
import { dumpLGraph } from '../../../test/helpers/layered-framework-replay.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';

const rows = loadRows(ROWS_FILE);
const rowCounts = (JSON.parse(readFileSync(ROWS_FILE, 'utf8')) as { rowCounts: Record<string, number> }).rowCounts;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const graph = row.steps === null ? runPrefix(row, factories) : runSteps(row, factories);
  const actual = phaseDump(graph, importRow(row).importDump);
  return row.expected.dump === undefined ? actual : { ...actual, dump: dumpLGraph(graph) };
}

describe('layered-phases.json replay', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded total row count', () => {
    expect(rows.length).toBe(Object.values(rowCounts).reduce((sum, n) => sum + n, 0));
  });

  it.each(ROW_GROUPS)('has the recorded %s row count', (group) => {
    expect(rows.filter((row) => row.group === group).length).toBe(rowCounts[group]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(compareFullDump(actual, row.expected)).toEqual([]);
    }
  });
});
