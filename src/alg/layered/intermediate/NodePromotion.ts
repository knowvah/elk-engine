// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { Pair } from '../../../core/util/Pair.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import { promotionMagic, setNewLayering } from './NodePromotionHeuristic.js';
import { modelOrderNodePromotion, setNewLayeringModelOrder } from './NodePromotionModelOrder.js';
import {
  precalculateAndSetInformation,
  precalculateAndSetInformationModelOrder,
} from './NodePromotionPrecalculation.js';
import { NodePromotionState } from './NodePromotionState.js';

/** Java `Function<Pair<Integer, Integer>, Boolean>`: the termination criterion handed to `promotionMagic`. */
type PromotionCriterion = (pair: Pair<number, number>) => boolean;

/** Percent denominator of the two percentage strategies. */
const PERCENT = 100.0;

/** Dummy function that's got no other choice but to say "it's true" (Java `funFunction`). */
const funFunction: PromotionCriterion = () => true;

/**
 * An approach that is implementing the node promotion heuristic of Nikola S. Nikolov and Alexandre Tarassov and added a
 * few more options for handling and stopping the promotion earlier.
 *
 * The algorithm is described in Nikola S. Nikolov, Alexandre Tarassov, and Jürgen Branke. 2005. In search for efficient
 * heuristics for minimum-width graph layering with consideration of dummy nodes. J. Exp. Algorithmics 10, Article 2.7
 * (December 2005). DOI=10.1145/1064546.1180618 http://doi.acm.org/10.1145/1064546.1180618.
 *
 * Note that the term 'width' here refers to the maximum number of nodes in any layer.
 *
 * The goal of the node promotion is to achieve a layering with less dummy nodes. For this purpose the original graph
 * nodes are promoted recursively and the promotion is applied, if and only if this reduces the determined count of
 * dummy nodes. A promotion takes a node and puts it on a higher layer, if there is a predecessor on that layer this
 * node will be promoted as well and so on. After that the effect of the promotion is evaluated, if the number of dummy
 * nodes decreases the promotion is applied. Furthermore there are different strategies to handle the node promotion:
 * `LayeredOptions.NODE_PROMOTION` (the handling strategies, see `NodePromotionStrategy`) and
 * `LayeredOptions.NODE_PROMOTION_BOUNDARY` (an upper bound for the iterations of the node promotion).
 *
 * Facade over the section files `NodePromotionPrecalculation`, `NodePromotionModelOrder` and `NodePromotionHeuristic`
 * (Java is 752 lines); the Java fields are the `NodePromotionState` they share. B8: `promoteNode` (`:629`) is an
 * explicit-stack loop in `NodePromotionHeuristic`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NodePromotion.java
 */
export class NodePromotion implements ILayoutProcessor<LGraph> {
  private readonly state = new NodePromotionState();

  /** @see NodePromotion.java:169 */
  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    const s = this.state;
    progressMonitor.begin('Node promotion heuristic', 1);

    s.masterGraph = layeredGraph;

    s.promotionStrategy = layeredGraph.getProperty(LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY);
    if (!this.isModelOrderStrategy()) {
      precalculateAndSetInformation(s);
    } else {
      this.precalculateAndSetInformationModelOrder(); // NodePromotion.java:180 calls the public method
    }

    // If the promotion strategy is set to DUMMYNODE_PERCENTAGE or NODECOUNT_PERCENTAGE this
    // value will have an effect on the termination criterion of the node promotion.
    const promoteUntil = s.masterGraph.getProperty(LayeredOptions.LAYERING_NODE_PROMOTION_MAX_ITERATIONS);

    this.promote(promoteUntil);
    if (!this.isModelOrderStrategy()) {
      setNewLayering(s, layeredGraph);
    } else {
      setNewLayeringModelOrder(s, layeredGraph);
    }

    progressMonitor.done();
  }

  /** The repeated `promotionStrategy != MODEL_ORDER_LEFT_TO_RIGHT && != MODEL_ORDER_RIGHT_TO_LEFT` test, negated. */
  private isModelOrderStrategy(): boolean {
    return (
      this.state.promotionStrategy === NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT ||
      this.state.promotionStrategy === NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT
    );
  }

  /**
   * The `switch (promotionStrategy)` of `process`. The switch value is read once; the improved arms reassign the
   * strategy for the calls that follow.
   *
   * @see NodePromotion.java:190
   */
  private promote(promoteUntil: number): void {
    const s = this.state;
    switch (s.promotionStrategy) {
      case NodePromotionStrategy.NIKOLOV: // Java: two arms with the same body
      case NodePromotionStrategy.NIKOLOV_PIXEL:
        promotionMagic(s, funFunction);
        break;
      case NodePromotionStrategy.NIKOLOV_IMPROVED:
        this.nikolovImproved();
        break;
      case NodePromotionStrategy.NIKOLOV_IMPROVED_PIXEL:
        this.nikolovImprovedPixel();
        break;
      case NodePromotionStrategy.NODECOUNT_PERCENTAGE:
        this.nodecountPercentage(promoteUntil);
        break;
      case NodePromotionStrategy.DUMMYNODE_PERCENTAGE:
        this.dummynodePercentage(promoteUntil);
        break;
      case NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT:
        modelOrderNodePromotion(s, true);
        break;
      case NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT:
        modelOrderNodePromotion(s, false);
        break;
      default:
        promotionMagic(s, funFunction);
        break;
    }
  }

  /** The `case NIKOLOV_IMPROVED` arm. @see NodePromotion.java:198 */
  private nikolovImproved(): void {
    const s = this.state;
    s.promotionStrategy = NodePromotionStrategy.NO_BOUNDARY;
    promotionMagic(s, funFunction);
    // Determine if the max width of original plus dummy nodes is bigger than before the
    // promotion. If so, use a more cautious style of promotion.
    let newMaxWidth = 0;
    for (const martha of s.currentWidth) {
      newMaxWidth = Math.max(newMaxWidth, martha);
    }
    if (newMaxWidth > s.maxWidth) {
      // maximal width exceeded
      s.promotionStrategy = NodePromotionStrategy.NIKOLOV;
      promotionMagic(s, funFunction);
    }
  }

  /** The `case NIKOLOV_IMPROVED_PIXEL` arm. @see NodePromotion.java:212 */
  private nikolovImprovedPixel(): void {
    const s = this.state;
    s.promotionStrategy = NodePromotionStrategy.NO_BOUNDARY;
    promotionMagic(s, funFunction);
    // Determine if the approximated max width of original plus dummy nodes in pixels is
    // bigger than before the promotion. If so, use a more cautious style of promotion.
    let newMaxWidthPixel = 0.0;
    for (const donna of s.currentWidthPixel) {
      newMaxWidthPixel = Math.max(newMaxWidthPixel, donna);
    }
    if (newMaxWidthPixel > s.maxWidthPixel) {
      // maximal width exceeded
      s.promotionStrategy = NodePromotionStrategy.NIKOLOV_PIXEL;
      promotionMagic(s, funFunction);
    }
  }

  /**
   * The `case NODECOUNT_PERCENTAGE` arm: set maximal number of iterations till stopping the node promotion depending on
   * the number of nodes in the graph. After the number of iterations is reached it's forced to stop. Terminating
   * criterion is handed to the promotion algorithm in the form of an anonymous function that checks if the criterion is
   * fulfilled. (It's possible the number is never reached.) `layers.length * promoteUntil` is `int * int`.
   *
   * @see NodePromotion.java:232
   */
  private nodecountPercentage(promoteUntil: number): void {
    const s = this.state;
    const promoteUntilN = d2i(Math.ceil(Int32.mul(s.layers.length, promoteUntil) / PERCENT));
    promotionMagic(s, (pair) => pair.getSecond()! < promoteUntilN);
  }

  /**
   * The `case DUMMYNODE_PERCENTAGE` arm: calculate number of dummy nodes the algorithm shall ideally reduce until it's
   * forced to stop and hand it to the promotion algorithm in the form of an anonymous function that checks if the
   * criterion is fulfilled. (It's possible the number is never reached.) `dummyNodeCount * promoteUntil` is
   * `int * int`.
   *
   * @see NodePromotion.java:241
   */
  private dummynodePercentage(promoteUntil: number): void {
    const s = this.state;
    const promoteUntilD = d2i(Math.ceil(Int32.mul(s.dummyNodeCount, promoteUntil) / PERCENT));
    promotionMagic(s, (pair) => pair.getFirst()! < promoteUntilD);
  }

  /**
   * Private helper method to generate the necessary data structure and layer and node ids for model order node
   * promotion (`public` in Java).
   *
   * @see NodePromotion.java:354
   */
  precalculateAndSetInformationModelOrder(): void {
    precalculateAndSetInformationModelOrder(this.state);
  }
}
