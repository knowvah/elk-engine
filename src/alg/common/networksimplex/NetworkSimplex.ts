// SPDX-License-Identifier: EPL-2.0
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { NEdge } from './NEdge.js';
import type { NGraph } from './NGraph.js';
import { enterEdge, leaveEdge } from './NetworkSimplexCutValues.js';
import { balance, normalize } from './NetworkSimplexNormalize.js';
import { exchange, feasibleTree } from './NetworkSimplexPivot.js';
import { NetworkSimplexState } from './NetworkSimplexState.js';
import { reattachSubtrees, removeSubtrees } from './NetworkSimplexSubtrees.js';

/**
 * The main class of the network simplex layerer component. It offers an algorithm to determine an optimal layering of
 * all nodes in the graph concerning a minimal length of all edges using the network simplex algorithm described in
 * Emden R. Gansner, Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo, A technique for drawing directed graphs.
 * Software Engineering 19(3), pp. 214-230, 1993.
 *
 * Precondition: the graph has no cycles. Postcondition: all nodes have been assigned a layer such that edges connect
 * only nodes from layers with increasing indices.
 *
 * The 891-line Java class is split into section modules behind this facade (P1): `NetworkSimplexSubtrees`,
 * `NetworkSimplexTree`, `NetworkSimplexCutValues`, `NetworkSimplexPivot` and `NetworkSimplexNormalize`. They share the
 * instance fields through `NetworkSimplexState` and never import this file.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export class NetworkSimplex {
  /** Empirically determined threshold when removing subtrees pays off. */
  private static readonly REMOVE_SUBTREES_THRESH = 40;

  readonly #state: NetworkSimplexState;

  /** Use {@link NetworkSimplex.forGraph}. */
  private constructor(graph: NGraph) {
    this.#state = new NetworkSimplexState(graph);
  }

  /** The graph for which to execute the network simplex; returns a new instance of the algorithm. */
  static forGraph(graph: NGraph): NetworkSimplex {
    return new NetworkSimplex(graph);
  }

  /**
   * Balances the layering concerning its width, i.e. the number of nodes in each layer. If the graph allows multiple
   * optimal layerings regarding a minimal edge length, this moves separate nodes to a layer with a minimal amount of
   * currently contained nodes with respect to the retention of feasibility and optimality of the given layering.
   */
  withBalancing(doBalance: boolean): NetworkSimplex {
    this.#state.balance = doBalance;
    return this;
  }

  /** Previously layered nodes may become relevant when moving nodes to layers with fewer nodes during balancing. */
  withPreviousLayering(considerPreviousLayering: number[]): NetworkSimplex {
    this.#state.previousLayeringNodeCounts = considerPreviousLayering;
    return this;
  }

  /**
   * Since there is a theoretical possibility that the network simplex does not terminate Gansner et al. propose to
   * incorporate an iteration limit. However, in practice this shouldn't happen.
   */
  withIterationLimit(limit: number): NetworkSimplex {
    this.#state.iterationLimit = limit;
    return this;
  }

  /**
   * Instantiates all necessary attributes for the execution and initializes them with their default values. All edges
   * of the graph are determined, as well as its sources.
   */
  #initialize(): void {
    const state = this.#state;
    // initialize node attributes
    const numNodes = state.graph.nodes.length;
    for (const n of state.graph.nodes) {
      n.treeNode = false;
    }
    state.poID = new Array<number>(numNodes).fill(0);
    state.lowestPoID = new Array<number>(numNodes).fill(0);
    state.sources = [];

    // determine edges and re-index nodes
    let index = 0;
    const theEdges: NEdge[] = [];
    for (const node of state.graph.nodes) {
      node.internalId = index++;
      // add node to sinks, resp. sources
      if (node.getIncomingEdges().size() === 0) {
        state.sources.push(node);
      }
      theEdges.push(...node.getOutgoingEdges());
    }
    // re-index edges
    let counter = 0;
    for (const edge of theEdges) {
      edge.internalId = counter++;
      edge.treeEdge = false;
    }
    this.#initializeEdgeAttributes(theEdges);
    state.postOrder = 1;
  }

  /**
   * The edge-attribute part of Java's `initialize()`, split out to meet the complexity limit: sizes the cut value and
   * visited arrays and installs the edge list and the (insertion-ordered) tree edge set.
   */
  #initializeEdgeAttributes(theEdges: NEdge[]): void {
    const state = this.#state;
    // initialize edge attributes
    const numEdges = theEdges.length;
    if (state.cutvalue.length < numEdges) {
      state.cutvalue = new Float64Array(numEdges);
      state.edgeVisited = new Array<boolean>(numEdges).fill(false);
    } else {
      state.edgeVisited.fill(false);
    }
    state.edges = theEdges;
    // we iterate over this set, thus we have to use a linked hash set to get a deterministic iteration order
    state.treeEdges = new Set<NEdge>();
  }

  /** Release all created resources so the GC can reap them. */
  #dispose(): void {
    const state = this.#state;
    state.cutvalue = new Float64Array(0);
    state.edges = [];
    state.treeEdges = new Set<NEdge>();
    state.edgeVisited = [];
    state.lowestPoID = [];
    state.poID = [];
    state.sources = [];
    state.subtreeNodesStack = [];
  }

  /**
   * The improvement loop of Java's `execute(...)`, split out to meet the complexity limit: exchanges tree edges until
   * the layering is optimal or the iteration limit is reached.
   */
  #improveLayering(): void {
    const state = this.#state;
    let e: NEdge | null = leaveEdge(state);
    let iter = 0;
    while (e !== null && iter < state.iterationLimit) {
      // current layering is not optimal
      exchange(state, e, enterEdge(state, e) as NEdge);
      e = leaveEdge(state);
      iter++;
    }
  }

  /** Determine the optimal layering. */
  execute(): void;
  /** Determine the optimal layering, reporting to the given progress monitor. */
  execute(monitor: IElkProgressMonitor): void;
  execute(monitor?: IElkProgressMonitor): void {
    const theMonitor = monitor ?? new BasicProgressMonitor();
    const state = this.#state;
    theMonitor.begin('Network simplex', 1);

    if (state.graph.nodes.length < 1) {
      theMonitor.done();
      return;
    }

    // reset any old layering
    for (const node of state.graph.nodes) {
      node.layer = 0;
    }

    // remove leafs
    const doRemoveSubtrees = state.graph.nodes.length >= NetworkSimplex.REMOVE_SUBTREES_THRESH;
    if (doRemoveSubtrees) {
      removeSubtrees(state);
    }

    // init all the data structures we use
    this.#initialize();
    // determine an initial feasible layering
    feasibleTree(state);
    // improve the initial layering until it is optimal
    this.#improveLayering();

    // re-attach leafs
    if (doRemoveSubtrees) {
      reattachSubtrees(state);
    }

    // normalize and, if desired, balance
    //   both methods must work on the NNode#layer field
    if (state.balance) {
      balance(state, normalize(state));
    } else {
      normalize(state);
    }

    // release the created resources
    this.#dispose();
    theMonitor.done();
  }
}
