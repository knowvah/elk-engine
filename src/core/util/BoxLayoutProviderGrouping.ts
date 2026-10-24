// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { ArrayListIterator } from '../../java/util/ListIterator.js';
import type { ListIterator } from '../../java/util/ListIterator.js';
import { PriorityQueue } from '../../java/util/PriorityQueue.js';
import { KVector } from '../math/KVector.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { Group } from './BoxLayoutProviderGroup.js';
import { ElkUtil } from './ElkUtil.js';

/**
 * The parameters Java passes to the packing methods besides the boxes and the padding (the Java methods take them as
 * separate parameters; bundled here because of the five-parameter limit). Shared with `BoxLayoutProvider.ts`.
 */
export interface PlacementSettings {
  /** minimal spacing between elements */
  spacing: number;
  /** minimal width of the parent node */
  minTotalWidth: number;
  /** minimal height of the parent node */
  minTotalHeight: number;
  /** if true, the nodes are expanded to fill their parent */
  expandNodes: boolean;
  /** the desired aspect ratio */
  aspectRatio: number;
}

/** The state shared by the row placement of Java's `placeInnerBoxes` and its expansion step. */
interface InnerRows {
  /** the group whose boxes are placed */
  group: Group;
  /** Java's local `last`: the box placed last */
  last: Group | null;
  /** Java's local `bottoms`: the boxes of the current row, cleared per row when expanding */
  bottoms: Group[];
  xpos: number;
  ypos: number;
  highestBox: number;
  broadestRow: number;
  rowIndices: LinkedList<number>;
  rowHeights: LinkedList<number>;
}

/** Java's `new ElkPadding()` argument of the inner `placeInnerBoxes` calls: no border spacing for grouped nodes. */
function noPadding(): ElkPadding {
  return new ElkPadding();
}

/**
 * Place the boxes of the given group according to their order in the list. Furthermore, adjust the
 * parent size to fit the bounding box.
 *
 * @param group the group whose inner boxes are placed
 * @param padding spacing to the border
 * @param settings spacing, minimal parent size, expansion and aspect ratio (Java passes them as five parameters)
 * @returns the bounding box of the resulting layout
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/BoxLayoutProvider.java
 */
export function placeInnerBoxes(group: Group, padding: ElkPadding, settings: PlacementSettings): KVector {
  const maxRowWidth = computeInnerRowWidth(group, padding, settings.aspectRatio);

  // place nodes iteratively into rows
  const rows = placeInnerRows(group, padding, settings, maxRowWidth);
  rows.broadestRow = Math.max(rows.broadestRow, settings.minTotalWidth);
  let totalHeight = rows.ypos + rows.highestBox + padding.getBottom();
  if (totalHeight < settings.minTotalHeight) {
    rows.highestBox += settings.minTotalHeight - totalHeight;
    totalHeight = settings.minTotalHeight;
  }

  // expand nodes if required
  if (settings.expandNodes) {
    expandInnerBoxes(group, padding, settings.spacing, rows);
  }

  // return parent size
  return new KVector(rows.broadestRow, totalHeight);
}

/** The first section of Java's `placeInnerBoxes`: the row width that achieves the desired aspect ratio. */
function computeInnerRowWidth(group: Group, padding: ElkPadding, aspectRatio: number): number {
  const groups = group.groups as Group[];
  // determine the maximal row width by the maximal box width and the total area
  let maxRowWidth = 0.0;
  let totalArea = 0.0;
  for (const box of groups) {
    if (box.node !== null) {
      ElkUtil.resizeNode(box.node);
    }
    maxRowWidth = Math.max(maxRowWidth, box.getWidth());
    totalArea += box.getWidth() * box.getHeight();
  }

  // calculate std deviation
  //  rationale: the greater the diversity of box sizes, the more space will be 'wasted',
  //  contributing to the total area. We address this by adding x*n*stddev to the area.
  //  TODO x should be assessed empirically, for the moment set it to 1 (GROUP_DEC worked better with 2 though)
  const mean = totalArea / groups.length;
  const stddev = areaStdDev2(groups, mean);

  const sdInfluence = 1;
  totalArea += groups.length * sdInfluence * stddev;

  // calculate the required row width w to achieve the desired aspect ratio,
  //  i.e.:  w*h=area s.t. w/h=dar  ->  w=sqrt(area * dar)
  maxRowWidth = Math.max(maxRowWidth, Math.sqrt(totalArea * aspectRatio)) + padding.getLeft();
  return maxRowWidth;
}

/** The "place nodes iteratively into rows" section of Java's `placeInnerBoxes`, incl. the group's `bottom`/`right`. */
function placeInnerRows(
  group: Group,
  padding: ElkPadding,
  settings: PlacementSettings,
  maxRowWidth: number,
): InnerRows {
  const rows = newInnerRows(group, padding);
  rows.rowIndices.add(0);
  const boxIter: ListIterator<Group> = new ArrayListIterator(group.groups as Group[]);
  while (boxIter.hasNext()) {
    const box = boxIter.next();
    const width = box.getWidth();
    const height = box.getHeight();
    if (rows.xpos + width > maxRowWidth) {
      startNextInnerRow(rows, padding, settings, width, boxIter.previousIndex());
    }
    rows.bottoms.push(box);
    box.translate(rows.xpos, rows.ypos);
    rows.broadestRow = Math.max(rows.broadestRow, rows.xpos + width + padding.getRight());
    rows.highestBox = Math.max(rows.highestBox, height);
    rows.xpos += width + settings.spacing;
    rows.last = box;
  }
  collectInnerEdges(rows);
  return rows;
}

/** The local variable declarations of Java's `placeInnerBoxes` row placement. */
function newInnerRows(group: Group, padding: ElkPadding): InnerRows {
  return {
    group,
    last: null,
    bottoms: [],
    xpos: padding.getLeft(),
    ypos: padding.getTop(),
    highestBox: 0.0,
    broadestRow: padding.getHorizontal(),
    rowIndices: new LinkedList<number>(),
    rowHeights: new LinkedList<number>(),
  };
}

/** The statements after the row loop of Java's `placeInnerBoxes`: the group's `bottom` and `right` boxes. */
function collectInnerEdges(rows: InnerRows): void {
  const group = rows.group;
  (group.bottom as Group[]).push(...rows.bottoms);
  if (rows.bottoms.length === 0) {
    // Java's `bottoms.get(bottoms.size() - 1)`
    throw new IndexOutOfBoundsException('Index -1 out of bounds for length 0');
  }
  (group.right as Group[]).push(rows.bottoms[rows.bottoms.length - 1] as Group);
}

/** The "place box into the next row" branch of the loop in `placeInnerRows`; `previousIndex` is the box's index. */
function startNextInnerRow(
  rows: InnerRows,
  padding: ElkPadding,
  settings: PlacementSettings,
  width: number,
  previousIndex: number,
): void {
  // place box into the next row
  if (settings.expandNodes) {
    rows.rowHeights.addLast(rows.highestBox);
    rows.rowIndices.addLast(previousIndex);
    // Java adds `last` even when it is still `null`; the first box always fits (maxRowWidth >= width + left)
    (rows.group.right as Group[]).push(rows.last as Group);
    rows.bottoms = [];
  }
  rows.xpos = padding.getLeft();
  rows.ypos += rows.highestBox + settings.spacing;
  rows.highestBox = 0.0;
  rows.broadestRow = Math.max(rows.broadestRow, padding.getHorizontal() + width);
}

/** The "expand nodes if required" section of Java's `placeInnerBoxes`. */
function expandInnerBoxes(group: Group, padding: ElkPadding, minSpacing: number, rows: InnerRows): void {
  const groups = group.groups as Group[];
  let xpos = padding.getLeft();
  const boxIter: ListIterator<Group> = new ArrayListIterator(groups);
  rows.rowIndices.addLast(groups.length);
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
    box.setHeight(rowHeight);
    if (boxIter.nextIndex() === nextRowIndex) {
      const newWidth = rows.broadestRow - xpos - padding.getRight();
      const oldWidth = box.getWidth();
      box.setWidth(newWidth);
      box.translateInnerNodes((newWidth - oldWidth) / 2, 0.0);
    }
    xpos += box.getWidth() + minSpacing;
  }
}

export function areaStdDev2(boxes: Group[], mean: number): number {
  let variance = 0;
  for (const box of boxes) {
    variance += Math.pow(box.area() - mean, 2);
  }
  const stddev = Math.sqrt(variance / (boxes.length - 1));
  return stddev;
}

// Now the packing modes ///////////////////////////////////////////////////////////////////////////

/**
 * The "combine" blocks shared by the three merge methods: wrap `members` into a group, place its inner boxes with no
 * border spacing and store the resulting bounding box as the group's size.
 */
function placeAsGroup(members: Group[], innerAspectRatio: number, settings: PlacementSettings): Group {
  const innerGroup = new Group(members);
  const groupSize = placeInnerBoxes(innerGroup, noPadding(), { ...settings, aspectRatio: innerAspectRatio });
  (innerGroup.size as KVector).reset().add(groupSize);
  return innerGroup;
}

/** The condition guarding the "combine" block of `mergeAndPlaceDec`. */
function readyToCombine(
  maybeGroup: Group[],
  collectedArea: number,
  boxToBeat: Group,
  boxQueue: LinkedList<Group>,
): boolean {
  return (
    maybeGroup.length > 1 &&
    (collectedArea > boxToBeat.area() / 2 ||
      // make sure the remaining nodes in the queue get grouped
      boxQueue.isEmpty())
  );
}

/**
 * Start with large nodes and collect smaller nodes afterwards until the large node's
 * half size is reached, then groups the small nodes.
 */
export function mergeAndPlaceDec(groups: Group[], settings: PlacementSettings): Group[] {
  // sort in decreasing area
  // the code below makes relies on this (`Collections.sort` is stable, as is `Array.prototype.sort`)
  groups.sort((g1, g2) => -doubleCompare(g1.area(), g2.area()));

  const boxQueue = new LinkedList<Group>(groups);
  const toBePlaced: Group[] = [];
  let maybeGroup: Group[] = [];

  // current 'large' node and the combined area of 'smaller' nodes
  let boxToBeat: Group | null = null;
  let collectedArea = 0;

  while (!boxQueue.isEmpty()) {
    const box = boxQueue.removeFirst();
    if (
      boxToBeat === null ||
      // prevent 'box' from getting its own 'innerGroup'
      boxToBeat.area() / 2 < box.area()
    ) {
      boxToBeat = box;
      toBePlaced.push(box);
    } else {
      collectedArea += box.area();
      maybeGroup.push(box);

      if (readyToCombine(maybeGroup, collectedArea, boxToBeat, boxQueue)) {
        // combine
        // TODO there may be a better choice for the inner aspect ratio
        const innerGroup = placeAsGroup(maybeGroup, boxToBeat.getWidth() / boxToBeat.getHeight(), settings);

        boxToBeat = innerGroup;
        toBePlaced.push(innerGroup);

        collectedArea = 0;
        maybeGroup = [];
      }
    }
  }

  // add remaining boxes
  toBePlaced.push(...maybeGroup);
  return toBePlaced;
}

/** The index search of `mergeAndPlaceMixed`: the largest index whose cumulated area stays below half of `box`. */
function findMixedSplitIndex(box: Group, toBePlaced: Group[], cumAreaArray: number[]): number {
  // TODO this should be a binary search
  let anIndex = 0;
  // find the largest index
  // we can use at most 'toBePlaced.size()' groups
  while (anIndex < toBePlaced.length - 1 && box.area() / 2 > (cumAreaArray[anIndex] as number)) {
    anIndex++;
  }
  return anIndex;
}

/** The cumulated-area bookkeeping of `mergeAndPlaceMixed` for the box at `index`. */
function accumulateArea(cumAreaArray: number[], index: number, box: Group): void {
  if (index > 0) {
    cumAreaArray[index] = cumAreaArray[index - 1] as number;
  }
  cumAreaArray[index] = (cumAreaArray[index] as number) + box.area();
}

/**
 * Use a priority queue, once a large node is encountered,
 * check if there's an (arbitrary) number of small nodes
 * that can be combined to come close to the larger node's size.
 */
export function mergeAndPlaceMixed(groups: Group[], settings: PlacementSettings): Group[] {
  const cumAreaArray: number[] = new Array<number>(groups.length).fill(0);

  const pq = new PriorityQueue<Group>((g1, g2) => doubleCompare(g1.area(), g2.area()));
  pq.addAll(groups);

  let index = 0;
  let toBePlaced: Group[] = [];

  while (!pq.isEmpty()) {
    // only take a look, we might not want to remove it
    const box = pq.peek() as Group;

    // we need at least two boxes in the 'toBePlaced' list that can be merged
    // thus 'index > 1'
    if (index > 1 && box.area() / 2 > (cumAreaArray[0] as number)) {
      const anIndex = findMixedSplitIndex(box, toBePlaced, cumAreaArray);

      // place the selected groups
      const select = toBePlaced.slice(0, anIndex + 1);
      // TODO there's probably a better strategy to select this aspect ratio
      const innerAspectRatio = box.getWidth() / box.getHeight();
      const innerGroup = placeAsGroup(select, innerAspectRatio, settings);

      // now start over
      pq.add(innerGroup);
      const remain = toBePlaced.slice(anIndex + 1);
      pq.addAll(remain);
      toBePlaced = [];
      index = 0;
      cumAreaArray.fill(0);
    } else {
      // ok, now remove the group from the queue
      pq.poll();
      accumulateArea(cumAreaArray, index, box);
      index++;
      toBePlaced.push(box);
    }
  }

  return toBePlaced;
}

/**
 * In increasing node area order: pick nodes until the next node's half size is larger than
 * the current cumulated area. Problematic for certain graphs, where
 * the cumulation becomes quite large early.
 */
export function mergeAndPlaceInc(groups: Group[], settings: PlacementSettings): Group[] {
  // sort increasingly
  groups.sort((g1, g2) => doubleCompare(g1.area(), g2.area()));

  const groupIterator: ListIterator<Group> = new ArrayListIterator(groups);
  let toBePlaced: Group[] = [];
  let commonArea = 0;

  while (groupIterator.hasNext()) {
    const g = groupIterator.next();
    if (toBePlaced.length > 0 && g.area() > commonArea * 2) {
      // merge the current set of groups into a common group
      const innerAspectRatio = g.getWidth() / g.getHeight();

      // place the nodes in the group
      const merged = placeAsGroup(toBePlaced, innerAspectRatio, settings);

      // reset
      toBePlaced = [];
      commonArea = 0;

      // add the merged group and the current group to
      // the active list
      toBePlaced.push(merged);
      toBePlaced.push(g);
      commonArea = merged.area() + g.area();
    } else {
      // add the group to the active set
      toBePlaced.push(g);
      commonArea += g.area();
    }
  }

  return toBePlaced;
}
