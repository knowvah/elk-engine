// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue700Test: every edge of a hierarchical layout is routed. Java: `@DefaultConfiguration()` (no `@Algorithm`),
 * one `@GraphResourceProvider` over the `665` and `700` tickets and `examples/hierarchy/**`, one `@Test` (4 oracle runs).
 *
 * H13: `665_includeChildrenDoesntStop.elkt` and `hierarchicalLayoutMixing.elkt` lay a child out with `elk.stress`, which has
 * no TypeScript port (issue #58); `STRESS_PENDING` drops them, so 2 of the 4 cases run (`700_brokenHierarchyHandling.elkt`,
 * `hierarchicalEdges.elkt`). The models are vendored under `compound/` (mission 7h, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue700Test.java
 */
import { describe, expect, it } from 'vitest';
import { allNodes } from '../../../../test/helpers/graph-test-navigation.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import { ISSUE700_GRAPHS, vendored, withoutStressPending } from '../../../../test/helpers/stress-pending.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

const GRAPHS = withoutStressPending([...ISSUE700_GRAPHS, ...ISSUE700_GRAPHS.map(vendored)]);

function testEdgeRouted(edge: ElkEdge): void {
  expect(edge.getSections().size(), 'Edge has no sections.').toBe(1);

  // The start and end point may not be at the origin
  const section = edge.getSections().get(0);
  expect(
    section.getStartX() !== 0 || section.getStartY() !== 0 || section.getEndX() !== 0 || section.getEndY() !== 0,
    'Edge has no proper start and end coordinates.',
  ).toBe(true);
}

function testEdgesRouted(graph: ElkNode): void {
  for (const node of allNodes(graph, true)) {
    for (const edge of node.getContainedEdges()) {
      testEdgeRouted(edge);
    }
  }
}

const SPEC: LayoutTestSpec = {
  name: 'Issue700Test',
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testEdgesRouted },
};

defineLayoutTest(SPEC);

describe('Issue700Test (non-vacuity)', () => {
  it('runs 2 cases (the oracle runs minus the H13 cases)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(2);
  });

  it('(non-vacuity) the cases route edges in more than one level of the hierarchy', () => {
    const seen = { runs: 0, edges: 0, nestedEdges: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.runs += 1;
          for (const node of allNodes(graph, true)) {
            seen.edges += node.getContainedEdges().size();
            seen.nestedEdges += node === graph ? 0 : node.getContainedEdges().size();
          }
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(2);
    expect(seen.runs).toBe(2);
    expect(seen.edges).toBeGreaterThan(seen.runs);
    expect(seen.nestedEdges).toBeGreaterThan(0);
  });
});
