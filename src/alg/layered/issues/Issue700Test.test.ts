// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue700Test: every edge of a hierarchical layout is routed. Java: `@DefaultConfiguration()` (no `@Algorithm`),
 * one `@GraphResourceProvider` over the `665` and `700` tickets and `examples/hierarchy/**`, one `@Test` (4 oracle runs).
 *
 * `665_includeChildrenDoesntStop.elkt` and `hierarchicalLayoutMixing.elkt` lay a child out with `elk.stress`. Mission 7h
 * held them back (H13) until stress was ported; the maintainer's ruling on issue #58 removed the hold-back, so all 4 cases
 * run: the runner registers `elk.stress` as `PlainJavaInitialization` does. The four models are vendored under
 * `compound/` (mission 7h, T1, and issue #58).
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
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

const GRAPHS = [
  // each Java source after its twin under `compound/`, where the models are vendored
  { path: 'compound/tickets/layered/**', filter: /665.+\.elkt/ },
  { path: 'tickets/layered/**', filter: /665.+\.elkt/ },
  { path: 'compound/tickets/layered/**', filter: /700.+\.elkt/ },
  { path: 'tickets/layered/**', filter: /700.+\.elkt/ },
  { path: 'compound/examples/hierarchy/**' },
  { path: 'examples/hierarchy/**' },
] as const;

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
  it('runs 4 cases (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(4);
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
    expect(cases.length).toBe(4);
    expect(seen.runs).toBe(4);
    expect(seen.edges).toBeGreaterThan(seen.runs);
    expect(seen.nestedEdges).toBeGreaterThan(0);
  });
});
