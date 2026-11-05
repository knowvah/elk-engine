// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue476Test: each node label of a top-level node is horizontally centred. The graphs, algorithm and default
 * configuration go through the layout test runner.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue476Test.java
 */
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** Allowed delta when comparing coordinates. */
const COORDINATE_FUZZYNESS = 0.5;

function testLabels(node: ElkNode): void {
  const nodeWidth = node.getWidth();

  // Each label must be centered
  for (const label of node.getLabels()) {
    const expected = nodeWidth / 2;
    const actual = label.getX() + label.getWidth() / 2;
    assertEqualsWithin(`Label "${String(label.getText())}" is not centered.`, expected, actual, COORDINATE_FUZZYNESS);
  }
}

defineLayoutTest({
  name: 'Issue476Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [
    { path: 'tickets/layered/476_multiLabelInVerticalLayout.elkt' },
    { path: 'tickets/layered/476_multiLabelInHorizontalLayout.elkt' },
  ],
  afterLayout: {
    testNodeLabelAlignment: (graph: ElkNode): void => {
      for (const node of graph.getChildren()) {
        testLabels(node);
      }
    },
  },
});
