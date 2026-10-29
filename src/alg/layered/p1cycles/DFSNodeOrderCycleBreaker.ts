// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * One suspended activation of the Java recursive method `dfs` (B8): the node, its model-order map (Java
 * `HashMap<Integer, HashSet<LEdge>>`, only `get`/`put`/`containsKey` and a sorted `TreeSet` of its keys are used, so a
 * `Map` of insertion-ordered `Set`s suffices) and the position in the sorted keys.
 */
interface Frame {
  readonly n: LNode;
  readonly modelOrderMap: ReadonlyMap<number, Set<LEdge>>;
  readonly keys: readonly number[];
  next: number;
}

/**
 * Cycle breaker implementation that uses a depth-first traversal of the graph. Described in
 * <ul>
 * <li>Emden R. Gansner, Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo, A technique for drawing directed
 * graphs. <i>Software Engineering</i> 19(3), pp. 214-230, 1993.</li>
 * </ul>
 * While the `DepthFirstCycleBreaker` uses the edge order as the visiting order this cycle breaker uses the node (model
 * order) for this.
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
 * B8: the recursion of `dfs` (Java `:146`) is an explicit-stack loop with the same visit and side-effect order.
 * AD-10: the `HashSet<LEdge>` per key holds identity-hashed edges; `iterator().next()` (`:192`) and `addAll`
 * (`:203`) take their insertion order, which the oracle's constant identity hash reproduces for up to 10 edges.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.java
 */
export class DFSNodeOrderCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (DFSNodeOrderCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
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

  private graph!: LGraph;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return DFSNodeOrderCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(graph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Depth-first cycle removal', 1);

    this.graph = graph;
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
      if (frame.next >= frame.keys.length) {
        // We're leaving this node
        this.active[frame.n.id] = false;
        frames.pop();
        continue;
      }
      const key = frame.keys[frame.next++]!;
      const edgesOfKey = frame.modelOrderMap.get(key)!;
      const out = edgesOfKey.values().next().value!;
      // Ignore self loops
      if (out.isSelfLoop()) {
        continue;
      }

      const target = out.getTarget()!.getNode()!;

      // If the edge connects to an active node, we have found a path from said active node back to itself since
      // active nodes are on our current path. That's a backward edge and needs to be reversed
      if (this.active[target.id]) {
        this.edgesToBeReversed.push(...edgesOfKey);
      } else if (!this.visited[target.id]) {
        // the recursive call `dfs(target)`; an already visited target returns at once
        frames.push(this.enter(target));
      }
    }
  }

  /** The start of the Java method `dfs` for an unvisited node, up to the loop over the sorted model orders. */
  private enter(n: LNode): Frame {
    // We're now visiting the node, and it's active
    this.visited[n.id] = true;
    this.active[n.id] = true;

    const modelOrderMap = new Map<number, Set<LEdge>>();
    const groupModelOrder =
      this.graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
      GroupOrderStrategy.ENFORCED;

    // Construct tree set to efficiently find next node to look at by finding all connected nodes and sorting them.
    for (const e of n.getOutgoingEdges()) {
      this.addToModelOrderMap(modelOrderMap, e, groupModelOrder);
    }
    // The model order serves as the key by which all elements are sorted.
    // Construct this by <number of nodes> * groupId + MO if ENFORCED, otherwise using model order is ok.
    const modelOrderSet = [...modelOrderMap.keys()].sort((a, b) => a - b);
    return { n, modelOrderMap, keys: modelOrderSet, next: 0 };
  }

  /** `:160-187`: the body of the `forEach` lambda over the outgoing edges. */
  private addToModelOrderMap(modelOrderMap: Map<number, Set<LEdge>>, e: LEdge, groupModelOrder: boolean): void {
    if (e.getTarget()!.getNode()!.getProperty(InternalProperties.MODEL_ORDER) === null) {
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
