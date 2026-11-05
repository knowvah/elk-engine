// SPDX-License-Identifier: EPL-2.0
// Structural tests of the runner's label sizing against TestConfiguration.computeLabelSize (FX8). The sizes come from the ref.
import { beforeAll, describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { registerLayered } from './layered-framework-replay.js';
import { ensureSensibleLabelSize, LABEL_SIZES } from './layout-test-labels.js';

const KNOWN_TEXT = 'P1';
const OTHER_KNOWN_TEXT = 'P2_';
const UNKNOWN_TEXT = 'not a recorded label text';
const PRESET = 7;

void IntermediateProcessorStrategy;

function graphWithChild(): { graph: ElkNode; child: ElkNode } {
  const graph = ElkGraphUtil.createGraph();
  return { graph, child: ElkGraphUtil.createNode(graph) };
}

function labelOf(text: string, parent: ElkGraphElement): ElkLabel {
  const label = ElkGraphUtil.createLabel(parent);
  label.setText(text);
  return label;
}

function sizeOf(label: ElkLabel): [number, number] {
  return [label.getWidth(), label.getHeight()];
}

describe('ensureSensibleLabelSize', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('sizes the labels of nodes, ports, edges and labels at every level from the table', () => {
    const { graph, child } = graphWithChild();
    const grandchild = ElkGraphUtil.createNode(child);
    const labels = [
      labelOf(KNOWN_TEXT, graph),
      labelOf(KNOWN_TEXT, grandchild),
      labelOf(OTHER_KNOWN_TEXT, ElkGraphUtil.createPort(child)),
      labelOf(OTHER_KNOWN_TEXT, ElkGraphUtil.createSimpleEdge(child, grandchild)),
    ];
    const onLabel = labelOf(KNOWN_TEXT, labels[0]!);
    ensureSensibleLabelSize(graph);
    expect(labels.map(sizeOf)).toEqual([
      LABEL_SIZES[KNOWN_TEXT],
      LABEL_SIZES[KNOWN_TEXT],
      LABEL_SIZES[OTHER_KNOWN_TEXT],
      LABEL_SIZES[OTHER_KNOWN_TEXT],
    ]);
    expect(sizeOf(onLabel)).toEqual(LABEL_SIZES[KNOWN_TEXT]);
  });

  it('leaves a label with a width or a height alone, as the Java tests both for zero', () => {
    const { graph, child } = graphWithChild();
    const wide = labelOf(KNOWN_TEXT, child);
    wide.setWidth(PRESET);
    const tall = labelOf(KNOWN_TEXT, child);
    tall.setHeight(PRESET);
    ensureSensibleLabelSize(graph);
    expect(sizeOf(wide)).toEqual([PRESET, 0]);
    expect(sizeOf(tall)).toEqual([0, PRESET]);
  });

  it('leaves a label with an empty text unsized, and does not look it up', () => {
    const { graph, child } = graphWithChild();
    const label = labelOf('', child);
    ensureSensibleLabelSize(graph);
    expect(sizeOf(label)).toEqual([0, 0]);
  });

  it('throws naming a text the table does not hold, rather than staying zero-sized', () => {
    const { graph, child } = graphWithChild();
    labelOf(UNKNOWN_TEXT, child);
    expect(() => {
      ensureSensibleLabelSize(graph);
    }).toThrow(`label text "${UNKNOWN_TEXT}" is not in layered-label-metrics.json`);
  });
});
