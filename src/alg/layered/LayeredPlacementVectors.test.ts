// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-placement.json (mission 7d, T8; recorded by
// tools/vectors/LayeredPlacementVectors.java from the source-built oracle) through the whole 7d set the way the
// pipeline uses it: processors by `IntermediateProcessorStrategy` name, phases by `CycleBreakingStrategy` /
// `LayeringStrategy` / `CrossingMinimizationStrategy` / `NodePlacementStrategy`. Model rows replay their recorded
// `prefix`; step rows interpret their `steps`. Numbers within 1e-6 (AD-4), everything else exactly (the comparators of
// test/helpers/layered-placement-replay-compare.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../test/helpers/layered-framework-replay.js';
import { runSteps, type Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, ROW_GROUPS } from '../../../test/helpers/layered-phase-replay-rows.js';
import { comparePlacement, comparePlacementFullDump } from '../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../test/helpers/layered-placement-replay-rows.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';

const rows = loadPlacementRows(ROWS_FILE);
const rowCounts = (JSON.parse(readFileSync(ROWS_FILE, 'utf8')) as { rowCounts: Record<string, number> }).rowCounts;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

function replay(row: PlacementRow): ReturnType<typeof placementDump> {
  const graph = row.steps === null ? runPlacementPrefix(row, factories) : runSteps(row, factories);
  const actual = placementDump(graph, importRow(row).importDump);
  return row.expected.dump === undefined ? actual : { ...actual, dump: dumpLGraph(graph) };
}

describe('layered-placement.json replay', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded total row count', () => {
    expect(rows.length).toBe(Object.values(rowCounts).reduce((sum, n) => sum + n, 0));
  });

  it.each(ROW_GROUPS)('has the recorded %s row count', (group) => {
    expect(rows.filter((row) => row.group === group).length).toBe(rowCounts[group] ?? 0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump(actual, row.expected)).toEqual([]);
    }
  });
});
