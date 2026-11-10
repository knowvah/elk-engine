// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { MAX_VALUE, MIN_VALUE } from '../../../../java/lang/JavaInteger.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { Layer } from '../../graph/Layer.js';
import { CuttingStrategy } from '../../options/CuttingStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { ValidifyStrategy } from '../../options/ValidifyStrategy.js';
import { ARDCutIndexHeuristic } from './ARDCutIndexHeuristic.js';
import { CuttingUtils } from './CuttingUtils.js';
import { GraphStats } from './GraphStats.js';
import { ManualCutIndexCalculator, type ICutIndexCalculator } from './ICutIndexCalculator.js';
import { MSDCutIndexHeuristic } from './MSDCutIndexHeuristic.js';

/** Java `List.get(index)`: an index outside the list throws, where a JavaScript array answers `undefined`. */
function listGet(list: readonly number[], index: number): number {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${index} out of bounds for length ${list.length}`);
  }
  return list[index]!;
}

/**
 * Intermediate processor that splits path-like graphs into multiple sub-paths to improve the overall aspect ratio of the
 * drawing.
 *
 * This is a rather problem-specific intermediate processor that works only on a very small subset of graphs, namely
 * paths that have very few branches. Also, it only works in conjunction with the `LongestPathLayerer`.
 *
 * What we do is the following. After layering and crossing minimization we determine into how many "rows" we want to
 * split the path. Let n denote the number of nodes of each row. We start moving the node in layer n+1 into layer 1,
 * node n+2 into layer 2 and so on. While doing this we have to assure that the order within each layer is correct, have
 * to insert dummy nodes for the edge that now spans from layer n+1 to layer 1, and have to treat inverted ports
 * specifically.
 *
 * Precondition: a layering has been calculated by the longest path layerer and the crossing minimization has finished.
 * Postcondition: long paths are split such that the aspect ratio is closer to the currently available area. Slots:
 * before phase 4.
 *
 * Java overloads `validifyIndexesLookingBack(GraphStats, List)` (public) and `validifyIndexesLookingBack(List, List)`
 * (private); the private one is `validifyIndexesLookingBackIn` here. `Integer` sentinel arithmetic wraps at 32 bits
 * (`MIN_VALUE` distances), so it goes through `Int32`. The per-layer body of `performCuts` is `moveLayer`, its tail `removeOldLayers`; the strategy `switch` of `process` is
 * `createCutIndexCalculator`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/SingleEdgeGraphWrapper.java
 */
export class SingleEdgeGraphWrapper implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Path-Like Graph Wrapping', 1);

    if (graph.getLayers().length === 0) {
      progressMonitor.done();
      return;
    }

    // initialization
    const gs = new GraphStats(graph);

    // stop early if there's nothing we can do
    const sumWidth = gs.getMaxWidth() * gs.longestPath;
    const currentAR = sumWidth / gs.getMaxWidth();
    if (gs.dar > currentAR) {
      // nothing to do for us
      progressMonitor.done();
      return;
    }

    // get indexes for cutting
    const icic = this.createCutIndexCalculator(graph);
    let cuts = icic.getCutIndexes(graph, gs);

    // if they are not guaranteed to be valid, make them valid
    if (!icic.guaranteeValid()) {
      const validify = graph.getProperty(LayeredOptions.WRAPPING_VALIDIFY_STRATEGY);
      if (validify === ValidifyStrategy.LOOK_BACK) {
        cuts = SingleEdgeGraphWrapper.validifyIndexesLookingBack(gs, cuts);
      } else if (validify === ValidifyStrategy.GREEDY) {
        cuts = SingleEdgeGraphWrapper.validifyIndexesGreedily(gs, cuts);
      }
      // otherwise: leave the cuts as they are
    }

    // re-build the layering
    this.performCuts(graph, gs, cuts);

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

  /** Validify `cuts` by increasing every forbidden index (and its successors) until they are valid. */
  static validifyIndexesGreedily(gs: GraphStats, cuts: readonly number[]): number[] {
    const validCuts: number[] = [];
    let offset = 0;

    for (const next of cuts) {
      // plain number arithmetic: cut and offset are bounded by the layer count
      let cut = next + offset;
      while (cut < gs.longestPath && !gs.isCutAllowed(cut)) {
        cut++;
        offset++;
      }
      if (cut >= gs.longestPath) {
        // cut cannot be performed anymore, discard it
        break;
      }
      validCuts.push(cut);
    }

    return validCuts;
  }

  /** Validify `desiredCuts` by finding the closest valid cuts. */
  static validifyIndexesLookingBack(gs: GraphStats, desiredCuts: readonly number[]): number[] {
    if (desiredCuts.length === 0) {
      return [];
    }

    // initialize array with valid cuts
    const validCuts: number[] = [];
    validCuts.push(MIN_VALUE); // -inf
    for (let i = 1; i < gs.longestPath; ++i) {
      if (gs.isCutAllowed(i)) {
        validCuts.push(i);
      }
    }
    if (validCuts.length === 1) {
      return [];
    }
    validCuts.push(MAX_VALUE); // +inf

    return SingleEdgeGraphWrapper.validifyIndexesLookingBackIn(desiredCuts, validCuts);
  }

  /**
   * Validify the `desiredCuts` s.t. the resulting cuts are all out of `validCuts`. `validCuts` is expected to be a list
   * that contains -inf as initial element and +inf as last element. (Java asserts at `:177-178` and `:193-194` are
   * omitted.)
   */
  private static validifyIndexesLookingBackIn(desiredCuts: readonly number[], validCuts: readonly number[]): number[] {
    // turn cuts into valid cuts
    const finalCuts: number[] = [];
    let iIdx = 0;
    let cIdx = 0;
    let offset = 0;

    while (iIdx < validCuts.length - 1 && cIdx < desiredCuts.length) {
      const current = Int32.add(listGet(desiredCuts, cIdx), offset);

      while (listGet(validCuts, iIdx + 1) < current) {
        iIdx++;
      }

      let select = 0;
      const distLower = Int32.sub(current, listGet(validCuts, iIdx));
      const distHigher = Int32.sub(listGet(validCuts, iIdx + 1), current);
      if (distLower > distHigher) {
        select++;
      }

      finalCuts.push(listGet(validCuts, iIdx + select));
      offset = Int32.add(offset, Int32.sub(listGet(validCuts, iIdx + select), current));
      cIdx++;
      while (
        cIdx < desiredCuts.length &&
        Int32.add(listGet(desiredCuts, cIdx), offset) <= listGet(validCuts, iIdx + select)
      ) {
        cIdx++;
      }
      iIdx += 1 + select;
    }

    return finalCuts;
  }

  /**
   * Preconditions: all cuts are allowed; no cut larger than number of layers; cuts are ordered increasingly.
   */
  private performCuts(graph: LGraph, gs: GraphStats, cuts: readonly number[]): void {
    if (cuts.length === 0) {
      return;
    }

    // index in the "old" layering
    let index = 0;
    // index in the "new" layering
    let newIndex = 0;

    const cutIt = cuts[Symbol.iterator]();
    let nextCut = cutIt.next().value as number; // guaranteed to exist

    // iterate all original layers
    while (index < gs.longestPath) {
      if (index === nextCut) {
        // start new "row"
        newIndex = 0;
        const following = cutIt.next();
        if (following.done !== true) {
          nextCut = following.value;
        } else {
          // no further cut to apply
          nextCut = gs.longestPath + 1;
        }
      }

      // once we started cutting, we have to move nodes
      if (index !== newIndex) {
        this.moveLayer(graph, index, newIndex);
      }

      // move to the next layer
      newIndex++;
      index++;
    }

    this.removeOldLayers(graph);
  }

  /** The tail of `performCuts`: remove old layers. */
  private removeOldLayers(graph: LGraph): void {
    const it = new ArrayListIterator<Layer>(graph.getLayers());
    while (it.hasNext()) {
      const l = it.next();
      if (l.getNodes().length === 0) {
        it.remove();
      }
    }
  }

  /** The body of `if (index != newIndex)` of `performCuts`. */
  private moveLayer(graph: LGraph, index: number, newIndex: number): void {
    const oldLayer = graph.getLayers()[index]!;
    const newLayer = graph.getLayers()[newIndex]!;

    const nodesToMove: LNode[] = [...oldLayer.getNodes()];
    for (const n of nodesToMove) {
      // first move the original node
      // to allow creating dummy nodes for the reversed edge
      n.setLayer(newLayer.getNodes().length, newLayer);

      // at the cut points the edges have to be re-routed
      if (newIndex === 0) {
        const incEdges: LEdge[] = [...n.getIncomingEdges()];
        for (const e of incEdges) {
          e.reverse(graph, true);
          graph.setProperty(InternalProperties.CYCLIC, true);

          // insert proper dummy nodes for the newly created long edge
          CuttingUtils.insertDummies(graph, e, 1);
        }
      }
    }
  }
}
