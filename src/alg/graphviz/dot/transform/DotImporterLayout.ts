// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../../../core/options/EdgeLabelPlacement.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import * as DoubleToString from '../../../../java/lang/DoubleToString.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import type { Attribute } from '../dot/Attribute.js';
import type { AttributeStatement } from '../dot/AttributeStatement.js';
import { AttributeType } from '../dot/AttributeType.js';
import { DotFactory } from '../dot/DotFactory.js';
import { DotPackage } from '../dot/DotPackage.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { Graph } from '../dot/Graph.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Statement } from '../dot/Statement.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { Attributes } from './Attributes.js';
import { DotExporter } from './DotExporter.js';
import { PROP_ID, PROP_STATEMENT } from './DotImporterProperties.js';

// DotImporter, part 4 of 4: the layout transfer from the ElkGraph to the Dot model. The Java overloads
// `applyLayout(ElkNode, ...)` and `applyLayout(ElkEdge, ...)` are `applyLayout` and `applyEdgeLayout` (translation
// rule 6.5). Both are split for the complexity limits into helpers named after them, in statement order. Java
// `Double.toString` and `StringBuilder.append(double)` are `DoubleToString.toString`.

const L = DotPackage.Literals;

/**
 * Apply layout to a parent node and its children.
 *
 * @param parent a parent node
 * @param offset the node's offset in the graph
 * @param graph the Graphviz graph
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function applyLayout(parent: ElkNode, offset: KVector, graph: Graph): void {
  for (const elknode of parent.getChildren()) {
    let statement = elknode.getProperty(PROP_STATEMENT);
    if (statement === null) {
      // the node was only declared implicitly - create an explicit declaration
      const stm = DotFactory.eINSTANCE.createNodeStatement();
      const node = DotFactory.eINSTANCE.createNode();
      node.setName(elknode.getProperty(PROP_ID));
      stm.setNode(node);
      graph.getStatements().add(stm);
      statement = stm;
    }
    if (L.NODE_STATEMENT.isInstance(statement)) {
      applyLayoutNodeStatement(elknode, (statement as NodeStatement).getAttributes(), offset);
    } else if (L.SUBGRAPH.isInstance(statement)) {
      applyLayout(elknode, new KVector(offset).add(elknode.getX(), elknode.getY()), graph);
    }

    for (const elkedge of ElkGraphUtil.allOutgoingEdges(elknode)) {
      applyEdgeLayout(elkedge, offset, graph);
    }
  }

  applyLayoutBoundingBox(parent, graph);
}

/**
 * The node statement arm of `applyLayout(ElkNode, ...)`: transfer node position and size (DotImporter.java:544-555).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function applyLayoutNodeStatement(elknode: ElkNode, attributes: EList<Attribute>, offset: KVector): void {
  // transfer node position
  removeAttributes(attributes, Attributes.POS);
  const xpos = elknode.getX() + elknode.getWidth() / 2 + offset.x;
  const ypos = elknode.getY() + elknode.getHeight() / 2 + offset.y;
  const posString = `"${DoubleToString.toString(xpos)},${DoubleToString.toString(ypos)}"`;
  attributes.add(DotExporter.createAttribute(Attributes.POS, posString));
  // transfer node size
  removeAttributes(attributes, Attributes.WIDTH);
  attributes.add(DotExporter.createAttributeDouble(Attributes.WIDTH, elknode.getWidth() / DotExporter.DPI));
  removeAttributes(attributes, Attributes.HEIGHT);
  attributes.add(DotExporter.createAttributeDouble(Attributes.HEIGHT, elknode.getHeight() / DotExporter.DPI));
}

/**
 * The end of `applyLayout(ElkNode, ...)`: transfer graph size to bounding box (DotImporter.java:565-577).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function applyLayoutBoundingBox(parent: ElkNode, graph: Graph): void {
  let statements: EList<Statement>;
  const graphStm = parent.getProperty(PROP_STATEMENT);
  if (graphStm !== null && L.SUBGRAPH.isInstance(graphStm)) {
    statements = (graphStm as Subgraph).getStatements();
  } else {
    statements = graph.getStatements();
  }
  removeGraphAttributes(statements, Attributes.BOUNDINGBOX);
  const bbString = `"0,0,${DoubleToString.toString(parent.getWidth())},${DoubleToString.toString(parent.getHeight())}"`;
  statements.add(DotExporter.createAttribute(Attributes.BOUNDINGBOX, bbString));
}

/**
 * Apply layout to an edge and its labels (Java `applyLayout(ElkEdge, KVector, Graph)`).
 *
 * @param edge an edge
 * @param offset its offset in the graph
 * @param graph the Graphviz graph
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function applyEdgeLayout(edge: ElkEdge, offset: KVector, graph: Graph): void {
  const edgeStatement = edge.getProperty(PROP_STATEMENT) as EdgeStatement;
  if (edgeStatement.eContainer() === null) {
    // this can happen when an edge with multiple target declarations was found
    graph.getStatements().add(edgeStatement);
  }

  // transfer edge bend points and source / target points
  const attributes = edgeStatement.getAttributes();
  removeAttributes(attributes, Attributes.POS);

  if (!edge.getSections().isEmpty()) {
    applyEdgeLayoutBendPoints(edge, attributes, offset);
  }

  // transfer label positions
  applyEdgeLayoutLabels(edge, attributes, offset);
}

/**
 * The label loop of `applyLayout(ElkEdge, ...)`: transfer label positions (DotImporter.java:616-638).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function applyEdgeLayoutLabels(edge: ElkEdge, attributes: EList<Attribute>, offset: KVector): void {
  for (const label of edge.getLabels()) {
    let attrKey: string | null = null;
    switch (label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT)) {
      case EdgeLabelPlacement.CENTER:
        attrKey = Attributes.LABELPOS;
        break;
      case EdgeLabelPlacement.HEAD:
        attrKey = Attributes.HEADLP;
        break;
      case EdgeLabelPlacement.TAIL:
        attrKey = Attributes.TAILLP;
        break;
    }
    if (attrKey !== null) {
      removeAttributes(attributes, attrKey);
      const xpos = label.getX() + label.getWidth() / 2 + offset.x;
      const ypos = label.getY() + label.getHeight() / 2 + offset.y;
      const posString = `"${DoubleToString.toString(xpos)},${DoubleToString.toString(ypos)}"`;
      attributes.add(DotExporter.createAttribute(attrKey, posString));
    }
  }
}

/**
 * The bend point block of `applyLayout(ElkEdge, ...)` (DotImporter.java:598-614).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function applyEdgeLayoutBendPoints(edge: ElkEdge, attributes: EList<Attribute>, offset: KVector): void {
  let bendpointString = '"';
  const vectorChain = ElkUtil.createVectorChain(edge.getSections().get(0));
  const chainIter = vectorChain.listIterator();
  while (chainIter.hasNext()) {
    const point = chainIter.next().add(offset);
    bendpointString += DoubleToString.toString(point.x);
    bendpointString += ',';
    bendpointString += DoubleToString.toString(point.y);
    if (chainIter.hasNext()) {
      bendpointString += ' ';
    }
  }
  bendpointString += '"';
  attributes.add(DotExporter.createAttribute(Attributes.POS, bendpointString));
}

/**
 * Removes all graph-related occurrences of the given key from a statement list.
 *
 * @param statements a list of statements
 * @param key an attribute key
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function removeGraphAttributes(statements: EList<Statement>, key: string): void {
  const stmIter = statements.listIterator();
  while (stmIter.hasNext()) {
    const stm = stmIter.next();
    if (L.ATTRIBUTE.isInstance(stm)) {
      if (key === (stm as Attribute).getName()) {
        stmIter.remove();
      }
    } else if (L.ATTRIBUTE_STATEMENT.isInstance(stm)) {
      const attrStatement = stm as AttributeStatement;
      if (attrStatement.getType() === AttributeType.GRAPH) {
        removeAttributes(attrStatement.getAttributes(), key);
        if (attrStatement.getAttributes().isEmpty()) {
          stmIter.remove();
        }
      }
    }
  }
}

/**
 * Removes all occurrences of the given key from an attributes list.
 *
 * @param attributes a list of attributes
 * @param key an attribute key
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function removeAttributes(attributes: EList<Attribute>, key: string): void {
  const attrIter = attributes.listIterator();
  while (attrIter.hasNext()) {
    const attr = attrIter.next();
    if (key === attr.getName()) {
      attrIter.remove();
    }
  }
}
