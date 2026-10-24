// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { KVector } from '../math/KVector.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { BoxLayouterOptions } from '../options/BoxLayouterOptions.js';
import { ContentAlignment } from '../options/ContentAlignment.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { BoxLayoutProvider } from './BoxLayoutProvider.js';
import { NullElkProgressMonitor } from './NullElkProgressMonitor.js';
import { PackingMode } from './PackingMode.js';

// Expected values are traced by hand from BoxLayoutProvider.java (line numbers in the comments): `layout` :73-92,
// the simple mode `placeBoxes` :99-120, `sort` :128-164, the list `placeBoxes` :181-281, `areaStdDev` :283-290 and
// `placeBoxesGrouping` :305-351. Box sizes are chosen so that every row width and area is exact.
const ONE_ROW = 100; // an aspect ratio wide enough for every box to fit in the first row
const NO_PADDING = new ElkPadding(0);

class RecordingMonitor extends NullElkProgressMonitor {
  readonly events: string[] = [];

  override begin(name: string, totalWork: number): boolean {
    this.events.push(`begin ${name} ${totalWork}`);
    return super.begin(name, totalWork);
  }

  override done(): void {
    this.events.push('done');
  }
}

interface Settings {
  spacing?: number;
  padding?: ElkPadding;
  aspectRatio?: number;
  expandNodes?: boolean;
  interactive?: boolean;
}

const DEFAULT_SETTINGS = {
  spacing: 0,
  padding: NO_PADDING,
  aspectRatio: 1,
  expandNodes: false,
  interactive: false,
};

function parent(settings: Settings = {}): ElkNode {
  const { spacing, padding, aspectRatio, expandNodes, interactive } = { ...DEFAULT_SETTINGS, ...settings };
  const root = ElkGraphUtil.createNode(null);
  root.setProperty(BoxLayouterOptions.SPACING_NODE_NODE, spacing);
  root.setProperty(BoxLayouterOptions.PADDING, new ElkPadding(padding));
  root.setProperty(BoxLayouterOptions.ASPECT_RATIO, aspectRatio);
  root.setProperty(BoxLayouterOptions.EXPAND_NODES, expandNodes);
  root.setProperty(BoxLayouterOptions.INTERACTIVE, interactive);
  return root;
}

function box(root: ElkNode, width: number, height: number, x = 0, y = 0): ElkNode {
  const child = ElkGraphUtil.createNode(root);
  child.setDimensions(width, height);
  child.setLocation(x, y);
  return child;
}

function layout(root: ElkNode): RecordingMonitor {
  const monitor = new RecordingMonitor();
  new BoxLayoutProvider().layout(root, monitor);
  return monitor;
}

function geometry(node: ElkNode): [number, number, number, number] {
  return [node.getX(), node.getY(), node.getWidth(), node.getHeight()];
}

beforeAll(() => {
  // Property defaults of mutable types (padding, vectors) need the registered cloners.
  LayoutMetaDataService.getInstance();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BoxLayoutProvider: surface', () => {
  it('exposes the default aspect ratio and the nested PackingMode (:57-58, C3)', () => {
    expect(BoxLayoutProvider.DEF_ASPECT_RATIO).toBe(1.3);
    expect(BoxLayoutProvider.PackingMode).toBe(PackingMode);
  });

  it('reports the task with two units of work (:75, :91)', () => {
    expect(layout(parent()).events).toEqual(['begin Box layout 2', 'done']);
  });
});

describe('BoxLayoutProvider: simple mode packing (:181-281)', () => {
  it('places boxes in rows of the row width sqrt(area * aspectRatio) (:238-256)', () => {
    // 4 boxes 100x100: area 40000, std dev 0, row width max(100, sqrt(40000)) = 200; the third box would end at 300
    const root = parent();
    const boxes = [box(root, 100, 100), box(root, 100, 100), box(root, 100, 100), box(root, 100, 100)];
    layout(root);
    expect(boxes.map(geometry)).toEqual([
      [0, 0, 100, 100],
      [100, 0, 100, 100],
      [0, 100, 100, 100],
      [100, 100, 100, 100],
    ]);
    expect(geometry(root).slice(2)).toEqual([200, 200]);
  });

  it('adds the spacing between boxes and rows, converted from float (:73-75, :244-250)', () => {
    // spacing 10: row width 200 holds one box (110 + 100 > 200): a column at y = 0, 110, 220, 330
    const root = parent({ spacing: 10 });
    const boxes = [box(root, 100, 100), box(root, 100, 100), box(root, 100, 100), box(root, 100, 100)];
    layout(root);
    expect(boxes.map((b) => [b.getX(), b.getY()])).toEqual([
      [0, 0],
      [0, 110],
      [0, 220],
      [0, 330],
    ]);
    expect(geometry(root).slice(2)).toEqual([100, 430]);
  });

  it('narrows the spacing to a float before it is used (:73)', () => {
    // 0.1f = 0.100000001490116119384765625; 100 + 0.1f = 100.10000000149012
    const root = parent({ spacing: 0.1, aspectRatio: ONE_ROW });
    const first = box(root, 100, 100);
    const second = box(root, 100, 100);
    layout(root);
    expect(first.getX()).toBe(0);
    expect(second.getX()).toBe(100.10000000149012);
  });

  it('adds the padding to the row width, the origin and the parent size (:224-232, :238-239, :264)', () => {
    // padding top 10.5, right 0, bottom 10, left 6: area 40000 + sqrt(40000) * 20.5 = 44100, sqrt = 210, row width 216
    const root = parent({ padding: new ElkPadding(10.5, 0, 10, 6) });
    const boxes = [box(root, 100, 100), box(root, 100, 100), box(root, 100, 100), box(root, 100, 100)];
    layout(root);
    expect(boxes.map((b) => [b.getX(), b.getY()])).toEqual([
      [6, 10.5],
      [106, 10.5],
      [6, 110.5],
      [106, 110.5],
    ]);
    expect(geometry(root).slice(2)).toEqual([206, 220.5]);
  });

  it('lets a single box (area std dev 0 / 0 = NaN) never wrap and adds the right and bottom padding (:283-290)', () => {
    const root = parent({ padding: new ElkPadding(1, 2, 3, 4) });
    const only = box(root, 50, 30);
    layout(root);
    expect(geometry(only)).toEqual([4, 1, 50, 30]);
    expect(geometry(root).slice(2)).toEqual([4 + 50 + 2, 1 + 30 + 3]);
  });

  it('sizes an empty parent to the padding alone (:276-279)', () => {
    const root = parent({ padding: new ElkPadding(1, 2, 3, 4) });
    layout(root);
    expect(geometry(root).slice(2)).toEqual([6, 4]);
  });

  it('uses the aspect ratio of the parent (:105-108)', () => {
    // 4 boxes 100x90: area 36000; aspect 1 -> row width 189.7: one box per row; aspect 4 -> 379.5: three per row
    const narrow = parent({ aspectRatio: 1 });
    const wide = parent({ aspectRatio: 4 });
    for (const root of [narrow, wide]) {
      for (let i = 0; i < 4; i++) box(root, 100, 90);
    }
    layout(narrow);
    layout(wide);
    expect(geometry(narrow).slice(2)).toEqual([100, 360]);
    expect(geometry(wide).slice(2)).toEqual([300, 180]);
  });

  it.each([0, -2])('falls back to 1.3 for the aspect ratio %d (:105-108)', (aspectRatio) => {
    // 4 boxes 100x90: area 36000, sqrt(36000 * 1.3) = 216.3 -> two boxes per row
    const root = parent({ aspectRatio });
    const boxes = [box(root, 100, 90), box(root, 100, 90), box(root, 100, 90), box(root, 100, 90)];
    layout(root);
    expect(boxes.map((b) => [b.getX(), b.getY()])).toEqual([
      [0, 0],
      [100, 0],
      [0, 90],
      [100, 90],
    ]);
    expect(geometry(root).slice(2)).toEqual([200, 180]);
  });

  it('resizes boxes by their own size constraints before measuring (:184-186)', () => {
    const root = parent({ aspectRatio: ONE_ROW });
    const small = box(root, 50, 50);
    small.setProperty(BoxLayouterOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.minimumSize());
    small.setProperty(BoxLayouterOptions.NODE_SIZE_MINIMUM, new KVector(120, 90));
    const other = box(root, 100, 100);
    layout(root);
    // the small box is first (area 5400 against 10000) and now 120x90
    expect(geometry(small)).toEqual([0, 0, 120, 90]);
    expect(geometry(other)).toEqual([120, 0, 100, 100]);
  });

  it('honors the minimum size of the parent (:110-111, :263-270)', () => {
    // natural size 200x200; minimum 300x250 only applies with the MINIMUM_SIZE constraint
    const constrained = parent();
    const free = parent();
    for (const root of [constrained, free]) {
      for (let i = 0; i < 4; i++) box(root, 100, 100);
      root.setProperty(BoxLayouterOptions.NODE_SIZE_MINIMUM, new KVector(300, 250));
    }
    constrained.setProperty(BoxLayouterOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.minimumSize());
    layout(constrained);
    layout(free);
    expect(geometry(constrained).slice(2)).toEqual([300, 250]);
    expect(geometry(free).slice(2)).toEqual([200, 200]);
  });
});

describe('BoxLayoutProvider: sorting (:128-164)', () => {
  it('orders by priority (high first), then by area, and breaks no tie by moving boxes (five boxes)', () => {
    // C prio 5 (30x30), D (20x20), A (50x50), B (100x40) at prio 0, E prio -1 (60x60), spacing 5, aspect 1:
    // areas 900/400/2500/4000/3600, mean 2280, std dev sqrt(2547000) = 1595.9, area 19379.7, row width 139.2
    const root = parent({ spacing: 5 });
    const a = box(root, 50, 50);
    const b = box(root, 100, 40);
    const c = box(root, 30, 30);
    const d = box(root, 20, 20);
    const e = box(root, 60, 60);
    c.setProperty(BoxLayouterOptions.PRIORITY, 5);
    e.setProperty(BoxLayouterOptions.PRIORITY, -1);
    layout(root);
    // order C, D, A, B, E: row 1 C(0), D(35), A(60); B (215 > 139.2) row 2 at y 55; E (165 > 139.2) row 3 at y 100
    expect([c, d, a, b, e].map((n) => [n.getX(), n.getY()])).toEqual([
      [0, 0],
      [35, 0],
      [60, 0],
      [0, 55],
      [0, 100],
    ]);
    expect(geometry(root).slice(2)).toEqual([110, 160]);
  });

  it('keeps the input order of equal boxes (stable sort, :135)', () => {
    const root = parent({ aspectRatio: ONE_ROW });
    const first = box(root, 10, 10);
    const second = box(root, 10, 10);
    const third = box(root, 10, 10);
    layout(root);
    expect([first, second, third].map((n) => n.getX())).toEqual([0, 10, 20]);
  });

  // 3 boxes at the aspect ratio of ONE_ROW: all in one row, so the x coordinates show the order
  function threeBoxes(interactive: boolean): { p1: ElkNode; p2: ElkNode; p3: ElkNode; root: ElkNode } {
    const root = parent({ aspectRatio: ONE_ROW, interactive });
    return {
      root,
      p1: box(root, 40, 40, 10, 20),
      p2: box(root, 20, 20, 5, 20),
      p3: box(root, 100, 100, 0, 0),
    };
  }

  it('orders by area when not interactive (:152-155)', () => {
    const { p1, p2, p3, root } = threeBoxes(false);
    layout(root);
    expect([p2.getX(), p1.getX(), p3.getX()]).toEqual([0, 20, 60]);
    expect(geometry(root).slice(2)).toEqual([160, 100]);
  });

  it('orders by y, then x when interactive, ignoring the area (:145-151)', () => {
    const { p1, p2, p3, root } = threeBoxes(true);
    layout(root);
    // P3 (y 0) first; P2 and P1 share y 20, P2 has the smaller x
    expect([p3.getX(), p2.getX(), p1.getX()]).toEqual([0, 100, 120]);
    expect(geometry(root).slice(2)).toEqual([160, 100]);
  });

  it('falls back to the area when interactive boxes share their position (:152-155)', () => {
    const root = parent({ aspectRatio: ONE_ROW, interactive: true });
    const large = box(root, 100, 100);
    const small = box(root, 20, 20);
    layout(root);
    expect([small.getX(), large.getX()]).toEqual([0, 20]);
  });
});

describe('BoxLayoutProvider: expanding nodes (:236-261, :283-290)', () => {
  it('stretches each row to its height and the last box of a row to the parent width', () => {
    // A 60x40, B 80x50, C 150x40: row width 150: A(0), B(60); C (290 > 150) starts row 2 at y 50.
    // Row heights [50, 40]; B is last of row 1: new width 150 - 60 = 90; C: 150.
    const root = parent({ expandNodes: true });
    const a = box(root, 60, 40);
    const b = box(root, 80, 50);
    const c = box(root, 150, 40);
    const child = ElkGraphUtil.createNode(b);
    child.setLocation(5, 5);
    b.setProperty(BoxLayouterOptions.CONTENT_ALIGNMENT, EnumSet.of(ContentAlignment.H_RIGHT, ContentAlignment.V_TOP));
    layout(root);
    expect(geometry(a)).toEqual([0, 0, 60, 50]);
    expect(geometry(b)).toEqual([60, 0, 90, 50]);
    expect(geometry(c)).toEqual([0, 50, 150, 40]);
    expect(geometry(root).slice(2)).toEqual([150, 90]);
    // the 10 units of new width move the content of B to the right (content alignment H_RIGHT)
    expect([child.getX(), child.getY()]).toEqual([15, 5]);
  });

  it('gives the last row the height added by the parent minimum size (:268-271, :273)', () => {
    // 4 boxes 100x100, minimum 300x250: broadest row 300, last row height 100 + 50
    const root = parent({ expandNodes: true });
    const boxes = [box(root, 100, 100), box(root, 100, 100), box(root, 100, 100), box(root, 100, 100)];
    root.setProperty(BoxLayouterOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.minimumSize());
    root.setProperty(BoxLayouterOptions.NODE_SIZE_MINIMUM, new KVector(300, 250));
    layout(root);
    expect(boxes.map(geometry)).toEqual([
      [0, 0, 100, 100],
      [100, 0, 200, 100],
      [0, 100, 100, 150],
      [100, 100, 200, 150],
    ]);
    expect(geometry(root).slice(2)).toEqual([300, 250]);
  });

  it('expands nothing for an empty parent (:236-261)', () => {
    const root = parent({ expandNodes: true });
    layout(root);
    expect(geometry(root).slice(2)).toEqual([0, 0]);
  });
});

// The group helpers are filled in later; the entry `placeBoxesGrouping` (:305-351) is checked with them replaced.
interface GroupingInternals {
  mergeAndPlaceInc(groups: unknown[], settings: unknown): unknown[];
  mergeAndPlaceDec(groups: unknown[], settings: unknown): unknown[];
  mergeAndPlaceMixed(groups: unknown[], settings: unknown): unknown[];
  placeInnerBoxes(group: unknown, padding: ElkPadding, settings: unknown): KVector;
}

describe('BoxLayoutProvider: grouping modes entry (:305-351)', () => {
  const FINAL_SIZE = new KVector(50, 60);
  const MERGES = ['mergeAndPlaceInc', 'mergeAndPlaceDec', 'mergeAndPlaceMixed'] as const;

  function groupingRun(mode: PackingMode): {
    spies: Record<(typeof MERGES)[number] | 'placeInnerBoxes', ReturnType<typeof vi.spyOn>>;
    root: ElkNode;
    children: ElkNode[];
  } {
    const root = parent({
      spacing: 10,
      padding: new ElkPadding(1, 2, 3, 4),
      aspectRatio: -1,
      expandNodes: true,
    });
    root.setProperty(BoxLayouterOptions.BOX_PACKING_MODE, mode);
    root.setProperty(BoxLayouterOptions.NODE_SIZE_MINIMUM, new KVector(100, 80));
    const children = [box(root, 30, 20, 7, 8), box(root, 40, 10, 9, 9)];
    const provider = new BoxLayoutProvider() as unknown as GroupingInternals;
    const spies = {
      mergeAndPlaceInc: vi.spyOn(provider, 'mergeAndPlaceInc').mockImplementation((groups) => groups),
      mergeAndPlaceDec: vi.spyOn(provider, 'mergeAndPlaceDec').mockImplementation((groups) => groups),
      mergeAndPlaceMixed: vi.spyOn(provider, 'mergeAndPlaceMixed').mockImplementation((groups) => groups),
      placeInnerBoxes: vi.spyOn(provider, 'placeInnerBoxes').mockReturnValue(FINAL_SIZE),
    };
    (provider as unknown as BoxLayoutProvider).layout(root, new NullElkProgressMonitor());
    return { spies, root, children };
  }

  it.each([
    [PackingMode.GROUP_INC, 'mergeAndPlaceInc'],
    [PackingMode.GROUP_DEC, 'mergeAndPlaceDec'],
    [PackingMode.GROUP_MIXED, 'mergeAndPlaceMixed'],
  ] as const)('dispatches %s to %s and passes the reduced minimum size (:313-345)', (mode, method) => {
    const { spies } = groupingRun(mode);
    for (const merge of MERGES) {
      expect(spies[merge]).toHaveBeenCalledTimes(merge === method ? 1 : 0);
    }
    // minimum size 100x80 less the padding (left 4 + right 2, top 1 + bottom 3); aspect ratio -1 -> 1.3
    const settings = { spacing: 10, minTotalWidth: 94, minTotalHeight: 76, expandNodes: true, aspectRatio: 1.3 };
    const [groups, mergeSettings] = spies[method].mock.calls[0] as [unknown[], unknown];
    expect(groups).toHaveLength(2);
    expect(mergeSettings).toEqual(settings);
    const [finalGroup, padding, innerSettings] = spies.placeInnerBoxes.mock.calls[0] as [
      { groups: unknown[] },
      ElkPadding,
      unknown,
    ];
    expect(finalGroup.groups).toHaveLength(2);
    expect([padding.getTop(), padding.getRight(), padding.getBottom(), padding.getLeft()]).toEqual([1, 2, 3, 4]);
    expect(innerSettings).toEqual(settings);
  });

  it('moves every wrapped node to the origin and resizes the parent to the final group size (:331-336, :349)', () => {
    const { root, children } = groupingRun(PackingMode.GROUP_INC);
    expect(children.map((c) => [c.getX(), c.getY()])).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(geometry(root).slice(2)).toEqual([50, 60]);
  });
});
