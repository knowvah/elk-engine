// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { ElkConnectableShape } from '../../../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import { type ElkNode, isElkNode } from '../../../../graph/ElkNode.js';
import { type ElkPort, isElkPort } from '../../../../graph/ElkPort.js';
import { ElkNodeImpl } from '../../../../graph/impl/ElkNodeImpl.js';
import { ElkPortImpl } from '../../../../graph/impl/ElkPortImpl.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { checkCast } from '../../../../java/lang/JavaCast.js';
import { Pair } from '../../../util/Pair.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { connect, retrievePort } from './RandomGraphGeneratorConnect.js';
import { createNode } from './RandomGraphGeneratorElements.js';
import { nonNull, RandomGraphGenerator } from './RandomGraphGenerator.js';

const ELK_NODE = 'org.eclipse.elk.graph.ElkNode';
const ELK_PORT = 'org.eclipse.elk.graph.ElkPort';

/** Removes the port from its node when it only has this one (incoming) edge left. */
function removePortIfOnlyThisEdge(port: ElkPort): void {
  if (port.getOutgoingEdges().size() === 0 && port.getIncomingEdges().size() === 1) {
    nonNull(port.getParent()).getPorts().remove(port);
  }
}

/**
 * The `if (oldConnectShape instanceof ElkNodeImpl)` branch of the ports-enabled `moveSource` and
 * `moveTarget`: drops every end of the edge that is a port of the old node. `ends` is the edge's
 * sources or targets (the two Java methods are identical but for that list).
 */
function removePortsOfOldNode(ends: EList<ElkConnectableShape>, oldNode: ElkNode): void {
  for (const end of ends) {
    if (end instanceof ElkPortImpl) {
      const port = end;
      if (nonNull(port.getParent()) === oldNode) {
        ends.remove(port);
        removePortIfOnlyThisEdge(port);
      }
    }
  }
}

/** The `if (!edge.getSources().isEmpty())` block of the ports-enabled `moveSource` and `moveTarget`. */
function removeOldEnd(ends: EList<ElkConnectableShape>, oldConnectShape: ElkConnectableShape): void {
  if (!ends.isEmpty()) {
    if (oldConnectShape instanceof ElkNodeImpl) {
      removePortsOfOldNode(ends, oldConnectShape);
    } else if (oldConnectShape instanceof ElkPortImpl) {
      const oldPort = oldConnectShape;
      if (ends.contains(oldPort)) {
        ends.remove(oldPort);
      }
      removePortIfOnlyThisEdge(oldPort);
    }
  }
}

/**
 * The tail of the ports-enabled `moveSource` and `moveTarget`. Java casts the OLD shape where the
 * new one was tested (`newNode = (ElkNode) oldConnectShape`) and passes `true` to `retrievePort`
 * for targets too; both are kept. A new port shape leaves `newNode` null, which `isHypernode`
 * rejects (a `NullPointerException` in Java, `TypeError` here).
 */
function addNewEnd(
  gen: RandomGraphGenerator,
  ends: EList<ElkConnectableShape>,
  oldConnectShape: ElkConnectableShape,
  newConnectShape: ElkConnectableShape,
): void {
  let newNode: ElkNode | null = null;
  let newPort: ElkPort | null = null;
  if (newConnectShape instanceof ElkNodeImpl) {
    newNode = checkCast(oldConnectShape, isElkNode, ELK_NODE);
    newPort = retrievePort(gen, nonNull(newNode), true);
  } else if (newConnectShape instanceof ElkPortImpl) {
    newPort = checkCast(oldConnectShape, isElkPort, ELK_PORT);
  }
  if (!RandomGraphGenerator.isHypernode(nonNull(newNode))) {
    // edge.setSourcePort(newPort);
    ends.add(nonNull(newPort));
  }
}

/** The ports-disabled branch of `moveSource` and `moveTarget`. */
function replaceEndWithoutPorts(
  ends: EList<ElkConnectableShape>,
  oldConnectShape: ElkConnectableShape,
  newConnectShape: ElkConnectableShape,
): void {
  let oldNode: ElkNode | null = null;
  let newNode: ElkNode | null = null;

  // edge.setSource(node);
  if (oldConnectShape instanceof ElkNodeImpl) {
    oldNode = oldConnectShape;
  } else if (oldConnectShape instanceof ElkPortImpl) {
    oldNode = oldConnectShape.getParent();
  }
  if (oldNode !== null && ends.contains(oldNode)) {
    ends.remove(oldNode);
  }

  if (newConnectShape instanceof ElkNodeImpl) {
    newNode = newConnectShape;
  } else if (newConnectShape instanceof ElkPortImpl) {
    newNode = newConnectShape.getParent();
  }
  ends.add(nonNull(newNode));
}

/**
 * Changes the source of a given edge to a given node.
 *
 * @param gen the generator
 * @param edge the edge
 * @param oldConnectShape the old source
 * @param newConnectShape the new source
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function moveSource(
  gen: RandomGraphGenerator,
  edge: ElkEdge,
  oldConnectShape: ElkConnectableShape,
  newConnectShape: ElkConnectableShape,
): void {
  if (gen.get(GeneratorOptions.ENABLE_PORTS)) {
    removeOldEnd(edge.getSources(), oldConnectShape);
    addNewEnd(gen, edge.getSources(), oldConnectShape, newConnectShape);
  } else {
    replaceEndWithoutPorts(edge.getSources(), oldConnectShape, newConnectShape);
  }
  ElkGraphUtil.updateContainment(edge);
}

/**
 * Changes the target of a given edge to a given node.
 *
 * @param gen the generator
 * @param edge the edge
 * @param oldConnectShape the old target
 * @param newConnectShape the new target
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function moveTarget(
  gen: RandomGraphGenerator,
  edge: ElkEdge,
  oldConnectShape: ElkConnectableShape,
  newConnectShape: ElkConnectableShape,
): void {
  if (gen.get(GeneratorOptions.ENABLE_PORTS)) {
    // Check if we need to remove the old target port
    removeOldEnd(edge.getTargets(), oldConnectShape);
    addNewEnd(gen, edge.getTargets(), oldConnectShape, newConnectShape);
  } else {
    replaceEndWithoutPorts(edge.getTargets(), oldConnectShape, newConnectShape);
  }
  ElkGraphUtil.updateContainment(edge);
}

/**
 * Splits an edge by inserting a new node and a new edge. The old edge will have all the old
 * sources and just the new node as a target and the new edge will have all the old targets and
 * just the new node as a source. The parent of the new node will be the node containing a whole
 * edge.
 *
 * @param gen the generator
 * @param edge the edge
 * @returns a pair containing the new node and the new edge
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function split(gen: RandomGraphGenerator, edge: ElkEdge): Pair<ElkNode, ElkEdge> {
  const newNode = createNode(gen, nonNull(edge.getContainingNode()));
  const newEdge = connect(gen, newNode, edge.getTargets().get(0));
  const oldTarget = edge.getTargets().get(0);
  edge.getTargets().removeAt(0);
  newEdge.getTargets().addAll(edge.getTargets());
  edge.getTargets().clear();
  edge.getTargets().add(oldTarget);
  moveTarget(gen, edge, edge.getTargets().get(0), newNode);
  ElkGraphUtil.updateContainment(newEdge);
  return new Pair<ElkNode, ElkEdge>(newNode, newEdge);
}
