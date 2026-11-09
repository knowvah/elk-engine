// SPDX-License-Identifier: EPL-2.0
import { add as int32Add, div as int32Div, sub as int32Sub } from '../../../java/lang/Int32.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { CenterEdgeLabelPlacementStrategy } from '../options/CenterEdgeLabelPlacementStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LabelDummySwitcherLabelDummyInfo } from './LabelDummySwitcherLabelDummyInfo.js';
import { firstOf } from './LabelDummySwitcherSupport.js';

/**
 * The target layer finders of the label dummy switcher (Java private methods of `LabelDummySwitcher`); each takes the
 * layer widths that the facade owns.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java:248
 */

/**
 * Find a layer to place the label dummy into. This method bases its decision on which long edge dummy is in the
 * widest layer.
 *
 * @see LabelDummySwitcher.java:248
 */
export function findWidestLayerTargetId(
  labelDummyInfo: LabelDummySwitcherLabelDummyInfo,
  layerWidths: readonly number[],
): number {
  // Find the widest layer among those the long edge dummies are placed in
  let widestLayerIndex = labelDummyInfo.leftmostLayerId;

  for (let index = int32Add(widestLayerIndex, 1); index <= labelDummyInfo.rightmostLayerId; index++) {
    if (layerWidths[index]! > layerWidths[widestLayerIndex]!) {
      widestLayerIndex = index;
    }
  }

  // Return the dummy node in the widest layer
  return widestLayerIndex;
}

/**
 * Find a layer to place the label dummy into. This method bases its decision on which layer it thinks will be closest
 * to the edge's physical center later.
 *
 * @see LabelDummySwitcher.java:270
 */
export function findCenterLayerTargetId(
  labelDummyInfo: LabelDummySwitcherLabelDummyInfo,
  layerWidths: readonly number[],
): number {
  // Sum up the widths of all the layers this thing spans
  const layerWidthSums = computeLayerWidthSums(labelDummyInfo, layerWidths);

  // Find the first layer that exceeds half the width
  const threshold = layerWidthSums[layerWidthSums.length - 1]! / 2;

  for (let i = 0; i < layerWidthSums.length; i++) {
    if (layerWidthSums[i]! >= threshold) {
      return int32Add(labelDummyInfo.leftmostLayerId, i);
    }
  }

  // This should actually not happen (Java: `assert false;`, omitted)
  return int32Add(labelDummyInfo.leftmostLayerId, labelDummyInfo.leftLongEdgeDummies.length);
}

/**
 * Computes an array in which entry i refers to the combined width of layers [0, i]. The combined width is estimated
 * based on the currently estimated layer width and a wild guess as to the layer spacing.
 *
 * @see LabelDummySwitcher.java:292
 */
function computeLayerWidthSums(
  labelDummyInfo: LabelDummySwitcherLabelDummyInfo,
  layerWidths: readonly number[],
): number[] {
  // The minimum space that we think will be left between
  const lgraph = labelDummyInfo.labelDummy.getGraph()!;
  const edgeNodeSpacing = lgraph.getProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS) * 2;
  const nodeNodeSpacing = lgraph.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS);
  const minSpaceBetweenLayers = Math.max(edgeNodeSpacing, nodeNodeSpacing);

  // The array that will hold the accumulated widths (Java `new double[n]`: zero-filled)
  const layerWidthSums: number[] = new Array<number>(labelDummyInfo.totalDummyCount()).fill(0);

  let currentWidthSum = -minSpaceBetweenLayers;
  let currentIndex = 0;

  for (const leftDummy of labelDummyInfo.leftLongEdgeDummies) {
    currentWidthSum += layerWidths[leftDummy.getLayer()!.id]! + minSpaceBetweenLayers;
    layerWidthSums[currentIndex++] = currentWidthSum;
  }

  currentWidthSum += layerWidths[labelDummyInfo.labelDummy.getLayer()!.id]! + minSpaceBetweenLayers;
  layerWidthSums[currentIndex++] = currentWidthSum;

  for (const rightDummy of labelDummyInfo.rightLongEdgeDummies) {
    currentWidthSum += layerWidths[rightDummy.getLayer()!.id]! + minSpaceBetweenLayers;
    layerWidthSums[currentIndex++] = currentWidthSum;
  }

  return layerWidthSums;
}

/**
 * Find a layer to place the label dummy into. This method bases its decision on which long edge dummy is in the median
 * layer of the layers the long edge spans.
 *
 * @see LabelDummySwitcher.java:329
 */
export function findMedianLayerTargetId(labelDummyInfo: LabelDummySwitcherLabelDummyInfo): number {
  // Find the median of the layers spanned by the long edge this label dummy is part of
  const layers = labelDummyInfo.totalDummyCount();
  const lowerMedian = int32Div(int32Sub(layers, 1), 2);

  return int32Add(labelDummyInfo.leftmostLayerId, lowerMedian);
}

/**
 * Find a layer to place the label dummy into. This method simply returns the dummy node closest to the original edge's
 * head or tail. It does take into account whether the edge is reversed or not.
 *
 * @param headLayer `true` if the label is to be placed at the edge's head, `false` if it is to be placed at the
 *   edge's tail.
 * @see LabelDummySwitcher.java:349
 */
export function findEndLayerTargetId(labelDummyInfo: LabelDummySwitcherLabelDummyInfo, headLayer: boolean): number {
  const reversed = isPartOfReversedEdge(labelDummyInfo);

  if ((headLayer && !reversed) || (!headLayer && reversed)) {
    return labelDummyInfo.rightmostLayerId;
  } else {
    return labelDummyInfo.leftmostLayerId;
  }
}

/**
 * Sets the alignment property for the given label dummy. Its placement strategy is assumed to be one of the end
 * strategies (Java asserts it, line 364; omitted).
 *
 * @see LabelDummySwitcher.java:363
 */
export function setEndLayerNodeAlignment(labelDummyInfo: LabelDummySwitcherLabelDummyInfo): void {
  const isHeadLabel = labelDummyInfo.placementStrategy === CenterEdgeLabelPlacementStrategy.HEAD_LAYER;
  const partOfReversedEdge = isPartOfReversedEdge(labelDummyInfo);

  if ((isHeadLabel && !partOfReversedEdge) || (!isHeadLabel && partOfReversedEdge)) {
    labelDummyInfo.labelDummy.setProperty(LayeredOptions.ALIGNMENT, Alignment.RIGHT);
  } else {
    labelDummyInfo.labelDummy.setProperty(LayeredOptions.ALIGNMENT, Alignment.LEFT);
  }
}

/**
 * Checks if the given label dummy node is part of a reversed edge (Java asserts on the node type and the edges,
 * lines 381-383; omitted).
 *
 * @see LabelDummySwitcher.java:380
 */
function isPartOfReversedEdge(labelDummyInfo: LabelDummySwitcherLabelDummyInfo): boolean {
  // Find incoming and outgoing edge
  const incoming = firstOf(labelDummyInfo.labelDummy.getIncomingEdges());
  const outgoing = firstOf(labelDummyInfo.labelDummy.getOutgoingEdges());

  return incoming.getProperty(InternalProperties.REVERSED) || outgoing.getProperty(InternalProperties.REVERSED);
}
