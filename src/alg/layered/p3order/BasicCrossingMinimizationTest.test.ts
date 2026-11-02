// SPDX-License-Identifier: EPL-2.0
// Port of BasicCrossingMinimizationTest (mission 7c, T8): `ensureLayerAssignmentUnchanged`, which the Java runs as both
// @TestBeforeProcessor and @TestAfterProcessor of LayerSweepCrossingMinimizer (the "2 tests" of the brief are these two
// annotations on the one method): the first call records which nodes each layer holds, the second verifies that the
// crossing minimizer moved none to another layer.
//
// Row selection: the `models/*` rows of test/golden/refs/java/layered-order.json that stop at P3_NODE_ORDERING/
// LAYER_SWEEP with the default options of that stop (the id's configuration label is `P3/LAYER_SWEEP`), the one
// configurator of the Java test (CROSSING_MINIMIZATION_STRATEGY = LAYER_SWEEP, which is also the default). Each row is
// replayed through the real factories to the entry before the phase, the Java method is called, the phase runs, the Java
// method is called again. `scenarios/*` and `sites/*` rows are excluded: the Java graph set is the `tests/**` models.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/BasicCrossingMinimizationTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'P3_NODE_ORDERING/LAYER_SWEEP';
const CONFIGURATION_SUFFIX = '/P3/LAYER_SWEEP';

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

const rows = loadOrderRows(ROWS_FILE).filter(
  (row) => row.group === 'models' && row.id.endsWith(CONFIGURATION_SUFFIX) && row.prefix?.at(-1) === STOP,
);

/** The test class: `layerAssignments` is an instance field in the Java (BasicCrossingMinimizationTest.java:61). */
class BasicCrossingMinimizationTest {
  private readonly layerAssignments = new Map<LGraph, Map<Layer, Set<LNode>>>();

  ensureLayerAssignmentUnchanged(lgraph: LGraph): void {
    if (this.layerAssignments.has(lgraph)) {
      this.verifyLayerAssignment(lgraph);
    } else {
      this.recordLayerAssignment(lgraph);
    }
  }

  private verifyLayerAssignment(lgraph: LGraph): void {
    const layerAssignment = this.layerAssignments.get(lgraph)!;
    this.layerAssignments.delete(lgraph);

    for (const layer of lgraph) {
      for (const node of layer) {
        // node in the same layer?
        expect(layerAssignment.get(layer)?.has(node) === true).toBe(true);
      }
    }
  }

  private recordLayerAssignment(lgraph: LGraph): void {
    const layerAssignment = new Map<Layer, Set<LNode>>();

    for (const layer of lgraph) {
      for (const node of layer) {
        const nodes = layerAssignment.get(layer) ?? new Set<LNode>();
        nodes.add(node);
        layerAssignment.set(layer, nodes);
      }
    }

    this.layerAssignments.set(lgraph, layerAssignment);
  }
}

function check(row: OrderRow): { before: number; after: number } {
  const stopIndex = row.prefix!.length - 1;
  const graph = runOrderPrefix({ ...row, prefix: row.prefix!.slice(0, stopIndex) }, factories);
  const test = new BasicCrossingMinimizationTest();
  test.ensureLayerAssignmentUnchanged(graph);
  const before = [...graph].reduce((sum, layer) => sum + layer.getNodes().length, 0);
  const separator = STOP.indexOf('/');
  factories
    .createPhase(STOP.slice(0, separator), STOP.slice(separator + 1))
    .process(graph, new NullElkProgressMonitor());
  test.ensureLayerAssignmentUnchanged(graph);
  const after = [...graph].reduce((sum, layer) => sum + layer.getNodes().length, 0);
  return { before, after };
}

describe('BasicCrossingMinimizationTest on the replayed rows', () => {
  it('selects the default-configuration LAYER_SWEEP rows', () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.group === 'models')).toBe(true);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: ensureLayerAssignmentUnchanged', (_id, row) => {
    const { before, after } = check(row);
    expect(before).toBeGreaterThan(0);
    expect(after).toBe(before);
  });
});
