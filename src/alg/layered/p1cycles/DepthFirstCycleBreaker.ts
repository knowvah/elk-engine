// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';

/** One suspended activation of the Java recursive method `dfs` (B8): its node and the outgoing-edge iteration. */
interface Frame {
  readonly n: LNode;
  readonly edges: Iterator<LEdge>;
}

/**
 * Cycle breaker implementation that uses a depth-first traversal of the graph. Described in
 * <ul>
 * <li>Emden R. Gansner, Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo, A technique for
 * drawing directed graphs. <i>Software Engineering</i> 19(3), pp. 214-230, 1993.</li>
 * </ul>
 *
 * <p>This cycle breaker does not support the `LayeredOptions.PRIORITY_DIRECTION` option that can be set on edges.
 * Neither does it support layer constraints out of the box. If layer constraints should be observed,
 * `EdgeAndLayerConstraintEdgeReverser` and `LayerConstraintProcessor` should be used.</p>
 *
 * <dl>
 *   <dt>Precondition:</dt><dd>an unlayered graph</dd>
 *   <dt>Postcondition:</dt><dd>the graph has no cycles</dd>
 * </dl>
 *
 * B8: the recursion of `dfs` (Java `:133`) is an explicit-stack loop with the same visit and side-effect order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/DepthFirstCycleBreaker.java
 */
export class DepthFirstCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (DepthFirstCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER));
  }

  /** List of source nodes. */
  private sources: LNode[] = [];
  /** Indicates whether a given node was already visited during DFS. */
  private visited: boolean[] = [];
  /**
   * A node is active during DFS if it is on our current DFS path. Any edge that leads back to an active node induces
   * a cycle and needs to be reversed.
   */
  private active: boolean[] = [];
  /** The list of edges to be reversed at the end of our little algorithmic adventure. */
  private edgesToBeReversed: LEdge[] = [];

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return DepthFirstCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(graph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Depth-first cycle removal', 1);

    const nodes = graph.getLayerlessNodes();

    // initialize values for the algorithm
    const nodeCount = nodes.length;

    this.sources = [];
    this.visited = new Array<boolean>(nodeCount).fill(false);
    this.active = new Array<boolean>(nodeCount).fill(false);
    this.edgesToBeReversed = [];

    this.collectSources(nodes);

    this.runDfs(nodes, nodeCount);

    this.reverseBackEdges(graph);

    // Cleanup
    this.sources = [];
    this.visited = [];
    this.active = [];
    this.edgesToBeReversed = [];

    monitor.done();
  }

  /** `:93-101`: the node id is the index into the arrays; nodes without incoming edges are sources. */
  private collectSources(nodes: readonly LNode[]): void {
    let index = 0;
    for (const node of nodes) {
      // The node id is used as index into our arrays
      node.id = index;
      if (Iterables.isEmpty(node.getIncomingEdges())) {
        this.sources.push(node);
      }
      index++;
    }
  }

  /** `:103-116`: a DFS from every source, then from every node not yet visited. */
  private runDfs(nodes: readonly LNode[], nodeCount: number): void {
    // From every source node start a DFS
    for (const source of this.sources) {
      this.dfs(source);
    }

    // Start more DFS runs for all nodes that have not been visited yet. These must be part of a cycle since they
    // are not source nodes
    for (let i = 0; i < nodeCount; i++) {
      if (!this.visited[i]) {
        const n = nodes[i]!;
        this.dfs(n);
      }
    }
  }

  /** `:118-122`: reverse "back edges". */
  private reverseBackEdges(graph: LGraph): void {
    for (const edge of this.edgesToBeReversed) {
      edge.reverse(graph, true);
      graph.setProperty(InternalProperties.CYCLIC, true);
    }
  }

  private dfs(start: LNode): void {
    if (this.visited[start.id]) {
      return;
    }
    const frames: Frame[] = [this.enter(start)];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        // We're leaving this node
        this.active[frame.n.id] = false;
        frames.pop();
        continue;
      }
      const out = next.value;
      // Ignore self loops
      if (out.isSelfLoop()) {
        continue;
      }

      const target = out.getTarget()!.getNode()!;

      // If the edge connects to an active node, we have found a path from said active node back to itself since
      // active nodes are on our current path. That's a backward edge and needs to be reversed
      if (this.active[target.id]) {
        this.edgesToBeReversed.push(out);
      } else if (!this.visited[target.id]) {
        // the recursive call `dfs(target)`; an already visited target returns at once
        frames.push(this.enter(target));
      }
    }
  }

  /** The start of the Java method `dfs` for an unvisited node: it is now visited, and it's active. */
  private enter(n: LNode): Frame {
    this.visited[n.id] = true;
    this.active[n.id] = true;
    return { n, edges: n.getOutgoingEdges()[Symbol.iterator]() };
  }
}
