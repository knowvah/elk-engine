// SPDX-License-Identifier: EPL-2.0
// Proof of HierarchicalPortDummySizeProcessor: every row of layered-placement.json whose last replayed entry is HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR (mission 7d, T4), with
// the class injected through `createProcessor` (the enum arm is wired by T8). Expectations come only from the rows and
// the Java (L4).
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import {
  comparePlacement,
  comparePlacementFullDump,
} from '../../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../test/helpers/layered-placement-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { PLACEMENT_PROCESSOR_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const PROCESSOR = 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-multicoreexecution/N2/HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N8/HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR/default',
  'models/ptolemy-htvq4/N7/HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph04/parent/HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR/default',
  'scenarios/port-dummy-size/external-chain',
  'scenarios/port-dummy-size/external-fan',
  // layered-evidence-gaps T2 (#49): two and three N or S dummies in one layer, so `delta` and `step` are oracle values
  'sites/HierarchicalPortDummySizeProcessor/two-north',
  'sites/HierarchicalPortDummySizeProcessor/two-south',
  'sites/HierarchicalPortDummySizeProcessor/three-north',
  'sites/HierarchicalPortDummySizeProcessor/three-south',
  'sites/HierarchicalPortDummySizeProcessor/two-south-out',
  'sites/HierarchicalPortDummySizeProcessor/mixed',
];

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: PlacementRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

const rows = loadPlacementRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === PROCESSOR);

function replay(row: PlacementRow): LGraph {
  return row.steps === null
    ? runPlacementPrefix(row, PLACEMENT_PROCESSOR_FACTORIES)
    : runSteps(row, PLACEMENT_PROCESSOR_FACTORIES);
}

describe('HierarchicalPortDummySizeProcessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES);
  });

  it.each(ROW_NAMES.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = replay(row);
    const actual = placementDump(graph, importRow(row).importDump);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });
});
