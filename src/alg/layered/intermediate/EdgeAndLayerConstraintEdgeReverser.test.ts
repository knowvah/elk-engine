// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { EdgeAndLayerConstraintEdgeReverser } from './EdgeAndLayerConstraintEdgeReverser.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/EdgeAndLayerConstraintEdgeReverser/';
const PROCESSOR_NAME = 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER';
const ROW_NAMES: readonly string[] = ['first-last', 'last-separate', 'feedback-node', 'feedback-node-blocked'];
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

const factories: Factories = {
  createProcessor(name) {
    if (name !== PROCESSOR_NAME) {
      throw new Error(`unexpected processor ${name}`);
    }
    return new EdgeAndLayerConstraintEdgeReverser();
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

describe('EdgeAndLayerConstraintEdgeReverser (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES.map((name) => `${ROW_PREFIX}${name}`));
  });

  it.each(rows.map((row) => [row.id, row] as const))('replays %s', (_id, row) => {
    const { importDump } = importRow(row);
    const graph = runSteps(row, factories);
    const actual = { ...phaseDump(graph, importDump), dump: dumpWithPropertyValues(graph) };
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(row.expected.dump).toBeDefined();
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });
});
