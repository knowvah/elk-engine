// SPDX-License-Identifier: EPL-2.0
import { UnsupportedGraphException } from '../../../../core/UnsupportedGraphException.js';
import type { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { Direction } from '../../../../core/options/Direction.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { type BiMap, HashBiMap } from '../../../../guava/HashBiMap.js';
import * as DoubleToString from '../../../../java/lang/DoubleToString.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { identity } from '../../../../java/util/HashStrategy.js';
import type { HashStrategy } from '../../../../java/util/HashStrategy.js';
import * as JavaString from '../../../../java/lang/JavaString.js';
import type { Attribute } from '../dot/Attribute.js';
import { AttributeType } from '../dot/AttributeType.js';
import { DotFactory } from '../dot/DotFactory.js';
import { DotPackage } from '../dot/DotPackage.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import { GraphType } from '../dot/GraphType.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Statement } from '../dot/Statement.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { Attributes } from './Attributes.js';
import type { Command } from './Command.js';
import {
  createAttribute,
  createAttributeDouble,
  createAttributeFloat,
  createAttributeInt,
  createString,
} from './DotExporterAttributes.js';
import { DotExporterEdgeLabels } from './DotExporterEdgeLabels.js';
import { type EdgeScope, isInsideGraph, transformEdgesEnds, transformEdgesLayout } from './DotExporterEdges.js';
import * as P from './DotExporterProperties.js';
import { applyEdgeLayout } from './DotExporterEdgeLayout.js';
import { applyLayout } from './DotExporterTransfer.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

/** The transformation data of the exporter: an ElkGraph source and a DOT target. */
type TransData = IDotTransformationData<ElkNode, GraphvizModel>;

/** node types used for identifier generation (the Java private enum `NodeType`). */
const NodeType = { NODE: 'NODE', CLUSTER: 'CLUSTER', DUMMY: 'DUMMY' } as const;
type NodeType = (typeof NodeType)[keyof typeof NodeType];

/**
 * The keys of `GRAPH_ELEMS`: `String.hashCode`/`equals`, with Java's `null` key (hash 0) that `transferLayout` looks
 * up for an edge statement without `comment`.
 */
const NULLABLE_STRING: HashStrategy<string | null> = {
  hash: (k) => (k === null ? 0 : JavaString.hashCode(k)),
  equals: (a, b) => a === b,
};

/** The flags `transformNodes` reads once per hierarchy level and its node branch uses. */
interface NodeFlags {
  readonly transformNodeLayout: boolean;
  readonly transformNodeLabels: boolean;
}

/**
 * This class implements a transformation from the KGraph metamodel to the Dot metamodel. Furthermore it contains
 * functionality to apply layout information attached to a Dot model to a KGraph model.
 *
 * Split for the 500-line file limit along method boundaries: the static fields live in `DotExporterProperties.ts`
 * (exposed here as statics), the `createAttribute` overloads and the private static `createString` in
 * `DotExporterAttributes.ts` (the four overloads are statics here), the edge label stacking of `setEdgeLabels` in
 * `DotExporterEdgeLabels.ts`, the edge helpers that call no overridable method in `DotExporterEdges.ts`, and the
 * private layout transfer methods in `DotExporterTransfer.ts` (`applyLayout`, `applyNodeLayout`) and
 * `DotExporterEdgeLayout.ts` (`applyEdgeLayout` … `parseSplinePoints`); none of those
 * calls an overridable method. The Java `createAttribute` overloads for `int`, `float` and `double` cannot be told
 * apart at run time and are `createAttributeInt`, `createAttributeFloat` and `createAttributeDouble` (translation
 * rule 6.5).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export class DotExporter {
  /** small default value for minimal spacing. */
  static readonly DEF_SPACING_SMALL: number = P.DEF_SPACING_SMALL;
  /** large default value for minimal spacing. */
  static readonly DEF_SPACING_LARGE: number = P.DEF_SPACING_LARGE;
  /** extra-large default value for minimal spacing. */
  static readonly DEF_SPACING_XLARGE: number = P.DEF_SPACING_XLARGE;
  /** dots per inch specification, needed by Graphviz for some values (a Java `float`, `72.0f`). */
  static readonly DPI: number = P.DPI;

  /** the Graphviz command to use for transformation. */
  static readonly COMMAND: IProperty<Command> = P.COMMAND;
  /** whether edge identifiers should be generated or not. */
  static readonly USE_EDGE_IDS: IProperty<boolean> = P.USE_EDGE_IDS;
  /** whether to transform all hierarchy levels of the graph. */
  static readonly HIERARCHY: IProperty<boolean> = P.HIERARCHY;
  /** whether to transform the layout information of nodes. */
  static readonly TRANSFORM_NODE_LAYOUT: IProperty<boolean> = P.TRANSFORM_NODE_LAYOUT;
  /** whether to transform the layout information of edges. */
  static readonly TRANSFORM_EDGE_LAYOUT: IProperty<boolean> = P.TRANSFORM_EDGE_LAYOUT;
  /** whether to transform node labels. */
  static readonly TRANSFORM_NODE_LABELS: IProperty<boolean> = P.TRANSFORM_NODE_LABELS;
  /** whether to adapt port positions to edge end points. */
  static readonly ADAPT_PORT_POSITIONS: IProperty<boolean> = P.ADAPT_PORT_POSITIONS;

  /** indicates whether splines are used. */
  protected static readonly USE_SPLINES: IProperty<boolean> = P.USE_SPLINES;

  /**
   * Transforms the KGraph instance to a Dot instance using the given command.
   *
   * @param transData the transformation data instance
   */
  transform(transData: TransData): void {
    const graphElems: BiMap<string | null, ElkGraphElement> = HashBiMap.create(
      NULLABLE_STRING,
      identity<ElkGraphElement>(),
    );
    transData.setProperty(P.GRAPH_ELEMS, graphElems);
    const elkgraph = transData.getSourceGraph() as ElkNode;
    const graphvizModel = DotFactory.eINSTANCE.createGraphvizModel();
    const graph = DotFactory.eINSTANCE.createGraph();
    graph.setType(GraphType.DIGRAPH);
    graphvizModel.getGraphs().add(graph);
    this.transformNodes(elkgraph, graph.getStatements(), new KVector(), transData);
    this.transformEdges(elkgraph, graph.getStatements(), transData);
    transData.getTargetGraphs().push(graphvizModel);
  }

  /**
   * Applies the layout information attached to the given Dot instance to the KGraph instance using the mapping
   * created by a previous call to `transform`. Has to be called after a call to `transform`.
   *
   * @param transData the transformation data instance
   */
  transferLayout(transData: TransData): void {
    const padding = (transData.getSourceGraph() as ElkNode).getProperty(CoreOptions.PADDING) as ElkPadding;
    const graph = (transData.getTargetGraphs()[0] as GraphvizModel).getGraphs().get(0);

    // process nodes and subgraphs
    const baseOffset = new KVector();
    applyLayout(transData.getSourceGraph(), graph.getStatements(), baseOffset, padding, transData);

    // finally process the edges
    const statements: Statement[] = [...graph.getStatements()];
    const edgeOffset = baseOffset.add(padding.getLeft(), padding.getTop());
    while (statements.length > 0) {
      const statement = statements.shift() as Statement;
      if (DotPackage.Literals.EDGE_STATEMENT.isInstance(statement)) {
        applyEdgeLayout(statement as EdgeStatement, edgeOffset, transData);
      } else if (DotPackage.Literals.SUBGRAPH.isInstance(statement)) {
        statements.push(...(statement as Subgraph).getStatements());
      }
    }
  }

  /**
   * Transform the child nodes of the given parent node.
   *
   * @param parent a parent node
   * @param statements the list to which new statements are added
   * @param offset offset of the parent node in the whole graph
   * @param transData transformation data
   */
  private transformNodes(parent: ElkNode, statements: EList<Statement>, offset: KVector, transData: TransData): void {
    // set attributes for the whole graph
    this.setGraphAttributes(statements, parent, transData);

    // create nodes and subgraphs
    const hierarchy = transData.getProperty(P.HIERARCHY);
    const flags: NodeFlags = {
      transformNodeLayout: transData.getProperty(P.TRANSFORM_NODE_LAYOUT),
      transformNodeLabels: transData.getProperty(P.TRANSFORM_NODE_LABELS),
    };
    for (const childNode of parent.getChildren()) {
      const nodeStatement = DotFactory.eINSTANCE.createNodeStatement();
      const attributes = nodeStatement.getAttributes();
      let nodeID: string;
      // if hierarchy mode is active, create a subgraph, else a regular node
      if (hierarchy && !childNode.getChildren().isEmpty()) {
        nodeID = this.transformNodesCluster(childNode, nodeStatement, statements, offset, transData);
      } else {
        nodeID = this.transformNodesNode(childNode, attributes, offset, flags, transData);
        statements.add(nodeStatement);
      }
      const node = DotFactory.eINSTANCE.createNode();
      node.setName(nodeID);
      nodeStatement.setNode(node);
    }
  }

  /** The hierarchy branch of `transformNodes`: a subgraph with the children, then the dummy node for compound edges. */
  private transformNodesCluster(
    childNode: ElkNode,
    nodeStatement: NodeStatement,
    statements: EList<Statement>,
    offset: KVector,
    transData: TransData,
  ): string {
    const attributes = nodeStatement.getAttributes();
    const clusterNodeID = this.getNodeID(childNode, NodeType.CLUSTER, transData);
    const subgraph = DotFactory.eINSTANCE.createSubgraph();
    subgraph.setName(clusterNodeID);
    statements.add(subgraph);

    // transform child nodes recursively
    const padding = childNode.getProperty(CoreOptions.PADDING) as ElkPadding;
    const subgraphx = childNode.getX() + padding.getLeft();
    const subgraphy = childNode.getY() + padding.getTop();
    this.transformNodes(childNode, subgraph.getStatements(), new KVector(offset).add(subgraphx, subgraphy), transData);

    // create a dummy node for compound edges
    const nodeID = this.getNodeID(childNode, NodeType.DUMMY, transData);
    attributes.add(DotExporter.createAttribute(Attributes.STYLE, 'invis'));
    attributes.add(DotExporter.createAttributeInt(Attributes.WIDTH, 0));
    attributes.add(DotExporter.createAttributeInt(Attributes.HEIGHT, 0));
    subgraph.getStatements().add(nodeStatement);
    return nodeID;
  }

  /** The regular branch of `transformNodes` up to adding the statement: size, label and interactive position. */
  private transformNodesNode(
    childNode: ElkNode,
    attributes: EList<Attribute>,
    offset: KVector,
    flags: NodeFlags,
    transData: TransData,
  ): string {
    const nodeID = this.getNodeID(childNode, NodeType.NODE, transData);
    // set width and height
    ElkUtil.resizeNode(childNode);
    if (childNode.getWidth() > 0) {
      attributes.add(DotExporter.createAttributeDouble(Attributes.WIDTH, childNode.getWidth() / P.DPI));
    }
    if (childNode.getHeight() > 0) {
      attributes.add(DotExporter.createAttributeDouble(Attributes.HEIGHT, childNode.getHeight() / P.DPI));
    }
    if (
      flags.transformNodeLabels &&
      !childNode.getLabels().isEmpty() &&
      (childNode.getLabels().get(0).getText() as string).length > 0
    ) {
      attributes.add(
        DotExporter.createAttribute(Attributes.LABEL, createString(childNode.getLabels().get(0).getText() as string)),
      );
    }
    // add node position if interactive layout is chosen
    if (flags.transformNodeLayout && (childNode.getX() !== 0 || childNode.getY() !== 0)) {
      this.transformNodesPos(childNode, attributes, offset);
    }
    return nodeID;
  }

  /** The interactive position block of `transformNodes`: the node centre in the whole graph. */
  private transformNodesPos(childNode: ElkNode, attributes: EList<Attribute>, offset: KVector): void {
    const xpos = childNode.getX() + childNode.getWidth() / 2 + offset.x;
    const ypos = childNode.getY() + childNode.getHeight() / 2 + offset.y;
    const posString = `"${DoubleToString.toString(xpos)},${DoubleToString.toString(ypos)}"`;
    attributes.add(DotExporter.createAttribute(Attributes.POS, posString));
  }

  /**
   * Transform the edges of the given parent node.
   *
   * @param parent a parent node
   * @param statements the list to which new statements are added
   * @param transData transformation data
   */
  private transformEdges(parent: ElkNode, statements: EList<Statement>, transData: TransData): void {
    const hierarchy = transData.getProperty(P.HIERARCHY);
    const transformEdgeLayout = transData.getProperty(P.TRANSFORM_EDGE_LAYOUT);
    const direction = parent.getProperty(CoreOptions.DIRECTION);
    const vertical = direction === Direction.DOWN || direction === Direction.UP || direction === Direction.UNDEFINED;
    const nodes: ElkNode[] = [...parent.getChildren()];
    const nodeIds = (transData.getProperty(P.GRAPH_ELEMS) as BiMap<string | null, ElkGraphElement>).inverse();
    const scope: EdgeScope = { hierarchy, transformEdgeLayout, vertical, nodeIds, transData };

    while (nodes.length > 0) {
      const source = nodes.shift() as ElkNode;
      for (const edge of ElkGraphUtil.allOutgoingEdges(source)) {
        this.transformEdgesEdge(edge, source, statements, scope);
      }
      if (hierarchy) {
        nodes.push(...source.getChildren());
      }
    }
  }

  /** The body of the edge loop of `transformEdges`. */
  private transformEdgesEdge(edge: ElkEdge, source: ElkNode, statements: EList<Statement>, scope: EdgeScope): void {
    // We don't support hyperedges
    if (edge.isHyperedge()) {
      throw new UnsupportedGraphException('Hyperedges are not supported.');
    }

    const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;

    // cross-hierarchy edges are considered only if hierarchy mode is active
    if (
      source.getParent() === target.getParent() ||
      (scope.hierarchy && isInsideGraph(target, scope.transData.getSourceGraph() as ElkNode))
    ) {
      const edgeStatement = DotFactory.eINSTANCE.createEdgeStatement();
      const attributes = edgeStatement.getAttributes();
      transformEdgesEnds(source, target, edgeStatement, scope);

      // add edge labels at head, tail, and middle position
      this.setEdgeLabels(edge, attributes, scope.vertical);

      if (scope.transData.getProperty(P.USE_EDGE_IDS)) {
        // add comment with edge identifier
        const edgeID = this.getEdgeID(edge, scope.transData);
        attributes.add(DotExporter.createAttribute(Attributes.COMMENT, `"${edgeID}"`));
      }

      // include edge routing for full export, if there is one
      if (!edge.getSections().isEmpty()) {
        transformEdgesLayout(edge, attributes, scope.transformEdgeLayout);
      }

      statements.add(edgeStatement);
    }
  }

  /**
   * Sets attributes for the whole graph.
   *
   * @param _statements the statement list for adding attributes
   * @param _parentNode the parent node
   * @param _transData transformation data
   */
  protected setGraphAttributes(_statements: EList<Statement>, _parentNode: ElkNode, _transData: TransData): void {
    // Implement in subclasses
  }

  /**
   * Sets general attributes for nodes.
   *
   * @param statements the statement list for adding attributes
   * @returns the list of node attributes
   */
  protected setGeneralNodeAttributes(statements: EList<Statement>): EList<Attribute> {
    const nodeAttrStatement = DotFactory.eINSTANCE.createAttributeStatement();
    nodeAttrStatement.setType(AttributeType.NODE);
    const nodeAttrs = nodeAttrStatement.getAttributes();
    statements.add(nodeAttrStatement);
    nodeAttrs.add(DotExporter.createAttribute(Attributes.SHAPE, 'box'));
    nodeAttrs.add(DotExporter.createAttribute(Attributes.FIXEDSIZE, 'true'));
    return nodeAttrs;
  }

  /**
   * Sets general attributes for edges.
   *
   * @param statements the statement list for adding attributes
   * @returns the list of edge attributes
   */
  protected setGeneralEdgeAttributes(statements: EList<Statement>): EList<Attribute> {
    const edgeAttrStatement = DotFactory.eINSTANCE.createAttributeStatement();
    edgeAttrStatement.setType(AttributeType.EDGE);
    const edgeAttrs = edgeAttrStatement.getAttributes();
    statements.add(edgeAttrStatement);
    edgeAttrs.add(DotExporter.createAttribute(Attributes.EDGEDIR, 'none'));
    return edgeAttrs;
  }

  /**
   * Create an attribute with given name and value for the Dot graph.
   *
   * @see DotExporterAttributes.createAttribute
   */
  static readonly createAttribute: (name: string, value: string | null) => Attribute = createAttribute;

  /**
   * Create an attribute with given name and integer value for the Dot graph (Java `createAttribute(String, int)`).
   *
   * @see DotExporterAttributes.createAttributeInt
   */
  static readonly createAttributeInt: (name: string, value: number) => Attribute = createAttributeInt;

  /**
   * Create an attribute with given name and float value for the Dot graph (Java `createAttribute(String, float)`).
   *
   * @see DotExporterAttributes.createAttributeFloat
   */
  static readonly createAttributeFloat: (name: string, value: number) => Attribute = createAttributeFloat;

  /**
   * Create an attribute with given name and float value for the Dot graph (Java `createAttribute(String, double)`).
   *
   * @see DotExporterAttributes.createAttributeDouble
   */
  static readonly createAttributeDouble: (name: string, value: number) => Attribute = createAttributeDouble;

  /**
   * Set edge labels for the given edge.
   *
   * @param elkedge edge whose labels shall be set
   * @param attributes edge attribute list to which the labels are added
   * @param isVertical indicates whether vertical layout direction is active
   */
  protected setEdgeLabels(elkedge: ElkEdge, attributes: EList<Attribute>, isVertical: boolean): void {
    if (elkedge.getLabels().isEmpty()) {
      return;
    }
    // as Graphviz only supports positioning of one label per label placement, all labels
    // are stacked to one big label as workaround
    const stack = DotExporterEdgeLabels.stack(elkedge);
    DotExporterEdgeLabels.addAttributes(elkedge, attributes, isVertical, stack);
  }

  /**
   * Creates a unique identifier for the given node.
   *
   * @param node node for which an identifier shall be created
   * @param type the kind of identifier to create
   * @param transData transformation data
   * @returns a unique string used to identify the node
   */
  private getNodeID(node: ElkNode, type: NodeType, transData: TransData): string {
    const id = transData.getProperty(P.NEXT_NODE_ID);
    transData.setProperty(P.NEXT_NODE_ID, Int32.add(id, 1));
    let idstring: string;
    const graphElems = transData.getProperty(P.GRAPH_ELEMS) as BiMap<string | null, ElkGraphElement>;
    switch (type) {
      case NodeType.NODE:
        idstring = `node${String(id)}`;
        graphElems.put(idstring, node);
        break;
      case NodeType.CLUSTER:
        idstring = `cluster${String(id)}`;
        graphElems.put(idstring, node);
        break;
      case NodeType.DUMMY:
        idstring = `dummy${String(id)}`;
        node.setProperty(P.CLUSTER_DUMMY, idstring);
        break;
    }
    return idstring;
  }

  /**
   * Creates a unique identifier for the given edge.
   *
   * @param edge edge for which an identifier shall be created
   * @param transData transformation data
   * @returns a unique string used to identify the edge
   */
  private getEdgeID(edge: ElkEdge, transData: TransData): string {
    const id = transData.getProperty(P.NEXT_EDGE_ID);
    transData.setProperty(P.NEXT_EDGE_ID, Int32.add(id, 1));
    const idstring = `edge${String(id)}`;
    (transData.getProperty(P.GRAPH_ELEMS) as BiMap<string | null, ElkGraphElement>).put(idstring, edge);
    return idstring;
  }
}
