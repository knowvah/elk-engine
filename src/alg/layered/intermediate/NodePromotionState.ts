// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import { BiLinkedHashMultiMap } from './BiLinkedHashMultiMap.js';

/**
 * The instance fields of Java's `NodePromotion`. The section files (`NodePromotionPrecalculation`,
 * `NodePromotionModelOrder`, `NodePromotionHeuristic`) hold the Java methods as functions over this record and never
 * import the facade, so the fields live in a file of their own (Q1). Java member docs are kept on the fields.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NodePromotion.java:100
 */
export class NodePromotionState {
  /** The layered graph to which the promotion is applied. */
  masterGraph!: LGraph;

  /** Holds all nodes of the graph that have incoming edges. */
  nodesWithIncomingEdges: LNode[] = [];

  /** Stores all nodes of the graph. */
  nodes: LNode[] = [];

  /**
   * Holds for each layer the current number of original and dummy nodes inside it. The index in the list stands for the
   * index of the layer.
   */
  currentWidth: number[] = [];

  /**
   * Holds for each layer the current approximated width in pixels of the original and dummy nodes inside it. The index
   * in the list stands for the index of the layer.
   */
  currentWidthPixel: number[] = [];

  /**
   * Contains the number of the layer for each node. For a node with the ID i layer[i] holds the index of the layer to
   * which it is currently assigned.
   */
  layers: number[] = [];

  /**
   * Contains three sets of precalculated information for all nodes, where the node with the ID i accesses the results:
   * degreeDiff[i][2]: count of outgoing edges of node i; degreeDiff[i][1]: count of incoming edges of node i;
   * degreeDiff[i][0]: the difference between the count of outgoing and incoming edges for node i. (Java declares the
   * array as `degreeDiff[nodeID][3]` and its comment indexes it the other way round.)
   */
  degreeDiff: number[][] = [];

  /** Stores the maximal accepted width of the graph before processing for later comparison. */
  maxWidth = 0;

  /** Stores the approximated maximal accepted width in pixels of the graph before processing for later comparison. */
  maxWidthPixel = 0;

  /** Holds current number of dummy nodes in the graph. */
  dummyNodeCount = 0;

  /** Is the current height of the graph. */
  maxHeight = 0;

  /** Approximated pixels that have to be added to the width (in pixels) for better estimation of the actual width. */
  nodeSizeAffix = 0;

  /** Approximated size in pixels for a dummy node. */
  dummySize = 0;

  /** The strategy which is used for the node promotion. */
  promotionStrategy!: NodePromotionStrategy;

  biLayerMap: BiLinkedHashMultiMap<number, LNode> = new BiLinkedHashMultiMap<number, LNode>();
}
