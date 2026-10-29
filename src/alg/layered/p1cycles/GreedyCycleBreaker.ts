// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { Random } from '../../../java/util/Random.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Cycle breaker implementation that uses a greedy algorithm. Inspired by
 * <ul>
 *   <li>Peter Eades, Xuemin Lin, W. F. Smyth,
 *     A fast and effective heuristic for the feedback arc set problem.
 *     <i>Information Processing Letters</i> 47(6), pp. 319-323, 1993.</li>
 *   <li>Giuseppe di Battista, Peter Eades, Roberto Tamassia, Ioannis G. Tollis,
 *     <i>Graph Drawing: Algorithms for the Visualization of Graphs</i>,
 *     Prentice Hall, New Jersey, 1999 (Section 9.4).</li>
 * </ul>
 *
 * <p>This cycle breaker doesn't support layer constraints out of the box. If layer constraints should be observed,
 * `EdgeAndLayerConstraintEdgeReverser` and `LayerConstraintProcessor` should be used.</p>
 *
 * <dl>
 *   <dt>Precondition:</dt><dd>none</dd>
 *   <dt>Postcondition:</dt><dd>the graph has no cycles</dd>
 * </dl>
 *
 * `process` is split at the Java statement-group boundaries (`:107-142`, `:144-193`, `:195-201`, `:203-218`) to stay
 * inside the complexity limits; statement order is unchanged.
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/GreedyCycleBreaker.java
 */
export class GreedyCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (GreedyCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER));
  }

  /** indegree values for the nodes. */
  private indeg: Int32Array = new Int32Array(0);
  /** outdegree values for the nodes. */
  private outdeg: Int32Array = new Int32Array(0);
  /** mark for the nodes, inducing an ordering of the nodes. */
  private mark: Int32Array = new Int32Array(0);
  /** list of source nodes. */
  private readonly sources = new LinkedList<LNode>();
  /** list of sink nodes. */
  private readonly sinks = new LinkedList<LNode>();

  /** The graph. */
  protected layeredGraph!: LGraph;

  private random!: Random;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return GreedyCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Greedy cycle removal', 1);

    this.layeredGraph = layeredGraph;

    const nodes = layeredGraph.getLayerlessNodes();

    // initialize values for the algorithm (sum of priorities of incoming edges and outgoing
    // edges per node, and the ordering calculated for each node)
    const unprocessedNodeCount = nodes.length;
    this.indeg = new Int32Array(unprocessedNodeCount);
    this.outdeg = new Int32Array(unprocessedNodeCount);
    this.mark = new Int32Array(unprocessedNodeCount);

    this.collectDegrees(nodes);

    this.assignMarks(nodes, unprocessedNodeCount);

    this.shiftNegativeRanks(nodes);

    this.reverseLeftPointingEdges(nodes);

    this.dispose();
    monitor.done();
  }

  /** `:107-142`: the degrees of every node and the initial sources and sinks. */
  private collectDegrees(nodes: readonly LNode[]): void {
    let index = 0;
    for (const node of nodes) {
      // the node id is used as index for the indeg, outdeg, and mark arrays
      node.id = index;

      this.addPriorityDegrees(node, index);

      // collect sources and sinks
      if (this.outdeg[index] === 0) {
        this.sinks.add(node);
      } else if (this.indeg[index] === 0) {
        this.sources.add(node);
      }
      index++;
    }
  }

  /** `:112-133`: the sum of the edge priorities of a node, self-loops ignored. */
  private addPriorityDegrees(node: LNode, index: number): void {
    for (const port of node.getPorts()) {
      // calculate the sum of edge priorities
      for (const edge of port.getIncomingEdges()) {
        // ignore self-loops
        if (edge.getSource()!.getNode() === node) {
          continue;
        }

        const priority = edge.getProperty(LayeredOptions.PRIORITY_DIRECTION);
        this.indeg[index] += priority > 0 ? priority + 1 : 1;
      }

      for (const edge of port.getOutgoingEdges()) {
        // ignore self-loops
        if (edge.getTarget()!.getNode() === node) {
          continue;
        }

        const priority = edge.getProperty(LayeredOptions.PRIORITY_DIRECTION);
        this.outdeg[index] += priority > 0 ? priority + 1 : 1;
      }
    }
  }

  /** `:144-193`: assigns marks to all nodes. */
  private assignMarks(nodes: readonly LNode[], initialUnprocessedNodeCount: number): void {
    let unprocessedNodeCount = initialUnprocessedNodeCount;
    // next rank values used for sinks and sources (from right and from left)
    let nextRight = -1;
    let nextLeft = 1;

    // assign marks to all nodes
    const maxNodes: LNode[] = [];
    this.random = this.layeredGraph.getProperty(InternalProperties.RANDOM);

    while (unprocessedNodeCount > 0) {
      // sinks are put to the right --> assign negative rank, which is later shifted to positive
      while (!this.sinks.isEmpty()) {
        const sink = this.sinks.removeFirst();
        this.mark[sink.id] = nextRight--;
        this.updateNeighbors(sink);
        unprocessedNodeCount--;
      }

      // sources are put to the left --> assign positive rank
      while (!this.sources.isEmpty()) {
        const source = this.sources.removeFirst();
        this.mark[source.id] = nextLeft++;
        this.updateNeighbors(source);
        unprocessedNodeCount--;
      }

      // while there are unprocessed nodes left that are neither sinks nor sources...
      if (unprocessedNodeCount > 0) {
        this.collectMaxOutflowNodes(nodes, maxNodes);

        // randomly select a node from the ones with maximal outflow and put it left
        const maxNode = this.chooseNodeWithMaxOutflow(maxNodes);
        this.mark[maxNode.id] = nextLeft++;
        this.updateNeighbors(maxNode);
        unprocessedNodeCount--;
      }
    }
  }

  /** `:170-186`: find the set of unprocessed node (=> mark == 0), with the largest out flow. */
  private collectMaxOutflowNodes(nodes: readonly LNode[], maxNodes: LNode[]): void {
    let maxOutflow = JavaInteger.MIN_VALUE;

    for (const node of nodes) {
      if (this.mark[node.id] === 0) {
        const outflow = Int32.sub(this.outdeg[node.id]!, this.indeg[node.id]!);
        if (outflow >= maxOutflow) {
          if (outflow > maxOutflow) {
            maxNodes.length = 0;
            maxOutflow = outflow;
          }
          maxNodes.push(node);
        }
      }
    }
  }

  /** `:195-201`: shift negative ranks to positive; this applies to sinks of the graph. */
  private shiftNegativeRanks(nodes: readonly LNode[]): void {
    const shiftBase = nodes.length + 1;
    for (let index = 0; index < nodes.length; index++) {
      if (this.mark[index]! < 0) {
        this.mark[index] += shiftBase;
      }
    }
  }

  /** `:203-218`: reverse edges that point left. */
  private reverseLeftPointingEdges(nodes: readonly LNode[]): void {
    for (const node of nodes) {
      const ports = LGraphUtil.toPortArray(node.getPorts());
      for (const port of ports) {
        const outgoingEdges: LEdge[] = LGraphUtil.toEdgeArray(port.getOutgoingEdges());

        // look at the node's outgoing edges
        for (const edge of outgoingEdges) {
          const targetIx = edge.getTarget()!.getNode()!.id;
          if (this.mark[node.id]! > this.mark[targetIx]!) {
            edge.reverse(this.layeredGraph, true);
            this.layeredGraph.setProperty(InternalProperties.CYCLIC, true);
          }
        }
      }
    }
  }

  /**
   * Choose a node among all nodes with the same maximum outflow.
   * In its default implementation this is done randomly.
   *
   * @param nodes All nodes with the same outflow.
   * @return The chosen node.
   */
  protected chooseNodeWithMaxOutflow(nodes: readonly LNode[]): LNode {
    return nodes[this.random.nextInt(nodes.length)]!;
  }

  /** Release all created resources so the GC can reap them. */
  private dispose(): void {
    this.indeg = new Int32Array(0);
    this.outdeg = new Int32Array(0);
    this.mark = new Int32Array(0);
    this.sources.clear();
    this.sinks.clear();
  }

  /**
   * Updates indegree and outdegree values of the neighbors of the given node, simulating its removal from the graph.
   * the sources and sinks lists are also updated.
   *
   * @param node node for which neighbors are updated
   */
  private updateNeighbors(node: LNode): void {
    for (const port of node.getPorts()) {
      for (const edge of port.getConnectedEdges()) {
        const connectedPort = edge.getSource() === port ? edge.getTarget()! : edge.getSource()!;
        const endpoint = connectedPort.getNode()!;

        // exclude self-loops
        if (node === endpoint) {
          continue;
        }

        let priority = edge.getProperty(LayeredOptions.PRIORITY_DIRECTION);
        if (priority < 0) {
          priority = 0;
        }
        this.removeEdgeFromEndpoint(edge, connectedPort, endpoint, priority);
      }
    }
  }

  /** `:268-281`: the unprocessed endpoint of an edge of the removed node loses the edge's degree contribution. */
  private removeEdgeFromEndpoint(edge: LEdge, connectedPort: LPort, endpoint: LNode, priority: number): void {
    const index = endpoint.id;
    if (this.mark[index] === 0) {
      if (edge.getTarget() === connectedPort) {
        this.indeg[index] -= priority + 1;
        if (this.indeg[index]! <= 0 && this.outdeg[index]! > 0) {
          this.sources.add(endpoint);
        }
      } else {
        this.outdeg[index] -= priority + 1;
        if (this.outdeg[index]! <= 0 && this.indeg[index]! > 0) {
          this.sinks.add(endpoint);
        }
      }
    }
  }
}
