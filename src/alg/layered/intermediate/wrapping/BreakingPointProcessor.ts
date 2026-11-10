// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LongEdgeJoiner } from '../LongEdgeJoiner.js';
import { BPInfo } from './BreakingPointInserterBPInfo.js';
import { CuttingUtils } from './CuttingUtils.js';

/** `predOne` and `predTwo` of `dropDummies`. */
type PredecessorPair = readonly [LNode, LNode];

/**
 * The second of the triumvirate of breaking point processors. While the other two processors are responsible for
 * inserting and removing the breaking point dummies, this processors performs the actual 'wrapping' of the graph.
 *
 * As such it locates breaking point start dummies and moves any subsequent layers to the previous (already existing)
 * layers. Care has to be taken to rearrange everything in a proper order within the layers as the crossing
 * minimization phase has already finished.
 *
 * During the (optional) improvement steps, internally the `id` field of nodes is used to remember a node's index
 * within its layer. It is important that this index is updated when nodes are moved.
 *
 * Preconditions: crossings minimization has been performed, breaking point dummies were inserted. Postconditions: the
 * graph's layering has been adjusted as desired by the inserted breaking points. Slots: after phase 3.
 *
 * Splits for the complexity limits: the reversed-layer body of `performWrapping` is `wrapReversedLayer`, the first
 * improvement step's loop body is `joinMultiCutChain`, and the node loop of `improveUnneccesarilyLongEdges` is
 * `dropAtBreakingPoints`; statement order is the Java's.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointProcessor.java
 */
export class BreakingPointProcessor implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Breaking Point Processor', 1);

    // #1 perform initial wrapping
    this.performWrapping(graph);

    // #2 if desired, improve edge lengths
    if (graph.getProperty(LayeredOptions.WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES)) {
      // assign indexes to nodes, s.t. the node's index
      // equals the nodes position within its layer
      for (const l of graph) {
        let index = 0;
        for (const n of l) {
          // plain counter: bounded by the node count of a layer
          n.id = index++;
        }
      }

      this.improveMultiCutIndexEdges(graph);

      this.improveUnneccesarilyLongEdges(graph, true);
      this.improveUnneccesarilyLongEdges(graph, false);
    }

    progressMonitor.done();
  }

  /** Main wrapping procedure, placing the determined chunks one below the other. */
  private performWrapping(graph: LGraph): void {
    const layers = graph.getLayers();
    const layerIt = new ArrayListIterator<Layer>(layers);

    // add initial empty layer to account for break point start dummies
    layerIt.add(new Layer(graph));

    // iterate the layers from left to right
    //  as soon as a layer with a BREAKING POINT start dummy is encountered,
    //  the nodes of the next layer should be moved to the very first layer
    //  consequently 'wrapping' the graph
    let reverse = false;
    let idx = 1;

    while (layerIt.hasNext()) {
      const layer = layerIt.next();
      const newLayer = layers[idx]!;
      const nodesToMove: LNode[] = [...layer.getNodes()];

      // remember an offset used for adding in-layer dummies later
      const offset = nodesToMove.length;

      // move the nodes to their new layer
      for (const n of nodesToMove) {
        n.setLayer(newLayer);
      }

      if (reverse) {
        this.wrapReversedLayer(graph, nodesToMove, offset);
        reverse = false;
      } else if (nodesToMove.length > 0) {
        const aNode = nodesToMove[0]!;
        if (aNode.getType() === NodeType.BREAKING_POINT) {
          // next layer should be moved (it contains the breaking point end dummies)
          reverse = true;
          // start moving nodes to the very first layer
          idx = -1;
        }
      }

      idx++;
    }

    this.removeEmptyLayers(graph);
  }

  /** The tail of `performWrapping`: remove old layers that are now empty. */
  private removeEmptyLayers(graph: LGraph): void {
    const it = new ArrayListIterator<Layer>(graph.getLayers());
    while (it.hasNext()) {
      const l = it.next();
      if (l.getNodes().length === 0) {
        it.remove();
      }
    }
  }

  /** The `if (reverse)` body of `performWrapping` (without the `reverse = false` reset). */
  private wrapReversedLayer(graph: LGraph, nodesToMove: readonly LNode[], offset: number): void {
    // important to introduce the chains of long edge dummies in reversed order
    for (const n of [...nodesToMove].reverse()) {
      for (const e of [...n.getIncomingEdges()]) {
        // reverse the edge
        e.reverse(graph, true);
        graph.setProperty(InternalProperties.CYCLIC, true);

        // insert proper dummy nodes for the newly created long edge
        const dummyEdges = CuttingUtils.insertDummies(graph, e, offset);

        // ameliorate breaking point info
        const bpi = n.getProperty(InternalProperties.BREAKING_POINT_INFO);
        const startInLayerEdge = dummyEdges[dummyEdges.length - 1]!;
        bpi.startInLayerDummy = startInLayerEdge.getSource()!.getNode();
        bpi.startInLayerEdge = startInLayerEdge;
        bpi.endInLayerDummy = e.getTarget()!.getNode();
        bpi.endInLayerEdge = e;
      }
    }
  }

  /** Improvement step, reducing the overall edge length of edges that span multiple cut indexes. */
  private improveMultiCutIndexEdges(graph: LGraph): void {
    for (const l of graph) {
      for (const n of [...l.getNodes()]) {
        if (BPInfo.isStart(n)) {
          const info = n.getProperty(InternalProperties.BREAKING_POINT_INFO);

          if (info.prev === null && info.next !== null) {
            let current = info;
            let next: BPInfo | null = info.next;

            while (next !== null) {
              const newInfo = this.joinMultiCutChain(current, next);

              next = next.next;
              // continue with the newly assembled one (_not_ 'next')
              current = newInfo;
            }
          }
        }
      }
    }
  }

  /** The body of the `while (next != null)` loop of `improveMultiCutIndexEdges`, up to `next = next.next`. */
  private joinMultiCutChain(current: BPInfo, next: BPInfo): BPInfo {
    const nextStartInLayer = next.startInLayerDummy!;
    const nextEndInLayer = next.endInLayerDummy!;

    // drop the dummy chain
    this.dropDummies(next.start, nextStartInLayer, false, true);

    // update the in-layer indexes of subsequent nodes
    this.updateIndexesAfter(current.end);
    this.updateIndexesAfter(next.start);
    this.updateIndexesAfter(nextStartInLayer);
    this.updateIndexesAfter(nextEndInLayer);

    // reconnect the edge
    next.endInLayerEdge!.setTarget(current.endInLayerEdge!.getTarget());
    current.endInLayerEdge!.setTarget(null);

    // throw out all the unnecessary stuff
    current.end.setLayer(null);
    next.start.setLayer(null);
    nextStartInLayer.setLayer(null);
    nextEndInLayer.setLayer(null);

    // update BPInfo
    const newInfo = new BPInfo(current.start, next.end, current.nodeStartEdge, next.startEndEdge, next.originalEdge);
    newInfo.startInLayerDummy = current.startInLayerDummy;
    newInfo.startInLayerEdge = current.startInLayerEdge;
    newInfo.endInLayerDummy = current.endInLayerDummy;
    newInfo.endInLayerEdge = next.endInLayerEdge;
    newInfo.prev = current.prev;
    newInfo.next = next.next;

    current.start.setProperty(InternalProperties.BREAKING_POINT_INFO, newInfo);
    next.end.setProperty(InternalProperties.BREAKING_POINT_INFO, newInfo);
    return newInfo;
  }

  /** Improvement step, reducing the length of edges that were wrapped back. */
  private improveUnneccesarilyLongEdges(graph: LGraph, forwards: boolean): void {
    const check = forwards ? (n: LNode): boolean => BPInfo.isEnd(n) : (n: LNode): boolean => BPInfo.isStart(n);

    let didsome = false;
    do {
      didsome = false;

      // Lists.reverse is a live view in Java; the list of layers is not modified in this loop
      const layers: readonly Layer[] = forwards ? [...graph.getLayers()].reverse() : graph.getLayers();
      for (const layer of layers) {
        // `if (!forwards) { Lists.reverse(nodes); }` of the Java (:252) is a view that is dropped unused: a no-op
        const nodes = [...layer.getNodes()];

        for (const n of nodes) {
          if (check(n)) {
            const bpNode = n;
            const bpInfo = n.getProperty(InternalProperties.BREAKING_POINT_INFO);
            const dummy = forwards ? bpInfo.endInLayerDummy! : bpInfo.startInLayerDummy!;

            didsome = this.dropDummies(bpNode, dummy, forwards, false);
          }
        }
      }
    } while (didsome);
  }

  /**
   * The method drops dummy nodes in scenarios like the following:
   *
   * ```
   *  ... -- d1 -- d2 -- startBP
   *                        |
   *  ... -- d4 -- d3 -- inLayer
   * ```
   *
   * For this case the layers are iterated from right to left and after identifying the `startBP` node and the
   * `inLayer` dummy, subsequent pairs of long edge dummy nodes `(d2, d3)` and `(d1, d4)` are removed under certain
   * circumstances. Either the `force` flag must be `true`, or the dummy node pair must be adjacent in their layer.
   *
   * The symmetric case is handled as well if `forwards` is true.
   *
   * @returns `true` if any dummies have been removed.
   */
  private dropDummies(bpNode: LNode, inLayerDummy: LNode, forwards: boolean, force: boolean): boolean {
    // get the adjacent long edge dummies (if any)
    let predOne = this.nextLongEdgeDummy(bpNode, forwards);
    let predTwo = this.nextLongEdgeDummy(inLayerDummy, forwards);

    // predOne and predTwo are guaranteed to be LONG_EDGE
    let didsome = false;
    while (predOne !== null && predTwo !== null) {
      if (force || this.isAdjacentOrSeparatedByBreakingpoints(predOne, predTwo, forwards)) {
        const nextOne = this.nextLongEdgeDummy(predOne, forwards);
        const nextTwo = this.nextLongEdgeDummy(predTwo, forwards);

        this.updateIndexesAfter(inLayerDummy);
        this.updateIndexesAfter(bpNode);

        // the two dummies were in same layer
        const newLayer = predOne.getLayer();

        LongEdgeJoiner.joinAt(predOne, false);
        LongEdgeJoiner.joinAt(predTwo, false);

        this.reinsert(bpNode, inLayerDummy, [predOne, predTwo], newLayer, forwards);

        predOne.setLayer(null);
        predTwo.setLayer(null);

        predOne = nextOne;
        predTwo = nextTwo;

        didsome = true;
      } else {
        break;
      }
    }
    return didsome;
  }

  /** The `if (forwards) ... else ...` of `dropDummies`: put the two nodes where the dropped dummies were. */
  private reinsert(
    bpNode: LNode,
    inLayerDummy: LNode,
    preds: PredecessorPair,
    newLayer: Layer | null,
    forwards: boolean,
  ): void {
    const [predOne, predTwo] = preds;
    if (forwards) {
      inLayerDummy.setLayer(predTwo.id, newLayer);
      inLayerDummy.id = predTwo.id;
      bpNode.setLayer(predOne.id + 1, newLayer);
      bpNode.id = predOne.id;
    } else {
      bpNode.setLayer(predOne.id, newLayer);
      bpNode.id = predOne.id;
      inLayerDummy.setLayer(predTwo.id + 1, newLayer);
      inLayerDummy.id = predTwo.id;
    }
  }

  private isAdjacentOrSeparatedByBreakingpoints(dummy1: LNode, dummy2: LNode, forwards: boolean): boolean {
    // d1 is the one in line with the bp dummy
    const layer = dummy1.getLayer()!;
    const start = forwards ? dummy2 : dummy1;
    const end = forwards ? dummy1 : dummy2;

    for (let i = start.id + 1; i < end.id; ++i) {
      // we know that nodes is an array list, thus we can easily query using index
      const node = layer.getNodes()[i]!;
      if (!(node.getType() === NodeType.BREAKING_POINT || this.isInLayerDummy(node))) {
        return false;
      }
    }

    return true;
  }

  private nextLongEdgeDummy(start: LNode, forwards: boolean): LNode | null {
    const edges: Iterable<LEdge> = forwards ? start.getOutgoingEdges() : start.getIncomingEdges();

    // Usually long edge dummies are connected by exactly one edge.
    // However, we allow the 'start' node to be an in-layer dummy.
    // Thus, it may have two incoming edges, one of which is the in-layer edge.
    for (const e of edges) {
      const other = e.getOther(start)!;

      if (other.getType() === NodeType.LONG_EDGE && other.getLayer() !== start.getLayer()) {
        return other;
      }
    }
    return null;
  }

  private isInLayerDummy(node: LNode): boolean {
    if (node.getType() === NodeType.LONG_EDGE) {
      for (const e of node.getConnectedEdges()) {
        if (!e.isSelfLoop() && node.getLayer() === e.getOther(node)!.getLayer()) {
          return true;
        }
      }
    }
    return false;
  }

  private updateIndexesAfter(node: LNode): void {
    for (let i = node.id + 1; i < node.getLayer()!.getNodes().length; ++i) {
      node.getLayer()!.getNodes()[i]!.id--;
    }
  }
}
