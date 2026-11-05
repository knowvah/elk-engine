// SPDX-License-Identifier: EPL-2.0
// Structural tests of the plan names: every expected name is read from the enum member whose `create()` made the
// instance, so no name is spelled by hand beyond the two GraphTransformer rule names the task fixes. GraphTransformer
// itself is staged, so the position rule is proven on a stand-in class through `planNamesWith` and, once the real class
// is ported, again through `planNames`.
import { describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../../src/alg/layered/p5edges/EdgeRouterFactory.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import {
  DIRECTION_POSTPROCESSOR,
  DIRECTION_PREPROCESSOR,
  PHASE_SEPARATOR,
  planNames,
  planNamesWith,
  tableFrom,
} from './layered-pipeline-replay-names.js';

const asProcessor = (p: unknown): ILayoutProcessor<LGraph> => p as ILayoutProcessor<LGraph>;

class StandInTransformer {
  process(): void {}
}
class StandInOther {
  process(): void {}
}

function transformerTable(): ReturnType<typeof tableFrom> {
  return tableFrom('', [
    { name: () => DIRECTION_PREPROCESSOR, create: () => new StandInTransformer() },
    { name: () => DIRECTION_POSTPROCESSOR, create: () => new StandInTransformer() },
    { name: () => 'LABEL_DUMMY_INSERTER', create: () => new StandInOther() },
  ]);
}

function graphTransformerPorted(): boolean {
  try {
    IntermediateProcessorStrategy.DIRECTION_PREPROCESSOR.create();
    return true;
  } catch {
    return false;
  }
}

describe('planNamesWith', () => {
  it('names a GraphTransformer first and last by position', () => {
    const plan = [new StandInTransformer(), new StandInOther(), new StandInTransformer()].map(asProcessor);
    expect(planNamesWith(transformerTable(), plan)).toEqual([
      DIRECTION_PREPROCESSOR,
      'LABEL_DUMMY_INSERTER',
      DIRECTION_POSTPROCESSOR,
    ]);
  });

  it('rejects an instance the table does not know, naming its position and class', () => {
    expect(() => planNamesWith(transformerTable(), [asProcessor(new StandInOther()), asProcessor({})])).toThrow(
      'plan entry 1 (Object) names no enum member',
    );
  });
});

describe('planNames', () => {
  it.skipIf(!graphTransformerPorted())('names the real GraphTransformer first and last by position', () => {
    const { DIRECTION_PREPROCESSOR: pre, DIRECTION_POSTPROCESSOR: post } = IntermediateProcessorStrategy;
    expect(planNames([pre.create(), post.create()])).toEqual([DIRECTION_PREPROCESSOR, DIRECTION_POSTPROCESSOR]);
  });

  it('names an intermediate processor by its enum member', () => {
    const member = IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER;
    expect(planNames([member.create()])).toEqual([member.name()]);
  });

  it('names phases as PHASE/STRATEGY', () => {
    const phases = [
      LayeringStrategy.NETWORK_SIMPLEX,
      CrossingMinimizationStrategy.INTERACTIVE,
      NodePlacementStrategy.BRANDES_KOEPF,
    ];
    expect(planNames(phases.map((s) => asProcessor(s.create())))).toEqual([
      `P2_LAYERING${PHASE_SEPARATOR}${LayeringStrategy.NETWORK_SIMPLEX.name()}`,
      `P3_NODE_ORDERING${PHASE_SEPARATOR}${CrossingMinimizationStrategy.INTERACTIVE.name()}`,
      `P4_NODE_PLACEMENT${PHASE_SEPARATOR}${NodePlacementStrategy.BRANDES_KOEPF.name()}`,
    ]);
  });

  it('names an edge router phase by its EdgeRouting', () => {
    const router = EdgeRouterFactory.factoryFor(EdgeRouting.POLYLINE).create();
    expect(planNames([asProcessor(router)])).toEqual([
      `P5_EDGE_ROUTING${PHASE_SEPARATOR}${EdgeRouting.POLYLINE.name()}`,
    ]);
  });

  it('names the greedy switch processors and the sweep phases apart without a hint', () => {
    const { ONE_SIDED_GREEDY_SWITCH: one, TWO_SIDED_GREEDY_SWITCH: two } = IntermediateProcessorStrategy;
    const { LAYER_SWEEP: layer, MEDIAN_LAYER_SWEEP: median } = CrossingMinimizationStrategy;
    const prefix = `P3_NODE_ORDERING${PHASE_SEPARATOR}`;
    expect(planNames([asProcessor(layer.create()), one.create(), two.create()])).toEqual([
      `${prefix}${layer.name()}`,
      one.name(),
      two.name(),
    ]);
    expect(planNames([asProcessor(median.create())])).toEqual([`${prefix}${median.name()}`]);
  });

  it('names the orthogonal router P5_EDGE_ROUTING/ORTHOGONAL, not UNDEFINED', () => {
    const router = EdgeRouterFactory.factoryFor(EdgeRouting.ORTHOGONAL).create();
    expect(planNames([asProcessor(router)])).toEqual([
      `P5_EDGE_ROUTING${PHASE_SEPARATOR}${EdgeRouting.ORTHOGONAL.name()}`,
    ]);
  });

  it('rejects an instance no enum member creates, naming its position and class', () => {
    expect(() => planNames([asProcessor(new StandInOther())])).toThrow(
      'plan entry 0 (StandInOther) names no enum member',
    );
  });
});
