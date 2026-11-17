// SPDX-License-Identifier: EPL-2.0
/*
 * Port of InteractiveLayeredGraphVisitorTest: the in-layer constraints of the InteractiveLayeredGraphVisitor on the graph
 * `n0 -> n1, n0 -> n2, n1 -> n3, n2 -> n3, n3 -> n4, n3 -> n5`, laid out, visited and laid out again as an interactive
 * editor does. The Java's `PlainJavaInitialization.initializePlainJavaLayout()` is the explicit layered registration.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitorTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compare } from '../../java/lang/DoubleCompare.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { InteractiveLayeredGraphVisitor } from './InteractiveLayeredGraphVisitor.js';
import { LayeredOptions } from './options/LayeredOptions.js';

const DIRECTIONS: readonly Direction[] = [Direction.RIGHT, Direction.LEFT, Direction.DOWN, Direction.UP];

function graph(direction: Direction): ElkNode[] {
  const parent = ElkGraphUtil.createGraph();
  parent.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  parent.setProperty(CoreOptions.DIRECTION, direction);
  parent.setProperty(LayeredOptions.GENERATE_POSITION_AND_LAYER_IDS, true);
  const nodes: ElkNode[] = [];
  for (let i = 0; i < 6; i++) {
    const node = ElkGraphUtil.createNode(parent);
    node.setIdentifier(`n${String(i)}`);
    node.setDimensions(30, 30);
    nodes.push(node);
  }
  const edges: readonly (readonly [number, number])[] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [3, 4],
    [3, 5],
  ];
  for (const edge of edges) {
    ElkGraphUtil.createSimpleEdge(nodes[edge[0]]!, nodes[edge[1]]!);
  }
  return nodes;
}

function layoutVisitLayout(nodes: readonly ElkNode[]): void {
  const parent = nodes[0]!.getParent()!;
  new RecursiveGraphLayoutEngine().layout(parent, new BasicProgressMonitor());
  new InteractiveLayeredGraphVisitor().visit(parent);
  new RecursiveGraphLayoutEngine().layout(parent, new BasicProgressMonitor());
}

function horizontal(direction: Direction): boolean {
  return direction === Direction.RIGHT || direction === Direction.LEFT;
}

/** The coordinate along the layout direction, which tells the layers apart. */
function layerCoordinate(node: ElkNode, direction: Direction): number {
  return horizontal(direction) ? node.getX() : node.getY();
}

/** The coordinate within a layer. */
function inLayerCoordinate(node: ElkNode, direction: Direction): number {
  return horizontal(direction) ? node.getY() : node.getX();
}

/** JUnit `assertNotEquals(message, unexpected, actual, delta)` with delta 0: fails if equal under `Double.compare` or within delta. */
function assertNotEqualsDelta0(message: string, unexpected: number, actual: number): void {
  const equal = compare(unexpected, actual) === 0 || Math.abs(unexpected - actual) <= 0;
  expect(equal, message).toBe(false);
}

describe('InteractiveLayeredGraphVisitorTest', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('testSuccessorConstraintToConnectedNodeIsIgnored', () => {
    // n3 -> n4 is an edge, so n3 and n4 can never share a layer. The visitor used to throw an
    // IndexOutOfBoundsException because n3 was left out of the order of its layer.
    for (const direction of DIRECTIONS) {
      const n = graph(direction);
      n[3]!.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF, 'n4');
      layoutVisitLayout(n);
      assertNotEqualsDelta0(direction.toString(), layerCoordinate(n[3]!, direction), layerCoordinate(n[4]!, direction));
    }
  });

  it('testPredecessorAndSuccessorConstraintsToConnectedNodesAreIgnored', () => {
    // Both targets are connected to n3 by edges. The visitor used to throw a NullPointerException.
    for (const direction of DIRECTIONS) {
      const n = graph(direction);
      n[3]!.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF, 'n2');
      n[3]!.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF, 'n4');
      layoutVisitLayout(n);
      assertNotEqualsDelta0(direction.toString(), layerCoordinate(n[3]!, direction), layerCoordinate(n[2]!, direction));
      assertNotEqualsDelta0(direction.toString(), layerCoordinate(n[3]!, direction), layerCoordinate(n[4]!, direction));
    }
  });

  it('testSuccessorConstraintInLayerIsKept', () => {
    // Without the constraint n4 comes first in its layer; with it, n4 follows n5.
    for (const direction of DIRECTIONS) {
      const n = graph(direction);
      n[4]!.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF, 'n5');
      layoutVisitLayout(n);
      expect(inLayerCoordinate(n[5]!, direction) < inLayerCoordinate(n[4]!, direction), direction.toString()).toBe(
        true,
      );
    }
  });
});
