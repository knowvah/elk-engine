// SPDX-License-Identifier: EPL-2.0
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { BiMap } from '../../../../guava/HashBiMap.js';
import * as DoubleToString from '../../../../java/lang/DoubleToString.js';
import type { Attribute } from '../dot/Attribute.js';
import { DotFactory } from '../dot/DotFactory.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { Attributes } from './Attributes.js';
import { createAttribute } from './DotExporterAttributes.js';
import { CLUSTER_DUMMY } from './DotExporterProperties.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

/**
 * The private helpers of `DotExporter.transformEdges` that call no overridable method: the statement ends, the edge
 * routing and `isInsideGraph`. Split off `DotExporter.ts` for the 500-line limit (the ends and the routing also out
 * of the edge loop body for the function limits, statement order kept).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */

/** The locals of `transformEdges` that its per-edge statements share. */
export interface EdgeScope {
  readonly hierarchy: boolean;
  readonly transformEdgeLayout: boolean;
  readonly vertical: boolean;
  readonly nodeIds: BiMap<ElkGraphElement, string | null>;
  readonly transData: IDotTransformationData<ElkNode, GraphvizModel>;
}

/** `nodeIds.get(node)`: Guava's `BiMap.get` gives `null` for an unmapped node. */
function nodeIdOf(scope: EdgeScope, node: ElkNode): string | null {
  return scope.nodeIds.get(node) ?? null;
}

/**
 * The source and target node or cluster of an edge statement (`transformEdges`), split into its two halves for the
 * complexity limit.
 */
export function transformEdgesEnds(
  source: ElkNode,
  target: ElkNode,
  edgeStatement: EdgeStatement,
  scope: EdgeScope,
): void {
  transformEdgesSource(source, edgeStatement, scope);
  transformEdgesTarget(target, edgeStatement, scope);
}

/** The source half of `transformEdgesEnds`. */
function transformEdgesSource(source: ElkNode, edgeStatement: EdgeStatement, scope: EdgeScope): void {
  const attributes = edgeStatement.getAttributes();
  // set source node or cluster
  const sourceNode = DotFactory.eINSTANCE.createNode();
  if (scope.hierarchy && !source.getChildren().isEmpty()) {
    sourceNode.setName(source.getProperty(CLUSTER_DUMMY));
    attributes.add(createAttribute(Attributes.LTAIL, nodeIdOf(scope, source)));
  } else {
    sourceNode.setName(nodeIdOf(scope, source));
  }
  edgeStatement.setSourceNode(sourceNode);
}

/** The target half of `transformEdgesEnds`. */
function transformEdgesTarget(target: ElkNode, edgeStatement: EdgeStatement, scope: EdgeScope): void {
  const attributes = edgeStatement.getAttributes();
  // set target node or cluster
  const edgeTarget = DotFactory.eINSTANCE.createEdgeTarget();
  const targetNode = DotFactory.eINSTANCE.createNode();
  if (scope.hierarchy && !target.getChildren().isEmpty()) {
    targetNode.setName(target.getProperty(CLUSTER_DUMMY));
    attributes.add(createAttribute(Attributes.LHEAD, nodeIdOf(scope, target)));
  } else {
    targetNode.setName(nodeIdOf(scope, target));
  }
  edgeTarget.setTargetnode(targetNode);
  edgeStatement.getEdgeTargets().add(edgeTarget);
}

/** The edge routing of `transformEdges`: the `pos` of the first section, in absolute coordinates. */
export function transformEdgesLayout(edge: ElkEdge, attributes: EList<Attribute>, transformEdgeLayout: boolean): void {
  const edgeSection = edge.getSections().get(0);

  if (
    transformEdgeLayout &&
    (edgeSection.getBendPoints().size() > 0 ||
      edgeSection.getStartX() !== 0 ||
      edgeSection.getStartY() !== 0 ||
      edgeSection.getEndX() !== 0 ||
      edgeSection.getEndY() !== 0)
  ) {
    let pos = '';
    const pointIter = ElkUtil.createVectorChain(edgeSection)[Symbol.iterator]();
    let next = pointIter.next();
    while (next.done !== true) {
      const point = next.value;
      ElkUtil.toAbsolute(point, edge.getContainingNode());
      pos += DoubleToString.toString(point.x);
      pos += ',';
      pos += DoubleToString.toString(point.y);
      next = pointIter.next();
      if (next.done !== true) {
        pos += ' ';
      }
    }
    attributes.add(createAttribute(Attributes.POS, `"${pos}"`));
  }
}

/**
 * Determines whether the given node is contained in the currently processed layout graph.
 *
 * @param node a node
 * @param root the root node
 * @returns true if the node is in the layout graph
 */
export function isInsideGraph(node: ElkNode, root: ElkNode): boolean {
  let n: ElkNode | null = node;
  do {
    if (n === root) {
      return true;
    }
    n = n.getParent();
  } while (n !== null);
  return false;
}
