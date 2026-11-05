// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue682Test (`Parameterized`, one run per layout direction RIGHT, DOWN, UP, LEFT): a node with an inside
 * top-centre label and `NODE_LABELS` size constraint. The Java calls the engine directly. Its commented-out height
 * assertion stays out.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue682Test.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { RecursiveGraphLayoutEngine } from '../../../core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import { Triple } from '../../../core/util/Triple.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const EPSILON = 1e-5;
const DIRECTIONS: readonly Direction[] = [Direction.RIGHT, Direction.DOWN, Direction.UP, Direction.LEFT];

function testGraph(layoutDirection: Direction): Triple<ElkNode, ElkNode, ElkLabel> {
  const graph = ElkGraphUtil.createGraph();
  graph.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
  graph.setProperty(LayeredOptions.DIRECTION, layoutDirection);
  graph.setProperty(LayeredOptions.NODE_LABELS_PADDING, new ElkPadding(21, 32, 43, 54));

  const parent = ElkGraphUtil.createNode(graph);
  parent.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.NODE_LABELS));
  parent.setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.insideTopCenter());

  const label = ElkGraphUtil.createLabelWithText('foobar', parent);
  label.setWidth(23); // Arbitrary
  label.setHeight(22);

  return new Triple(graph, parent, label);
}

/** Hamcrest `assertThat(actual, closeTo(expected, error))`. */
function expectCloseTo(actual: number, expected: number, error: number): void {
  expect(
    Math.abs(actual - expected) <= error,
    `Expected: a numeric value within <${String(error)}> of <${String(expected)}> but: was <${String(actual)}>`,
  ).toBe(true);
}

describe('Issue682Test', () => {
  beforeAll(() => {
    registerLayered();
  });

  for (const layoutDirection of DIRECTIONS) {
    it(`test[${layoutDirection.toString()}]`, () => {
      const uut = testGraph(layoutDirection);
      new RecursiveGraphLayoutEngine().layout(uut.getFirst(), new NullElkProgressMonitor());

      // Label position
      const label = uut.getThird();
      expectCloseTo(label.getX(), 54.0, EPSILON);
      expectCloseTo(label.getY(), 21.0, EPSILON);

      // Node dimension
      expectCloseTo(uut.getSecond().getWidth(), label.getX() + label.getWidth() + 32, EPSILON);
      // TODO the following line fails, it looks like the label's height is applied twice.
      // assertThat(uut.getSecond().getHeight(), closeTo(label.getY() + label.getHeight() + 43, EPSILON));
    });
  }
});
