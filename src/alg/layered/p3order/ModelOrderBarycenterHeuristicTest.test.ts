// SPDX-License-Identifier: EPL-2.0
// Port of ModelOrderBarycenterHeuristicTest (mission 7c, T8): `testModelOrderRespected`, @TestAfterProcessor(
// LayerSweepCrossingMinimizer).
//
// Row selection: the Java configurator sets CROSSING_MINIMIZATION_STRATEGY = LAYER_SWEEP, CONSIDER_MODEL_ORDER_STRATEGY
// = NODES_AND_EDGES, CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER = true and CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE =
// OFF, over the ptolemy models. The recorder has the first three as the configuration label
// `P3/LAYER_SWEEP/model-order-NODES_AND_EDGES-force-node-order` but leaves the greedy switch at its default. The
// selected rows are the `models/ptolemy-*` rows with that label that stop at P3_NODE_ORDERING/LAYER_SWEEP; each is
// replayed as a derived row that adds the missing greedy-switch option (a C4 value, the same encoding the recorder
// writes), so the replay runs exactly the Java configuration. The derived rows have no oracle expectation; the Java
// invariant is the oracle. The non-ptolemy rows with that label are excluded (not the Java graph set).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/ModelOrderBarycenterHeuristicTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'P3_NODE_ORDERING/LAYER_SWEEP';
const ID_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/P3\/LAYER_SWEEP\/model-order-NODES_AND_EDGES-force-node-order$/;
const GREEDY_SWITCH_TYPE_ID = 'org.eclipse.elk.layered.crossingMinimization.greedySwitch.type';
const GREEDY_SWITCH_OFF = { c: 'GreedySwitchType', n: 'OFF', t: 'enum' } as const;

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

const recorded = loadOrderRows(ROWS_FILE).filter((row) => ID_PATTERN.test(row.id) && row.prefix?.at(-1) === STOP);
const rows: OrderRow[] = recorded.map((row) => ({
  ...row,
  options: { ...row.options, [GREEDY_SWITCH_TYPE_ID]: GREEDY_SWITCH_OFF },
}));

// Just check for errors that might occur (Java :74-92)
function testModelOrderRespected(graph: LGraph): number {
  let checked = 0;
  for (const layer of graph) {
    // We iterate over the layer's nodes check whether the real nodes (the one with a model order)
    // are correctly ordered.
    let modelOrder = -1;
    for (const node of layer) {
      if (node.hasProperty(InternalProperties.MODEL_ORDER)) {
        const newModelOrder = node.getProperty(InternalProperties.MODEL_ORDER);
        expect(
          newModelOrder > modelOrder,
          `Node ${node.toString()} has model order ${String(newModelOrder)}, which is smaller than the previous model order of ${String(modelOrder)}`,
        ).toBe(true);
        modelOrder = newModelOrder;
        checked++;
      }
    }
  }
  return checked;
}

describe('ModelOrderBarycenterHeuristicTest on the replayed rows', () => {
  it('selects the ptolemy force-node-order rows and derives the greedy-switch OFF configuration', () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.id.startsWith('models/ptolemy-'))).toBe(true);
    expect(
      rows.every((row) => JSON.stringify(row.options[GREEDY_SWITCH_TYPE_ID]) === JSON.stringify(GREEDY_SWITCH_OFF)),
    ).toBe(true);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testModelOrderRespected', (_id, row) => {
    expect(testModelOrderRespected(runOrderPrefix(row, factories))).toBeGreaterThan(0);
  });
});
