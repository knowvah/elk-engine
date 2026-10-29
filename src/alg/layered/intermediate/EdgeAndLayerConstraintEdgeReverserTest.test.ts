// SPDX-License-Identifier: EPL-2.0
// Port of EdgeAndLayerConstraintEdgeReverserTest.testLayerConstraints over every row whose last replayed entry is
// EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER (mission 7b, T8).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverserTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

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

const PROCESSOR = 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER';
const rows = allRows.filter((row) => lastEntry(row) === PROCESSOR);

/** EdgeAndLayerConstraintEdgeReverserTest.java:56-82. */
function testLayerConstraints(graph: LGraph): void {
  for (const node of graph.getLayerlessNodes()) {
    const constr = node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
    if (constr === LayerConstraint.FIRST) {
      // either no incoming edges or only from FIRST_SEPARATE nodes
      for (const inc of node.getIncomingEdges()) {
        const src = inc.getSource()!.getNode()!;
        expect(src.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT) === LayerConstraint.FIRST_SEPARATE).toBe(true);
      }
    } else if (constr === LayerConstraint.LAST) {
      // either no outgoing edges or only to LAST_SEPARATE nodes
      for (const inc of node.getOutgoingEdges()) {
        const src = inc.getTarget()!.getNode()!;
        expect(src.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT) === LayerConstraint.LAST_SEPARATE).toBe(true);
      }
    } else if (constr === LayerConstraint.FIRST_SEPARATE) {
      expect([...node.getIncomingEdges()]).toEqual([]);
    } else if (constr === LayerConstraint.LAST_SEPARATE) {
      expect([...node.getOutgoingEdges()]).toEqual([]);
    }
  }
}

describe('EdgeAndLayerConstraintEdgeReverserTest on the replayed rows', () => {
  it('covers the four scenario rows that end in the processor', () => {
    expect(rows.map((row) => row.id)).toEqual([
      'scenarios/EdgeAndLayerConstraintEdgeReverser/first-last',
      'scenarios/EdgeAndLayerConstraintEdgeReverser/last-separate',
      'scenarios/EdgeAndLayerConstraintEdgeReverser/feedback-node',
      'scenarios/EdgeAndLayerConstraintEdgeReverser/feedback-node-blocked',
    ]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testLayerConstraints', (_id, row) => {
    testLayerConstraints(replay(row));
  });
});
