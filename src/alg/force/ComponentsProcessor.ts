// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import * as Float32 from '../../java/lang/Float32.js';
import * as Int32 from '../../java/lang/Int32.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import type { FEdge } from './graph/FEdge.js';
import { FGraph } from './graph/FGraph.js';
import type { FNode } from './graph/FNode.js';
import { ForceOptions } from './options/ForceOptions.js';
import { InternalProperties } from './options/InternalProperties.js';

/**
 * Splits an input graph into connected components and recombines those components after layout.
 *
 * <h4>Splitting into components</h4>
 * Precondition: a graph. Postcondition: a list of graphs that represent the connected components of the input graph.
 *
 * <h4>Packing components</h4>
 * Precondition: a list of graphs with complete layout and layer assignment. Postcondition: a single graph.
 *
 * `recombine` is split at the statement-group boundaries of the Java (`:176-192`, `:194-208`, `:213-222`,
 * `:226-241`) to stay inside the complexity limits; statement order is unchanged. In `dfs`, for the same limit, the
 * `if (component == null)` assignment is `graph ?? new FGraph()` and `addAll` is a spread `push`. The Java `LinkedList` of
 * components and the `ArrayList`s of the graph are arrays (AD-10: insertion order, no hashing); the per-node
 * incidence lists stay `LinkedList`s.
 *
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/ComponentsProcessor.java
 */
export class ComponentsProcessor {
  // ///////////////////////////////////////////////////////////////////////////////////////////
  // Splitting

  /**
   * Split the given graph into its connected components.
   *
   * @param graph an input graph.
   * @return a list of components that can be processed one by one.
   */
  split(graph: FGraph): FGraph[] {
    const separate = graph.getProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS);
    if (separate === null || separate) {
      const visited: boolean[] = new Array<boolean>(graph.getNodes().length).fill(false);
      const incidence = this.buildIncidenceLists(graph);

      // perform DFS starting on each node, collecting connected components
      const components: FGraph[] = [];
      for (const node of graph.getNodes()) {
        const comp = this.dfs(node, null, null, visited, incidence);
        if (comp !== null) {
          comp.copyProperties(graph);
          components.push(comp);
        }
      }

      // redistribute identifier numbers to each component
      if (components.length > 1) {
        for (const comp of components) {
          let id = 0;
          for (const node of comp.getNodes()) {
            node.id = id++;
          }
        }
      }

      return components;
    }

    return [graph];
  }

  /**
   * Creates and returns the incidence list that for each node lists the incident edges.
   *
   * @param graph a force graph.
   */
  private buildIncidenceLists(graph: FGraph): LinkedList<FEdge>[] {
    const n = graph.getNodes().length;
    const incidence = new Array<LinkedList<FEdge>>(n);

    // create incidence lists
    for (const node of graph.getNodes()) {
      incidence[node.id] = new LinkedList<FEdge>();
    }

    // add edges to incidence lists
    for (const edge of graph.getEdges()) {
      incidence[edge.getSource()!.id]!.add(edge);
      incidence[edge.getTarget()!.id]!.add(edge);
    }

    return incidence;
  }

  /**
   * Perform a DFS starting on the given node and collect all nodes that are found in the corresponding connected
   * component. Recursive on the input depth, as in Java.
   *
   * @param node a node.
   * @param last the last node, i.e. the node from which the dfs arrived at {@code node}, or {@code null} if the dfs
   *             just started.
   * @param graph a graph representing a connected component, or {@code null}.
   * @param visited boolean indicating for each node whether it was already visited ({@code true}) or not.
   * @param incidence list of incident edges for each node.
   * @return the connected component, or {@code null} if the node was already visited.
   */
  private dfs(
    node: FNode,
    last: FNode | null,
    graph: FGraph | null,
    visited: boolean[],
    incidence: LinkedList<FEdge>[],
  ): FGraph | null {
    if (!visited[node.id]) {
      visited[node.id] = true;
      const component = graph ?? new FGraph();
      component.getNodes().push(node);

      for (const edge of incidence[node.id]!) {
        if (edge.getTarget() === last || edge.getSource() === last) {
          // Do not handle again the edge we just arrived from
          continue;
        }

        if (edge.getSource() !== node) {
          this.dfs(edge.getSource()!, node, component, visited, incidence);
        }
        if (edge.getTarget() !== node) {
          this.dfs(edge.getTarget()!, node, component, visited, incidence);
        }

        component.getEdges().push(edge);
        component.getLabels().push(...edge.getLabels());
      }

      return component;
    }
    return null;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////
  // Recombination

  /**
   * Pack the given components into a single graph. The list is sorted in place, as in Java.
   *
   * @param components a list of components.
   * @return a single graph that contains all components.
   */
  recombine(components: FGraph[]): FGraph {
    if (components.length === 1) {
      return components[0]!;
    } else if (components.length <= 0) {
      return new FGraph();
    }

    this.assignPrioritiesAndSizes(components);
    this.sortComponents(components);

    const result = new FGraph();
    result.copyProperties(components[0]!);

    const maxRowWidth = this.determineMaxRowWidth(components, result);
    this.placeIntoRows(components, result, maxRowWidth);

    return result;
  }

  /** Statement group "assign priorities and sizes" of `recombine` (`ComponentsProcessor.java:176-192`). */
  private assignPrioritiesAndSizes(components: FGraph[]): void {
    for (const graph of components) {
      let priority = 0;
      let minx: number = JavaInteger.MAX_VALUE;
      let miny: number = JavaInteger.MAX_VALUE;
      let maxx: number = JavaInteger.MIN_VALUE;
      let maxy: number = JavaInteger.MIN_VALUE;
      for (const node of graph.getNodes()) {
        priority = Int32.add(priority, node.getProperty(ForceOptions.PRIORITY));
        // careful: the (x,y) of an FNode refers to its center
        minx = Math.min(minx, node.getPosition().x - node.getSize().x / 2);
        miny = Math.min(miny, node.getPosition().y - node.getSize().y / 2);
        maxx = Math.max(maxx, node.getPosition().x + node.getSize().x / 2);
        maxy = Math.max(maxy, node.getPosition().y + node.getSize().y / 2);
      }
      graph.setProperty(ForceOptions.PRIORITY, priority);
      graph.setProperty(InternalProperties.BB_UPLEFT, new KVector(minx, miny));
      graph.setProperty(InternalProperties.BB_LOWRIGHT, new KVector(maxx, maxy));
    }
  }

  /**
   * Statement group "sort the components by their priority and size" of `recombine` (`:194-208`): `Collections.sort`
   * is a stable sort, as is `Array.prototype.sort`.
   */
  private sortComponents(components: FGraph[]): void {
    components.sort((graph1: FGraph, graph2: FGraph): number => {
      const prio = Int32.sub(graph2.getProperty(ForceOptions.PRIORITY), graph1.getProperty(ForceOptions.PRIORITY));
      if (prio === 0) {
        const size1 = graph1
          .getProperty(InternalProperties.BB_LOWRIGHT)
          .clone()
          .sub(graph1.getProperty(InternalProperties.BB_UPLEFT));
        const size2 = graph2
          .getProperty(InternalProperties.BB_LOWRIGHT)
          .clone()
          .sub(graph2.getProperty(InternalProperties.BB_UPLEFT));
        return doubleCompare(size1.x * size1.y, size2.x * size2.y);
      }
      return prio;
    });
  }

  /**
   * Statement group "determine the maximal row width" of `recombine` (`:213-222`). `(float) Math.sqrt(totalArea)` is
   * narrowed to binary32 and multiplied by the `Float` aspect ratio in binary32 (`:222`).
   */
  private determineMaxRowWidth(components: FGraph[], result: FGraph): number {
    // determine the maximal row width by the maximal box width and the total area
    let maxRowWidth = 0.0;
    let totalArea = 0.0;
    for (const graph of components) {
      const size = graph
        .getProperty(InternalProperties.BB_LOWRIGHT)
        .clone()
        .sub(graph.getProperty(InternalProperties.BB_UPLEFT));
      maxRowWidth = Math.max(maxRowWidth, size.x);
      totalArea += size.x * size.y;
    }
    return Math.max(
      maxRowWidth,
      Float32.mul(Float32.fromDouble(Math.sqrt(totalArea)), result.getProperty(ForceOptions.ASPECT_RATIO)),
    );
  }

  /** Statement group "place nodes iteratively into rows" of `recombine` (`:226-241`). */
  private placeIntoRows(components: FGraph[], result: FGraph, maxRowWidth: number): void {
    const spacing = result.getProperty(ForceOptions.SPACING_NODE_NODE);

    // place nodes iteratively into rows
    let xpos = 0;
    let ypos = 0;
    let highestBox = 0;
    let broadestRow = spacing;
    for (const graph of components) {
      const size = graph
        .getProperty(InternalProperties.BB_LOWRIGHT)
        .clone()
        .sub(graph.getProperty(InternalProperties.BB_UPLEFT));
      if (xpos + size.x > maxRowWidth) {
        // place the graph into the next row
        xpos = 0;
        ypos += highestBox + spacing;
        highestBox = 0;
      }
      this.moveGraph(result, graph, xpos, ypos);
      broadestRow = Math.max(broadestRow, xpos + size.x);
      highestBox = Math.max(highestBox, size.y);
      xpos += size.x + spacing;
    }
    // `broadestRow` is written but never read upstream (`ComponentsProcessor.java:227`, `:238`); kept as ported
    void broadestRow;
  }

  /**
   * Move the source graph into the destination graph using a specified offset.
   *
   * @param destGraph the destination graph.
   * @param sourceGraph the source graph.
   * @param offsetx x coordinate offset.
   * @param offsety y coordinate offset.
   */
  private moveGraph(destGraph: FGraph, sourceGraph: FGraph, offsetx: number, offsety: number): void {
    const graphOffset = new KVector(offsetx, offsety);
    graphOffset.sub(sourceGraph.getProperty(InternalProperties.BB_UPLEFT));

    for (const node of sourceGraph.getNodes()) {
      node.getPosition().add(graphOffset);
      destGraph.getNodes().push(node);
    }
    for (const edge of sourceGraph.getEdges()) {
      for (const bendpoint of edge.getBendpoints()) {
        bendpoint.getPosition().add(graphOffset);
      }
      destGraph.getEdges().push(edge);
    }
    for (const label of sourceGraph.getLabels()) {
      label.getPosition().add(graphOffset);
      destGraph.getLabels().push(label);
    }
  }
}
