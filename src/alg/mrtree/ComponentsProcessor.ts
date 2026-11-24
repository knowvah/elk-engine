// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { PROPERTY } from '../../graph/properties/MapPropertyHolder.js';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import * as Int32 from '../../java/lang/Int32.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import { checkStackDepth } from '../../java/lang/StackDepth.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { TEdge } from './graph/TEdge.js';
import { TGraph } from './graph/TGraph.js';
import type { TNode } from './graph/TNode.js';
import { GraphBoundsProcessor } from './intermediate/GraphBoundsProcessor.js';
import { InternalProperties } from './options/InternalProperties.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

/** The point a suspended `dfs` activation has reached in its loop body (ComponentsProcessor.java:142-151). */
const DfsStep = {
  /** before the source-side test of the next edge (`:143`) */
  SOURCE: 0,
  /** after the source-side call, before the target-side test (`:146`) */
  TARGET: 1,
  /** after the target-side call, before the edge is added (`:150`) */
  ADD: 2,
} as const;
type DfsStep = (typeof DfsStep)[keyof typeof DfsStep];

/** One suspended `dfs` activation (ComponentsProcessor.java:129-155). */
interface DfsFrame {
  readonly node: TNode;
  readonly component: TGraph;
  readonly edges: Iterator<TEdge>;
  edge: TEdge | null;
  step: DfsStep;
}

/**
 * A processor that is able to split an input graph into connected components and to pack those components after
 * layout.
 *
 * `pack` is split at the statement-group boundaries of the Java (`:174-189`, `:191-208`, `:210-221`, `:223-238`,
 * `:240-262`) to stay inside the complexity limits; statement order is unchanged.
 *
 * @author sor
 * @author sgu
 * @author msp
 * @author cds
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/ComponentsProcessor.java
 */
export class ComponentsProcessor {
  /** the incidence lists of the graph. */
  private incidence: LinkedList<TEdge>[] | null = null;
  /** the visited array of the graph. */
  private visited: boolean[] | null = null;

  /**
   * Initialize adjacency lists.
   *
   * @param graph a force graph
   */
  private initialize(graph: TGraph): void {
    const n = graph.getNodes().size();
    const incidence = new Array<LinkedList<TEdge>>(n);
    this.incidence = incidence;
    this.visited = new Array<boolean>(n).fill(false);

    // create incidence lists
    for (const node of graph.getNodes()) {
      incidence[node.id] = new LinkedList<TEdge>();
    }
    // add edges to incidence lists
    for (const edge of graph.getEdges()) {
      incidence[edge.getSource()!.id]!.add(edge);
      incidence[edge.getTarget()!.id]!.add(edge);
    }
  }

  /**
   * Split the given graph into its connected components.
   *
   * @param graph an input graph
   * @returns a list of components that can be processed one by one
   */
  split(graph: TGraph): TGraph[] {
    const separate = graph.getProperty(MrTreeOptions.SEPARATE_CONNECTED_COMPONENTS);
    if (separate === null || separate) {
      this.initialize(graph);

      // perform DFS starting on each node, collecting connected components
      const components: TGraph[] = [];
      for (const node of graph.getNodes()) {
        const comp = this.dfs(node, null);
        if (comp !== null) {
          comp.copyProperties(graph);
          components.push(comp);
        }
      }
      this.incidence = null;
      this.visited = null;

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
   * Perform a DFS starting on the given node and collect all nodes that are found in the corresponding connected
   * component.
   *
   * The two recursive calls of ComponentsProcessor.java:144 (source side) and :147 (target side) are separate frame
   * pushes in that order. AC6 (#67): explicit stack, same visit, side-effect and accumulation order. A frame is one
   * suspended Java activation with an unvisited node: the node, the component, the live iterator over its incidence
   * list and the current edge with the step reached in the loop body; an activation on a visited node returns at entry
   * without a frame, as the Java's `if` does.
   *
   * @param node the starting node
   * @param graph a graph representing a connected component, or `null`
   * @returns the connected component, or `null` if the node was already visited
   */
  private dfs(node: TNode, graph: TGraph | null): TGraph | null {
    const stack: DfsFrame[] = [];
    const component = this.openDfs(node, graph, stack);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = this.nextDfsCall(frame);
      if (next === null) {
        stack.pop();
      } else {
        this.openDfs(next, frame.component, stack);
      }
    }
    return component;
  }

  /**
   * Entry of one `dfs` activation (ComponentsProcessor.java:131-140): an unvisited node is marked, the component
   * created if necessary, the node added and a frame pushed; a visited node yields `null` and no frame.
   */
  private openDfs(node: TNode, graph: TGraph | null, stack: DfsFrame[]): TGraph | null {
    const visited = this.visited!;
    // check if node was visited earlier
    if (!visited[node.id]) {
      // if not it is visited now
      visited[node.id] = true;
      // create new component if necessary
      let component = graph;
      if (component === null) {
        component = new TGraph();
      }
      // add the node to the component
      component.getNodes().add(node);
      // the incidence lists are not modified while the DFS runs; the iterator stays live as the Java's does
      stack.push({ node, component, edges: this.incidence![node.id]!.iterator(), edge: null, step: DfsStep.SOURCE });
      this.checkDfsDepth(stack.length);
      return component;
    }
    // if the node was visited before skip it
    return null;
  }

  /**
   * Runs a frame's loop body (ComponentsProcessor.java:142-151) up to its next recursive call and returns the node of
   * that call, or `null` when the loop ends and the activation returns.
   */
  private nextDfsCall(frame: DfsFrame): TNode | null {
    for (;;) {
      if (frame.step === DfsStep.SOURCE) {
        // follow all edges from this node
        const next = frame.edges.next();
        if (next.done === true) {
          return null;
        }
        frame.edge = next.value;
        frame.step = DfsStep.TARGET;
        if (frame.edge.getSource() !== frame.node) {
          return frame.edge.getSource()!;
        }
      }
      if (frame.step === DfsStep.TARGET) {
        frame.step = DfsStep.ADD;
        if (frame.edge!.getTarget() !== frame.node) {
          return frame.edge!.getTarget()!;
        }
      }
      // add the edges an labels to the component
      frame.component.getEdges().add(frame.edge!);
      frame.step = DfsStep.SOURCE;
    }
  }

  /** Java's `StackOverflowError` of an endless `dfs` recursion, raised from this class (AC6, #67). */
  private checkDfsDepth(depth: number): void {
    checkStackDepth(depth);
  }

  /**
   * Pack the given components into a single graph. The list is sorted in place, as in Java.
   *
   * @param components a list of components
   * @returns a single graph that contains all components
   */
  pack(components: TGraph[]): TGraph {
    if (components.length === 1) {
      this.applyPaddingAndNormalizePositions(components[0]!);
      return components[0]!;
    } else if (components.length <= 0) {
      return new TGraph();
    }

    this.assignPrioritiesAndSizes(components);
    this.sortComponents(components);

    const result = new TGraph();
    result.copyProperties(components[0]!);

    const maxRowWidth = this.determineMaxRowWidth(components, result);
    this.placeIntoRows(components, result, maxRowWidth);
    this.mergeProperties(components, result);

    // We need to recompute the graphs bounds, since each component only knows its own bounds and the prop merge
    // cannot catch this
    const boundsProcessor = new GraphBoundsProcessor();
    boundsProcessor.process(result, new NullElkProgressMonitor());
    // Move the resulting graph to 0,0 and apply padding
    this.applyPaddingAndNormalizePositions(result);

    return result;
  }

  /** Statement group "assign priorities and sizes" of `pack` (`ComponentsProcessor.java:174-189`). */
  private assignPrioritiesAndSizes(components: TGraph[]): void {
    for (const graph of components) {
      let priority = 0;
      let minx: number = JavaInteger.MAX_VALUE;
      let miny: number = JavaInteger.MAX_VALUE;
      let maxx: number = JavaInteger.MIN_VALUE;
      let maxy: number = JavaInteger.MIN_VALUE;
      for (const node of graph.getNodes()) {
        priority = Int32.add(priority, node.getProperty(MrTreeOptions.PRIORITY));
        minx = Math.min(minx, node.getPosition().x);
        miny = Math.min(miny, node.getPosition().y);
        maxx = Math.max(maxx, node.getPosition().x + node.getSize().x);
        maxy = Math.max(maxy, node.getPosition().y + node.getSize().y);
      }
      graph.setProperty(MrTreeOptions.PRIORITY, priority);
      graph.setProperty(InternalProperties.BB_UPLEFT, new KVector(minx, miny));
      graph.setProperty(InternalProperties.BB_LOWRIGHT, new KVector(maxx, maxy));
    }
  }

  /** Statement group "sort the components by their priority and size" of `pack` (`:191-208`; `Collections.sort`). */
  private sortComponents(components: TGraph[]): void {
    components.sort((graph1, graph2) => {
      const prio = Int32.sub(graph2.getProperty(MrTreeOptions.PRIORITY), graph1.getProperty(MrTreeOptions.PRIORITY));
      if (prio === 0) {
        const size1 = graph1
          .getProperty(InternalProperties.BB_LOWRIGHT)!
          .clone()
          .sub(graph1.getProperty(InternalProperties.BB_UPLEFT)!);
        const size2 = graph2
          .getProperty(InternalProperties.BB_LOWRIGHT)!
          .clone()
          .sub(graph2.getProperty(InternalProperties.BB_UPLEFT)!);
        return doubleCompare(size1.x * size1.y, size2.x * size2.y);
      }
      return prio;
    });
  }

  /** Statement group "determine the maximal row width by the maximal box width and the total area" (`:210-221`). */
  private determineMaxRowWidth(components: TGraph[], result: TGraph): number {
    let maxRowWidth = 0.0;
    let totalArea = 0.0;
    for (const graph of components) {
      const size = graph
        .getProperty(InternalProperties.BB_LOWRIGHT)!
        .clone()
        .sub(graph.getProperty(InternalProperties.BB_UPLEFT)!);
      maxRowWidth = Math.max(maxRowWidth, size.x);
      totalArea += size.x * size.y;
    }
    // `(float) Math.sqrt(totalArea)` (`:220`): narrowed to float, widened again by the multiplication
    return Math.max(maxRowWidth, Math.fround(Math.sqrt(totalArea)) * result.getProperty(MrTreeOptions.ASPECT_RATIO));
  }

  /** Statement group "place nodes iteratively into rows" of `pack` (`:223-238`). */
  private placeIntoRows(components: TGraph[], result: TGraph, maxRowWidth: number): void {
    const spacing = result.getProperty(MrTreeOptions.SPACING_NODE_NODE);

    let xpos = 0;
    let ypos = 0;
    let highestBox = 0;
    let broadestRow = spacing;
    for (const graph of components) {
      const size = graph
        .getProperty(InternalProperties.BB_LOWRIGHT)!
        .clone()
        .sub(graph.getProperty(InternalProperties.BB_UPLEFT)!);
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
    // `broadestRow` is written but never read upstream; kept as in the Java
    void broadestRow;
  }

  /**
   * The property merge of `pack` (`ComponentsProcessor.java:240-262`, V1 / TR3): both maps are `HashMap`s keyed by
   * `IProperty` (`PROPERTY` strategy), `getAllProperties()` is iterated in its `JavaHashMap` order and the last writer
   * wins.
   *
   * Stop 13, the boxed `!=` of `:249` (`entry.getKey().getDefault() != entry.getValue()`), is the reference comparison
   * `!==` here. Provenance: the left operand is `Property.getDefault()` (`Property.java`): a fresh `ElkReflect` clone for
   * a `Cloneable` default (`REMOVABLE_EDGES`' `LinkedList`), else the one shared default object; the right operand is
   * the stored value. The properties that can differ between components at this point are `PRIORITY`, `BB_UPLEFT`,
   * `BB_LOWRIGHT`, `REMOVABLE_EDGES` and `GRAPH_XMIN/YMIN/XMAX/YMAX` (everything else is copied by reference from the
   * one input graph at `split`, so every component holds the same value). `REMOVABLE_EDGES` (fresh clone) and
   * `BB_*` (`null` default against a `KVector`) are always `!=` in Java and `!==` here. `PRIORITY` is an `Integer`
   * autoboxed from `int` (`:174-189`, `setProperty(PRIORITY, int)`) against the shared default `1`
   * (`MrTreeOptions.PRIORITY`), and `Integer.valueOf` caches -128..127: equal values are one object (`!=`
   * false), values outside it are fresh objects but then differ from `1` anyway, so `!==` is exact. `GRAPH_*` are `Double`s (`Double.valueOf`, never cached) against the shared default `0d`: Java is
   * always `!=` true, `!==` is false for a stored `0.0`. That difference is unobservable: `GraphBoundsProcessor` sets
   * all four on `result` unconditionally right after the merge (`GraphBoundsProcessor.java:34-40`), and the only other
   * effect, the `debugMode` message of `:251`, goes to the error stream.
   */
  private mergeProperties(components: TGraph[], result: TGraph): void {
    const propMerge = new JavaHashMap<IProperty<unknown>, unknown>(PROPERTY);

    const debug = new JavaHashMap<IProperty<unknown>, unknown>(PROPERTY);

    for (const tGraph of components) {
      const debugMode = tGraph.getProperty(CoreOptions.DEBUG_MODE);
      const propComp = tGraph.getAllProperties();
      for (const [key, value] of propComp) {
        if (propMerge.containsKey(key)) {
          if (key.getDefault() !== value) {
            if (debugMode && debug.containsKey(key)) {
              console.error(`Found different values for property ${key.getId()} in components.`);
            } else {
              propMerge.put(key, value);
              result.setProperty(key, value);
              if (debugMode) {
                debug.put(key, value);
              }
            }
          }
        } else {
          propMerge.put(key, value);
          result.setProperty(key, value);
        }
      }
    }
  }

  /**
   * Move the nodes so that minX and minY node coords are zero and apply padding.
   *
   * @param g the graph to work on
   */
  private applyPaddingAndNormalizePositions(g: TGraph): void {
    const padding = g.getProperty(MrTreeOptions.PADDING);
    g.setProperty(InternalProperties.BB_UPLEFT, new KVector(0, 0));
    this.moveGraph(
      new TGraph(),
      g,
      padding.getLeft() - g.getProperty(InternalProperties.GRAPH_XMIN),
      padding.getTop() - g.getProperty(InternalProperties.GRAPH_YMIN),
    );
  }

  /**
   * Move the source graph into the destination graph using a specified offset.
   *
   * @param destGraph the destination graph
   * @param sourceGraph the source graph
   * @param offsetx x coordinate offset
   * @param offsety y coordinate offset
   */
  private moveGraph(destGraph: TGraph, sourceGraph: TGraph, offsetx: number, offsety: number): void {
    const graphOffset = new KVector(offsetx, offsety);
    graphOffset.sub(sourceGraph.getProperty(InternalProperties.BB_UPLEFT)!);

    for (const node of sourceGraph.getNodes()) {
      node.getPosition().add(graphOffset);
      destGraph.getNodes().add(node);
    }

    // `stream().distinct()`: first occurrence of each edge, in encounter order (TEdge has no `equals`)
    for (const edge of new Set(sourceGraph.getEdges())) {
      for (const bendpoint of edge.getBendPoints()) {
        bendpoint.add(graphOffset);
      }
      destGraph.getEdges().add(edge);
    }
  }
}
