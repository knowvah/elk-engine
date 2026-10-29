// SPDX-License-Identifier: EPL-2.0
// Port of PartitionPostProcessorTest (noEmptyLayerTest, testPartitionOrder) over every row whose last replayed entry is
// PARTITION_POSTPROCESSOR (mission 7b, T8).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/PartitionPostProcessorTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
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

const PROCESSOR = 'PARTITION_POSTPROCESSOR';
/**
 * The Java class runs with the default configuration (default layerer); the BF/DF model-order variants of the rows are
 * not partition-aware layerings and are left out of the partition-order check.
 */
const NOT_TEST_LAYERERS: ReadonlySet<string> = new Set(['BF_MODEL_ORDER', 'DF_MODEL_ORDER']);
const rows = allRows.filter(
  (row) => lastEntry(row) === PROCESSOR && !NOT_TEST_LAYERERS.has(row.id.slice(row.id.lastIndexOf('/') + 1)),
);

/** PartitionPostProcessorTest.java:~55-65 (noEmptyLayerTest). */
function noEmptyLayerTest(lGraph: LGraph): void {
  for (const layer of lGraph) {
    expect(layer.getNodes().length === 0).toBe(false);
  }
}

/** PartitionPostProcessorTest.java:~67-96 (testPartitionOrder). */
function testPartitionOrder(lGraph: LGraph): void {
  let lastPartition = -1;
  for (const layer of lGraph) {
    // Set to invalid partition
    let currentPartition = -1;

    for (const node of layer) {
      if (node.getType() === NodeType.NORMAL && node.hasProperty(LayeredOptions.PARTITIONING_PARTITION)) {
        const nodePartition = node.getProperty(LayeredOptions.PARTITIONING_PARTITION);
        if (currentPartition === -1) {
          currentPartition = nodePartition;
        } else {
          expect(nodePartition).toBe(currentPartition);
        }
      }
    }

    expect(lastPartition <= currentPartition).toBe(true);
    lastPartition = currentPartition;
  }
}

describe('PartitionPostProcessorTest on the replayed rows', () => {
  it('covers the 24 models rows and the one scenario row ending in the postprocessor', () => {
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(24);
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(1);
  });

  describe.each([
    ['noEmptyLayerTest', noEmptyLayerTest],
    ['testPartitionOrder', testPartitionOrder],
  ] as const)('%s', (_name, check) => {
    it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      check(replay(row));
    });
  });
});
