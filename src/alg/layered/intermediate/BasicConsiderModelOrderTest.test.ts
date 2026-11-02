// SPDX-License-Identifier: EPL-2.0
// Port of BasicConsiderModelOrderTest (mission 7c, T8): `test`, @TestAfterProcessor(SortByInputModelProcessor), whose
// Java body is `assert(true)` ("just check for errors that might occur"): the test passes when the pipeline reaches the
// stop in every configuration without throwing. The port asserts that too, and that the graph reached the stop with
// layers and with the MODEL_ORDER the importer attached.
//
// Row selection: the Java graph set is the ptolemy models, run under nine configurators that all set
// CROSSING_MINIMIZATION_STRATEGY = LAYER_SWEEP: the three ordering strategies NODES_AND_EDGES, PREFER_EDGES and
// PREFER_NODES, each plain, weighted (CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE and PORT_INFLUENCE = 0.001)
// and with CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER = true. The rows are
//  - recorded: the `models/ptolemy-*` rows whose last replayed entry is SORT_BY_INPUT_ORDER_OF_MODEL, which the recorder
//    runs under the PREFER_EDGES configurator (configuration label `PREFER_EDGES`), as recorded;
//  - derived: the three `models/ptolemy-*` rows with the label `P3/LAYER_SWEEP/model-order-NODES_AND_EDGES` (the only
//    ptolemy models the recorder runs under model order variants), cut after SORT_BY_INPUT_ORDER_OF_MODEL, once per
//    configurator with the configurator's options in place of the recorded ones (C4 encodings, as the recorder writes
//    them). Derived rows have no oracle expectation.
// Other model families, `scenarios/*` and `sites/*` rows are excluded.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/BasicConsiderModelOrderTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'SORT_BY_INPUT_ORDER_OF_MODEL';
const RECORDED_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/SORT_BY_INPUT_ORDER_OF_MODEL\/PREFER_EDGES$/;
const BASE_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/P3\/LAYER_SWEEP\/model-order-NODES_AND_EDGES$/;

const OPTION_PREFIX = 'org.eclipse.elk.layered.';
const CROSSING_MINIMIZATION_STRATEGY = `${OPTION_PREFIX}crossingMinimization.strategy`;
const CONSIDER_MODEL_ORDER_STRATEGY = `${OPTION_PREFIX}considerModelOrder.strategy`;
const NODE_INFLUENCE = `${OPTION_PREFIX}considerModelOrder.crossingCounterNodeInfluence`;
const PORT_INFLUENCE = `${OPTION_PREFIX}considerModelOrder.crossingCounterPortInfluence`;
const PORT_MODEL_ORDER = `${OPTION_PREFIX}considerModelOrder.portModelOrder`;
const ROOT_OPTION_SEPARATE_COMPONENTS = 'org.eclipse.elk.separateConnectedComponents';

type Options = Readonly<Record<string, unknown>>;

const layerSweep = { c: 'CrossingMinimizationStrategy', n: 'LAYER_SWEEP', t: 'enum' };
const ordering = (name: string): Options => ({ c: 'OrderingStrategy', n: name, t: 'enum' });
const weights: Options = {
  [NODE_INFLUENCE]: { t: 'double', v: '0.001' },
  [PORT_INFLUENCE]: { t: 'double', v: '0.001' },
};
const portModelOrder: Options = { [PORT_MODEL_ORDER]: { t: 'bool', v: true } };

/** The Java configurators (BasicConsiderModelOrderTest.java:53-160): label to options. */
const CONFIGURATORS: ReadonlyMap<string, Options> = new Map(
  (['NODES_AND_EDGES', 'PREFER_EDGES', 'PREFER_NODES'] as const).flatMap((strategy) =>
    (
      [
        [strategy, {}],
        [`${strategy}-weighted`, weights],
        [`${strategy}-port-model-order`, portModelOrder],
      ] as const
    ).map(([label, extra]): [string, Options] => [
      label,
      {
        [CROSSING_MINIMIZATION_STRATEGY]: layerSweep,
        [CONSIDER_MODEL_ORDER_STRATEGY]: ordering(strategy),
        [ROOT_OPTION_SEPARATE_COMPONENTS]: { t: 'bool', v: false },
        ...extra,
      },
    ]),
  ),
);

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

const all = loadOrderRows(ROWS_FILE);
const recorded = all.filter((row) => RECORDED_PATTERN.test(row.id) && row.prefix?.at(-1) === STOP);
const derived: OrderRow[] = all
  .filter((row) => BASE_PATTERN.test(row.id) && row.prefix?.at(-2) === STOP)
  .flatMap((row) =>
    [...CONFIGURATORS].map(([label, options]) => ({
      ...row,
      id: `${row.id}@${label}`,
      options,
      prefix: row.prefix!.slice(0, -1),
    })),
  );
const rows: readonly OrderRow[] = [...recorded, ...derived];

describe('BasicConsiderModelOrderTest on the replayed rows', () => {
  it('selects the recorded PREFER_EDGES rows and every configurator over the three variant-set ptolemy models', () => {
    expect(recorded.length).toBeGreaterThan(0);
    expect(derived.length).toBe(3 * CONFIGURATORS.size);
    expect(CONFIGURATORS.size).toBe(9);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: test', (_id, row) => {
    expect(row.prefix!.at(-1)).toBe(STOP);
    const graph = runOrderPrefix(row, factories);
    expect([...graph].length).toBeGreaterThan(0);
    const nodes = [...graph].flatMap((layer) => layer.getNodes());
    expect(nodes.some((node) => node.hasProperty(InternalProperties.MODEL_ORDER))).toBe(true);
  });
});
