// SPDX-License-Identifier: EPL-2.0
// `TestConfiguration.ensureSensibleLabelSize` (decision FX8, user, mission 7f). The Java framework sizes every unsized label
// of a `LayoutTestRunner` graph with AWT font metrics before layout; the suites depend on it (`Issue405_2Test`, and `haveOverlaps`
// is vacuous on empty rectangles). AWT has no place here, so the sizes come from the JVM through a recorded table,
// test/golden/refs/java/layered-label-metrics.json (tools/vectors/layered-label-metrics-vectors.sh). A text missing from the table
// throws rather than staying zero-sized: add it to tools/vectors/layered-label-metrics-texts.txt and re-record.
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { AWT_SNAPSHOT_TEXT_MEASURER, LABEL_SIZES, type TextMeasurer } from './layout-test-text-measurer.js';

export { LABEL_SIZES };

/**
 * `TestConfiguration.computeLabelSize`: a label with no size and a non-empty text takes the measured one (patch 0003 routes
 * the measurement through a `TextMeasurer`).
 *
 * @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TestConfiguration.java
 */
function computeLabelSize(label: ElkLabel, measurer: TextMeasurer): void {
  const text = label.getText();
  if (label.getHeight() === 0 && label.getWidth() === 0 && text !== null && text !== '') {
    const size = measurer.measure(text);
    label.setHeight(size.y);
    label.setWidth(size.x);
  }
}

function sizeLabelsOf(element: { getLabels(): Iterable<ElkLabel> }, measurer: TextMeasurer): void {
  for (const label of element.getLabels()) {
    computeLabelSize(label, measurer);
    sizeLabelsOf(label, measurer);
  }
}

/**
 * Every label under the graph, as `graph.eAllContents()` reaches them: the labels of the graph, its ports, its contained
 * edges and its children, at every level, and the labels of labels.
 */
export function ensureSensibleLabelSize(graph: ElkNode, measurer: TextMeasurer = AWT_SNAPSHOT_TEXT_MEASURER): void {
  sizeLabelsOf(graph, measurer);
  for (const port of graph.getPorts()) {
    sizeLabelsOf(port, measurer);
  }
  for (const edge of graph.getContainedEdges()) {
    sizeLabelsOf(edge, measurer);
  }
  for (const child of graph.getChildren()) {
    ensureSensibleLabelSize(child, measurer);
  }
}
