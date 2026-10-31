// SPDX-License-Identifier: EPL-2.0
// Port of LongEdgeSplitterTest (mission 7c, T8): `testEdgesBetweenAdjacentLayers`, @TestAfterProcessor(LongEdgeSplitter).
//
// Row selection: the Java graph set is the ptolemy models under @DefaultConfiguration (no configurator). The rows are the
// `models/ptolemy-*` rows of test/golden/refs/java/layered-order.json whose last replayed entry is LONG_EDGE_SPLITTER
// with the default options (configuration label `default`). The other model families, `scenarios/*` and `sites/*` rows
// are excluded.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LongEdgeSplitterTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'LONG_EDGE_SPLITTER';
const ID_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/LONG_EDGE_SPLITTER\/default$/;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      default:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
    }
  },
};

const rows = loadOrderRows(ROWS_FILE).filter((row) => ID_PATTERN.test(row.id) && row.prefix?.at(-1) === STOP);

/** All edges connect directly adjacent layer where the source layer's index is smaller than the target layer's index (Java :56-75). */
function testEdgesBetweenAdjacentLayers(lGraph: LGraph): void {
  // Assign layer IDs
  let nextLayerId = 0;
  for (const layer of lGraph) {
    layer.id = nextLayerId++;
  }

  for (const layer of lGraph) {
    for (const node of layer) {
      for (const edge of node.getOutgoingEdges()) {
        // increasing layer ID
        expect(layer.id < edge.getTarget()!.getNode()!.getLayer()!.id).toBe(true);

        // directly adjacent index
        expect(layer.id + 1 === edge.getTarget()!.getNode()!.getLayer()!.id).toBe(true);
      }
    }
  }
}
describe('LongEdgeSplitterTest on the replayed rows', () => {
  it('selects the ptolemy LONG_EDGE_SPLITTER rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testEdgesBetweenAdjacentLayers', (_id, row) => {
    const graph = runOrderPrefix(row, factories);
    expect([...graph].length).toBeGreaterThan(0);
    testEdgesBetweenAdjacentLayers(graph);
  });
});
