// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { PartitionMidprocessor } from './PartitionMidprocessor.js';
import { PartitionPreprocessor } from './PartitionPreprocessor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/PartitionMidprocessor/';
const PROCESSOR_NAME = 'PARTITION_MIDPROCESSOR';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

const factories: Factories = {
  createProcessor(name) {
    if (name !== PROCESSOR_NAME) {
      throw new Error(`unexpected processor ${name}`);
    }
    return new PartitionMidprocessor();
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('PartitionMidprocessor (oracle rows)', () => {
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

describe('PartitionMidprocessor', () => {});

// ------------------------------------------------------------------------------------------------------------
// Site row (T11): partitioning activated, no partitioned node (S14)

describe('PartitionMidprocessor (site row)', () => {
  // oracle: sites/Partition/none; PartitionMidprocessor.java:73 (no node has a partition: nothing to constrain)
  it('adds nothing when no node carries a partition', () => {
    const row = loadRows(ROWS_FILE).find((candidate) => candidate.id === 'sites/Partition/none')!;
    const graph = runSteps(row, {
      createProcessor(name) {
        if (name === 'PARTITION_PREPROCESSOR') {
          return new PartitionPreprocessor();
        }
        if (name !== PROCESSOR_NAME) {
          throw new Error(`unexpected processor ${name}`);
        }
        return new PartitionMidprocessor();
      },
      createPhase(phase, strategy) {
        if (phase === 'P1_CYCLE_BREAKING' && strategy === 'GREEDY') {
          return CycleBreakingStrategy.GREEDY.create();
        }
        throw new Error(`unexpected phase ${phase}/${strategy}`);
      },
    });
    const actual = phaseDump(graph, importRow(row).importDump);
    expect(actual.layerless).toEqual(['g0/n0', 'g0/n1', 'g0/n2']);
    expect(actual.edges.map((edge) => [edge.path, edge.src, edge.tgt, edge.reversed])).toEqual([
      ['g0/e0', 'g0/n0/p0', 'g0/n1/p0', false],
      ['g0/e1', 'g0/n1/p1', 'g0/n2/p0', false],
    ]);
    expect(actual.changed).toEqual([]);
  });
});
