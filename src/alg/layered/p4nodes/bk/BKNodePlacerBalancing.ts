// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../../../java/lang/JavaInteger.js';
import * as DoubleCompare from '../../../../java/lang/DoubleCompare.js';
import type { LGraph } from '../../graph/LGraph.js';
import { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';

/**
 * The first loop of `createBalancedLayout` (`BKNodePlacer.java:413`): finds the smallest layout and the extent of
 * each layout.
 *
 * @return the index of the layout with the smallest width
 */
function findSmallestLayout(
  lGraph: LGraph,
  layouts: BKAlignedLayout[],
  width: number[],
  min: number[],
  max: number[],
): number {
  const noOfLayouts = layouts.length;
  let minWidthLayout = 0;

  // Find the smallest layout
  for (let i = 0; i < noOfLayouts; i++) {
    min[i] = JavaInteger.MAX_VALUE;
    max[i] = JavaInteger.MIN_VALUE;
  }

  for (let i = 0; i < noOfLayouts; i++) {
    const bal = layouts[i]!;
    width[i] = bal.layoutSize();
    if (width[minWidthLayout]! > width[i]!) {
      minWidthLayout = i;
    }

    for (const l of lGraph) {
      for (const n of l) {
        const nodePosY = bal.y[n.id]! + bal.innerShift[n.id]!;
        min[i] = Math.min(min[i]!, nodePosY);
        max[i] = Math.max(max[i]!, nodePosY + n.getSize().y);
      }
    }
  }
  return minWidthLayout;
}

/**
 * Calculates a balanced layout by determining the median of the four layouts.
 *
 * First, the layout with the smallest height, meaning the difference between the highest and the lowest y-coordinate
 * placement, is used as a starting point. Then, the median position of each of the four layouts is used to determine
 * the final position.
 *
 * During this process, a node's inner shift value is regarded.
 *
 * Section "Layout Balancing" of `BKNodePlacer`, moved here for the file size limit (P1); `lGraph` is the placer's field.
 *
 * @param lGraph the placer's graph
 * @param layouts The four calculated layouts
 * @param nodeCount The number of nodes in the graph
 * @return A balanced layout, the median of the four layouts
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKNodePlacer.java:400
 */
export function createBalancedLayout(lGraph: LGraph, layouts: BKAlignedLayout[], nodeCount: number): BKAlignedLayout {
  const noOfLayouts = layouts.length;
  const balanced = new BKAlignedLayout(lGraph, nodeCount, null, null);
  const width = new Array<number>(noOfLayouts).fill(0);
  const min = new Array<number>(noOfLayouts).fill(0);
  const max = new Array<number>(noOfLayouts).fill(0);
  const minWidthLayout = findSmallestLayout(lGraph, layouts, width, min, max);

  // Find the shift between the smallest and the four layouts
  const shift = new Array<number>(noOfLayouts).fill(0);
  for (let i = 0; i < noOfLayouts; i++) {
    if (layouts[i]!.vdir === VDirection.DOWN) {
      shift[i] = min[minWidthLayout]! - min[i]!;
    } else {
      shift[i] = max[minWidthLayout]! - max[i]!;
    }
  }

  // Calculated y-coordinates for a balanced placement
  const calculatedYs = new Array<number>(noOfLayouts).fill(0);
  for (const layer of lGraph.getLayers()) {
    for (const node of layer.getNodes()) {
      for (let i = 0; i < noOfLayouts; i++) {
        // it's important to include the innerShift here!
        calculatedYs[i] = layouts[i]!.y[node.id]! + layouts[i]!.innerShift[node.id]! + shift[i]!;
      }

      // `Arrays.sort(double[])` orders numerically as `Double.compare` does (-0.0 before 0.0, NaN last), not as the
      // JavaScript default (string) sort would
      calculatedYs.sort(DoubleCompare.compare);
      balanced.y[node.id] = (calculatedYs[1]! + calculatedYs[2]!) / 2.0;
      // since we include the inner shift in the calculation of a balanced y
      // coordinate we don't need it any more
      // note that after this step no further processing of the graph that
      // would include the inner shift is possible
      balanced.innerShift[node.id] = 0;
    }
  }

  return balanced;
}
