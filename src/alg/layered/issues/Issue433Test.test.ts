// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue433Test: the self loop label of the graph is fully contained in the graph. The Java has one
 * `@GraphResourceProvider` over `tickets/layered/433_graphSizeWithSelfLoopLabel.elkt`, one `@Test` and
 * `@DefaultConfiguration` (1 oracle run); the model is vendored under `loops/` (mission 7g, T1). The Java checks
 * `Rectangle2D.Double.contains(Rectangle2D)`, which is false for an empty label rectangle, so the check cannot pass on a
 * zero-sized label (the runner sizes the label from the recorded font metrics first).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue433Test.java
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
  // vendored under `loops/`; the models repository holds it at the Java path
  { path: 'loops/tickets/layered/433_graphSizeWithSelfLoopLabel.elkt' },
  { path: 'tickets/layered/433_graphSizeWithSelfLoopLabel.elkt' },
] as const;

/** `java.awt.geom.Rectangle2D.Double`. */
interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** `Rectangle2D.Double.toString`. */
function rectString(r: Rect): string {
  return `java.awt.geom.Rectangle2D$Double[x=${r.x},y=${r.y},w=${r.w},h=${r.h}]`;
}

/** `Rectangle2D.contains(Rectangle2D)`: false when either rectangle is empty. */
function contains(outer: Rect, inner: Rect): boolean {
  if (outer.w <= 0 || outer.h <= 0 || inner.w <= 0 || inner.h <= 0) {
    return false;
  }
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/** The first label of a contained edge, as a rectangle (the Java's `findFirst().get()`). */
function firstLabelRect(graph: ElkNode): Rect {
  for (const edge of graph.getContainedEdges()) {
    for (const label of edge.getLabels()) {
      return { x: label.getX(), y: label.getY(), w: label.getWidth(), h: label.getHeight() };
    }
  }
  throw new Error('No value present');
}

/** Check that the self loop label in the graph is fully contained in the graph. */
function testProperLabelCoordinates(graph: ElkNode): void {
  const graphRect: Rect = { x: 0, y: 0, w: graph.getWidth(), h: graph.getHeight() };
  const labelRect = firstLabelRect(graph);
  expect(
    contains(graphRect, labelRect),
    'Self loop label is not entirely inside the graph.' +
      `\nGraph rect: ${rectString(graphRect)}\nLabel rect: ${rectString(labelRect)}`,
  ).toBe(true);
}

const SPEC: LayoutTestSpec = {
  name: 'Issue433Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testProperLabelCoordinates },
};

defineLayoutTest(SPEC);

describe('Issue433Test (non-vacuity)', () => {
  it('(non-vacuity) the checked label is a sized self loop label and the graph is non-empty', () => {
    const seen = { loopLabel: false, labelW: 0, labelH: 0, graphW: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          const rect = firstLabelRect(graph);
          const edge = [...graph.getContainedEdges()][0]!;
          seen.loopLabel = edge.isSelfloop();
          seen.labelW = rect.w;
          seen.labelH = rect.h;
          seen.graphW = graph.getWidth();
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.loopLabel).toBe(true);
    expect(seen.labelW).toBeGreaterThan(0);
    expect(seen.labelH).toBeGreaterThan(0);
    expect(seen.graphW).toBeGreaterThanOrEqual(seen.labelW);
  });
});
