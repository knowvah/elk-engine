// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue734Test: orthogonal edges are centred between the nodes of the top level. Java: `@Algorithm`, one
 * `@GraphResourceProvider` over three models, one `@Test`, no `@DefaultConfiguration` (3 oracle runs); the models are
 * vendored under `compound/` (mission 7h, T1). The Java class extends `TestGraphCreator` and uses nothing of it, so the
 * port does not either.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue734Test.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const MODELS = [
  'tickets/layered/734_nodeEdgeSpacingFlat.elkt',
  'tickets/layered/734_nodeEdgeSpacingFlatMoreComplex.elkt',
  'tickets/layered/734_nodeEdgeSpacingHierarchical.elkt',
];
// vendored under `compound/`; the models repository holds them at the Java path
const GRAPHS = [...MODELS.map((path) => ({ path: `compound/${path}` })), ...MODELS.map((path) => ({ path }))];

class CoordinateSpan {
  min = Number.POSITIVE_INFINITY;
  max = Number.NEGATIVE_INFINITY;

  constructor(min?: number, max?: number) {
    if (min !== undefined && max !== undefined) {
      this.min = min;
      this.max = max;
    }
  }
}

function computeNodeCoordinateSpan(nodes: Iterable<ElkNode>): CoordinateSpan {
  const span = new CoordinateSpan();
  // `mapToDouble(...).min().orElse(0)` / `.max().orElse(0)`
  const list = [...nodes];
  span.min = list.length === 0 ? 0 : Math.min(...list.map((node) => node.getX()));
  span.max = list.length === 0 ? 0 : Math.max(...list.map((node) => node.getX() + node.getWidth()));
  return span;
}

function computeEdgeCoordinateSpan(containedEdges: Iterable<ElkEdge>): CoordinateSpan {
  // `DoubleSummaryStatistics`: +Infinity / -Infinity when no value is seen
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const edge of containedEdges) {
    for (const section of edge.getSections()) {
      for (const vec of ElkUtil.createVectorChain(section)) {
        min = Math.min(min, vec.x);
        max = Math.max(max, vec.x);
      }
    }
  }
  return new CoordinateSpan(min, max);
}

function testOrthogonalEdges(graph: ElkNode): void {
  // Compute the area occupied by nodes on the top level
  const nodeSpan = computeNodeCoordinateSpan(graph.getChildren());
  const edgeSpan = computeEdgeCoordinateSpan(graph.getContainedEdges());

  // If the edge is routed properly, the edge span should have the same distance to the node span on both
  // sides. In other words, their respective centres should be aligned
  const nodeSpanCenter = (nodeSpan.min + nodeSpan.max) / 2;
  const edgeSpanCenter = (edgeSpan.min + edgeSpan.max) / 2;

  assertEqualsWithin('', nodeSpanCenter, edgeSpanCenter, 0.5);
}

const SPEC: LayoutTestSpec = {
  name: 'Issue734Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  graphs: GRAPHS,
  afterLayout: { testOrthogonalEdges },
};

defineLayoutTest(SPEC);

describe('Issue734Test (non-vacuity)', () => {
  it('runs 3 cases (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(3);
  });

  it('(non-vacuity) every run has top-level nodes and edge points, so both spans are finite and non-empty', () => {
    const seen = { runs: 0, finiteSpans: 0, widerThanZero: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.runs += 1;
          const nodeSpan = computeNodeCoordinateSpan(graph.getChildren());
          const edgeSpan = computeEdgeCoordinateSpan(graph.getContainedEdges());
          seen.finiteSpans += [nodeSpan.min, nodeSpan.max, edgeSpan.min, edgeSpan.max].every(Number.isFinite) ? 1 : 0;
          seen.widerThanZero += edgeSpan.max > edgeSpan.min && nodeSpan.max > nodeSpan.min ? 1 : 0;
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(3);
    expect(seen.runs).toBe(3);
    expect(seen.finiteSpans).toBe(3);
    expect(seen.widerThanZero).toBe(3);
  });
});
