// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import * as Float32 from '../../java/lang/Float32.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { ArrayListIterator } from '../../java/util/ListIterator.js';
import type { ListIterator } from '../../java/util/ListIterator.js';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import { KVector } from '../math/KVector.js';
import type { ElkPadding } from '../math/ElkPadding.js';
import { BoxLayouterOptions } from '../options/BoxLayouterOptions.js';
import { Group } from './BoxLayoutProviderGroup.js';
import {
  areaStdDev2,
  mergeAndPlaceDec,
  mergeAndPlaceInc,
  mergeAndPlaceMixed,
  placeInnerBoxes,
} from './BoxLayoutProviderGrouping.js';
import type { PlacementSettings } from './BoxLayoutProviderGrouping.js';
import { ElkUtil } from './ElkUtil.js';
import type { IElkProgressMonitor } from './IElkProgressMonitor.js';
import { PackingMode } from './PackingMode.js';

/** The state shared by the row placement of Java's list `placeBoxes` and its expansion step. */
interface Rows {
  xpos: number;
  ypos: number;
  highestBox: number;
  broadestRow: number;
  rowIndices: LinkedList<number>;
  rowHeights: LinkedList<number>;
}

/**
 * A layout algorithm that does not take edges into account, but treats all nodes as isolated boxes.
 * This is useful for parts of a diagram that consist of objects without connections, such as
 * parallel regions in Statecharts.
 *
 * The box layouter allows to configure the underlying packing strategy, see the {@link PackingMode} enumeration.
 *
 * TODO there's duplicate code in this class, handling either the simple mode or any of the grouped modes.
 * It should be possible to re-use the grouped code for the simple packing mode though.
 *
 * MIGRATE The code needs to be changed to apply padding to the coordinates immediately.
 *
 * MIGRATE The box layout provider does not support hyperedges yet.
 *
 * Java overload `placeBoxes(List<ElkNode>, …)` is `placeSortedBoxes` here.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/BoxLayoutProvider.java
 */
export class BoxLayoutProvider extends AbstractLayoutProvider {
  /** The nested Java enum `BoxLayoutProvider.PackingMode`, which lives in its own file (C3). */
  static readonly PackingMode: typeof PackingMode = PackingMode;

  /** default value for aspect ratio. */
  static readonly DEF_ASPECT_RATIO = 1.3;

  layout(layoutNode: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Box layout', 2);

    // `.floatValue()`
    const objSpacing = Float32.fromDouble(layoutNode.getProperty(BoxLayouterOptions.SPACING_NODE_NODE));
    const padding = layoutNode.getProperty(BoxLayouterOptions.PADDING);
    const expandNodes = layoutNode.getProperty(BoxLayouterOptions.EXPAND_NODES);
    const interactive = layoutNode.getProperty(BoxLayouterOptions.INTERACTIVE);

    if (layoutNode.getProperty(BoxLayouterOptions.BOX_PACKING_MODE) === PackingMode.SIMPLE) {
      this.placeBoxes(layoutNode, objSpacing, padding, expandNodes, interactive);
    } else {
      // any of the groups
      this.placeBoxesGrouping(layoutNode, objSpacing, padding, expandNodes);
    }

    progressMonitor.done();
  }

  // ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Simple Mode

  /**
   * Place the boxes in the given parent node. The children are first sorted appropriately. Furthermore, adjust the
   * parent size to fit the bounding box.
   *
   * @param parentNode parent node
   * @param objSpacing minimal spacing between elements
   * @param padding spacing to the border
   * @param expandNodes if true, the nodes are expanded to fill their parent
   * @param interactive whether position should be considered instead of size
   */
  private placeBoxes(
    parentNode: ElkNode,
    objSpacing: number,
    padding: ElkPadding,
    expandNodes: boolean,
    interactive: boolean,
  ): void {
    const sortedBoxes = this.sort(parentNode, interactive);

    // Work on a copy of the minimum size to avoid changing the property's value
    const minSize = ElkUtil.effectiveMinSizeConstraintFor(parentNode);

    let aspectRatio: number | null = parentNode.getProperty(BoxLayouterOptions.ASPECT_RATIO);
    if (aspectRatio === null || aspectRatio <= 0) {
      aspectRatio = BoxLayoutProvider.DEF_ASPECT_RATIO;
    }

    // do place the boxes
    const parentSize = this.placeSortedBoxes(sortedBoxes, padding, {
      spacing: objSpacing,
      minTotalWidth: minSize.x,
      minTotalHeight: minSize.y,
      expandNodes,
      aspectRatio,
    });

    // adjust parent size
    ElkUtil.resizeNode(parentNode, parentSize.x, parentSize.y, false, true);
  }

  /**
   * Sorts nodes according to priority and size or position. Nodes with higher priority are
   * put to the start of the list.
   *
   * @param parentNode parent node
   * @param interactive whether position should be considered instead of size
   * @returns sorted list of children
   */
  private sort(parentNode: ElkNode, interactive: boolean): ElkNode[] {
    const sortedBoxes: ElkNode[] = [...parentNode.getChildren()];

    // `Collections.sort` is stable, as is `Array.prototype.sort`
    sortedBoxes.sort((child1, child2) => BoxLayoutProvider.compareBoxes(child1, child2, interactive));

    return sortedBoxes;
  }

  /** The body of the anonymous `Comparator<ElkNode>` of Java's `sort`. */
  private static compareBoxes(child1: ElkNode, child2: ElkNode, interactive: boolean): number {
    let prio1: number | null = child1.getProperty(BoxLayouterOptions.PRIORITY);
    if (prio1 === null) {
      prio1 = 0;
    }

    let prio2: number | null = child2.getProperty(BoxLayouterOptions.PRIORITY);
    if (prio2 === null) {
      prio2 = 0;
    }

    if (prio1 > prio2) {
      return -1;
    } else if (prio1 < prio2) {
      return 1;
    }
    // boxes have same priority - compare their position or size
    if (interactive) {
      let c: number = doubleCompare(child1.getY(), child2.getY());
      if (c !== 0) {
        return c;
      }
      c = doubleCompare(child1.getX(), child2.getX());
      if (c !== 0) {
        return c;
      }
    }
    const size1 = child1.getWidth() * child1.getHeight();
    const size2 = child2.getWidth() * child2.getHeight();
    return doubleCompare(size1, size2);
  }

  /**
   * Place the boxes of the given sorted list according to their order in the list.
   *
   * @param sortedBoxes sorted list of boxes
   * @param padding spacing to the border
   * @param settings spacing, minimal parent size, expansion and aspect ratio (Java passes them as five parameters)
   * @returns the bounding box of the resulting layout
   */
  private placeSortedBoxes(sortedBoxes: ElkNode[], padding: ElkPadding, settings: PlacementSettings): KVector {
    const maxRowWidth = this.computeMaxRowWidth(sortedBoxes, padding, settings.aspectRatio);

    // place nodes iteratively into rows
    const rows = this.placeInRows(sortedBoxes, padding, settings, maxRowWidth);
    rows.broadestRow = Math.max(rows.broadestRow, settings.minTotalWidth);
    let totalHeight = rows.ypos + rows.highestBox + padding.getBottom();
    if (totalHeight < settings.minTotalHeight) {
      rows.highestBox += settings.minTotalHeight - totalHeight;
      totalHeight = settings.minTotalHeight;
    }

    // expand nodes if required
    if (settings.expandNodes) {
      this.expandBoxes(sortedBoxes, padding, settings.spacing, rows);
    }

    // return parent size
    return new KVector(rows.broadestRow, totalHeight);
  }

  /** The first section of Java's list `placeBoxes`: the row width that achieves the desired aspect ratio. */
  private computeMaxRowWidth(sortedBoxes: ElkNode[], padding: ElkPadding, aspectRatio: number): number {
    // determine the maximal row width by the maximal box width and the total area
    let maxRowWidth = 0.0;
    let totalArea = 0.0;
    for (const box of sortedBoxes) {
      ElkUtil.resizeNode(box);
      maxRowWidth = Math.max(maxRowWidth, box.getWidth());
      totalArea += box.getWidth() * box.getHeight();
    }

    // calculate std deviation
    //  rationale: the greater the diversity of box sizes, the more space will be 'wasted',
    //  contributing to the total area. We address this by adding x*n*stddev to the area.
    //  TODO x should be assessed empirically, for the moment set it to 1
    const mean = totalArea / sortedBoxes.length;
    const stddev = this.areaStdDev(sortedBoxes, mean);

    totalArea += sortedBoxes.length * 1 * stddev;
    // add top and bottom padding to total area
    totalArea += Math.sqrt(totalArea) * (padding.getBottom() + padding.getTop());
    // add left and right padding
    totalArea += Math.sqrt(totalArea) * padding.getRight();

    // calculate the required row width w to achieve the desired aspect ratio,
    //  i.e.:  w*h=area s.t. w/h=dar  ->  w=sqrt(area * dar)
    maxRowWidth = Math.max(maxRowWidth, Math.sqrt(totalArea * aspectRatio)) + padding.getLeft();
    return maxRowWidth;
  }

  /** The "place nodes iteratively into rows" loop of Java's list `placeBoxes`. */
  private placeInRows(
    sortedBoxes: ElkNode[],
    padding: ElkPadding,
    settings: PlacementSettings,
    maxRowWidth: number,
  ): Rows {
    const rows: Rows = {
      xpos: padding.getLeft(),
      ypos: padding.getTop(),
      highestBox: 0.0,
      broadestRow: padding.getHorizontal(),
      rowIndices: new LinkedList<number>(),
      rowHeights: new LinkedList<number>(),
    };
    rows.rowIndices.add(0);
    const boxIter: ListIterator<ElkNode> = new ArrayListIterator(sortedBoxes);
    while (boxIter.hasNext()) {
      const box = boxIter.next();
      const width = box.getWidth();
      const height = box.getHeight();
      if (rows.xpos + width > maxRowWidth) {
        this.startNextRow(rows, padding, settings, width, boxIter.previousIndex());
      }
      box.setLocation(rows.xpos, rows.ypos);
      rows.broadestRow = Math.max(rows.broadestRow, rows.xpos + width + padding.getRight());
      rows.highestBox = Math.max(rows.highestBox, height);
      rows.xpos += width + settings.spacing;
    }
    return rows;
  }

  /** The "place box into the next row" branch of the loop in `placeInRows`; `previousIndex` is the box's index. */
  private startNextRow(
    rows: Rows,
    padding: ElkPadding,
    settings: PlacementSettings,
    width: number,
    previousIndex: number,
  ): void {
    // place box into the next row
    if (settings.expandNodes) {
      rows.rowHeights.addLast(rows.highestBox);
      rows.rowIndices.addLast(previousIndex);
    }
    rows.xpos = padding.getLeft();
    rows.ypos += rows.highestBox + settings.spacing;
    rows.highestBox = 0.0;
    rows.broadestRow = Math.max(rows.broadestRow, padding.getHorizontal() + width);
  }

  /** The "expand nodes if required" block of Java's list `placeBoxes`. */
  private expandBoxes(sortedBoxes: ElkNode[], padding: ElkPadding, minSpacing: number, rows: Rows): void {
    let xpos = padding.getLeft();
    const boxIter: ListIterator<ElkNode> = new ArrayListIterator(sortedBoxes);
    rows.rowIndices.addLast(sortedBoxes.length);
    const rowIndexIter = rows.rowIndices.listIterator();
    let nextRowIndex = rowIndexIter.next();
    rows.rowHeights.addLast(rows.highestBox);
    const rowHeightIter = rows.rowHeights.listIterator();
    let rowHeight = 0.0;
    while (boxIter.hasNext()) {
      if (boxIter.nextIndex() === nextRowIndex) {
        xpos = padding.getLeft();
        rowHeight = rowHeightIter.next();
        nextRowIndex = rowIndexIter.next();
      }
      const box = boxIter.next();
      const oldHeight = box.getHeight();
      box.setHeight(rowHeight);
      const newHeight = rowHeight;
      if (boxIter.nextIndex() === nextRowIndex) {
        const newWidth = rows.broadestRow - xpos - padding.getRight();
        const oldWidth = box.getWidth();
        box.setWidth(newWidth);
        // Content alignment
        ElkUtil.translate(box, new KVector(newWidth, newHeight), new KVector(oldWidth, oldHeight));
      }
      xpos += box.getWidth() + minSpacing;
    }
  }

  private areaStdDev(boxes: ElkNode[], mean: number): number {
    let variance = 0;
    for (const box of boxes) {
      variance += Math.pow(box.getWidth() * box.getHeight() - mean, 2);
    }
    const stddev = Math.sqrt(variance / (boxes.length - 1));
    return stddev;
  }

  // ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Grouping Modes

  /**
   * Place the boxes of the given sorted list according to their order in the list.
   * Furthermore, adjust the parent size to fit the bounding box.
   *
   * @param parentNode parent node
   * @param objSpacing minimal spacing between elements
   * @param padding spacing to the border
   * @param expandNodes if true, the nodes are expanded to fill their parent
   */
  private placeBoxesGrouping(parentNode: ElkNode, objSpacing: number, padding: ElkPadding, expandNodes: boolean): void {
    // Work on a copy of the minimum size to avoid changing the property's value
    const minSize = new KVector(parentNode.getProperty(BoxLayouterOptions.NODE_SIZE_MINIMUM));
    minSize.x = Math.max(minSize.x - padding.getLeft() - padding.getRight(), 0);
    minSize.y = Math.max(minSize.y - padding.getTop() - padding.getBottom(), 0);

    let aspectRatio: number | null = parentNode.getProperty(BoxLayouterOptions.ASPECT_RATIO);
    if (aspectRatio === null || aspectRatio <= 0) {
      aspectRatio = BoxLayoutProvider.DEF_ASPECT_RATIO;
    }

    // wrap boxes in groups
    const groups: Group[] = [];
    for (const node of parentNode.getChildren()) {
      const g = new Group(node);
      groups.push(g);
    }

    // pack according to the mode (sorting is done within every method)
    const settings: PlacementSettings = {
      spacing: objSpacing,
      minTotalWidth: minSize.x,
      minTotalHeight: minSize.y,
      expandNodes,
      aspectRatio,
    };
    const toBePlaced = this.mergeAndPlace(
      parentNode.getProperty(BoxLayouterOptions.BOX_PACKING_MODE),
      groups,
      settings,
    );

    const finalGroup = new Group(toBePlaced);
    // do final packing of the 'out-most' boxes
    const parentSize = this.placeInnerBoxes(finalGroup, padding, settings);

    // adjust parent size
    ElkUtil.resizeNode(parentNode, parentSize.x, parentSize.y, false, true);
  }

  /** The `switch` over the packing mode in Java's `placeBoxesGrouping`. */
  private mergeAndPlace(mode: PackingMode, groups: Group[], settings: PlacementSettings): Group[] {
    // no border spacing for the grouped nodes!
    switch (mode) {
      case PackingMode.GROUP_INC:
        return this.mergeAndPlaceInc(groups, settings);
      case PackingMode.GROUP_DEC:
        return this.mergeAndPlaceDec(groups, settings);
      default: // GROUP_MIXED
        return this.mergeAndPlaceMixed(groups, settings);
    }
  }

  /** Java `:362-465`, in `BoxLayoutProviderGrouping.ts` (M15). */
  private placeInnerBoxes(group: Group, padding: ElkPadding, settings: PlacementSettings): KVector {
    return placeInnerBoxes(group, padding, settings);
  }

  /** Java `:466-480`, in `BoxLayoutProviderGrouping.ts` (M15). */
  private areaStdDev2(boxes: Group[], mean: number): number {
    return areaStdDev2(boxes, mean);
  }

  /** Java `:481-541`, in `BoxLayoutProviderGrouping.ts` (M15). */
  private mergeAndPlaceDec(groups: Group[], settings: PlacementSettings): Group[] {
    return mergeAndPlaceDec(groups, settings);
  }

  /** Java `:542-610`, in `BoxLayoutProviderGrouping.ts` (M15). */
  private mergeAndPlaceMixed(groups: Group[], settings: PlacementSettings): Group[] {
    return mergeAndPlaceMixed(groups, settings);
  }

  /** Java `:611-679`, in `BoxLayoutProviderGrouping.ts` (M15). */
  private mergeAndPlaceInc(groups: Group[], settings: PlacementSettings): Group[] {
    return mergeAndPlaceInc(groups, settings);
  }
}
