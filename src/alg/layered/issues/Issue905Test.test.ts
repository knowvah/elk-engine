// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test Issue905Test: the labels of the single edge end up at the same location after
 * layout, whichever side of the edge they start on. The Java has one `@Test` and `@DefaultConfiguration` over two models
 * (2 oracle runs); they are vendored under `labels/` (mission 7f2, T1). `assertEquals(expected, actual, 0)` is JUnit's
 * double comparison (`assertEqualsWithin`: `Double.compare` equal or `|expected - actual| <= delta`).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue905Test.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPH_NAMES = [
  // 2 identical graph except the location of the labels of the edge
  '905_beginLabelAboveEdge.elkt',
  '905_beginLableBellowEdge.elkt',
] as const;
// vendored under `labels/`; the models repository holds them at the Java path
const GRAPHS = ['labels/tickets/layered/', 'tickets/layered/'].flatMap((directory) =>
  GRAPH_NAMES.map((name) => ({ path: `${directory}${name}` })),
);

function assertEquals(message: string, expected: number, actual: number, delta: number): void {
  assertEqualsWithin(message, expected, actual, delta);
}

/**
 * Check that the labels of the edge is at the same location after layout, independently of the location before the layout.
 * Only tail label is problematic with issue 905.
 */
function testBegingLabel(edge: ElkEdge): void {
  const expectedXLocationForTailLabel = 10;
  const expectedYLocationForTailLabel = 92;

  const expectedXLocationForCenterLabel = 61;
  const expectedYLocationForCenterLabel = 91;

  const expectedXLocationForHeadLabel = 124;
  const expectedYLocationForHeadLabel = 92;

  for (const label of edge.getLabels()) {
    const currentLabelPlacement = label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT);
    if (EdgeLabelPlacement.TAIL === currentLabelPlacement) {
      assertEquals(
        'The x location of the tail label is wrong after layout.',
        expectedXLocationForTailLabel,
        label.getX(),
        0,
      );
      assertEquals(
        'The y location of the tail label is wrong after layout.',
        expectedYLocationForTailLabel,
        label.getY(),
        0,
      );
    } else if (EdgeLabelPlacement.CENTER === currentLabelPlacement) {
      assertEquals(
        'The x location of the center label is wrong after layout.',
        expectedXLocationForCenterLabel,
        label.getX(),
        0,
      );
      assertEquals(
        'The y location of the center label is wrong after layout.',
        expectedYLocationForCenterLabel,
        label.getY(),
        0,
      );
    } else if (EdgeLabelPlacement.HEAD === currentLabelPlacement) {
      assertEquals(
        'The x location of the head label is wrong after layout.',
        expectedXLocationForHeadLabel,
        label.getX(),
        0,
      );
      assertEquals(
        'The y location of the head label is wrong after layout.',
        expectedYLocationForHeadLabel,
        label.getY(),
        0,
      );
    }
  }
}

function testEdgeLabelAlignment(graph: ElkNode): void {
  assertEquals('Wrong input graph: The graph must contained one node.', 1, graph.getChildren().size(), 0);
  assertEquals(
    'Wrong input graph: The node of the graph must contained one edge.',
    1,
    graph.getChildren().get(0).getContainedEdges().size(),
    0,
  );
  testBegingLabel(graph.getChildren().get(0).getContainedEdges().get(0));
}

const SPEC: LayoutTestSpec = {
  name: 'Issue905Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testEdgeLabelAlignment },
};

defineLayoutTest(SPEC);

describe('Issue905Test (non-vacuity)', () => {
  it('(non-vacuity) head, center and tail labels are all sized and compared on both models', () => {
    const seen = { sized: 0, placements: new Set<EdgeLabelPlacement>() };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          for (const label of graph.getChildren().get(0).getContainedEdges().get(0).getLabels()) {
            seen.sized += label.getWidth() > 0 && label.getHeight() > 0 ? 1 : 0;
            seen.placements.add(label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT));
          }
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(2);
    expect(seen.sized).toBeGreaterThanOrEqual(6);
    expect(seen.placements).toEqual(
      new Set([EdgeLabelPlacement.TAIL, EdgeLabelPlacement.CENTER, EdgeLabelPlacement.HEAD]),
    );
  });
});
