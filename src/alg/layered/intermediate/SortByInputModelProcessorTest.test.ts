// SPDX-License-Identifier: EPL-2.0
// Port of SortByInputModelProcessorTest (mission 7c, T8): `preserveNodeAndEdgeOrder`, @TestAfterProcessor(
// LayerSweepCrossingMinimizer), configured with CROSSING_MINIMIZATION_STRATEGY = LAYER_SWEEP and
// CONSIDER_MODEL_ORDER_STRATEGY = NODES_AND_EDGES.
//
// Two describes. The second ('over the preserve_order models', mission 7f2, T13c) is the whole Java method: the 15
// vendored tests/layered/preserve_order/** models through the layout test runner (the real LayeredLayoutProvider, labels
// sized from layered-label-metrics.json), the Java configurator, @TestAfterProcessor(LayerSweepCrossingMinimizer) and
// the Java assertion body, 15 cases. The first describe is the 7c stand-in, kept as landed.
//
// Row selection (7c): none of the recorded rows can carry this method. Its graph set is tests/layered/preserve_order/**,
// whose models all have edge labels; their plans run LABEL_DUMMY_INSERTER, which 7c could not replay, so they were
// accepted refusals without rows. The label-free replicas (`scenarios/SortByInputModelProcessor/preserve-order-{small,long}`)
// stop at SORT_BY_INPUT_ORDER_OF_MODEL, and without the label dummies their layers are not the ones the model's node
// names (`l<layer>p<position>`, the layer counted with the label-dummy layers) encode, so the name assertion cannot
// hold on them; they are anchored by the oracle comparison of LayeredOrderVectors.test.ts instead. This test therefore
// replays two test-local label-free graphs whose names encode their real layers, through the real factories and exactly
// the processors the Java pipeline runs for the Java configuration up to P3_NODE_ORDERING/LAYER_SWEEP, and asserts the
// Java method on the result. Both graphs are authored here, are not recorded rows and have no oracle expectation: the
// Java invariant is the oracle. The root id is empty so that designations are the bare node ids, as in the Java
// models (an elkt root has no identifier; a JSON root id would prefix every designation, ElkGraphTransformerUtility).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/SortByInputModelProcessorTest.java
import { describe, expect, it } from 'vitest';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import type { OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { LayoutConfigurator } from '../../../core/LayoutConfigurator.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkNodeImpl } from '../../../graph/impl/ElkNodeImpl.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayerSweepCrossingMinimizer } from '../p3order/LayerSweepCrossingMinimizer.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

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

/** The pipeline of the Java configuration up to the stop, as the oracle rows with model order spell it. */
const PREFIX = [
  'P1_CYCLE_BREAKING/GREEDY',
  'P2_LAYERING/NETWORK_SIMPLEX',
  'LONG_EDGE_SPLITTER',
  'PORT_SIDE_PROCESSOR',
  'PORT_LIST_SORTER',
  'SORT_BY_INPUT_ORDER_OF_MODEL',
  'P3_NODE_ORDERING/LAYER_SWEEP',
] as const;

const NODE_SIZE = 30;
const LAYOUT_OPTIONS = {
  'crossingMinimization.strategy': 'LAYER_SWEEP',
  'considerModelOrder.strategy': 'NODES_AND_EDGES',
} as const;

/** The label-free graph: node ids name their layer and position, `edges` are source-target id pairs in model order. */
function graphRow(id: string, nodes: readonly string[], edges: readonly (readonly [string, string])[]): OrderRow {
  return {
    id,
    group: 'scenarios',
    input: {
      elk: {
        id: '',
        layoutOptions: LAYOUT_OPTIONS,
        children: nodes.map((name) => ({ id: name, x: 0, y: 0, width: NODE_SIZE, height: NODE_SIZE })),
        edges: edges.map(([source, target], index) => ({
          id: `e${String(index)}`,
          sources: [source],
          targets: [target],
        })),
      },
    },
    target: null,
    options: {},
    steps: null,
    prefix: PREFIX,
    expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [], ports: {} },
  } as unknown as OrderRow;
}

const rows: readonly OrderRow[] = [
  graphRow(
    'small',
    ['l0p0', 'l1p0', 'l1p1'],
    [
      ['l0p0', 'l1p0'],
      ['l0p0', 'l1p1'],
    ],
  ),
  graphRow(
    'long-edges',
    ['l0p0', 'l1p0', 'l2p0', 'l2p1'],
    [
      ['l0p0', 'l1p0'],
      ['l1p0', 'l2p0'],
      ['l0p0', 'l2p1'],
      ['l1p0', 'l2p1'],
    ],
  ),
];

function preserveNodeAndEdgeOrder(lgraph: LGraph): number {
  let layerIndex = 0;
  let normalNodes = 0;
  for (const layer of lgraph) {
    let nodeIndex = 0;
    for (const node of layer.getNodes()) {
      if (node.getType() === NodeType.NORMAL) {
        expect(node.toString(), 'A node is on an unexpected position.').toBe(
          `n_l${String(layerIndex)}p${String(nodeIndex)}`,
        );
        normalNodes++;
      }
      nodeIndex++;
    }
    layerIndex++;
  }
  return normalNodes;
}

describe('SortByInputModelProcessorTest on label-free graphs', () => {
  it.each(rows.map((row) => [row.id, row] as const))('%s: preserveNodeAndEdgeOrder', (_id, row) => {
    const normalNodes = preserveNodeAndEdgeOrder(runOrderPrefix(row, factories));
    expect(normalNodes).toBe((row.input as { elk: { children: unknown[] } }).elk.children.length);
  });
});

/** The Java `@ConfiguratorProvider preserveOrderConfigurator`, applied the way `ConfiguratorTestConfiguration` does. */
function preserveOrderConfigurator(graph: ElkNode): void {
  const config = new LayoutConfigurator();
  config
    .configure(ElkNodeImpl)
    .setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.LAYER_SWEEP);
  config
    .configure(ElkNodeImpl)
    .setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.NODES_AND_EDGES);
  ElkUtil.applyVisitors(graph, config);
}

defineLayoutTest({
  name: 'SortByInputModelProcessorTest over the preserve_order models',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tests/layered/preserve_order/**' }],
  configurators: { preserveOrderConfigurator },
  afterProcessor: [
    {
      name: 'preserveNodeAndEdgeOrder',
      cls: LayerSweepCrossingMinimizer,
      check: (lGraph) => {
        preserveNodeAndEdgeOrder(lGraph);
      },
    },
  ],
});
