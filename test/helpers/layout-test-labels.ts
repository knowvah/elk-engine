// SPDX-License-Identifier: EPL-2.0
// `TestConfiguration.ensureSensibleLabelSize` (decision FX8, user, mission 7f). The Java framework sizes every unsized label
// of a `LayoutTestRunner` graph with AWT font metrics before layout; the suites depend on it (`Issue405_2Test`, and `haveOverlaps`
// is vacuous on empty rectangles). AWT has no place here, so the sizes come from the JVM through a recorded table,
// test/golden/refs/java/layered-label-metrics.json (tools/vectors/layered-label-metrics-vectors.sh). A text missing from the table
// throws rather than staying zero-sized: add it to tools/vectors/layered-label-metrics-texts.txt and re-record.
import { readFileSync } from 'node:fs';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { repoRoot } from '../corpus/corpus.js';

const METRICS_REF = `${repoRoot()}/test/golden/refs/java/layered-label-metrics.json`;
const WIDTH = 0;
const HEIGHT = 1;

/** The recorded size of each label text, `[width, height]`. */
export const LABEL_SIZES = (
  JSON.parse(readFileSync(METRICS_REF, 'utf8')) as {
    readonly sizes: Readonly<Record<string, readonly [number, number]>>;
  }
).sizes;

/**
 * `TestConfiguration.computeLabelSize`: a label with no size and a non-empty text takes the recorded one.
 *
 * @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TestConfiguration.java
 */
function computeLabelSize(label: ElkLabel): void {
  const text = label.getText();
  if (label.getHeight() === 0 && label.getWidth() === 0 && text !== null && text !== '') {
    if (!Object.hasOwn(LABEL_SIZES, text)) {
      throw new Error(`label text ${JSON.stringify(text)} is not in layered-label-metrics.json; add it and re-record`);
    }
    const size = LABEL_SIZES[text]!;
    label.setHeight(size[HEIGHT]);
    label.setWidth(size[WIDTH]);
  }
}

function sizeLabelsOf(element: { getLabels(): Iterable<ElkLabel> }): void {
  for (const label of element.getLabels()) {
    computeLabelSize(label);
    sizeLabelsOf(label);
  }
}

/**
 * Every label under the graph, as `graph.eAllContents()` reaches them: the labels of the graph, its ports, its contained
 * edges and its children, at every level, and the labels of labels.
 */
export function ensureSensibleLabelSize(graph: ElkNode): void {
  sizeLabelsOf(graph);
  for (const port of graph.getPorts()) {
    sizeLabelsOf(port);
  }
  for (const edge of graph.getContainedEdges()) {
    sizeLabelsOf(edge);
  }
  for (const child of graph.getChildren()) {
    ensureSensibleLabelSize(child);
  }
}
