// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test Issue445Test: with zero padding, no edge label of a feedback edge with a tail
 * label ends up at (0, 0). The Java has one `@Configurator` (zero padding), one `@Test` and `@DefaultConfiguration`, over
 * `tickets/layered/445_feedbackEdgeTailLabel.elkt` (1 oracle run); the model is vendored under `labels/` (mission 7f2, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue445Test.java
 */
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `labels/`; the models repository holds it at the Java path
  { path: 'labels/tickets/layered/445_feedbackEdgeTailLabel.elkt' },
  { path: 'tickets/layered/445_feedbackEdgeTailLabel.elkt' },
] as const;

function configurePadding(graph: ElkNode): void {
  // Set the graph's padding to zero. Due to this bug, the label will end up at (0,0) as well, then
  graph.setProperty(LayeredOptions.PADDING, new ElkPadding(0));
}

function containedEdgeLabels(graph: ElkNode): ElkLabel[] {
  return [...graph.getContainedEdges()].flatMap((edge) => [...edge.getLabels()]);
}

/** Check that the property was set on the graph. */
function testProperLabelCoordinates(graph: ElkNode): void {
  const misplacedLabels = containedEdgeLabels(graph).filter((label) => label.getX() === 0 && label.getY() === 0).length;
  expect(
    misplacedLabels === 0,
    `Found ${misplacedLabels} label(s) placed at (0, 0) instead of a proper position.`,
  ).toBe(true);
}

const SPEC: LayoutTestSpec = {
  name: 'Issue445Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  configurators: { configurePadding },
  afterLayout: { testProperLabelCoordinates },
};

defineLayoutTest(SPEC);

describe('Issue445Test (non-vacuity)', () => {
  it('(non-vacuity) the checked graph has sized edge labels and zero padding', () => {
    const seen = { labels: 0, sized: 0, padding: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          const labels = containedEdgeLabels(graph);
          seen.labels += labels.length;
          seen.sized += labels.filter((l) => l.getWidth() > 0 && l.getHeight() > 0).length;
          const padding = graph.getProperty(LayeredOptions.PADDING);
          seen.padding += padding.top + padding.left + padding.bottom + padding.right;
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.labels).toBeGreaterThan(0);
    expect(seen.sized).toBe(seen.labels);
    expect(seen.padding).toBe(0);
  });
});
