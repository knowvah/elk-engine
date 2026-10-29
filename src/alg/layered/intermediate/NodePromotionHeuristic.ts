// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import type { NodePromotionState } from './NodePromotionState.js';

/** The locals of Java's `promotionMagic` that the node loop reads and writes (the backups and two counters). */
interface MagicRun {
  promotions: number;
  reducedDummies: number;
  layeringBackup: number[];
  dummyBackup: number;
  heightBackup: number;
  currentWidthBackup: number[];
  currentWidthPixelBackup: number[];
}

/** One active call of Java's recursive `promoteNode` (B8): the call's locals and the incoming edges still to visit. */
interface PromoteFrame {
  readonly node: LNode;
  readonly nodeLayerPos: number;
  readonly edges: Iterator<LEdge>;
  dummydiff: number;
  maxWidthNotExceeded: boolean;
}

export function promotionMagic(s: NodePromotionState, funky: (pair: Pair<number, number>) => boolean): void {
  let promotionFlag: boolean;
  let iterationCounter = 0; // Counts the number of iterations over all nodes.

  // Setting up backups..; Java aliases the live width lists here (no copy); they are copied only on a promotion.
  const run: MagicRun = {
    promotions: 0,
    reducedDummies: 0, // Counts the number of already exterminated dummy nodes.
    layeringBackup: [...s.layers],
    dummyBackup: s.dummyNodeCount,
    heightBackup: s.maxHeight,
    currentWidthBackup: s.currentWidth,
    currentWidthPixelBackup: s.currentWidthPixel,
  };

  do {
    run.promotions = 0;
    // Start promotion for all nodes with incoming edges.
    for (const node of s.nodesWithIncomingEdges) {
      applyOrRestore(s, run, promoteNode(s, node));
    }
    iterationCounter++;
    promotionFlag =
      run.promotions !== 0 && // Stopping criterium of Nikolov et al..
      // Added criterion for earlier
      // stopping depending on reduced
      // dummies or number of
      // iterations..
      funky(Pair.of(run.reducedDummies, iterationCounter));
  } while (promotionFlag);
}

/**
 * The body of the node loop of `promotionMagic`: apply a valid promotion and take the backups, or restore the last valid
 * state.
 *
 * @see NodePromotion.java:573
 */
function applyOrRestore(s: NodePromotionState, run: MagicRun, promotionPair: Pair<number, boolean>): void {
  const first = promotionPair.getFirst()!;

  // Strategies NIKOLOV and NIKOLOV_PIXEL are considerate about the actual width while
  // the nodes are promoted, therefore they are able to cancel a legitimate promotion
  // because of an exceeding of the maximal accepted width.
  let apply = true;
  if (
    s.promotionStrategy === NodePromotionStrategy.NIKOLOV ||
    s.promotionStrategy === NodePromotionStrategy.NIKOLOV_PIXEL
  ) {
    apply = promotionPair.getSecond()!;
  }

  // Promotion is valid and will be applied.
  if (first < 0 && apply) {
    run.promotions++;
    run.layeringBackup = [...s.layers];
    s.dummyNodeCount = s.dummyNodeCount + first;
    run.reducedDummies += run.dummyBackup - s.dummyNodeCount;
    run.dummyBackup = s.dummyNodeCount + first;
    run.heightBackup = s.maxHeight;
    run.currentWidthBackup = [...s.currentWidth];
    run.currentWidthPixelBackup = [...s.currentWidthPixel];
  } else {
    // Promotion is invalid and the last valid state will be restored.
    s.layers = [...run.layeringBackup];
    s.dummyNodeCount = run.dummyBackup;
    s.currentWidth = [...run.currentWidthBackup];
    s.currentWidthPixel = [...run.currentWidthPixelBackup];
    s.maxHeight = run.heightBackup;
  }
}

/**
 * Node promotion heuristic of the paper. Works on an array of integers which represents the nodes and their position
 * within the layers to avoid difficulties while creating and deleting new layers over the course of the discarded
 * promotions.
 *
 * B8: the Java recursion into the preceding nodes of the layer above is an explicit stack of `PromoteFrame`s. A frame
 * folds each callee's `(dummydiff, maxWidthNotExceeded)` into its own, in edge order, and checks every edge against
 * `layers` when it is reached, as Java does (an earlier callee may have promoted a node a later edge leads to).
 *
 * @param node Node that shall be promoted.
 * @returns A Pair consisting of an Integer and a Boolean. The Integer is the estimated difference of dummy nodes after
 *   applying the node promotion; a negative value indicates a reduction of dummy nodes. The Boolean gives information
 *   about whether the maximal accepted width has been exceeded while promoting the given node or not.
 * @see NodePromotion.java:629
 */
export function promoteNode(s: NodePromotionState, node: LNode): Pair<number, boolean> {
  const stack: PromoteFrame[] = [enterPromoteNode(s, node)];
  let returned: readonly [number, boolean] | null = null;
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (returned !== null) {
      frame.dummydiff = frame.dummydiff + returned[0];
      frame.maxWidthNotExceeded = frame.maxWidthNotExceeded && returned[1];
      returned = null;
    }
    const masterNode = nextMasterNode(s, frame);
    if (masterNode !== null) {
      stack.push(enterPromoteNode(s, masterNode));
    } else {
      s.layers[frame.node.id] = frame.nodeLayerPos;
      frame.dummydiff = frame.dummydiff + s.degreeDiff[frame.node.id]![0]!;
      stack.pop();
      returned = [frame.dummydiff, frame.maxWidthNotExceeded];
    }
  }
  return Pair.of(returned![0], returned![1]);
}

/**
 * The part of Java's `promoteNode` before its loop over the incoming edges: the width bookkeeping of the two layers and
 * the width check.
 *
 * @see NodePromotion.java:630
 */
function enterPromoteNode(s: NodePromotionState, node: LNode): PromoteFrame {
  let maxWidthNotExceeded = true;
  let nodeLayerPos = s.layers[node.id]!;
  const nodeSize = node.getSize().y + s.nodeSizeAffix;
  const dummiesBuilt = s.degreeDiff[node.id]![2]!;

  // Calculating the current width of the layer the node came from by subtracting its size
  // from the size of this layer and adding its outgoing edges to this layer because of the
  // then resulting new dummy nodes.
  s.currentWidth[nodeLayerPos] = s.currentWidth[nodeLayerPos]! - 1 + dummiesBuilt;
  s.currentWidthPixel[nodeLayerPos] = s.currentWidthPixel[nodeLayerPos]! - nodeSize + dummiesBuilt * s.dummySize;

  // Calculate index of the layer for the promoted node.
  nodeLayerPos++;
  moveToLayer(s, node, nodeLayerPos, nodeSize);

  // Shall the width be considered while promoting a node, it's necessary to check, if the
  // promotion of the node exceeds the max width of the previous layer or the new layer. If
  // so, the promotion will not be applied.
  if (exceedsMaxWidth(s, nodeLayerPos)) {
    maxWidthNotExceeded = false;
  }

  return {
    node,
    nodeLayerPos,
    edges: node.getIncomingEdges()[Symbol.iterator](),
    dummydiff: 0,
    maxWidthNotExceeded,
  };
}

/** The if/else on `nodeLayerPos >= maxHeight` of `promoteNode`. @see NodePromotion.java:645 */
function moveToLayer(s: NodePromotionState, node: LNode, nodeLayerPos: number, nodeSize: number): void {
  if (nodeLayerPos >= s.maxHeight) {
    s.maxHeight++;
    s.currentWidth.push(1);
    s.currentWidthPixel.push(nodeSize);
  } else {
    // Calculating the current width of the layer the node is promoted to by adding its size
    // to the size of this layer and subtracting its incoming edges to this layer due to the
    // resulting potentially reduced dummy nodes. If it's a new layer only the size itself will
    // be added to it.
    const dummiesReduced = s.degreeDiff[node.id]![1]!;
    s.currentWidth[nodeLayerPos] = s.currentWidth[nodeLayerPos]! + 1 - dummiesReduced;
    s.currentWidthPixel[nodeLayerPos] = s.currentWidthPixel[nodeLayerPos]! + nodeSize - dummiesReduced * s.dummySize;
  }
}

/** The width condition of `promoteNode`. @see NodePromotion.java:663 */
function exceedsMaxWidth(s: NodePromotionState, nodeLayerPos: number): boolean {
  return (
    (s.promotionStrategy === NodePromotionStrategy.NIKOLOV &&
      (s.currentWidth[nodeLayerPos]! > s.maxWidth || s.currentWidth[nodeLayerPos - 1]! > s.maxWidth)) ||
    (s.promotionStrategy === NodePromotionStrategy.NIKOLOV_PIXEL &&
      (s.currentWidthPixel[nodeLayerPos]! > s.maxWidthPixel ||
        s.currentWidthPixel[nodeLayerPos - 1]! > s.maxWidthPixel))
  );
}

/**
 * The loop header and `if` of `promoteNode`'s edge loop: the next preceding node whose layer is the frame's new layer,
 * `null` when the edges are exhausted.
 *
 * @see NodePromotion.java:674
 */
function nextMasterNode(s: NodePromotionState, frame: PromoteFrame): LNode | null {
  for (let next = frame.edges.next(); next.done !== true; next = frame.edges.next()) {
    const masterNode = next.value.getSource()!.getNode()!;
    if (s.layers[masterNode.id] === frame.nodeLayerPos) {
      return masterNode;
    }
  }
  return null;
}

/**
 * Helper method for setting the calculated and potentially improved layering after the node promotion heuristic is
 * finished.
 *
 * @param layeredGraph The graph to which the calculated new layering is applied.
 * @see NodePromotion.java:696
 */
export function setNewLayering(s: NodePromotionState, layeredGraph: LGraph): void {
  // The laLaLayer, born in the far away laLaLand, traveled here to be of special use for
  // our layering. It is added to the layeredGraph with reversed IDs so they fit to the IDs
  // stored in the nodes but can also be properly assigned compliant with the layering used in
  // ELK Layered.
  const layList: Layer[] = [];
  for (let i = 0; i <= s.maxHeight; i++) {
    const laLaLayer = new Layer(layeredGraph);
    laLaLayer.id = s.maxHeight - i;
    layList.push(laLaLayer);
  }

  // Assign all nodes to the beforehand created (laLa)layers.
  for (const node of s.nodes) {
    node.setLayer(layList[s.maxHeight - s.layers[node.id]!]!);
  }

  // One Loop to exterminate all deceiving layers that don't contain any nodes!
  const kept = layList.filter((possiblyEvilLayer) => possiblyEvilLayer.getNodes().length !== 0);
  layeredGraph.getLayers().length = 0;
  for (const layer of kept) {
    layeredGraph.getLayers().push(layer);
  }
}
