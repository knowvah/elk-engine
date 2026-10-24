// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { BoxLayouterOptions } from '../options/BoxLayouterOptions.js';
import { BoxLayoutProvider } from './BoxLayoutProvider.js';
import { Group } from './BoxLayoutProviderGroup.js';
import {
  areaStdDev2,
  mergeAndPlaceDec,
  mergeAndPlaceInc,
  mergeAndPlaceMixed,
  placeInnerBoxes,
} from './BoxLayoutProviderGrouping.js';
import type { PlacementSettings } from './BoxLayoutProviderGrouping.js';
import { NullElkProgressMonitor } from './NullElkProgressMonitor.js';
import { PackingMode } from './PackingMode.js';

// Expected values are traced by hand from BoxLayoutProvider.java: `placeInnerBoxes` :362-465, `areaStdDev2` :466-480,
// `mergeAndPlaceDec` :481-541, `mergeAndPlaceMixed` :542-610, `mergeAndPlaceInc` :611-679. Where an expected value
// needs the row width, the derivation is spelled out in the test.
const SETTINGS: PlacementSettings = {
  spacing: 0,
  minTotalWidth: 0,
  minTotalHeight: 0,
  expandNodes: false,
  aspectRatio: 1,
};

function node(width: number, height: number): ElkNode {
  const n = ElkGraphUtil.createNode(null);
  n.setDimensions(width, height);
  return n;
}

function position(n: ElkNode): [number, number] {
  return [n.getX(), n.getY()];
}

function size(g: Group): [number, number] {
  return [g.getWidth(), g.getHeight()];
}

/** Boxes A 100x100, B 50x50, C 50x50, D 20x20 (areas 10000, 2500, 2500, 400) as children of a box-layout parent. */
function fourBoxes(mode: PackingMode): { root: ElkNode; a: ElkNode; b: ElkNode; c: ElkNode; d: ElkNode } {
  const root = ElkGraphUtil.createNode(null);
  root.setProperty(BoxLayouterOptions.BOX_PACKING_MODE, mode);
  root.setProperty(BoxLayouterOptions.SPACING_NODE_NODE, 0);
  root.setProperty(BoxLayouterOptions.PADDING, new ElkPadding(0));
  root.setProperty(BoxLayouterOptions.ASPECT_RATIO, 1);
  const [a, b, c, d] = [100, 50, 50, 20].map((w) => {
    const child = ElkGraphUtil.createNode(root);
    child.setDimensions(w, w);
    return child;
  }) as [ElkNode, ElkNode, ElkNode, ElkNode];
  return { root, a, b, c, d };
}

function run(root: ElkNode): void {
  new BoxLayoutProvider().layout(root, new NullElkProgressMonitor());
}

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('areaStdDev2 (:466-480)', () => {
  it('is the sample standard deviation of the group areas around the mean', () => {
    // areas 600 and 200, mean 400: variance (200^2 + 200^2) / (2 - 1) = 80000
    const boxes = [new Group(node(30, 20)), new Group(node(20, 10))];
    expect(areaStdDev2(boxes, 400)).toBe(Math.sqrt(80000));
  });

  it('is NaN for a single group (0 / 0, :478)', () => {
    expect(areaStdDev2([new Group(node(30, 20))], 600)).toBeNaN();
  });
});

describe('placeInnerBoxes (:362-465)', () => {
  it('places the boxes into rows of the aspect-ratio width and returns the bounding box', () => {
    // 60x40, 80x50, 150x40: areas 2400/4000/6000, widest 150 > sqrt(17811 * 1) = 133.5: row width 150.
    // A (0,0); B (60,0) ends at 140; C would end at 290 > 150: row 2 at y = 50. Bounding box 150 x 90.
    const nodes = [node(60, 40), node(80, 50), node(150, 40)] as [ElkNode, ElkNode, ElkNode];
    const group = new Group(nodes.map((n) => new Group(n)));
    const result = placeInnerBoxes(group, new ElkPadding(0), SETTINGS);
    expect([result.x, result.y]).toEqual([150, 90]);
    expect(nodes.map(position)).toEqual([
      [0, 0],
      [60, 0],
      [0, 50],
    ]);
    // `bottoms` is only cleared per row when expanding (:422-425), so without it `bottom` holds every box and
    // `right` only the last one (:445-446)
    expect(group.bottom).toEqual(group.groups);
    expect(group.right).toEqual([(group.groups as Group[])[2]]);
  });

  it('applies the padding, the spacing and the minimum size (:419-420, :395-404, :446-452)', () => {
    // one 10x10 box, padding 1/2/3/4 (top/right/bottom/left): the box sits at (4, 1)
    // broadest row 4 + 10 + 2 = 16 -> max(16, minWidth 30); height 1 + 10 + 3 = 14 -> 25 (minHeight)
    const only = node(10, 10);
    const group = new Group([new Group(only)]);
    const result = placeInnerBoxes(group, new ElkPadding(1, 2, 3, 4), {
      ...SETTINGS,
      minTotalWidth: 30,
      minTotalHeight: 25,
    });
    expect(position(only)).toEqual([4, 1]);
    expect([result.x, result.y]).toEqual([30, 25]);
  });

  it('expands the rows to the row height and the last box of a row to the bounding width (:459-489)', () => {
    // as the first test, with the child of B at (5, 5): row heights [50, 40]; A grows to height 50;
    // B is last in row 1: width 150 - 60 = 90 and its content moves by (90 - 80) / 2 = 5; C: width stays 150
    const [a, b, c] = [node(60, 40), node(80, 50), node(150, 40)] as [ElkNode, ElkNode, ElkNode];
    const content = ElkGraphUtil.createNode(b);
    content.setLocation(5, 5);
    const group = new Group([a, b, c].map((n) => new Group(n)));
    const result = placeInnerBoxes(group, new ElkPadding(0), { ...SETTINGS, expandNodes: true });
    expect([result.x, result.y]).toEqual([150, 90]);
    expect([a, b, c].map((n) => [n.getX(), n.getY(), n.getWidth(), n.getHeight()])).toEqual([
      [0, 0, 60, 50],
      [60, 0, 90, 50],
      [0, 50, 150, 40],
    ]);
    expect(position(content)).toEqual([10, 5]);
    expect(group.right).toHaveLength(2);
  });

  it('throws for a group without boxes, as `bottoms.get(-1)` does in Java (:432)', () => {
    expect(() => placeInnerBoxes(new Group([]), new ElkPadding(0), SETTINGS)).toThrow(IndexOutOfBoundsException);
  });
});

describe('mergeAndPlaceDec (:481-541)', () => {
  it('merges the small boxes behind a large one once half of its area is collected', () => {
    // sorted A (10000), B, C (2500, stable), D (400). B: 5000 < 2500 no -> collected 2500; C: 5000, not > 5000;
    // D: 5400 > 5000 -> group [B, C, D] with the aspect ratio of A (1).
    // Inner rows: areas 5400, mean 1800, sd sqrt(2940000 / 2) = 1212.4, row width sqrt(9037.3) = 95.07:
    // B (0,0); C would end at 100 > 95.07: row 2 at y = 50; D (50, 50). Size 70 x 100.
    const [a, b, c, d] = [node(100, 100), node(50, 50), node(50, 50), node(20, 20)] as [
      ElkNode,
      ElkNode,
      ElkNode,
      ElkNode,
    ];
    const groups = [a, b, c, d].map((n) => new Group(n));
    const placed = mergeAndPlaceDec(groups, SETTINGS);
    expect(placed).toHaveLength(2);
    expect((placed[0] as Group).node).toBe(a);
    expect(size(placed[1] as Group)).toEqual([70, 100]);
    expect([b, c, d].map(position)).toEqual([
      [0, 0],
      [0, 50],
      [50, 50],
    ]);
  });

  it('keeps a lone small box ungrouped (maybeGroup holds only one) and a larger-than-half box on its own', () => {
    // A 100x100 (10000), B 80x80 (6400 > 5000: becomes the box to beat), C 10x10 (100 <= 3200: collected alone)
    const groups = [node(100, 100), node(80, 80), node(10, 10)].map((n) => new Group(n));
    const placed = mergeAndPlaceDec(groups, SETTINGS);
    expect(placed.map((g) => g.node !== null)).toEqual([true, true, true]);
    expect(placed.map(size)).toEqual([
      [100, 100],
      [80, 80],
      [10, 10],
    ]);
  });

  it('sorts the passed list in decreasing area in place (:489)', () => {
    const groups = [node(10, 10), node(40, 40), node(30, 30)].map((n) => new Group(n));
    mergeAndPlaceDec(groups, SETTINGS);
    expect(groups.map(size)).toEqual([
      [40, 40],
      [30, 30],
      [10, 10],
    ]);
  });

  it('lays the final result out into a parent through the provider (:305-351)', () => {
    // Final group [A, inner(70 x 100)]: areas 10000 / 7000, sd 2121.3, row width sqrt(21242.6) = 145.75:
    // the inner group (ends at 170) goes to row 2 at y = 100. Parent 100 x 200.
    const { root, a, b, c, d } = fourBoxes(PackingMode.GROUP_DEC);
    run(root);
    expect([a, b, c, d].map(position)).toEqual([
      [0, 0],
      [0, 100],
      [0, 150],
      [50, 150],
    ]);
    expect([root.getWidth(), root.getHeight()]).toEqual([100, 200]);
  });
});

describe('mergeAndPlaceMixed (:542-610)', () => {
  it('combines the cumulated small boxes below half of a large one and starts over', () => {
    // The queue yields D (400), B (2500), then C: C / 2 = 1250 > cum[0] = 400 and anIndex ends at 1 -> group [D, B]
    // (aspect 1): areas 400 / 2500, row width sqrt(5870) = 76.6: D (0,0), B (20,0); size 70 x 50.
    // Restart: C, then that group (3500); A / 2 = 5000 > 2500 -> group [C, group] (row width 86.1): C (0,0), the
    // first group wraps to y = 50; size 70 x 100. Result [group, A]. The B/C area tie is broken as the Java
    // PriorityQueue does: B is polled before C.
    const [a, b, c, d] = [node(100, 100), node(50, 50), node(50, 50), node(20, 20)] as [
      ElkNode,
      ElkNode,
      ElkNode,
      ElkNode,
    ];
    const placed = mergeAndPlaceMixed(
      [a, b, c, d].map((n) => new Group(n)),
      SETTINGS,
    );
    expect(placed).toHaveLength(2);
    expect(size(placed[0] as Group)).toEqual([70, 100]);
    expect((placed[1] as Group).node).toBe(a);
    expect([b, c, d].map(position)).toEqual([
      [20, 50],
      [0, 0],
      [0, 50],
    ]);
  });

  it('lays the final result out into a parent through the provider (:305-351)', () => {
    // Final group [group(70 x 100), A]: row width sqrt(21242.6) = 145.75; A (ends at 170) goes to y = 100.
    const { root, a, b, c, d } = fourBoxes(PackingMode.GROUP_MIXED);
    run(root);
    expect([a, b, c, d].map(position)).toEqual([
      [0, 100],
      [20, 50],
      [0, 0],
      [0, 50],
    ]);
    expect([root.getWidth(), root.getHeight()]).toEqual([100, 200]);
  });

  it('places nothing for no groups and keeps single boxes ungrouped (:549-609)', () => {
    expect(mergeAndPlaceMixed([], SETTINGS)).toEqual([]);
    // two boxes never reach `index > 1` before the queue is empty
    const two = [node(10, 10), node(20, 20)].map((n) => new Group(n));
    expect(mergeAndPlaceMixed(two, SETTINGS).map(size)).toEqual([
      [10, 10],
      [20, 20],
    ]);
  });
});

describe('mergeAndPlaceInc (:611-679)', () => {
  it('merges the smaller boxes once the next box exceeds twice their common area', () => {
    // sorted D (400), B, C (2500), A (10000). D: set [D], common 400. B: 2500 > 800 -> merged [D] (aspect 1;
    // a single group has NaN row width and never wraps), set [merged, B], common 400 + 2500. C: 2500 > 5800 no;
    // A: 10000 > 10800 no -> [merged(20 x 20), B, C, A].
    const [a, b, c, d] = [node(100, 100), node(50, 50), node(50, 50), node(20, 20)] as [
      ElkNode,
      ElkNode,
      ElkNode,
      ElkNode,
    ];
    const placed = mergeAndPlaceInc(
      [a, b, c, d].map((n) => new Group(n)),
      SETTINGS,
    );
    expect(placed.map(size)).toEqual([
      [20, 20],
      [50, 50],
      [50, 50],
      [100, 100],
    ]);
    expect((placed[1] as Group).node).toBe(b);
    expect((placed[2] as Group).node).toBe(c);
    expect(position(d)).toEqual([0, 0]);
  });

  it('lays the final result out into a parent through the provider (:305-351)', () => {
    // Final areas 400/2500/2500/10000: sd 4217.8, row width sqrt(32271) = 179.6: the first three share row 1
    // (0, 20, 70); A (ends at 220) goes to y = 50. Parent 120 x 150.
    const { root, a, b, c, d } = fourBoxes(PackingMode.GROUP_INC);
    run(root);
    expect([a, b, c, d].map(position)).toEqual([
      [0, 50],
      [20, 0],
      [70, 0],
      [0, 0],
    ]);
    expect([root.getWidth(), root.getHeight()]).toEqual([120, 150]);
  });

  it('sorts the passed list in increasing area in place (:619)', () => {
    const groups = [node(40, 40), node(10, 10), node(30, 30)].map((n) => new Group(n));
    mergeAndPlaceInc(groups, SETTINGS);
    expect(groups.map(size)).toEqual([
      [10, 10],
      [30, 30],
      [40, 40],
    ]);
  });

  it('keeps boxes whose areas stay within twice the common area in one list (:630-635, :655-659)', () => {
    const groups = [node(10, 10), node(12, 12), node(14, 14)].map((n) => new Group(n));
    expect(mergeAndPlaceInc(groups, SETTINGS)).toHaveLength(3);
  });
});
