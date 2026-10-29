// SPDX-License-Identifier: EPL-2.0
// Port of NodePromotionTest over every row whose last replayed entry is NODE_PROMOTION (mission 7b, T8). The Java methods
// delegate to `new BasicLayerAssignmentTest()`; those three bodies are repeated here (importing the test file would
// re-register its tests).
//
// Row filter (layerer pairing): NodePromotionTest.java:87-96 configures MODEL_ORDER_LEFT_TO_RIGHT together with
// LayeringStrategy.LONGEST_PATH_SOURCE and :98-107 MODEL_ORDER_RIGHT_TO_LEFT together with LONGEST_PATH; the five other
// configurators (:111-118, `configuratorFor`) set only the promotion strategy and so constrain no layerer. The three
// methods therefore run on every row except one that pairs a MODEL_ORDER_* strategy with another layerer than Java's.
// Such rows (LEFT_TO_RIGHT over LONGEST_PATH) replay as the oracle recorded, but Java never asserts the invariants on
// them and they do not hold.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/NodePromotionTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';

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

const PROCESSOR = 'NODE_PROMOTION';
const PROMOTION_STRATEGY_ID = 'org.eclipse.elk.layered.layering.nodePromotion.strategy';
const LAYERING_ENTRY_PREFIX = 'P2_LAYERING/';
/** NodePromotionTest.java:87-107: the layerer each MODEL_ORDER_* promotion strategy is configured with. */
const JAVA_LAYERER: Readonly<Record<string, string>> = {
  MODEL_ORDER_LEFT_TO_RIGHT: 'LONGEST_PATH_SOURCE',
  MODEL_ORDER_RIGHT_TO_LEFT: 'LONGEST_PATH',
};

/** The row's promotion strategy name: the recorded option, or the `setProperty` step of a step row. */
function promotionStrategy(row: PhaseRow): string | undefined {
  const option = row.options[PROMOTION_STRATEGY_ID] as { n: string } | undefined;
  const step = row.steps?.find(([op, , id]) => op === 'setProperty' && id === PROMOTION_STRATEGY_ID);
  return option?.n ?? (step === undefined ? undefined : (step[3] as { n: string }).n);
}

/** The layerer a pipeline row ran (a step row builds its layers by hand and names none). */
function layerer(row: PhaseRow): string | undefined {
  return row.prefix?.find((entry) => entry.startsWith(LAYERING_ENTRY_PREFIX))?.slice(LAYERING_ENTRY_PREFIX.length);
}

function pairsWithJavaLayerer(row: PhaseRow): boolean {
  const expected = JAVA_LAYERER[promotionStrategy(row) ?? ''];
  return expected === undefined || layerer(row) === undefined || layerer(row) === expected;
}

const candidates = allRows.filter((row) => lastEntry(row) === PROCESSOR);
const rows = candidates.filter(pairsWithJavaLayerer);
const unpaired = candidates.filter((row) => !pairsWithJavaLayerer(row));
/**
 * Rows that reach the processor through the real phases. A step row builds its layers with the `layers` op (the X4
 * pattern), which by design leaves the graph's layerless list alone, so `testNoLayerlessNodes` (SC2: it asserts the
 * outcome of a full layerer run) is checked on these rows only.
 */
const pipelineRows = rows.filter((row) => row.prefix !== null);

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

describe('NodePromotionTest on the replayed rows', () => {
  it('replays every candidate row, leaving out only MODEL_ORDER_* rows over a layerer Java does not pair', () => {
    expect(rows.length + unpaired.length).toBe(candidates.length);
    expect(unpaired.length).toBeGreaterThan(0);
    for (const row of unpaired) {
      expect(JAVA_LAYERER[promotionStrategy(row)!]).not.toBe(layerer(row));
    }
    expect(rows.some((row) => row.group === 'models')).toBe(true);
    expect(rows.some((row) => row.group === 'scenarios')).toBe(true);
  });

  describe.each([
    ['testNoLayerlessNodes', testNoLayerlessNodes, pipelineRows],
    ['testNoEmptyLayers', testNoEmptyLayers, rows],
    ['testEdgesPointTowardsNextLayers', testEdgesPointTowardsNextLayers, rows],
  ] as const)('%s', (_name, check, checked) => {
    it.each(checked.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      check(replay(row));
    });
  });
});
