// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { Layer } from '../../graph/Layer.js';
import type { NeighborhoodInformation } from './NeighborhoodInformation.js';

/** The minimum number of layers we need to have conflicts. */
const MIN_LAYERS_FOR_CONFLICTS = 3;

/**
 * Checks whether the given node is part of a long edge between the two given layers. At this 'layer2' is left, or
 * before, 'layer1'. Section "Utility Methods" of `BKNodePlacer`, moved here for the file size limit (P1).
 *
 * @param ni the neighborhood information (Java: the placer's field)
 * @param node Possible long edge node
 * @param layer1 The first layer, the layer of the node
 * @param layer2 The second layer
 * @return True if the node is part of a long edge between the layers, false else
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKNodePlacer.java:478
 */
export function incidentToInnerSegment(
  ni: NeighborhoodInformation,
  node: LNode,
  layer1: number,
  layer2: number,
): boolean {
  if (node.getType() === NodeType.LONG_EDGE) {
    for (const edge of node.getIncomingEdges()) {
      const sourceNodeType = edge.getSource()!.getNode()!.getType();

      if (
        sourceNodeType === NodeType.LONG_EDGE &&
        ni.layerIndex![edge.getSource()!.getNode()!.getLayer()!.id] === layer2 &&
        ni.layerIndex![node.getLayer()!.id] === layer1
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * The `if (!incidentToInnerSegment(v_l, i + 1, i))` block of `markConflictsInLayer` (`BKNodePlacer.java:361`), split
 * off for the complexity limits: marks the edges from `v_l` to upper neighbors outside `bounds` (`k_0`, `k_1`).
 */
function markUpperNeighbors(
  ni: NeighborhoodInformation,
  markedEdges: Set<LEdge>,
  v_l: LNode,
  i: number,
  bounds: readonly [number, number],
): void {
  const [k_0, k_1] = bounds;
  if (!incidentToInnerSegment(ni, v_l, i + 1, i)) {
    for (const upperNeighbor of ni.leftNeighbors[v_l.id]!) {
      const k = ni.nodeIndex![upperNeighbor.getFirst()!.id]!;

      if (k < k_0 || k > k_1) {
        // Marked edge can't return null here, because the upper neighbor
        // relationship between v_l and upperNeighbor enforces the existence
        // of at least one edge between the two nodes
        markedEdges.add(upperNeighbor.getSecond()!);
      }
    }
  }
}

/**
 * The inner loop of `markConflicts` (the body for one layer, `BKNodePlacer.java:336`): marks the edges of the nodes of
 * `currentLayer` that cross an inner segment.
 */
function markConflictsInLayer(
  ni: NeighborhoodInformation,
  markedEdges: Set<LEdge>,
  currentLayer: Layer,
  layerSize: number[],
  i: number,
): void {
  let k_0 = 0;
  let l = 0;

  for (let l_1 = 0; l_1 < layerSize[i + 1]!; l_1++) {
    // In the paper, l and i are indices for the layer and the position in the layer
    const v_l_i = currentLayer.getNodes()[l_1]!; // currentLayer.getNodes().get(l_1);

    if (l_1 === layerSize[i + 1]! - 1 || incidentToInnerSegment(ni, v_l_i, i + 1, i)) {
      let k_1 = layerSize[i]! - 1;
      if (incidentToInnerSegment(ni, v_l_i, i + 1, i)) {
        k_1 = ni.nodeIndex![ni.leftNeighbors[v_l_i.id]![0]!.getFirst()!.id]!;
      }

      while (l <= l_1) {
        const v_l = currentLayer.getNodes()[l]!;

        markUpperNeighbors(ni, markedEdges, v_l, i, [k_0, k_1]);

        l++;
      }

      k_0 = k_1;
    }
  }
}

/**
 * This phase of the node placer marks all type 1 and type 2 conflicts.
 *
 * The conflict types base on the distinction of inner segments and non-inner segments of edges. A inner segment is
 * present if an edge is drawn between two dummy nodes and thus is part of a long edge. A non-inner segment is present
 * if one of the connected nodes is not a dummy node.
 *
 * Type 0 conflicts occur if two non-inner segments cross each other. Type 1 conflicts happen when a non-inner segment
 * and a inner segment cross. Type 2 conflicts are present if two inner segments cross.
 *
 * The markers are later used to solve conflicts in favor of long edges. In case of type 2 conflicts, the marker favors
 * the earlier node in layout order.
 *
 * Section "Conflict Detection" of `BKNodePlacer`, moved here for the file size limit (P1); `ni` and `markedEdges` are
 * the placer's fields.
 *
 * @param layeredGraph The layered graph to be layouted
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKNodePlacer.java:318
 */
export function markConflicts(layeredGraph: LGraph, ni: NeighborhoodInformation, markedEdges: Set<LEdge>): void {
  const numberOfLayers = layeredGraph.getLayers().length;

  // Check if there are enough layers to detect conflicts
  if (numberOfLayers < MIN_LAYERS_FOR_CONFLICTS) {
    return;
  }

  // We'll need the number of nodes in the different layers quite often in this method, so save
  // them up front
  const layerSize = new Array<number>(numberOfLayers).fill(0);
  let layerIndex = 0;
  for (const layer of layeredGraph.getLayers()) {
    layerSize[layerIndex++] = layer.getNodes().length;
  }

  // The following call succeeds since there are at least 3 layers in the graph:
  // `layeredGraph.getLayers().listIterator(2)`, whose `next()` of iteration i is the layer at index i + 1
  for (let i = 1; i < numberOfLayers - 1; i++) {
    // The variable naming here follows the notation of the corresponding paper
    // Normally, underscores are not allowed in local variable names, but since there
    // is no way of properly writing indices beside underscores, Checkstyle will be
    // disabled here and in future methods containing indexed variables
    const currentLayer = layeredGraph.getLayers()[i + 1]!;
    markConflictsInLayer(ni, markedEdges, currentLayer, layerSize, i);
  }
}
