// SPDX-License-Identifier: EPL-2.0
// Port of BasicLayerAssignmentTest (testNoLayerlessNodes, testNoEmptyLayers, testEdgesPointTowardsNextLayers), run over the
// replayed graphs of every `models/*` row whose prefix ends in a P2_LAYERING phase (mission 7b, T8).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p2layers/BasicLayerAssignmentTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const allRows = loadRows(ROWS_FILE);

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

const LAYERING_PREFIX = 'P2_LAYERING/';
/**
 * The Java class lists no BF/DF model-order layerer among its `@TestAfterProcessor` targets (and runs with the default
 * configuration otherwise): their rows replay as recorded, but their layerings need not point every edge forward.
 */
const NOT_TEST_TARGETS: ReadonlySet<string> = new Set(['P2_LAYERING/BF_MODEL_ORDER', 'P2_LAYERING/DF_MODEL_ORDER']);
const rows = allRows.filter((row) => {
  const last = lastEntry(row);
  return row.group === 'models' && last?.startsWith(LAYERING_PREFIX) === true && !NOT_TEST_TARGETS.has(last);
});

// BasicLayerAssignmentTest.java:135-186, bodies verbatim (assertTrue/assertFalse become `expect`).
function testNoLayerlessNodes(lGraph: LGraph): void {
  expect(lGraph.getLayerlessNodes().length === 0).toBe(true);
}

function testNoEmptyLayers(lGraph: LGraph): void {
  for (const layer of lGraph) {
    expect(layer.getNodes().length === 0).toBe(false);
  }
}

function testEdgesPointTowardsNextLayers(lGraph: LGraph): void {
  // Assign increasing IDs to the layers
  let nextLayerId = 0;
  for (const layer of lGraph) {
    layer.id = nextLayerId++;
  }

  for (const layer of lGraph) {
    for (const node of layer) {
      const nodeLayerId = node.getLayer()!.id;

      for (const edge of node.getOutgoingEdges()) {
        expect(nodeLayerId < edge.getTarget()!.getNode()!.getLayer()!.id).toBe(true);
      }
    }
  }
}

describe('BasicLayerAssignmentTest on the replayed models rows', () => {
  it('covers the 88 models rows ending in a layerer other than BF and DF model order', () => {
    expect(rows).toHaveLength(88);
  });

  describe.each([
    ['testNoLayerlessNodes', testNoLayerlessNodes],
    ['testNoEmptyLayers', testNoEmptyLayers],
    ['testEdgesPointTowardsNextLayers', testEdgesPointTowardsNextLayers],
  ] as const)('%s', (_name, check) => {
    it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      check(replay(row));
    });
  });
});
