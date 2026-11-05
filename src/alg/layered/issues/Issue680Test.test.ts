// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue680Test: graph > parent > child under DOWN with orthogonal routing and ports with border offsets; the
 * parent and child land at fixed y positions. The Java calls the engine directly (no `LayoutTestRunner`).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue680Test.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { RecursiveGraphLayoutEngine } from '../../../core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { Triple } from '../../../core/util/Triple.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const EPSILON = 1e-5;

function testGraph(): Triple<ElkNode, ElkNode, ElkNode> {
  const graph = ElkGraphUtil.createGraph();
  graph.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
  graph.setProperty(LayeredOptions.DIRECTION, Direction.DOWN);

  const parent = ElkGraphUtil.createNode(graph);
  parent.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  parent.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
  parent.setProperty(LayeredOptions.DIRECTION, Direction.DOWN);

  const p1 = ElkGraphUtil.createPort(parent);
  p1.setWidth(15);
  p1.setHeight(165);
  p1.setProperty(LayeredOptions.PORT_BORDER_OFFSET, -20.0);

  const p2 = ElkGraphUtil.createPort(parent);
  p2.setWidth(15);
  p2.setHeight(166);
  p2.setProperty(LayeredOptions.PORT_BORDER_OFFSET, -22.0);

  const child = ElkGraphUtil.createNode(parent);
  child.setWidth(40.265625);
  child.setHeight(75.5);

  const childP1 = ElkGraphUtil.createPort(child);
  childP1.setWidth(15);
  childP1.setHeight(33);
  childP1.setProperty(LayeredOptions.PORT_BORDER_OFFSET, -8.0);

  const childP2 = ElkGraphUtil.createPort(child);
  childP2.setWidth(15);
  childP2.setHeight(34);
  childP2.setProperty(LayeredOptions.PORT_BORDER_OFFSET, -8.0);

  ElkGraphUtil.createSimpleEdge(p1, childP1);
  ElkGraphUtil.createSimpleEdge(childP2, p2);

  return new Triple(graph, parent, child);
}

/** Hamcrest `assertThat(actual, closeTo(expected, error))`. */
function expectCloseTo(actual: number, expected: number, error: number): void {
  expect(
    Math.abs(actual - expected) <= error,
    `Expected: a numeric value within <${String(error)}> of <${String(expected)}> but: was <${String(actual)}>`,
  ).toBe(true);
}

describe('Issue680Test', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('test', () => {
    const nodes = testGraph();
    new RecursiveGraphLayoutEngine().layout(nodes.getFirst(), new NullElkProgressMonitor());

    expectCloseTo(nodes.getSecond().getY(), 157.0, EPSILON);
    expectCloseTo(nodes.getThird().getY(), 57.0, EPSILON);
  });
});
