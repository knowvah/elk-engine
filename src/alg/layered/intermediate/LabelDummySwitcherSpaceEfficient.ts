// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import { add as int32Add } from '../../../java/lang/Int32.js';
import type { LabelDummySwitcherLabelDummyInfo } from './LabelDummySwitcherLabelDummyInfo.js';

/** The facade's `assignLayer`, injected so this section does not import the facade. */
export type AssignLayer = (labelDummyInfo: LabelDummySwitcherLabelDummyInfo, targetLayerIndex: number) => void;

/*
 * The space-efficient assignment strategy is a heuristic. We first perform all trivial assignments: labels that only
 * have one valid layer available to them, or that can be assigned to a layer larger than the label. We are then left
 * with labels that are too big for their layers. Given a current label, we define a layer's potential width to be the
 * maximum of its current width and the width of all unassigned labels that can be assigned to the layer, except for
 * the current label. We iterate over our labels from biggest to smallest and assign each to the layer with the
 * currently largest potential width.
 */

/**
 * Runs a heuristic that tries to compute the least wide label dummy to layer assignment.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java:407
 */
export function computeSpaceEfficientAssignment(
  labelDummyInfos: readonly LabelDummySwitcherLabelDummyInfo[],
  layerWidths: readonly number[],
  assignLayer: AssignLayer,
): void {
  // We start by assigning all label dummies that only have a single layer to choose from or that can be assigned to a
  // layer large enough for them and removing them from our list
  const nonTrivialLabels = performTrivialAssignments(labelDummyInfos, assignLayer);
  if (nonTrivialLabels.length === 0) {
    return;
  }

  // The remaining labels are not as easy to assign. Sort descendingly by size.
  nonTrivialLabels.sort((info1, info2) => doubleCompare(info2.labelDummy.getSize().x, info1.labelDummy.getSize().x));

  const labelCount = nonTrivialLabels.length;
  for (let labelIndex = 0; labelIndex < labelCount; labelIndex++) {
    assignLayer(nonTrivialLabels[labelIndex]!, findPotentiallyWidestLayer(nonTrivialLabels, labelIndex, layerWidths));
  }
}

/**
 * Assigns all layers that either only have a single layer to be assigned to or that can be assigned to a layer without
 * increasing that layer's width. Returns the remaining labels in a list.
 *
 * @see LabelDummySwitcher.java:430
 */
function performTrivialAssignments(
  labelDummyInfos: readonly LabelDummySwitcherLabelDummyInfo[],
  assignLayer: AssignLayer,
): LabelDummySwitcherLabelDummyInfo[] {
  const remainingLabels: LabelDummySwitcherLabelDummyInfo[] = [];

  for (const labelDummyInfo of labelDummyInfos) {
    if (labelDummyInfo.leftmostLayerId === labelDummyInfo.rightmostLayerId) {
      // Assign to only available layer and remove from list
      assignLayer(labelDummyInfo, labelDummyInfo.leftmostLayerId);
    } else if (!assignToWiderLayer(labelDummyInfo, assignLayer)) {
      // Ending up here means that we didn't find a layer wide enough for the node
      remainingLabels.push(labelDummyInfo);
    }
  }

  return remainingLabels;
}

/**
 * Assigns the given label dummy to the first layer wide enough to house it. If there is no such layer, the label
 * remains unassigned.
 *
 * @returns `true` if we succeeded in assigning the label to a layer.
 * @see LabelDummySwitcher.java:455
 */
function assignToWiderLayer(labelDummyInfo: LabelDummySwitcherLabelDummyInfo, assignLayer: AssignLayer): boolean {
  // Check if the label dummy can be assigned a layer that already is at least as wide as the dummy
  const dummyWidth = labelDummyInfo.labelDummy.getSize().x;
  const validLayers = labelDummyInfo.labelDummy
    .getGraph()!
    .getLayers()
    .slice(labelDummyInfo.leftmostLayerId, int32Add(labelDummyInfo.rightmostLayerId, 1));

  for (const layer of validLayers) {
    if (layer.getSize().x >= dummyWidth) {
      assignLayer(labelDummyInfo, layer.id);
      return true;
    }
  }

  // Ending up here means that we didn't find a layer wide enough for our label
  return false;
}

/**
 * Returns the index of the layer with the largest potential width (Java asserts the label index, line 485; omitted).
 *
 * @param labelDummyInfos label dummy infos, sorted descendingly by label width.
 * @param labelIndex index of the label dummy info for which we're currently looking for a layer. All labels with
 *   smaller index have already been assigned to layers.
 * @param layerWidths the facade's layer widths.
 * @returns index of the layer with the maximum potential width.
 * @see LabelDummySwitcher.java:484
 */
function findPotentiallyWidestLayer(
  labelDummyInfos: readonly LabelDummySwitcherLabelDummyInfo[],
  labelIndex: number,
  layerWidths: readonly number[],
): number {
  const labelDummyInfo = labelDummyInfos[labelIndex]!;
  const labelDummyWidth = labelDummyInfo.labelDummy.getSize().x;

  // Iterate over the label's valid layers
  let widestLayerIndex = labelDummyInfo.leftmostLayerId;
  let widestLayerWidth = 0;

  for (let layer = labelDummyInfo.leftmostLayerId; layer <= labelDummyInfo.rightmostLayerId; layer++) {
    // If the layer is already at least as large as the current label, simply return that layer
    if (labelDummyWidth <= layerWidths[layer]!) {
      return layer;
    }

    // The initial potential width is less wide than the label (otherwise we would have already returned)
    let potentialWidth = layerWidths[layer]!;

    // Find the largest unassigned label that is part of this layer
    const largestUnassignedLabel = findLargestUnassignedLabel(labelDummyInfos, labelIndex, layer);

    // Update layer's potential size
    if (largestUnassignedLabel !== null) {
      potentialWidth = Math.max(potentialWidth, largestUnassignedLabel.labelDummy.getSize().x);
    }

    // Update widest layer (if there are multiple widest layers, we use the leftmost one)
    if (potentialWidth > widestLayerWidth) {
      widestLayerIndex = layer;
      widestLayerWidth = potentialWidth;
    }
  }

  return widestLayerIndex;
}

/**
 * The inner loop of `findPotentiallyWidestLayer` (`:508-515`), split out for the NLOC limit: the last label after
 * `labelIndex` whose layer range contains `layer`, or `null`.
 */
function findLargestUnassignedLabel(
  labelDummyInfos: readonly LabelDummySwitcherLabelDummyInfo[],
  labelIndex: number,
  layer: number,
): LabelDummySwitcherLabelDummyInfo | null {
  let largestUnassignedLabel: LabelDummySwitcherLabelDummyInfo | null = null;
  for (let label = int32Add(labelIndex, 1); label < labelDummyInfos.length; label++) {
    // Check if the label can be placed in the current layer
    const currLabelInfo = labelDummyInfos[label]!;
    if (currLabelInfo.leftmostLayerId <= layer && currLabelInfo.rightmostLayerId >= layer) {
      largestUnassignedLabel = currLabelInfo;
    }
  }
  return largestUnassignedLabel;
}
