// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { PartitionMidprocessor } from './PartitionMidprocessor.js';
import { PartitionPostprocessor } from './PartitionPostprocessor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/PartitionPostprocessor/';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

// the row first runs PARTITION_MIDPROCESSOR to create the ports the postprocessor removes
const factories: Factories = {
  createProcessor(name) {
    switch (name) {
      case 'PARTITION_POSTPROCESSOR':
        return new PartitionPostprocessor();
      case 'PARTITION_MIDPROCESSOR':
        return new PartitionMidprocessor();
      default:
        throw new Error(`unexpected processor ${name}`);
    }
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('PartitionPostprocessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}three-partitions`]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('replays %s', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
    expect(row.expected.dump).toBeDefined();
  });
});

describe('PartitionPostprocessor', () => {});
