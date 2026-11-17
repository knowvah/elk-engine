// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue1232Test: inside self-loop labels move with their node (issue #1232). The Java has no `@BeforeClass`
 * registration (an earlier test class of the surefire run registers the algorithms); here layered is registered explicitly.
 * `assertEquals(message, double, double, EPSILON)` is `assertEqualsWithin`; the list assertion compares `List<Double>` with
 * `equals`, so exactly (`toEqual` of the number lists, `Double.equals` and `===` agree except for NaN and -0).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue1232Test.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { RecursiveGraphLayoutEngine } from '../../../core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const EPSILON = 0.000001;

function layout(rootPadding: number): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  root.setProperty(CoreOptions.PADDING, new ElkPadding(rootPadding));

  const node = ElkGraphUtil.createNode(root);
  node.setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, true);

  const edge = ElkGraphUtil.createSimpleEdge(ElkGraphUtil.createPort(node), ElkGraphUtil.createPort(node));
  edge.setProperty(CoreOptions.INSIDE_SELF_LOOPS_YO, true);
  const label = ElkGraphUtil.createLabel(edge);
  label.setText('1');
  label.setDimensions(7, 12);

  new RecursiveGraphLayoutEngine().layout(root, new NullElkProgressMonitor());
  return node;
}

function route(edge: ElkEdge, node: ElkNode): number[] {
  expect(edge.getSections().size(), 'The self loop must have one routed section').toBe(1);
  const section = edge.getSections().get(0);
  const points: number[] = [];
  points.push(section.getStartX() - node.getX());
  points.push(section.getStartY() - node.getY());
  for (const point of section.getBendPoints()) {
    points.push(point.getX() - node.getX());
    points.push(point.getY() - node.getY());
  }
  points.push(section.getEndX() - node.getX());
  points.push(section.getEndY() - node.getY());
  return points;
}

describe('Issue1232Test', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('testLabelMovesWithNodeWhenRootPaddingChanges', () => {
    const baseline = layout(12);
    const moved = layout(60);
    const baselineEdge = baseline.getPorts().get(0).getOutgoingEdges().get(0);
    const movedEdge = moved.getPorts().get(0).getOutgoingEdges().get(0);

    expect(
      moved.getX() > baseline.getX() && moved.getY() > baseline.getY(),
      'Root padding must move the containing node',
    ).toBe(true);
    assertEqualsWithin('', baseline.getWidth(), moved.getWidth(), EPSILON);
    assertEqualsWithin('', baseline.getHeight(), moved.getHeight(), EPSILON);
    expect(route(movedEdge, moved), 'Moving the node must preserve the local edge route').toEqual(
      route(baselineEdge, baseline),
    );

    const baselineLabel = baselineEdge.getLabels().get(0);
    const movedLabel = movedEdge.getLabels().get(0);
    assertEqualsWithin(
      'Moving the node must preserve the local label x coordinate',
      baselineLabel.getX() - baseline.getX(),
      movedLabel.getX() - moved.getX(),
      EPSILON,
    );
    assertEqualsWithin(
      'Moving the node must preserve the local label y coordinate',
      baselineLabel.getY() - baseline.getY(),
      movedLabel.getY() - moved.getY(),
      EPSILON,
    );
  });
});
