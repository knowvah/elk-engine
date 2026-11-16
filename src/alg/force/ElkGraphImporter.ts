// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { PortConstraints } from '../../core/options/PortConstraints.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkLabel } from '../../graph/ElkLabel.js';
import { type ElkNode, isElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import { FBendpoint } from './graph/FBendpoint.js';
import { FEdge } from './graph/FEdge.js';
import { FGraph } from './graph/FGraph.js';
import { FLabel } from './graph/FLabel.js';
import { FNode } from './graph/FNode.js';
import type { IGraphImporter } from './IGraphImporter.js';
import { ForceOptions } from './options/ForceOptions.js';
import { InternalProperties } from './options/InternalProperties.js';

/**
 * Manages the transformation of KGraphs to FGraphs.
 *
 * `applyLayout` is split at its statement-group boundaries (`ElkGraphImporter.java:164-186`, `:190-200`, `:202-222`,
 * `:223-228`) to stay inside the complexity limits; statement order is unchanged.
 *
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/ElkGraphImporter.java
 */
export class ElkGraphImporter implements IGraphImporter<ElkNode> {
  // /////////////////////////////////////////////////////////////////////////////
  // Transformation KGraph -> FGraph

  importGraph(kgraph: ElkNode): FGraph {
    const fgraph = new FGraph();

    // copy the properties of the KGraph to the force graph
    fgraph.copyProperties(kgraph);
    // TODO Find another way to do this kind of bounds checking
    //        fgraph.checkProperties(Properties.SPACING, Properties.ASPECT_RATIO, Properties.TEMPERATURE,
    //                Properties.ITERATIONS, Properties.REPULSION);
    fgraph.setProperty(InternalProperties.ORIGIN, kgraph);

    // keep a list of created nodes in the force graph (identity-keyed, lookup only: AD-10, `ElkGraphImporter.java:60`)
    const elemMap = new Map<ElkNode, FNode>();

    // transform everything
    this.transformNodes(kgraph, fgraph, elemMap);
    this.transformEdges(kgraph, fgraph, elemMap);

    return fgraph;
  }

  /**
   * Transforms the nodes and ports defined by the given layout node.
   *
   * @param parentNode the layout node whose edges to transform.
   * @param fgraph the force graph.
   * @param elemMap the element map that maps the original `KGraph` elements to the transformed `FGraph` elements.
   */
  private transformNodes(parentNode: ElkNode, fgraph: FGraph, elemMap: Map<ElkNode, FNode>): void {
    let index = 0;
    for (const knode of parentNode.getChildren()) {
      let label: string | null = '';
      if (!knode.getLabels().isEmpty()) {
        label = knode.getLabels().get(0).getText();
      }

      const newNode = new FNode(label);
      newNode.copyProperties(knode);
      newNode.setProperty(InternalProperties.ORIGIN, knode);
      newNode.id = index++;
      newNode.getPosition().x = knode.getX() + knode.getWidth() / 2;
      newNode.getPosition().y = knode.getY() + knode.getHeight() / 2;
      newNode.getSize().x = Math.max(knode.getWidth(), 1);
      newNode.getSize().y = Math.max(knode.getHeight(), 1);
      fgraph.getNodes().push(newNode);
      elemMap.set(knode, newNode);

      // port constraints cannot be undefined
      let portConstraints = knode.getProperty(ForceOptions.PORT_CONSTRAINTS);
      if (portConstraints === PortConstraints.UNDEFINED) {
        portConstraints = PortConstraints.FREE;
      }
      // TODO consider ports
    }
  }

  /**
   * Transforms the edges defined by the given layout node.
   *
   * @param parentNode the layout node whose edges to transform.
   * @param fgraph the force graph.
   * @param elemMap the element map that maps the original `KGraph` elements to the transformed `FGraph` elements.
   */
  private transformEdges(parentNode: ElkNode, fgraph: FGraph, elemMap: Map<ElkNode, FNode>): void {
    for (const knode of parentNode.getChildren()) {
      for (const kedge of ElkGraphUtil.allOutgoingEdges(knode)) {
        // We don't support hyperedges
        if (kedge.isHyperedge()) {
          throw new UnsupportedGraphException('Graph must not contain hyperedges.');
        }

        // exclude edges that pass hierarchy bounds as well as self-loops
        if (!kedge.isHierarchical() && knode !== ElkGraphUtil.connectableShapeToNode(kedge.getTargets().get(0))) {
          this.transformEdge(kedge, knode, fgraph, elemMap);
        }
      }
    }
  }

  /**
   * The body of the Java `if` of `transformEdges` (`ElkGraphImporter.java:127-148`), split out for the complexity limits.
   */
  private transformEdge(kedge: ElkEdge, knode: ElkNode, fgraph: FGraph, elemMap: Map<ElkNode, FNode>): void {
    // create a force edge
    const newEdge = new FEdge();
    newEdge.copyProperties(kedge);
    // TODO
    //        newEdge.checkProperties(Properties.LABEL_SPACING, Properties.REPULSIVE_POWER);
    newEdge.setProperty(InternalProperties.ORIGIN, kedge);
    // never null: a non-hierarchical edge has all its incident nodes under one parent, and `transformNodes` mapped every
    // child of `parentNode` (the Java `elemMap.get` cannot return null here)
    newEdge.setSource(elemMap.get(knode)!);
    newEdge.setTarget(elemMap.get(ElkGraphUtil.connectableShapeToNode(kedge.getTargets().get(0)) as ElkNode)!);
    fgraph.getEdges().push(newEdge);

    // transform the edge's labels
    for (const klabel of kedge.getLabels() as Iterable<ElkLabel>) {
      const newLabel = new FLabel(newEdge, klabel.getText());
      newLabel.copyProperties(klabel);
      newLabel.setProperty(InternalProperties.ORIGIN, klabel);
      newLabel.getSize().x = Math.max(klabel.getWidth(), 1);
      newLabel.getSize().y = Math.max(klabel.getHeight(), 1);
      newLabel.refreshPosition();
      fgraph.getLabels().push(newLabel);
    }
  }

  // /////////////////////////////////////////////////////////////////////////////
  // Apply Layout Results

  applyLayout(fgraph: FGraph): void {
    const kgraph = fgraph.getProperty(InternalProperties.ORIGIN) as ElkNode;

    // calculate the offset from border spacing and node distribution
    const [minXPos, minYPos, maxXPos, maxYPos] = this.calculateBounds(fgraph);

    const padding = kgraph.getProperty(ForceOptions.PADDING);
    const offset = new KVector(padding.getLeft() - minXPos, padding.getTop() - minYPos);

    this.applyNodePositions(fgraph, offset);
    this.applyEdges(fgraph, offset);
    this.applyLabels(fgraph, offset);

    // set up the parent node
    const width = maxXPos - minXPos + padding.getHorizontal();
    const height = maxYPos - minYPos + padding.getVertical();
    if (!kgraph.getProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      ElkUtil.resizeNode(kgraph, width, height, false, true);
    }
    kgraph.setProperty(CoreOptions.CHILD_AREA_WIDTH, width - padding.getHorizontal());
    kgraph.setProperty(CoreOptions.CHILD_AREA_HEIGHT, height - padding.getVertical());
  }

  /**
   * First statement group of `applyLayout` (`ElkGraphImporter.java:164-186`): the bounds of nodes and bend points.
   *
   * @returns minXPos, minYPos, maxXPos, maxYPos
   */
  private calculateBounds(fgraph: FGraph): [number, number, number, number] {
    let minXPos: number = JavaInteger.MAX_VALUE;
    let minYPos: number = JavaInteger.MAX_VALUE;
    let maxXPos: number = JavaInteger.MIN_VALUE;
    let maxYPos: number = JavaInteger.MIN_VALUE;
    for (const node of fgraph.getNodes()) {
      const pos = node.getPosition();
      const size = node.getSize();
      minXPos = Math.min(minXPos, pos.x - size.x / 2);
      minYPos = Math.min(minYPos, pos.y - size.y / 2);
      maxXPos = Math.max(maxXPos, pos.x + size.x / 2);
      maxYPos = Math.max(maxYPos, pos.y + size.y / 2);
    }
    for (const bendpoint of fgraph.getBendpoints()) {
      const pos = bendpoint.getPosition();
      const size = bendpoint.getSize();
      minXPos = Math.min(minXPos, pos.x - size.x / 2);
      minYPos = Math.min(minYPos, pos.y - size.y / 2);
      maxXPos = Math.max(maxXPos, pos.x + size.x / 2);
      maxYPos = Math.max(maxYPos, pos.y + size.y / 2);
    }
    return [minXPos, minYPos, maxXPos, maxYPos];
  }

  /** Statement group "process the nodes" of `applyLayout` (`ElkGraphImporter.java:190-200`). */
  private applyNodePositions(fgraph: FGraph, offset: KVector): void {
    for (const fnode of fgraph.getNodes()) {
      const object = fnode.getProperty(InternalProperties.ORIGIN);
      if (isElkNode(object)) {
        // set the node position
        const knode = object;
        const nodePos = new KVector(fnode.getPosition()).add(offset);
        knode.setLocation(nodePos.x - knode.getWidth() / 2, nodePos.y - knode.getHeight() / 2);
      }
    }
  }

  /** Statement group "process the edges" of `applyLayout` (`ElkGraphImporter.java:202-222`). */
  private applyEdges(fgraph: FGraph, offset: KVector): void {
    for (const fedge of fgraph.getEdges()) {
      const kedge = fedge.getProperty(InternalProperties.ORIGIN) as ElkEdge;
      const kedgeSection = ElkGraphUtil.firstEdgeSection(kedge, true, true);

      // Add bendpoints
      const startLocation = new KVector(fedge.getSourcePoint());
      startLocation.add(offset);
      kedgeSection.setStartLocation(startLocation.x, startLocation.y);

      fedge.getBendpoints().forEach((bp: FBendpoint) => {
        const position = new KVector(bp.getPosition());
        position.add(offset);
        ElkGraphUtil.createBendPoint(kedgeSection, position.x, position.y);
      });

      const endLocation = new KVector(fedge.getTargetPoint());
      endLocation.add(offset);
      kedgeSection.setEndLocation(endLocation.x, endLocation.y);
    }
  }

  /** Statement group "process the labels" of `applyLayout` (`ElkGraphImporter.java:223-228`). */
  private applyLabels(fgraph: FGraph, offset: KVector): void {
    for (const flabel of fgraph.getLabels()) {
      const klabel = flabel.getProperty(InternalProperties.ORIGIN) as ElkLabel;
      const labelPos = new KVector(flabel.getPosition()).add(offset);
      klabel.setLocation(labelPos.x, labelPos.y);
    }
  }
}
