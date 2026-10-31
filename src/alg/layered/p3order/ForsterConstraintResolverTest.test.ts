// SPDX-License-Identifier: EPL-2.0
// Port of ForsterConstraintResolverTest (mission 7c, T8): `testSuccessorConstraints` and `testNonOverlappingLayoutUnits`,
// both @TestAfterProcessor(LayerSweepCrossingMinimizer).
//
// Row selection: the Java graph set is tickets/layered/528_nodeEdgeOverlap.elkt and 528_violatedNodeOrder.elkt under
// @DefaultConfiguration (no configurator). The rows are the `models/ticket-528-*` rows, on every level the recorder
// replayed, that stop at P3_NODE_ORDERING/LAYER_SWEEP with the default options (configuration label `P3/LAYER_SWEEP`).
// The greedy, thoroughness, model-order, semi-interactive and sweepiness variants of those models are other
// configurations than the Java test's and are excluded; so are `scenarios/*` and `sites/*`.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/ForsterConstraintResolverTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'P3_NODE_ORDERING/LAYER_SWEEP';
const ID_PATTERN = /^models\/ticket-528-(nodeEdgeOverlap|violatedNodeOrder)\/[^/]+\/P3\/LAYER_SWEEP$/;

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

/** Test whether the order of nodes respects each node's IN_LAYER_SUCCESSOR_CONSTRAINTS (Java :69-85). */
function testSuccessorConstraints(graph: LGraph): void {
  for (const layer of graph) {
    // We iterate over the layer's nodes and remember the one's we've already seen. If a successor constraint
    // includes a node we've already seen, we fail
    const encounteredNodes = new Set<LNode>();
    for (const node of layer) {
      if (node.hasProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS)) {
        const violation = node
          .getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS)
          .some((n) => encounteredNodes.has(n));
        expect(violation, `Successor constraints are not respected for ${node.toString()}`).toBe(false);
      }

      encounteredNodes.add(node);
    }
  }
}

/** Nodes may be part of layout units, which must be adhered to even after in-layer constraints are resolved (Java :90-117). */
function testNonOverlappingLayoutUnits(graph: LGraph): void {
  for (const layer of graph) {
    // We iterate over the layer's nodes and keep track of two things: the layout units we've encountered so
    // far, and the current layout unit. Layout units are identified through a representing node.
    const encounteredLayoutUnits = new Set<LNode>();
    let currentLayoutUnit: LNode | null = null;

    for (const node of layer) {
      const newLayoutUnit = node.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT) as LNode | null;

      if (newLayoutUnit !== null && newLayoutUnit !== currentLayoutUnit) {
        // We have a node which does not belong to the current layout unit. That's okay if the new layout
        // unit has not been encountered before (if it has, nodes of different layout units overlap)
        expect(
          encounteredLayoutUnits.has(newLayoutUnit),
          `Node ${newLayoutUnit.toString()} is overlapping with the current layout unit`,
        ).toBe(false);

        if (currentLayoutUnit !== null) {
          encounteredLayoutUnits.add(currentLayoutUnit);
        }

        currentLayoutUnit = newLayoutUnit;
      }
    }
  }
}

describe('ForsterConstraintResolverTest on the replayed rows', () => {
  it('selects the default-configuration LAYER_SWEEP rows of both 528 models', () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((row) => row.id.split('/')[1]))).toEqual(
      new Set(['ticket-528-nodeEdgeOverlap', 'ticket-528-violatedNodeOrder']),
    );
  });

  describe.each([
    ['testSuccessorConstraints', testSuccessorConstraints],
    ['testNonOverlappingLayoutUnits', testNonOverlappingLayoutUnits],
  ] as const)('%s', (_name, check) => {
    it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      const graph = runOrderPrefix(row, factories);
      expect([...graph].length).toBeGreaterThan(0);
      check(graph);
    });
  });
});
