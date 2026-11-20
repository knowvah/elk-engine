// SPDX-License-Identifier: EPL-2.0
// Proof of NodePlacementRepeater: every row of layered-placement.json whose last replayed entry is NODE_PLACEMENT_REPEATER (mission 7d, T4), with
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
const PROCESSOR = 'NODE_PLACEMENT_REPEATER';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-producer/root/NODE_PLACEMENT_REPEATER/flex-PORT_POSITION-recompute',
  'models/ptolemy-producer/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/ptolemy-producer/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE-recompute',
  'models/node_placement-bk-classes-classes_leftdown/root/NODE_PLACEMENT_REPEATER/flex-PORT_POSITION-recompute',
  'models/node_placement-bk-classes-classes_leftdown/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/node_placement-bk-classes-classes_leftdown/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE-recompute',
  'models/node_placement-flexible_ports-graph01/root/NODE_PLACEMENT_REPEATER/flex-PORT_POSITION-recompute',
  'models/node_placement-flexible_ports-graph01/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/node_placement-flexible_ports-graph01/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE-recompute',
  'models/node_placement-flexible_ports-graph03/root/NODE_PLACEMENT_REPEATER/flex-PORT_POSITION-recompute',
  'models/node_placement-flexible_ports-graph03/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/node_placement-flexible_ports-graph03/root/NODE_PLACEMENT_REPEATER/flex-NODE_SIZE-recompute',
  'scenarios/repeater/graph-default-ports-port_position',
  'scenarios/repeater/graph-default-fan-port_position',
  'scenarios/repeater/node-level-fan-port_position',
  'scenarios/repeater/graph-default-ports-node_size_where_space_permits',
  'scenarios/repeater/graph-default-fan-node_size_where_space_permits',
  'scenarios/repeater/node-level-fan-node_size_where_space_permits',
  'scenarios/repeater/graph-default-ports-node_size',
  'scenarios/repeater/graph-default-fan-node_size',
  'scenarios/repeater/node-level-fan-node_size',
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

describe('NodePlacementRepeater (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES);
  });

  // the replay reaches P4_NODE_PLACEMENT through the real NodePlacementStrategy arms (wired in T8)
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
