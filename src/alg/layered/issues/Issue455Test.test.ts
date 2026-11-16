// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue455Test: the child nodes of a hierarchical node end up in the same layer. Java: `@Algorithm`,
 * `@DefaultConfiguration`, one `@GraphResourceProvider` over two models, one `@Test` (2 oracle runs); the models are
 * vendored under `compound/` (mission 7h, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue455Test.java
 */
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `compound/`; the models repository holds them at the Java path
  { path: 'compound/tickets/layered/455_longHierarchicalEdges.elkt' },
  { path: 'compound/tickets/layered/455_shortHierarchicalEdges.elkt' },
  { path: 'tickets/layered/455_longHierarchicalEdges.elkt' },
  { path: 'tickets/layered/455_shortHierarchicalEdges.elkt' },
] as const;

/** Allowed delta when comparing coordinates. */
const COORDINATE_FUZZYNESS = 0.5;

function doTest(node: ElkNode): void {
  // `DoubleSummaryStatistics` over the children's x: an empty stream has max -Infinity, min +Infinity.
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const child of node.getChildren()) {
    max = Math.max(max, child.getX());
    min = Math.min(min, child.getX());
  }

  expect(max - min <= COORDINATE_FUZZYNESS, 'Child nodes are not placed in the same layer.').toBe(true);
}

function testChildNodesAreInSameLayer(graph: ElkNode): void {
  // We want to inspect the graph's compound node
  for (const child of graph.getChildren()) {
    if (child.isHierarchical()) {
      doTest(child);
    }
  }
}

const SPEC: LayoutTestSpec = {
  name: 'Issue455Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testChildNodesAreInSameLayer },
};

defineLayoutTest(SPEC);

describe('Issue455Test (non-vacuity)', () => {
  it('runs 2 cases (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(2);
  });

  it('(non-vacuity) every run inspects a hierarchical node with several children', () => {
    const seen = { runs: 0, compounds: 0, minChildren: Number.POSITIVE_INFINITY };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.runs += 1;
          for (const child of graph.getChildren()) {
            if (child.isHierarchical()) {
              seen.compounds += 1;
              seen.minChildren = Math.min(seen.minChildren, child.getChildren().size());
            }
          }
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(2);
    expect(seen.runs).toBe(2);
    expect(seen.compounds).toBeGreaterThanOrEqual(seen.runs);
    expect(seen.minChildren).toBeGreaterThan(1);
  });
});
