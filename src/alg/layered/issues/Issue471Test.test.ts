// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test Issue471Test: the labels of an edge are centered on each other. The Java has one
 * `@Test` and `@DefaultConfiguration` over `tickets/layered/471_verticalInlineLabelAlignment.elkt` (1 oracle run); the
 * model is vendored under `labels/` (mission 7f2, T1). `assertEquals(expected, actual, delta)` is JUnit's double
 * comparison (`assertEqualsWithin`: `Double.compare` equal or `|expected - actual| <= delta`).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue471Test.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `labels/`; the models repository holds it at the Java path
  { path: 'labels/tickets/layered/471_verticalInlineLabelAlignment.elkt' },
  { path: 'tickets/layered/471_verticalInlineLabelAlignment.elkt' },
] as const;

/** Allowed delta when comparing coordinates. */
const COORDINATE_FUZZYNESS = 0.5;

function testLabels(edge: ElkEdge): void {
  let minX = Number.MAX_VALUE;
  let maxWidth = 0;

  for (const label of edge.getLabels()) {
    minX = Math.min(minX, label.getX());
    maxWidth = Math.max(maxWidth, label.getWidth());
  }

  // Each label must be centered
  for (const label of edge.getLabels()) {
    const expected = minX + (maxWidth - label.getWidth()) / 2;
    assertEqualsWithin('', expected, label.getX(), COORDINATE_FUZZYNESS);
  }
}

function testEdgeLabelAlignment(graph: ElkNode): void {
  [...graph.getContainedEdges()].forEach((edge) => {
    testLabels(edge);
  });
}

const SPEC: LayoutTestSpec = {
  name: 'Issue471Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testEdgeLabelAlignment },
};

defineLayoutTest(SPEC);

describe('Issue471Test (non-vacuity)', () => {
  it('(non-vacuity) an edge with at least two sized labels of different widths is checked', () => {
    const seen = { multiLabelEdges: 0, unsized: 0, widths: new Set<number>() };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          for (const edge of graph.getContainedEdges()) {
            const labels = [...edge.getLabels()];
            seen.multiLabelEdges += labels.length >= 2 ? 1 : 0;
            seen.unsized += labels.filter((l) => l.getWidth() === 0 || l.getHeight() === 0).length;
            labels.forEach((l) => seen.widths.add(l.getWidth()));
          }
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.multiLabelEdges).toBeGreaterThan(0);
    expect(seen.unsized).toBe(0);
    expect(seen.widths.size).toBeGreaterThan(1);
  });
});
