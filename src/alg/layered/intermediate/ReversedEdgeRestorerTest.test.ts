// SPDX-License-Identifier: EPL-2.0
// Port of ReversedEdgeRestorerTest.testRemovedNodes over every row whose steps run REVERSED_EDGE_RESTORER (mission 7b,
// T8).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/ReversedEdgeRestorerTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
// `sites/*` rows are branch probes with crafted pre-states (a pre-reversed edge, external port dummies, cleared
// constraints) that the Java test configurations never produce; the Java invariants are claimed for pipeline states
// only, so those rows are anchored by their own cases (T12), not run through this test (T11 journal row).
const allRows = loadRows(ROWS_FILE).filter((row) => row.group !== 'sites');

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

const PROCESSOR = 'REVERSED_EDGE_RESTORER';
const rows = allRows.filter(
  (row) => row.steps?.some(([op, name]) => op === 'runProcessor' && name === PROCESSOR) === true,
);

/** ReversedEdgeRestorerTest.java:61-70. */
function testRemovedNodes(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      for (const edge of node.getOutgoingEdges()) {
        expect(edge.getProperty(InternalProperties.REVERSED)).toBe(false);
      }
    }
  }
}

describe('ReversedEdgeRestorerTest on the replayed rows', () => {
  it('covers the two scenario rows that run the restorer', () => {
    expect(rows.map((row) => row.id)).toEqual([
      'scenarios/ReversedEdgeRestorer/back-edges',
      'scenarios/ReversedEdgeRestorer/none-reversed',
    ]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testRemovedNodes', (_id, row) => {
    testRemovedNodes(replay(row));
  });
});
