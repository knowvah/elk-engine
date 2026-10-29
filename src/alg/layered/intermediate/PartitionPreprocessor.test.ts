// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { PartitionPreprocessor } from './PartitionPreprocessor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/PartitionPreprocessor/';
const PROCESSOR_NAME = 'PARTITION_PREPROCESSOR';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

const factories: Factories = {
  createProcessor(name) {
    if (name !== PROCESSOR_NAME) {
      throw new Error(`unexpected processor ${name}`);
    }
    return new PartitionPreprocessor();
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('PartitionPreprocessor (oracle rows)', () => {
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

describe('PartitionPreprocessor', () => {});

// ------------------------------------------------------------------------------------------------------------
// Site row (T11): reversals through unpartitioned nodes (S15)

describe('PartitionPreprocessor (site row)', () => {
  // oracle: sites/PartitionPreprocessor/transitive; PartitionPreprocessor.java:110-130 (reachesLowerPartition search)
  // and :148 (the base priority 1000 plus the edge's own PRIORITY_DIRECTION: 1003)
  it('reverses edges that reach a lower partition through unpartitioned nodes, and no others', () => {
    const row = loadRows(ROWS_FILE).find((candidate) => candidate.id === 'sites/PartitionPreprocessor/transitive')!;
    const actual = replay(row);
    expect(actual.layerless).toEqual(['g0/n0', 'g0/n1', 'g0/n2', 'g0/n3', 'g0/n4']);
    expect(actual.edges.map((edge) => [edge.path, edge.src, edge.tgt, edge.reversed]).sort()).toEqual([
      ['g0/e0', 'g0/n1/p0', 'g0/n0/p0', true],
      ['g0/e1', 'g0/n2/p1', 'g0/n0/p1', true],
      ['g0/e2', 'g0/n1/p1', 'g0/n2/p0', false],
      ['g0/e3', 'g0/n4/p2', 'g0/n1/p2', false],
      ['g0/e4', 'g0/n3/p0', 'g0/n4/p0', false],
      ['g0/e5', 'g0/n3/p1', 'g0/n4/p1', false],
    ]);
    const valueOf = (value: unknown): unknown => (value as { v: unknown }).v;
    const changed = actual.changed.map((entry) => [
      entry.path,
      valueOf(entry.props['org.eclipse.elk.layered.priority.direction']),
      valueOf(entry.props.reversed),
    ]);
    expect(changed.sort()).toEqual([
      ['g0/e0', 1000, true],
      ['g0/e1', 1003, true],
    ]);
  });
});
