// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Uses the Breadth-First-Search to traverse the graph and reverses edges if the node is already explored.
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
 * AD-10: `sources` is a Java `HashSet<LNode>` of identity-hashed nodes that `:121` iterates, so it is a `Set` in
 * insertion order (the oracle's constant identity hash gives that order for up to 10 sources); `sinks` is only queried
 * with `contains`. The per-key `HashSet<LEdge>` of `bfs` takes its insertion order for `iterator().next()` (`:219`) and
 * `addAll` (`:228`); the `HashMap<Integer, ...>` is only read with `get`/`put`/`containsKey` and through a sorted
 * `TreeSet` of its keys, so a `Map` suffices.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/BFSNodeOrderCycleBreaker.java
 */
export class BFSNodeOrderCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (BFSNodeOrderCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER));
  }

  /** Set of source nodes. */
  private sources: Set<LNode> = new Set();

  /** Set of sink nodes. */
  private sinks: Set<LNode> = new Set();

  /** Indicates whether a given node was already visited during BFS. */
  private visited: boolean[] = [];

  /** Queues the nodes for BFS. */
  private bfsQueue: LinkedList<LNode> = new LinkedList();

  /** The list of edges to be reversed at the end of our little algorithmic adventure. */
  private edgesToBeReversed: LEdge[] = [];

  private graph!: LGraph;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return BFSNodeOrderCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(graph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Breadth-first cycle removal', 1);

    this.graph = graph;
    const nodes = graph.getLayerlessNodes();

    // initialize values for the algorithm
    this.bfsQueue = new LinkedList<LNode>();
    this.sources = new Set();
    this.sinks = new Set();
    this.visited = new Array<boolean>(nodes.length).fill(false);
    this.edgesToBeReversed = [];

    this.findSourcesAndSinks(nodes);

    this.bfsFromSources();

    this.bfsFromUnvisited(nodes);

    this.reverseBackEdges(graph);

    // Cleanup
    this.sources = new Set();
    this.visited = [];
    this.bfsQueue = new LinkedList<LNode>();
    this.edgesToBeReversed = [];

    monitor.done();
  }

  /** `:105-117`: find all sources and sinks in the graph. */
  private findSourcesAndSinks(nodes: readonly LNode[]): void {
    let index = 0;
    for (const node of nodes) {
      // The node id is used as index into our arrays
      node.id = index;
      if (Iterables.isEmpty(node.getIncomingEdges())) {
        this.sources.add(node);
      }
      if (Iterables.isEmpty(node.getOutgoingEdges())) {
        this.sinks.add(node);
      }
      index++;
    }
  }

  /** `:119-128`: start BFS Search starting at each source sequentially. */
  private bfsFromSources(): void {
    // This means each source may add their connections to the queue such that we search breadth-first.
    for (const source of this.sources) {
      // sequential bfs
      this.bfsQueue.add(source);
      this.bfsLoop();
    }

    this.bfsLoop();
  }

  /** `:130-145`: start more BFS runs from the first node that has not been visited yet. */
  private bfsFromUnvisited(nodes: readonly LNode[]): void {
    // This must be part of a cycle since it is not a source nodes
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < nodes.length; i++) {
        if (!this.visited[i]) {
          const n = nodes[i]!;
          this.bfsQueue.add(n);
          changed = true;
          break;
        }
      }
      this.bfsLoop();
    }
  }

  /** `:148-152`: reverse "back edges". */
  private reverseBackEdges(graph: LGraph): void {
    for (const edge of this.edgesToBeReversed) {
      edge.reverse(graph, true);
      graph.setProperty(InternalProperties.CYCLIC, true);
    }
  }

  private bfsLoop(): void {
    while (!this.bfsQueue.isEmpty()) {
      // Queue.poll(): the queue is not empty here
      this.bfs(this.bfsQueue.removeFirst());
    }
  }

  /**
   * Visits a node and adds its connections to the BF-queue.
   *
   * @param n the node to visit
   */
  private bfs(n: LNode): void {
    // Return if the node was already visited.
    if (this.visited[n.id]) {
      return;
    }
    this.visited[n.id] = true;

    // Map to save the node model order of each edge connection.
    const modelOrderMap = new Map<number, Set<LEdge>>();
    const groupModelOrder =
      this.graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
      GroupOrderStrategy.ENFORCED;

    // Create a map of edges and the model order of the node they lead to
    for (const e of n.getOutgoingEdges()) {
      this.addToModelOrderMap(modelOrderMap, e, groupModelOrder);
    }
    // This holds all model orders of nodes connected to the current node sorted by model order.
    // Basically this orders all different model orders (or group model orders) by priority.
    const modelOrderSet = [...modelOrderMap.keys()].sort((a, b) => a - b);

    // Since the model order determines the iteration order of e
    for (const key of modelOrderSet) {
      const out = modelOrderMap.get(key)!.values().next().value!;
      // Do not visit self loops
      if (out.isSelfLoop()) {
        continue;
      }
      // If the target was already visited, reverse the edge to it.
      const target = out.getTarget()!.getNode()!;
      if (this.visited[target.id] && !this.sources.has(n) && !this.sinks.has(target)) {
        this.edgesToBeReversed.push(...modelOrderMap.get(key)!);
      } else {
        this.bfsQueue.add(target);
      }
    }
  }

  /** `:185-212`: the body of the loop that maps each outgoing edge to the model order of its target. */
  private addToModelOrderMap(modelOrderMap: Map<number, Set<LEdge>>, e: LEdge, groupModelOrder: boolean): void {
    if (!e.getTarget()!.getNode()!.hasProperty(InternalProperties.MODEL_ORDER)) {
      // Handle edges that connect to nodes without model order.
      // They get a high unique value such that the first such node is the last one and the second the second last.
      modelOrderMap.set(Int32.sub(JavaInteger.MAX_VALUE, modelOrderMap.size), new Set<LEdge>([e]));
    } else {
      let targetModelOrder = 0;
      const target = e.getTarget()!.getNode()!;
      // Find out whether the model order group id or the model order is more important.
      if (groupModelOrder) {
        // Get the biggest cycle breaking model order group. Now scale all groups such that
        // maxModelOrderGroupSize * <model order group id> + model order creates a total ordering on all nodes.
        // This orders all nodes without a group model order at the top.
        // I leave this for know and find out whether this is desired. Maybe all need a group model order to begin with.
        const maxModelOrderGroupSize = this.graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES);
        targetModelOrder = Int32.add(
          Int32.mul(
            maxModelOrderGroupSize,
            target.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID),
          ),
          target.getProperty(InternalProperties.MODEL_ORDER),
        );
      } else {
        targetModelOrder = e.getTarget()!.getNode()!.getProperty(InternalProperties.MODEL_ORDER);
      }
      // If the long edge target node has a model order, add it to the map.
      if (modelOrderMap.has(targetModelOrder)) {
        modelOrderMap.get(targetModelOrder)!.add(e);
      } else {
        modelOrderMap.set(targetModelOrder, new Set<LEdge>([e]));
      }
    }
  }
}
