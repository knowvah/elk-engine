// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
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

// ------------------------------------------------------------------------------------------------------------
// Site rows (T11): a feedback node and a LAST node with an already reversed edge (S16)

const SITE_PREFIX = 'sites/EdgeAndLayerConstraintEdgeReverser/feedbackNode/';
const SITE_ROWS = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(SITE_PREFIX));

function replaySite(name: string): ReturnType<typeof phaseDump> {
  const row: PhaseRow | undefined = SITE_ROWS.find((candidate) => candidate.id === `${SITE_PREFIX}${name}`);
  if (row === undefined) {
    throw new Error(`no site row ${SITE_PREFIX}${name}`);
  }
  return phaseDump(runSteps(row, factories), importRow(row).importDump);
}

function edgeTuples(actual: ReturnType<typeof phaseDump>): (string | boolean | null)[][] {
  return actual.edges.map((edge) => [edge.path, edge.src, edge.tgt, edge.reversed]).sort();
}

function constraints(actual: ReturnType<typeof phaseDump>): [string, string][] {
  return actual.changed
    .filter((entry) => 'edgeConstraint' in entry.props)
    .map((entry): [string, string] => [entry.path, (entry.props.edgeConstraint as { n: string }).n])
    .sort();
}

describe('EdgeAndLayerConstraintEdgeReverser (site rows)', () => {
  // oracle: sites/EdgeAndLayerConstraintEdgeReverser/feedbackNode/reversedEdge;
  // EdgeAndLayerConstraintEdgeReverser.java:287 (an edge that is already REVERSED is not reversed again)
  it('does not reverse an edge of a LAST node again, and marks the constrained nodes', () => {
    const actual = replaySite('reversedEdge');
    expect(edgeTuples(actual)).toEqual([
      ['g0/e0', 'g0/n0/p0', 'g0/n1/p0', false],
      ['g0/e1', 'g0/n1/p1', 'g0/n2/p0', false],
      ['g0/e2', 'g0/n3/p0', 'g0/n2/p1', true],
      ['g0/e3', 'g0/n4/p0', 'g0/n3/p1', false],
    ]);
    expect(constraints(actual)).toEqual([
      ['g0/n0', 'OUTGOING_ONLY'],
      ['g0/n3', 'OUTGOING_ONLY'],
    ]);
  });

  // oracle: sites/EdgeAndLayerConstraintEdgeReverser/feedbackNode/plain;
  // EdgeAndLayerConstraintEdgeReverser.java:181-201 (the feedback node test over the side-fixed node's ports)
  it('reverses nothing on the plain feedback graph, and marks the constrained nodes', () => {
    const actual = replaySite('plain');
    expect(edgeTuples(actual)).toEqual([
      ['g0/e0', 'g0/n0/p0', 'g0/n1/p0', false],
      ['g0/e1', 'g0/n1/p1', 'g0/n2/p0', false],
      ['g0/e2', 'g0/n2/p1', 'g0/n3/p0', false],
      ['g0/e3', 'g0/n4/p0', 'g0/n3/p1', false],
    ]);
    expect(constraints(actual)).toEqual([
      ['g0/n0', 'OUTGOING_ONLY'],
      ['g0/n3', 'OUTGOING_ONLY'],
    ]);
  });
});
