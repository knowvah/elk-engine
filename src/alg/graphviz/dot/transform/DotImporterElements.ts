// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../../../core/options/EdgeLabelPlacement.js';
import { Pair } from '../../../../core/util/Pair.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import type { IPropertyHolder } from '../../../../graph/properties/IPropertyHolder.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import * as Float32 from '../../../../java/lang/Float32.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import * as JavaFloat from '../../../../java/lang/JavaFloat.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import type { ListIterator } from '../../../../java/util/ListIterator.js';
import type { Attribute } from '../dot/Attribute.js';
import { DotFactory } from '../dot/DotFactory.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { EdgeTarget } from '../dot/EdgeTarget.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { Node } from '../dot/Node.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Port } from '../dot/Port.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { Attributes } from './Attributes.js';
import { DotExporter } from './DotExporter.js';
import { transformAttribute, trimValue } from './DotImporterAttributes.js';
import {
  NODE_ID_MAP,
  PORT_ID_MAP,
  PROP_DEF_HEIGHT,
  PROP_DEF_WIDTH,
  PROP_ID,
  PROP_STATEMENT,
} from './DotImporterProperties.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

// DotImporter, part 2 of 4: the transformation of nodes, ports and edges. The Java overloads
// `transformNode(NodeStatement, ...)` and `transformNode(String, ...)` are `transformNodeStatement` and
// `transformNode` (translation rule 6.5: four private methods of distinct roles). `transformNodeStatement` and
// `transformEdge` are split for the complexity limits into helpers named after them, in statement order.

type TransData = IDotTransformationData<GraphvizModel, ElkNode>;

/** the default width and height value for nodes (a Java `float`, `10.0f`). */
const DEF_WIDTH = 10.0;

/**
 * Transforms a node (Java `transformNode(NodeStatement, ElkNode, IDotTransformationData, IPropertyHolder)`).
 *
 * @param statement a node statement
 * @param parent the parent node
 * @param transData the transformation data instance
 * @param defaultProps default values for node options
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function transformNodeStatement(
  statement: NodeStatement,
  parent: ElkNode,
  transData: TransData,
  defaultProps: IPropertyHolder,
): void {
  const elknode = transformNode((statement.getNode() as Node).getName(), parent, transData);
  if (elknode.getProperty(PROP_STATEMENT) !== null) {
    transData.log(`Discarding node "${String((statement.getNode() as Node).getName())}" since its id is already used.`);
  } else {
    elknode.copyProperties(defaultProps);
    elknode.setProperty(PROP_STATEMENT, statement);
    const defWidth = defaultProps.getProperty(PROP_DEF_WIDTH);
    if (defWidth !== null) {
      elknode.setWidth(defWidth);
    }
    const defHeight = defaultProps.getProperty(PROP_DEF_HEIGHT);
    if (defHeight !== null) {
      elknode.setHeight(defHeight);
    }

    // evaluate attributes for the new node
    for (const attr of statement.getAttributes()) {
      transformNodeStatementAttribute(statement, elknode, attr, transData);
    }
  }
}

/**
 * The body of the attribute loop of `transformNode(NodeStatement, ...)`: the `try` statement.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformNodeStatementAttribute(
  statement: NodeStatement,
  elknode: ElkNode,
  attr: Attribute,
  transData: TransData,
): void {
  const value = trimValue(attr);
  try {
    transformNodeStatementAttributeChain(elknode, attr, value, transData);
  } catch (exception) {
    if (exception instanceof NumberFormatException) {
      transData.log(discardNodeAttribute(statement, attr));
    } else if (exception instanceof IllegalArgumentException) {
      transData.log(discardNodeAttribute(statement, attr));
    } else {
      throw exception;
    }
  }
}

/**
 * The `try` block of the attribute loop of `transformNode(NodeStatement, ...)`: its if-else chain.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformNodeStatementAttributeChain(
  elknode: ElkNode,
  attr: Attribute,
  value: string,
  transData: TransData,
): void {
  if (Attributes.LABEL === attr.getName()) {
    ElkGraphUtil.createLabelWithText(value, elknode);
  } else if (Attributes.POS === attr.getName()) {
    const pos = new KVector();
    pos.parse(value);
    pos.scale(DotExporter.DPI);
    elknode.setLocation(pos.x, pos.y);
  } else if (Attributes.WIDTH === attr.getName()) {
    elknode.setWidth(Float32.mul(JavaFloat.parseFloat(value), DotExporter.DPI));
  } else if (Attributes.HEIGHT === attr.getName()) {
    elknode.setHeight(Float32.mul(JavaFloat.parseFloat(value), DotExporter.DPI));
  } else {
    transformAttribute(elknode, attr, transData);
  }
}

/** The log message of both `catch` blocks of `transformNode(NodeStatement, ...)`. */
function discardNodeAttribute(statement: NodeStatement, attr: Attribute): string {
  return (
    `Discarding attribute "${String(attr.getName())}" for node "${String((statement.getNode() as Node).getName())}"` +
    ' since its value could not be parsed correctly.'
  );
}

/**
 * Transforms a single node, if not already done before.
 *
 * @param nodeId a node identifier
 * @param parent the parent where the new KNode is stored
 * @param transData the transformation data instance
 * @return a KNode instance
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function transformNode(nodeId: string | null, parent: ElkNode, transData: TransData): ElkNode {
  const nodeIdMap = transData.getProperty(NODE_ID_MAP);
  let elknode = nodeIdMap.get(nodeId);
  if (elknode === undefined) {
    elknode = ElkGraphUtil.createNode(parent);
    elknode.setWidth(DEF_WIDTH);
    elknode.setHeight(DEF_WIDTH);
    if (nodeId !== null) {
      nodeIdMap.set(nodeId, elknode);
      elknode.setProperty(PROP_ID, nodeId);
    }
  }
  return elknode;
}

/**
 * Transforms a single port, if not already done before.
 *
 * @param portId a port identifier
 * @param node the node to which the new KPort belongs
 * @param transData the transformation data instance
 * @return a KPort instance
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function transformPort(portId: string | null, node: ElkNode, transData: TransData): ElkPort {
  const portIdMap = transData.getProperty(PORT_ID_MAP);
  const key = new Pair<ElkNode, string | null>(node, portId);
  let elkport = portIdMap.get(key);
  if (elkport === undefined) {
    elkport = ElkGraphUtil.createPort(node);
    if (portId !== null) {
      portIdMap.put(key, elkport);
    }
  }
  return elkport;
}

/** The target of one edge target, as the loop of `transformEdge` carries it into the next iteration. */
interface EdgeEnd {
  readonly target: ElkNode;
  readonly targetName: string | null;
  readonly targetPort: ElkPort | null;
}

/**
 * Transforms an edge.
 *
 * @param statement an edge statement
 * @param parent the parent node
 * @param transData the transformation data instance
 * @param defaultProps default values for edge options
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function transformEdge(
  statement: EdgeStatement,
  parent: ElkNode,
  transData: TransData,
  defaultProps: IPropertyHolder,
): void {
  let sourceName = (statement.getSourceNode() as Node).getName();
  let source = transformNode(sourceName, parent, transData);
  let sourcePort = transformEdgePort(statement.getSourceNode() as Node, source, transData);
  const targetIter = statement.getEdgeTargets().listIterator();
  while (targetIter.hasNext()) {
    const edgeTarget = targetIter.next();
    const elkedge = ElkGraphUtil.createEdge(null);
    if (sourcePort !== null) {
      elkedge.getSources().add(sourcePort);
    } else {
      elkedge.getSources().add(source);
    }
    const end = transformEdgeTarget(edgeTarget, elkedge, parent, transData, defaultProps);
    transformEdgeStatement(statement, elkedge, sourceName, targetIter, edgeTarget);
    transformEdgeAttributes(statement, elkedge, transData);

    // the edge target is the source for the next edge target
    source = end.target;
    sourceName = end.targetName;
    sourcePort = end.targetPort;
  }
}

/**
 * The port of an edge end in `transformEdge`: the block that resolves the source port (DotImporter.java:437-444) and
 * the identical one for the target port (DotImporter.java:464-470), split for the complexity limits. The compass
 * point names the port when given, else the port name.
 *
 * @return the port, or `null` when the endpoint names none
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformEdgePort(endpoint: Node, elknode: ElkNode, transData: TransData): ElkPort | null {
  let port: ElkPort | null = null;
  if (endpoint.getPort() !== null) {
    let portName = (endpoint.getPort() as Port).getCompass_pt();
    if (portName === null) {
      portName = (endpoint.getPort() as Port).getName();
    }
    port = transformPort(portName, elknode, transData);
  }
  return port;
}

/**
 * The target node and port of one edge target in `transformEdge`, its connection to the new edge and the default
 * properties of the edge (DotImporter.java:454-479).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformEdgeTarget(
  edgeTarget: EdgeTarget,
  elkedge: ElkEdge,
  parent: ElkNode,
  transData: TransData,
  defaultProps: IPropertyHolder,
): EdgeEnd {
  let target: ElkNode;
  let targetPort: ElkPort | null = null;
  const edgeTargetNode = edgeTarget.getTargetnode();
  let targetName: string | null;
  if (edgeTargetNode === null) {
    // Java NullPointerException when the target has no subgraph either (a recovered `e -> ;`): kept, no guard
    targetName = (edgeTarget.getTargetSubgraph() as Subgraph).getName();
    target = transformNode(targetName, parent, transData);
  } else {
    targetName = edgeTargetNode.getName();
    target = transformNode(targetName, parent, transData);
    targetPort = transformEdgePort(edgeTargetNode, target, transData);
  }

  if (targetPort !== null) {
    elkedge.getTargets().add(targetPort);
  } else {
    elkedge.getTargets().add(target);
  }

  elkedge.copyProperties(defaultProps);
  return { target, targetName, targetPort };
}

/**
 * The statement of the new edge in `transformEdge` (DotImporter.java:480-495).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformEdgeStatement(
  statement: EdgeStatement,
  elkedge: ElkEdge,
  sourceName: string | null,
  targetIter: ListIterator<EdgeTarget>,
  edgeTarget: EdgeTarget,
): void {
  if (targetIter.previousIndex() === 0) {
    // this is the first target - just store the edge statement
    elkedge.setProperty(PROP_STATEMENT, statement);
  } else {
    // the edge statement has more that one target - create a copy
    const newStatement = DotFactory.eINSTANCE.createEdgeStatement();
    const sourceNode = DotFactory.eINSTANCE.createNode();
    sourceNode.setName(sourceName);
    newStatement.setSourceNode(sourceNode);
    targetIter.remove();
    newStatement.getEdgeTargets().add(edgeTarget);
    for (const attr of statement.getAttributes()) {
      newStatement.getAttributes().add(copyAttribute(attr));
    }
    elkedge.setProperty(PROP_STATEMENT, newStatement);
  }
}

/**
 * Java `EcoreUtil.copy(attr)` (DotImporter.java:492): `src/emf` has no `EcoreUtil.copy`; an `Attribute` has two
 * string features and no containment, so the copy is a new `Attribute` with the same name and value.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function copyAttribute(attr: Attribute): Attribute {
  const copy = DotFactory.eINSTANCE.createAttribute();
  copy.setName(attr.getName());
  copy.setValue(attr.getValue());
  return copy;
}

/**
 * The attribute loop of `transformEdge`: evaluate attributes for the new edge (DotImporter.java:497-512).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformEdgeAttributes(statement: EdgeStatement, elkedge: ElkEdge, transData: TransData): void {
  for (const attr of statement.getAttributes()) {
    const value = trimValue(attr);
    if (Attributes.LABEL === attr.getName()) {
      const label = ElkGraphUtil.createLabelWithText(value, elkedge);
      label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.CENTER);
    } else if (Attributes.HEADLABEL === attr.getName()) {
      const label = ElkGraphUtil.createLabelWithText(value, elkedge);
      label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.HEAD);
    } else if (Attributes.TAILLABEL === attr.getName()) {
      const label = ElkGraphUtil.createLabelWithText(value, elkedge);
      label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
    } else {
      transformAttribute(elkedge, attr, transData);
    }
  }
}
