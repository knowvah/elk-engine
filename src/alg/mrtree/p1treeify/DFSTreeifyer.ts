// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeifyingOrder } from '../options/TreeifyingOrder.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';

/**
 * This phase should create a tree out of a graph that is hardly a tree. It should for example look for cycles in a tree
 * and remove that cycles. This cycle breaking is done through eliminating the edge that destroys the tree property and
 * putting that edge into a list. So this phase builds up a list with removed edges, so that the Mr. Tree algorithm can
 * operate on the newly constructed graph which is now a tree. The previously removed edges could be reinserted during a
 * post-processing. The search order can be DFS or BFS.
 *
 * @author sor
 * @author sgu
 * @author msp
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p1treeify/DFSTreeifyer.java
 */
export class DFSTreeifyer implements ILayoutPhase<TreeLayoutPhases, TGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIG: LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class initialisation:
   * a module-level read of `TreeLayoutPhases` or `IntermediateProcessorStrategy` would run before those enums finish
   * evaluating whenever the module graph is entered through one of them (the layered `GreedyCycleBreaker` precedent).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIG(): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return (DFSTreeifyer.#INTERMEDIATE_PROCESSING_CONFIG ??= LayoutProcessorConfiguration.create<
      TreeLayoutPhases,
      TGraph
    >().addAfter(TreeLayoutPhases.P3_NODE_PLACEMENT, IntermediateProcessorStrategy.DETREEIFYING_PROC));
  }

  /** marks the nodes that have been visited during DFS. */
  private visited: Int32Array | null = null;

  /** a list with the edges that can be removed. */
  private eliminated: LinkedList<TEdge> | null = null;

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('DFS Treeifying phase', 1);

    this.init(tGraph);
    this.collectEdges(tGraph);

    this.eliminated = null;
    this.visited = null;
    progressMonitor.done();
  }

  getLayoutProcessorConfiguration(_graph: TGraph): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return DFSTreeifyer.INTERMEDIATE_PROCESSING_CONFIG;
  }

  /** Initializes all previously defined structures of a TGraph with useful values. */
  private init(tGraph: TGraph): void {
    const size = tGraph.getNodes().size();
    this.eliminated = new LinkedList<TEdge>();
    this.visited = new Int32Array(size);

    // for using id property initialize ids first
    let id = 0;
    for (const node of tGraph.getNodes()) {
      node.id = id++;
    }
  }

  /** Create a list with the edges to remove. These edges should be all edges that destroy the tree-property. */
  private collectEdges(tGraph: TGraph): void {
    const treeifyingOrder = tGraph.getProperty(MrTreeOptions.SEARCH_ORDER);
    const visited = this.visited!;

    // start DFS on every node in graph
    for (const tNode of tGraph.getNodes()) {
      // if the node has not been visited yet
      if (visited[tNode.id] === 0) {
        // call DFS or BFS on that node
        if (treeifyingOrder === TreeifyingOrder.DFS) {
          this.dfs(tNode);
        } else if (treeifyingOrder === TreeifyingOrder.BFS) {
          this.bfs(tNode);
        }
        // if we come back to that node again, set the node as root
        visited[tNode.id] = 2;
      }
    }
    // remove the found edges out of graph structure
    for (const tEdge of this.eliminated!) {
      tEdge.getSource()!.getOutgoingEdges().remove(tEdge);
      tEdge.getTarget()!.getIncomingEdges().remove(tEdge);
    }
    // set the list of collected edges as a graph property
    tGraph.setProperty(InternalProperties.REMOVABLE_EDGES, this.eliminated);
  }

  /** Perform a DFS on a given graph till all nodes of the graph have been visited. */
  private dfs(tNode: TNode): void {
    const visited = this.visited!;
    // dfs starts on a node and marks that node as visited
    visited[tNode.id] = 1;

    // go to all child nodes of start node
    for (const tEdge of tNode.getOutgoingEdges()) {
      const target = tEdge.getTarget()!;
      // if a child has been visited
      if (visited[target.id] === 1) {
        // put that edge to the list that contains the edges to remove
        this.eliminated!.add(tEdge);
      } else if (visited[target.id] === 2) {
        // if a previous root can be visited from another node unmark the root property
        visited[target.id] = 1;
      } else {
        // recurse
        this.dfs(target);
      }
    }
  }

  /** Perform a BFS on a given graph till all nodes of the graph have been visited. */
  private bfs(startNode: TNode): void {
    const visited = this.visited!;
    const nodeQueue = new LinkedList<TNode>();
    nodeQueue.add(startNode);

    do {
      const node = nodeQueue.removeFirst();
      visited[node.id] = 1;

      for (const tEdge of node.getOutgoingEdges()) {
        const target = tEdge.getTarget()!;
        // if a child has been visited
        if (visited[target.id] === 1) {
          // put that edge to the list that contains the edges to remove
          this.eliminated!.add(tEdge);
        } else if (visited[target.id] === 2) {
          // if a previous root can be visited from another node unmark the root property
          visited[target.id] = 1;
        } else {
          // process the node in breadth-first order
          nodeQueue.addLast(target);
        }
      }
    } while (!nodeQueue.isEmpty());
  }
}
