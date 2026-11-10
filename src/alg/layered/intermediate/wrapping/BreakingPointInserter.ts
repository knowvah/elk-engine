// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { LPort } from '../../graph/LPort.js';
import { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { CuttingStrategy } from '../../options/CuttingStrategy.js';
import { ValidifyStrategy } from '../../options/ValidifyStrategy.js';
import { ARDCutIndexHeuristic } from './ARDCutIndexHeuristic.js';
import { BPInfo } from './BreakingPointInserterBPInfo.js';
import { Cut } from './BreakingPointInserterCut.js';
import { GraphStats } from './GraphStats.js';
import { ManualCutIndexCalculator, type ICutIndexCalculator } from './ICutIndexCalculator.js';
import { MSDCutIndexHeuristic } from './MSDCutIndexHeuristic.js';
import { SingleEdgeGraphWrapper } from './SingleEdgeGraphWrapper.js';

/** A breaking point marker with its two ports. */
interface Marker {
  readonly node: LNode;
  readonly inPort: LPort;
  readonly outPort: LPort;
}

/**
 * Calculates cut points and inserts breaking points into the calculated layering. The goal is to improve very wide and
 * narrow drawings, i.e. many layers but few nodes per layer.
 *
 * Cutting is to be performed between pairs of layers. Edges that span the cut points are split. Splitting an edge
 * `e=(u,v)` looks like this:
 *
 * ```
 *  u --nodeStartEdge--> startMarker --startEndEdge--> endMarker --e--> v
 * ```
 *
 * Note that the original edge is pushed "to the right", potentially allowing it to be split it again.
 *
 * During a later processing step (`BreakingPointProcessor`), the `startEndEdge` will be rerouted such that it runs from
 * the very right of the drawing back to the very left. It gets replaced by a chain of `LONG_EDGE` dummies.
 *
 * Preconditions: a layered graph without `LONG_EDGE` dummies. Postconditions: `BREAKING_POINT`s have been introduced.
 * Slots: after phase 2. Same-slot dependencies: must run before `LongEdgeSplitter`.
 *
 * Splits for the complexity limits: the cut handling of `applyCuts` is `insertBreakingPoints` with the loop body
 * `splitEdge` (and `createMarker`), the open-edge bookkeeping is `updateOpenEdges`, the strategy `switch` of `process` is
 * `createCutIndexCalculator`, and the `idx` scan of `improveCuts` is `findBestCut`; statement order is the
 * Java's. The nested `BPInfo` and `Cut` live in `BreakingPointInserterBPInfo.ts` and `BreakingPointInserterCut.ts`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointInserter.java
 */
export class BreakingPointInserter implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Breaking Point Insertion', 1);

    const gs = new GraphStats(graph);

    // #1 determine the cut points
    const icic = this.createCutIndexCalculator(graph);
    let cuts = icic.getCutIndexes(graph, gs);

    // #2 improve cuts
    if (graph.getProperty(LayeredOptions.WRAPPING_MULTI_EDGE_IMPROVE_CUTS)) {
      cuts = this.improveCuts(graph, cuts);
    }

    // #3 if they are not guaranteed to be valid, make them valid
    if (!icic.guaranteeValid() && graph.hasProperty(LayeredOptions.WRAPPING_VALIDIFY_STRATEGY)) {
      const validify = graph.getProperty(LayeredOptions.WRAPPING_VALIDIFY_STRATEGY);
      if (validify === ValidifyStrategy.LOOK_BACK) {
        cuts = SingleEdgeGraphWrapper.validifyIndexesLookingBack(gs, cuts);
      } else if (validify === ValidifyStrategy.GREEDY) {
        cuts = SingleEdgeGraphWrapper.validifyIndexesGreedily(gs, cuts);
      }
      // otherwise: leave the cuts as they are
    }

    if (cuts.length === 0) {
      progressMonitor.done();
      return;
    }

    // #4 insert the breaking points (the Java discards the returned split count)
    this.applyCuts(graph, cuts);

    progressMonitor.done();
  }

  /** The `switch` over `WRAPPING_CUTTING_STRATEGY` of `process`. */
  private createCutIndexCalculator(graph: LGraph): ICutIndexCalculator {
    const strategy = graph.getProperty(LayeredOptions.WRAPPING_CUTTING_STRATEGY);
    if (strategy === CuttingStrategy.MANUAL) {
      return new ManualCutIndexCalculator();
    } else if (strategy === CuttingStrategy.ARD) {
      return new ARDCutIndexHeuristic();
    }
    return new MSDCutIndexHeuristic();
  }

  private applyCuts(graph: LGraph, cuts: readonly number[]): number {
    // initialize iterators
    const layerIt = new ArrayListIterator<Layer>(graph.getLayers());
    const cutIt = cuts[Symbol.iterator]();

    let idx = 0;
    let cut = cutIt.next().value as number;
    let noSplitEdges = 0;

    const alreadySplit = new Set<LEdge>();

    // keep track of edges that have to be split upon cut insertion
    const openEdges = new Set<LEdge>();
    // run
    while (layerIt.hasNext()) {
      const layer = layerIt.next();

      this.updateOpenEdges(layer, openEdges);

      // at each cut index, insert two new layers plus breaking point dummies
      if (idx + 1 === cut) {
        noSplitEdges += this.insertBreakingPoints(graph, layerIt, openEdges, alreadySplit);

        const nextCut = cutIt.next();
        if (nextCut.done !== true) {
          cut = nextCut.value;
        } else {
          // done
          break;
        }
      }

      idx++;
    }

    return noSplitEdges;
  }

  /**
   * The body of the `if (idx + 1 == cut)` of `applyCuts`, before the cut iterator advances.
   *
   * @returns the number of edges split for the first time (the increments of `noSplitEdges`).
   */
  private insertBreakingPoints(
    graph: LGraph,
    layerIt: ArrayListIterator<Layer>,
    openEdges: ReadonlySet<LEdge>,
    alreadySplit: Set<LEdge>,
  ): number {
    let noSplitEdges = 0;
    // insert two new layers
    //  note that since a list iterator is used and 'idx' is decoupled
    //  from the actual position within the list of layers,
    //  the original 'cut' values are correct and do not have to be offset
    const bpLayer1 = new Layer(graph);
    layerIt.add(bpLayer1);
    const bpLayer2 = new Layer(graph);
    layerIt.add(bpLayer2);

    for (const originalEdge of openEdges) {
      if (!alreadySplit.has(originalEdge)) {
        noSplitEdges++;
        alreadySplit.add(originalEdge);
      }
      this.splitEdge(graph, originalEdge, bpLayer1, bpLayer2);
    }
    return noSplitEdges;
  }

  /** The book keeping of 'open' edges of `applyCuts`. */
  private updateOpenEdges(layer: Layer, openEdges: Set<LEdge>): void {
    for (const n of layer) {
      for (const e of n.getOutgoingEdges()) {
        openEdges.add(e);
      }
      for (const e of n.getIncomingEdges()) {
        openEdges.delete(e);
      }
    }
  }

  /**
   * The body of the `for (LEdge originalEdge : openEdges)` loop of `applyCuts`, after the `alreadySplit` book keeping.
   * Splitting an edge 'e' looks like this: `node --nodeStartEdge--> startMarker --startEndEdge--> endMarker --e--> node`;
   * the original edge is pushed "to the right", that way it is possible to split it again.
   */
  private splitEdge(graph: LGraph, originalEdge: LEdge, bpLayer1: Layer, bpLayer2: Layer): void {
    // start dummy
    const start = this.createMarker(graph, bpLayer1);
    // end dummy
    const end = this.createMarker(graph, bpLayer2);

    // first dummy edge
    const nodeStartEdge = new LEdge();
    nodeStartEdge.setSource(originalEdge.getSource());
    nodeStartEdge.setTarget(start.inPort);
    nodeStartEdge.setProperty(InternalProperties.MODEL_ORDER, originalEdge.getProperty(InternalProperties.MODEL_ORDER));

    // second dummy edge
    const startEndEdge = new LEdge();
    startEndEdge.setSource(start.outPort);
    startEndEdge.setTarget(end.inPort);
    startEndEdge.setProperty(InternalProperties.MODEL_ORDER, originalEdge.getProperty(InternalProperties.MODEL_ORDER));

    // reroute the original edge
    originalEdge.setSource(end.outPort);

    // attach information to the dummies
    const bpi = new BPInfo(start.node, end.node, nodeStartEdge, startEndEdge, originalEdge);
    start.node.setProperty(InternalProperties.BREAKING_POINT_INFO, bpi);
    end.node.setProperty(InternalProperties.BREAKING_POINT_INFO, bpi);

    // possibly link a chain of breaking point dummies
    const prevNode = nodeStartEdge.getSource()!.getNode()!;
    if (prevNode.getType() === NodeType.BREAKING_POINT) {
      const bpiPrev = prevNode.getProperty(InternalProperties.BREAKING_POINT_INFO);
      bpiPrev.next = bpi;
      bpi.prev = bpiPrev;
    }
  }

  /** A breaking point dummy in `layer` with its WEST input and EAST output port (the Java repeats it for both dummies). */
  private createMarker(graph: LGraph, layer: Layer): Marker {
    const node = new LNode(graph);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    node.setLayer(layer);
    node.setType(NodeType.BREAKING_POINT);
    const inPort = new LPort();
    inPort.setNode(node);
    inPort.setSide(PortSide.WEST);
    const outPort = new LPort();
    outPort.setNode(node);
    outPort.setSide(PortSide.EAST);
    return { node, inPort, outPort };
  }

  private improveCuts(graph: LGraph, cuts: readonly number[]): number[] {
    const improvedCuts: number[] = [];

    // convert to cut object
    const ccuts: Cut[] = [];
    let lastCut: Cut | null = null;
    for (const cutIdx of cuts) {
      const cut = new Cut(cutIdx);
      ccuts.push(cut);
      if (lastCut !== null) {
        cut.prev = lastCut;
        lastCut.suc = cut;
      }
      lastCut = cut;
    }

    // compute edge spans
    const spans = this.computeEdgeSpans(graph);

    // iteratively find the best cuts
    for (let i = 0; i < ccuts.length; ++i) {
      const bestCut = this.findBestCut(graph, ccuts, spans);

      // record
      if (bestCut !== null) {
        improvedCuts.push(bestCut.newIndex);
        bestCut.assigned = true;

        // propagate offsets as far as possible
        bestCut.offset();
      }
    }

    // Collections.sort(improvedCuts) on Integers
    improvedCuts.sort((a, b) => a - b);

    return improvedCuts;
  }

  /** The scan over the layer indexes of one iteration of the `improveCuts` loop; returns `bestCut`. */
  private findBestCut(graph: LGraph, ccuts: readonly Cut[], spans: readonly number[]): Cut | null {
    let lCut: Cut | null = null;
    let rCut: Cut | null = ccuts[0]!.selfOrNext();

    let bestCut: Cut | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let idx = 1; idx < graph.getLayers().length; ++idx) {
      let hit: Cut | null;
      const rDist = rCut !== null ? Math.abs(rCut.index - idx) : Math.abs(idx - lCut!.index) + 1;
      const lDist = lCut !== null ? Math.abs(idx - lCut.index) : rDist + 1;
      let dist: number;
      if (lDist < rDist) {
        hit = lCut;
        dist = lDist;
      } else {
        hit = rCut;
        dist = rDist;
      }

      const score = this.computeScore(graph, idx, spans[idx]!, dist);
      if (score < bestScore) {
        bestScore = score;
        bestCut = hit;
        bestCut!.newIndex = idx;
      }

      if (rCut !== null && idx === rCut.index) {
        lCut = rCut;
        rCut = rCut.next();
      }
    }
    return bestCut;
  }

  /**
   * spans + dist : weight on dist too small, cuts tend to clump up for highly connected graphs.
   */
  private computeScore(graph: LGraph, _index: number, spans: number, dist: number): number {
    const distancePenalty = graph.getProperty(LayeredOptions.WRAPPING_MULTI_EDGE_DISTANCE_PENALTY);
    return spans + Math.pow(dist, distancePenalty);
  }

  /**
   * @param graph a layered graph.
   * @returns an array `spans` with the number of edges spanning a certain index, i.e. `spans[i]` is the number of edge
   *   spans between layer `L_i-1` and `L_i`.
   */
  private computeEdgeSpans(graph: LGraph): number[] {
    const spans: number[] = new Array<number>(graph.getLayers().length + 1).fill(0);

    const open = new Set<LEdge>();
    let i = 0;
    for (const l of graph) {
      spans[i++] = open.size;

      for (const n of l.getNodes()) {
        for (const e of n.getOutgoingEdges()) {
          open.add(e);
        }
      }

      for (const n of l.getNodes()) {
        for (const e of n.getIncomingEdges()) {
          open.delete(e);
        }
      }
    }

    return spans;
  }
}
