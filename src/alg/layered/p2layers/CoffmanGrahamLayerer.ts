// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { PriorityQueue } from '../../../java/util/PriorityQueue.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/** One suspended `dfs` call (B8): the node and the iterator over its outgoing edges. */
interface Frame {
  readonly node: LNode;
  readonly edges: Iterator<LEdge>;
}

/**
 * A layering algorithm that places nodes in layers subject to a bound on the maximum number of (original) nodes per
 * layer. The bound is set via the {@link LayeredOptions#LAYERING_COFFMAN_GRAHAM_LAYER_BOUND} layout option.
 *
 * The algorithm is described in
 * <ul><li>
 *   Coffman, E. G., Jr. and Graham, R. L., "Optimal scheduling for two-processor systems",
 *   <i>Acta Informatica</i> (1972).
 * </li></ul>
 *
 * <dl>
 *   <dt>Precondition:</dt><dd>the graph has no cycles.</dd>
 *   <dt>Postcondition:</dt><dd>all nodes have been assigned a layer such that
 *     edges connect only nodes from layers with increasing indices and the specified
 *     layer bound is met.</dd>
 * </dl>
 *
 * B8: the recursion of `dfs` (Java `:279`) is an explicit-stack loop with the same visit, side-effect and
 * accumulation order. AD-10: `inTopo` (a Guava `ArrayListMultimap`) is only read per node, never iterated; it is a
 * `Map` of lists. `process` is split at its Java section comments (`#2`, `#3`) for the complexity limits.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/CoffmanGrahamLayerer.java
 */
export class CoffmanGrahamLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  /** Used during dfs of the transitive reduction algorithm. */
  private nodeMark: boolean[] = [];
  /** A marked edge is one that is not part of the transitive reduction. */
  private edgeMark: boolean[] = [];

  /** Used to identigy sources during computation of the topological ordering. */
  private inDeg: number[] = [];
  /** Used to identify sinks during layer assignment. */
  private outDeg: number[] = [];

  /** The calculated topological order which forms the basis for the layering. */
  private topoOrd: number[] = [];

  /**
   * For each node, stores the positions of incoming nodes in the topological ordering. Due to the way the positions
   * are added to the lists, one can assume that the lists are sorted.
   */
  private readonly inTopo = new Map<LNode, number[]>();

  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Coffman-Graham Layering', 1);

    if (layeredGraph.getLayerlessNodes().length === 0) {
      progressMonitor.done();
      return;
    }

    // the maximum number of allowed nodes per layer
    const w = layeredGraph.getProperty(LayeredOptions.LAYERING_COFFMAN_GRAHAM_LAYER_BOUND);

    // initialization, assign indexes and initialize arrays
    let index = 0;
    let edgeIndex = 0;
    for (const n of layeredGraph.getLayerlessNodes()) {
      n.id = index++;
      for (const e of n.getOutgoingEdges()) {
        e.id = edgeIndex++;
      }
    }
    this.nodeMark = new Array<boolean>(index).fill(false);
    this.edgeMark = new Array<boolean>(edgeIndex).fill(false);
    this.inDeg = new Array<number>(index).fill(0);
    this.outDeg = new Array<number>(index).fill(0);
    this.topoOrd = new Array<number>(index).fill(0);
    this.inTopo.clear();

    // --------------------------
    // #1 Remove transitive edges
    // --------------------------
    this.transitiveReduction(layeredGraph);

    this.computeTopologicalOrdering(layeredGraph);
    this.assignLayers(layeredGraph, w);

    progressMonitor.done();
  }

  /** `process`, section `#2 Compute topological ordering`. */
  private computeTopologicalOrdering(layeredGraph: LGraph): void {
    // -------------------------------
    // #2 Compute topological ordering
    // -------------------------------
    const sources = new PriorityQueue<LNode>((a, b) => this.compareNodesInTopo(a, b));

    // for each node, determine its current in-degree and remember initial sources
    for (const v of layeredGraph.getLayerlessNodes()) {
      for (const e of v.getIncomingEdges()) {
        if (!this.edgeMark[e.id]!) {
          this.inDeg[v.id] = Int32.add(this.inDeg[v.id]!, 1);
        }
      }
      if (this.inDeg[v.id] === 0) {
        sources.add(v);
      }
    }

    // compute topological ordering
    let i = 0;
    while (!sources.isEmpty()) {
      const v = sources.poll()!;
      // assign number of topological order
      this.topoOrd[v.id] = i++;

      // update the rest of the graph
      for (const e of v.getOutgoingEdges()) {
        if (this.edgeMark[e.id]!) {
          continue;
        }
        const tgt = e.getTarget()!.getNode()!;
        this.inDeg[tgt.id] = Int32.sub(this.inDeg[tgt.id]!, 1);
        this.putInTopo(tgt, this.topoOrd[v.id]!);
        if (this.inDeg[tgt.id] === 0) {
          sources.add(tgt); // 'tgt' is added according to its priority
        }
      }
    }
  }

  /** `process`, section `#3 Actual layer assignment`. */
  private assignLayers(layeredGraph: LGraph, w: number): void {
    // --------------------------
    // #3 Actual layer assignment
    // --------------------------
    // note that this time we start with sinks and work our way to the original graph's sources

    // set of candidate nodes, that is nodes for which all successors have been placed
    // highest priority first
    const sinks = this.initialSinks(layeredGraph);

    // assign the layers
    const layers: Layer[] = [];
    let currentLayer = this.createLayer(layeredGraph, layers);
    while (!sinks.isEmpty()) {
      // select a node for which all outgoing nodes have been placed,
      // and with maximum value in the topological sort
      const u = sinks.poll()!;

      // start a new layer if the current one is already full,
      // or an in-layer edge would be introduced
      if (this.isLayerFull(currentLayer, w) || !this.canAdd(u, currentLayer)) {
        currentLayer = this.createLayer(layeredGraph, layers);
      }

      // place the node in the layer
      u.setLayer(currentLayer);

      this.releasePredecessors(u, sinks);
    }

    this.appendLayersReversed(layeredGraph, layers);
  }

  /** The first part of `#3`: the out-degrees and the priority queue of the initial sinks, highest priority first. */
  private initialSinks(layeredGraph: LGraph): PriorityQueue<LNode> {
    const sinks = new PriorityQueue<LNode>((n1, n2) => -integerCompare(this.topoOrd[n1.id]!, this.topoOrd[n2.id]!));
    for (const v of layeredGraph.getLayerlessNodes()) {
      for (const e of v.getOutgoingEdges()) {
        if (!this.edgeMark[e.id]!) {
          this.outDeg[v.id] = Int32.add(this.outDeg[v.id]!, 1);
        }
      }
      if (this.outDeg[v.id] === 0) {
        sinks.add(v);
      }
    }
    return sinks;
  }

  /** The Java loop of `#3` that updates the out-degrees of the predecessors of `u` and collects the new sinks. */
  private releasePredecessors(u: LNode, sinks: PriorityQueue<LNode>): void {
    // update out-degrees and collect the new sinks
    for (const e of u.getIncomingEdges()) {
      if (this.edgeMark[e.id]!) {
        continue;
      }
      const src = e.getSource()!.getNode()!;
      this.outDeg[src.id] = Int32.sub(this.outDeg[src.id]!, 1);
      if (this.outDeg[src.id] === 0) {
        sinks.add(src);
      }
    }
  }

  /** The tail of `#3`: add the layers in inverse order and clear the layerless nodes. */
  private appendLayersReversed(layeredGraph: LGraph, layers: readonly Layer[]): void {
    // the layers were created in inverse order
    for (let j = layers.length - 1; j >= 0; --j) {
      layeredGraph.getLayers().push(layers[j]!);
    }

    // clear layerless nodes
    layeredGraph.getLayerlessNodes().length = 0;
  }

  /** `inTopo.put(node, position)` of the Guava multimap: appends to the node's list. */
  private putInTopo(node: LNode, position: number): void {
    const list = this.inTopo.get(node);
    if (list === undefined) {
      this.inTopo.set(node, [position]);
    } else {
      list.push(position);
    }
  }

  private isLayerFull(layer: Layer, w: number): boolean {
    return layer.getNodes().length >= w;
  }

  /**
   * @return true if node `n` can be added to layer `l` without introducing in-layer edges.
   */
  private canAdd(n: LNode, l: Layer): boolean {
    for (const e of n.getOutgoingEdges()) {
      const v = e.getTarget()!.getNode()!;
      if (v.getLayer() === l) {
        return false;
      }
    }
    return true;
  }

  /**
   * @return a newly created layer for the passed graph. The layer is <b>appended</b> to the passed list of layers.
   *         Note that the layer is not yet added to the graph's list of layers.
   */
  private createLayer(graph: LGraph, layers: Layer[]): Layer {
    const aLayer = new Layer(graph);
    layers.push(aLayer);
    return aLayer;
  }

  private compareNodesInTopo(u: LNode, v: LNode): number {
    const inListU = this.inTopo.get(u) ?? [];
    const inListV = this.inTopo.get(v) ?? [];
    // the two ListIterators start at the end of their lists; `hasPrevious`/`previous` walk backwards
    let posU = inListU.length;
    let posV = inListV.length;

    // find the node with the lower associated maximum value in 'inTopo'
    // break ties by ignoring all equal maxima
    while (posU > 0 && posV > 0) {
      const iu = inListU[--posU]!;
      const iv = inListV[--posV]!;
      // Java `:244` compares the boxed `Integer`s by reference (`iu != iv`); each list element is its own box of an
      // `int` (`inTopo.put(tgt, topoOrd[v.id])`), so two are the same object only for an equal value in -128..127 (E2)
      if (!JavaInteger.sameValueOfBox(iu, iv)) {
        return integerCompare(iu, iv);
      }
    }

    // `ListIterator.hasNext()` of an iterator that started at the end of its list: true once `previous()` was called
    return CoffmanGrahamLayerer.compareRest(u, v, posU < inListU.length, posV < inListV.length);
  }

  /** The Java code of `compareNodesInTopo` after the loop, given `itU.hasNext()` and `itV.hasNext()`. */
  private static compareRest(u: LNode, v: LNode, hasNextU: boolean, hasNextV: boolean): number {
    if (!hasNextU && !hasNextV) {
      // If the two nodes are the same, a secondary criterion is needed.
      // Else use the node id as a last resort.
      if (u.id < v.id) {
        return -1; // u < v
      } else if (u.id > v.id) {
        return 1; // u > v
      }
      // Else they are equal.
      return 0; // u == v
    } else if (!hasNextU) {
      return -1; // u < v
    } else {
      return 1; // u > v
    }
  }

  /**
   * Remove transitive edges.
   */
  private transitiveReduction(graph: LGraph): void {
    for (const start of graph.getLayerlessNodes()) {
      this.nodeMark.fill(false);
      for (const out of start.getOutgoingEdges()) {
        this.dfs(start, out.getTarget()!.getNode()!);
      }
    }
  }

  private dfs(start: LNode, v: LNode): void {
    if (this.nodeMark[v.id]!) {
      return;
    }
    const stack: Frame[] = [{ node: v, edges: v.getOutgoingEdges()[Symbol.iterator]() }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        this.nodeMark[frame.node.id] = true;
        stack.pop();
        continue;
      }
      const w = next.value.getTarget()!.getNode()!;
      for (const transitive of w.getIncomingEdges()) {
        if (transitive.getSource()!.getNode() === start) {
          this.edgeMark[transitive.id] = true;
        }
      }
      // the recursive call `dfs(start, w)` returns at once for a marked node
      if (!this.nodeMark[w.id]!) {
        stack.push({ node: w, edges: w.getOutgoingEdges()[Symbol.iterator]() });
      }
    }
  }

  /* ----------------------------------------------------------------------------------------------------------
   *                               Intermediate Processor Configuration
   * ---------------------------------------------------------------------------------------------------------- */

  static #BASELINE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Basic intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get BASELINE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (CoffmanGrahamLayerer.#BASELINE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR));
  }

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return CoffmanGrahamLayerer.BASELINE_PROCESSING_CONFIGURATION;
  }
}
