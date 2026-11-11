// SPDX-License-Identifier: EPL-2.0
import { ElkUtil } from '../../core/util/ElkUtil.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { KVector } from '../../core/math/KVector.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import { TEdge } from './graph/TEdge.js';
import { TGraph } from './graph/TGraph.js';
import { TNode } from './graph/TNode.js';
import type { IGraphImporter } from './IGraphImporter.js';
import { InternalProperties } from './options/InternalProperties.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

/**
 * Manages the transformation of KGraphs to TGraphs.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/ElkGraphImporter.java
 */
export class ElkGraphImporter implements IGraphImporter<ElkNode> {
  // /////////////////////////////////////////////////////////////////////////////
  // Transformation KGraph -> TGraph

  importGraph(elkgraph: ElkNode): TGraph {
    const tGraph = new TGraph();

    // copy the properties of the KGraph to the t-graph
    tGraph.copyProperties(elkgraph);
    // TODO Find a new concept for checking validity of bounds
    //        tGraph.checkProperties(Properties.SPACING, Properties.ASPECT_RATIO);
    tGraph.setProperty(InternalProperties.ORIGIN, elkgraph);

    // keep a list of created nodes in the t-graph (identity-keyed, lookup only: TR3, `ElkGraphImporter.java:60`)
    const elemMap = new Map<ElkNode, TNode>();

    // transform nodes and edges
    this.transformNodes(elkgraph, tGraph, elemMap);
    this.transformEdges(elkgraph, tGraph, elemMap);

    return tGraph;
  }

  /**
   * Transforms the nodes and ports defined by the given layout node.
   *
   * @param parentNode the layout node whose edges to transform.
   * @param tGraph the t-graph.
   * @param elemMap the element map that maps the original `KGraph` elements to the transformed `TGraph` elements.
   */
  private transformNodes(parentNode: ElkNode, tGraph: TGraph, elemMap: Map<ElkNode, TNode>): void {
    let index = 0;

    for (const elknode of parentNode.getChildren()) {
      // copy label
      let label: string | null = '';
      if (!elknode.getLabels().isEmpty()) {
        label = elknode.getLabels().get(0).getText();
      }

      // create new tNode
      const newNode = new TNode(index++, tGraph, label);
      newNode.copyProperties(elknode);
      newNode.setProperty(InternalProperties.ORIGIN, elknode);

      newNode.getPosition().y = elknode.getY() + elknode.getHeight() / 2;
      newNode.getSize().x = Math.max(elknode.getWidth(), 1);
      newNode.getPosition().x = elknode.getX() + elknode.getWidth() / 2;
      newNode.getSize().y = Math.max(elknode.getHeight(), 1);

      tGraph.getNodes().add(newNode);

      // keep the corresponding tNode of each kNode for edge transformation
      elemMap.set(elknode, newNode);
    }
  }

  /**
   * Transforms the edges defined by the given layout node.
   *
   * @param parentNode the layout node whose edges to transform.
   * @param tGraph the t-graph.
   * @param elemMap the element map that maps the original `KGraph` elements to the transformed `TGraph` elements.
   */
  private transformEdges(parentNode: ElkNode, tGraph: TGraph, elemMap: Map<ElkNode, TNode>): void {
    for (const elknode of parentNode.getChildren()) {
      for (const elkedge of ElkGraphUtil.allOutgoingEdges(elknode)) {
        // exclude hyperedges, edges that pass hierarchy bounds, and self-loops
        // (the upstream test repeats `isHierarchical()`, kept)
        if (!elkedge.isHierarchical() && !elkedge.isHierarchical() && !elkedge.isSelfloop()) {
          // find the corresponding source and target tNode of edge
          const source = elemMap.get(elknode);
          const target = elemMap.get(ElkGraphUtil.connectableShapeToNode(elkedge.getTargets().get(0)) as ElkNode);

          if (source !== undefined && target !== undefined) {
            // create a edge and add edge to tGraph
            const newEdge = new TEdge(source, target);
            newEdge.setProperty(InternalProperties.ORIGIN, elkedge);

            // TODO transform the edge's labels

            // set properties of the new edge
            newEdge.copyProperties(elkedge);

            // update tNode accordingly
            source.getOutgoingEdges().add(newEdge);
            target.getIncomingEdges().add(newEdge);

            tGraph.getEdges().add(newEdge);
          }
        }
      }
    }
  }

  // /////////////////////////////////////////////////////////////////////////////
  // Apply Layout Results

  applyLayout(tGraph: TGraph): void {
    // get the corresponding kGraph (null for a graph without nodes made by `ComponentsProcessor.pack`: the
    // property access below then fails, as Java's NullPointerException at `ElkGraphImporter.java:172`)
    const elkgraph = tGraph.getProperty(InternalProperties.ORIGIN) as ElkNode;

    // calculate the offset from border spacing and node distribution
    const [minXPos, minYPos, maxXPos, maxYPos] = this.calculateBounds(tGraph);

    const padding = elkgraph.getProperty(MrTreeOptions.PADDING);

    this.applyNodePositions(tGraph);
    this.copyBendPoints(tGraph);

    // set up the graph
    const width = maxXPos - minXPos + padding.getHorizontal();
    const height = maxYPos - minYPos + padding.getVertical();
    if (!elkgraph.getProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      ElkUtil.resizeNode(elkgraph, width, height, false, false);
    }
    elkgraph.setProperty(CoreOptions.CHILD_AREA_WIDTH, width - padding.getHorizontal());
    elkgraph.setProperty(CoreOptions.CHILD_AREA_HEIGHT, height - padding.getVertical());
  }

  /**
   * First statement group of `applyLayout` (`ElkGraphImporter.java:158-170`), split out for the complexity limits.
   *
   * @returns minXPos, minYPos, maxXPos, maxYPos
   */
  private calculateBounds(tGraph: TGraph): [number, number, number, number] {
    let minXPos: number = JavaInteger.MAX_VALUE;
    let minYPos: number = JavaInteger.MAX_VALUE;
    let maxXPos: number = JavaInteger.MIN_VALUE;
    let maxYPos: number = JavaInteger.MIN_VALUE;
    for (const tNode of tGraph.getNodes()) {
      const pos = tNode.getPosition();
      const size = tNode.getSize();
      minXPos = Math.min(minXPos, pos.x - size.x / 2);
      minYPos = Math.min(minYPos, pos.y - size.y / 2);
      maxXPos = Math.max(maxXPos, pos.x + size.x / 2);
      maxYPos = Math.max(maxYPos, pos.y + size.y / 2);
    }
    return [minXPos, minYPos, maxXPos, maxYPos];
  }

  /** Statement group "apply tNode positions to elkNodes" of `applyLayout` (`:174-182`). */
  private applyNodePositions(tGraph: TGraph): void {
    for (const tNode of tGraph.getNodes()) {
      const object = tNode.getProperty(InternalProperties.ORIGIN);
      if (isElkNode(object)) {
        const elknode = object;
        elknode.setLocation(tNode.getPosition().x, tNode.getPosition().y);
        elknode.copyProperties(tNode);
      }
    }
  }

  /** Statement group "copy tEdge bendpoints to elkEdges" of `applyLayout` (`:184-192`). */
  private copyBendPoints(tGraph: TGraph): void {
    for (const tEdge of tGraph.getEdges()) {
      const elkedge = tEdge.getProperty(InternalProperties.ORIGIN) as ElkEdge | null;
      if (elkedge !== null) {
        const bendPoints = tEdge.getBendPoints();
        const edgeSection = ElkGraphUtil.firstEdgeSection(elkedge, true, true);
        ElkUtil.applyVectorChain(bendPoints, edgeSection);
      }
    }
  }

  /**
   * Modify the given center position to the border of the node. Unused upstream (private, no caller), ported whole.
   *
   * @param center the node center position (modified by this method)
   * @param next the next point of the edge vector chain
   * @param size the node size
   */
  private static toNodeBorder(center: KVector, next: KVector, size: KVector): void {
    const wh = size.x / 2;
    const hh = size.y / 2;
    const absx = Math.abs(next.x - center.x);
    const absy = Math.abs(next.y - center.y);
    let xscale = 1;
    let yscale = 1;
    if (absx > wh) {
      xscale = wh / absx;
    }
    if (absy > hh) {
      yscale = hh / absy;
    }
    const scale = Math.min(xscale, yscale);
    center.x += scale * (next.x - center.x);
    center.y += scale * (next.y - center.y);
  }
}
