// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import {
  FakeComponent,
  FakeConnectedComponents,
  FakeExtension,
  FakePlaceholderExtension,
  TEST_SPACING,
} from '../../../../../test/helpers/components-compaction.js';
import { Quadruplet } from '../oned/Quadruplet.js';
import { DEFAULT_SPACING_HANDLER } from '../oned/ISpacingsHandler.js';
import { ComponentsToCGraphTransformer } from './ComponentsToCGraphTransformer.js';
import { CRectNode } from './ComponentsToCGraphTransformerCRectNode.js';
import { getPlaceholder } from './IExternalExtension.js';

/**
 * Structure tests (L4): the behaviour is proven through `ComponentsCompactor` rows. Lock tables are an
 * independent re-reading of ComponentsToCGraphTransformer.java:181-241; the bounding box twins re-state
 * the Java `Math.min`/`Math.max` loops (:255-275).
 */

/** Java literal `1d`, ComponentsToCGraphTransformer.java:164: the placeholder's individual spacing. */
const PLACEHOLDER_SPACING = 1;

function newTransformer(): ComponentsToCGraphTransformer<string, string> {
  return new ComponentsToCGraphTransformer<string, string>(TEST_SPACING);
}

/** Rows of ComponentsToCGraphTransformer.java:188-239, [sides, left, right, up, down]. */
const LOCK_TABLE: ReadonlyArray<[string, PortSide[], boolean[]]> = [
  ['none', [], [true, true, true, true]],
  ['north', [PortSide.NORTH], [true, true, true, false]],
  ['east', [PortSide.EAST], [false, true, true, true]],
  ['south', [PortSide.SOUTH], [true, true, false, true]],
  ['west', [PortSide.WEST], [true, false, true, true]],
  ['north-east', [PortSide.NORTH, PortSide.EAST], [false, true, true, false]],
  ['east-south', [PortSide.EAST, PortSide.SOUTH], [false, true, false, true]],
  ['south-west', [PortSide.SOUTH, PortSide.WEST], [true, false, false, true]],
  ['north-west', [PortSide.NORTH, PortSide.WEST], [true, false, true, false]],
  ['north-south', [PortSide.NORTH, PortSide.SOUTH], [true, true, true, true]],
  ['east-west', [PortSide.EAST, PortSide.WEST], [true, true, true, true]],
  ['east-south-west', [PortSide.EAST, PortSide.SOUTH, PortSide.WEST], [true, true, true, true]],
  ['north-south-west', [PortSide.NORTH, PortSide.SOUTH, PortSide.WEST], [true, true, true, true]],
  ['north-east-west', [PortSide.NORTH, PortSide.EAST, PortSide.WEST], [true, true, true, true]],
  ['all four', [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST], [true, true, true, true]],
];

describe('ComponentsToCGraphTransformer.setLock', () => {
  it.each(LOCK_TABLE)('sets the lock of the %s side set', (_name, sides, expected) => {
    const rect = new ElkRectangle(1, 2, 3, 4);
    const comp = new FakeComponent(
      [rect],
      [],
      sides.length === 0 ? EnumSet.noneOf(PortSide) : EnumSet.of(sides[0], ...sides.slice(1)),
    );
    const cGraph = newTransformer().transform(new FakeConnectedComponents([comp]));
    const lock = cGraph.cNodes[0].lock;
    expect([lock.left, lock.right, lock.up, lock.down]).toEqual(expected);
  });

  it('leaves the default lock for a side set none of the branches names (north-east-south)', () => {
    const comp = new FakeComponent(
      [new ElkRectangle(1, 2, 3, 4)],
      [],
      EnumSet.of(PortSide.NORTH, PortSide.EAST, PortSide.SOUTH),
    );
    const lock = newTransformer().transform(new FakeConnectedComponents([comp])).cNodes[0].lock;
    const unset = new Quadruplet();
    expect([lock.left, lock.right, lock.up, lock.down]).toEqual([unset.left, unset.right, unset.up, unset.down]);
  });
});

describe('ComponentsToCGraphTransformer.transform', () => {
  const hullA = [new ElkRectangle(10, 20, 30, 40), new ElkRectangle(50, 60, 70, 80)];
  const hullB = [new ElkRectangle(100, 110, 120, 130)];

  it('creates one group per component and one hull node per hull rectangle, hitbox a copy of the rectangle', () => {
    const t = newTransformer();
    const cGraph = t.transform(new FakeConnectedComponents([new FakeComponent(hullA), new FakeComponent(hullB)]));
    expect(cGraph.cGroups.length).toBe(2);
    expect(cGraph.cNodes.length).toBe(hullA.length + hullB.length);
    const all = [...hullA, ...hullB];
    cGraph.cNodes.forEach((node, i) => {
      expect(node.hitbox).not.toBe(all[i]);
      expect(node.hitbox.equals(all[i])).toBe(true);
    });
    expect(cGraph.cNodes[0].cGroup).toBe(cGraph.cGroups[0]);
    expect(cGraph.cNodes[1].cGroup).toBe(cGraph.cGroups[0]);
    expect(cGraph.cNodes[2].cGroup).toBe(cGraph.cGroups[1]);
    expect(cGraph.supports(Direction.UP)).toBe(true);
    expect(cGraph.supports(Direction.UNDEFINED)).toBe(true);
  });

  it('applies the transformer spacing to hull nodes', () => {
    const cGraph = newTransformer().transform(new FakeConnectedComponents([new FakeComponent(hullA)]));
    expect(cGraph.cNodes[0].getHorizontalSpacing()).toBe(TEST_SPACING);
    expect(cGraph.cNodes[0].getVerticalSpacing()).toBe(TEST_SPACING);
  });

  it('keeps extension nodes out of the graph, in insertion order, with their group', () => {
    const t = newTransformer();
    const eeRight = new FakeExtension(Direction.RIGHT, new ElkRectangle(1, 1, 1, 1));
    const eeLeft = new FakeExtension(Direction.LEFT, new ElkRectangle(2, 2, 2, 2));
    const cGraph = t.transform(new FakeConnectedComponents([new FakeComponent(hullA, [eeRight, eeLeft])]));
    expect(cGraph.cNodes.length).toBe(hullA.length);
    const entries = [...t.getExternalExtensions().entries()];
    expect(entries.map(([ee]) => ee)).toEqual([eeRight, eeLeft]);
    expect(entries[0][1].getFirst()).toBe(cGraph.cGroups[0]);
    expect(entries[0][1].getSecond()).toBeInstanceOf(CRectNode);
    expect(entries[0][1].getSecond()?.cGroup).toBeNull();
    expect(t.getExternalPlaceholder().size).toBe(0);
  });

  it('registers a placeholder per direction in insertion order, with the individual spacing', () => {
    const t = newTransformer();
    const first = new FakePlaceholderExtension(
      Direction.LEFT,
      new ElkRectangle(1, 1, 1, 1),
      new ElkRectangle(3, 3, 3, 3),
    );
    const other = new FakePlaceholderExtension(
      Direction.UP,
      new ElkRectangle(4, 4, 4, 4),
      new ElkRectangle(5, 5, 5, 5),
    );
    const second = new FakePlaceholderExtension(
      Direction.LEFT,
      new ElkRectangle(6, 6, 6, 6),
      new ElkRectangle(7, 7, 7, 7),
    );
    const none = new FakePlaceholderExtension(Direction.DOWN, new ElkRectangle(8, 8, 8, 8), null);
    const cGraph = t.transform(
      new FakeConnectedComponents([new FakeComponent(hullA, [first, other]), new FakeComponent(hullB, [second, none])]),
    );
    const left = [...t.getExternalPlaceholder().get(Direction.LEFT)];
    expect(left.length).toBe(2);
    expect(left[0].getFirst()).toBe(cGraph.cGroups[0]);
    expect(left[1].getFirst()).toBe(cGraph.cGroups[1]);
    expect(left[0].getSecond()?.hitbox.equals(new ElkRectangle(3, 3, 3, 3))).toBe(true);
    expect(left[0].getSecond()?.getHorizontalSpacing()).toBe(PLACEHOLDER_SPACING);
    expect(left[0].getSecond()?.getVerticalSpacing()).toBe(PLACEHOLDER_SPACING);
    expect([...t.getExternalPlaceholder().get(Direction.UP)].length).toBe(1);
    expect([...t.getExternalPlaceholder().get(Direction.DOWN)].length).toBe(0);
    expect(t.getExternalExtensions().size).toBe(4);
  });

  it('records only the first hull rectangle of a component as its old position and offset node', () => {
    const t = newTransformer();
    const comp = new FakeComponent(hullA);
    const cGraph = t.transform(new FakeConnectedComponents([comp]));
    expect(t.getOffset(comp).x + 0).toBe(0);
    expect(t.getOffset(comp).y + 0).toBe(0);
    // move the first hull node, apply, and read the offset back (old - new, ComponentsToCGraphTransformer.java:94)
    const moved = cGraph.cNodes[0];
    const before = { x: hullA[0].x, y: hullA[0].y };
    moved.hitbox.x += TEST_SPACING;
    moved.hitbox.y += TEST_SPACING;
    t.applyLayout();
    expect(t.getOffset(comp).x).toBe(before.x - hullA[0].x);
    expect(t.getOffset(comp).y).toBe(before.y - hullA[0].y);
  });
});

describe('ComponentsToCGraphTransformer.applyLayout', () => {
  it('writes the hitboxes back, computes size and global offset, and empties the graph', () => {
    const t = newTransformer();
    const hull = [new ElkRectangle(10, 20, 30, 40), new ElkRectangle(50, 60, 70, 80)];
    const cGraph = t.transform(new FakeConnectedComponents([new FakeComponent(hull)]));
    cGraph.cNodes[1].hitbox.x = 5;
    cGraph.cNodes[1].hitbox.y = 6;
    const hitboxes = cGraph.cNodes.map((n) => new ElkRectangle(n.hitbox));
    t.applyLayout();
    hull.forEach((rect, i) => expect(rect.equals(hitboxes[i])).toBe(true));
    const left = Math.min(...hitboxes.map((r) => r.x));
    const top = Math.min(...hitboxes.map((r) => r.y));
    const right = Math.max(...hitboxes.map((r) => r.x + r.width));
    const bottom = Math.max(...hitboxes.map((r) => r.y + r.height));
    expect(t.getGlobalOffset().x).toBe(-left);
    expect(t.getGlobalOffset().y).toBe(-top);
    expect(t.getGraphSize().x).toBe(right - left);
    expect(t.getGraphSize().y).toBe(bottom - top);
    expect(cGraph.cNodes.length).toBe(0);
    expect(cGraph.cGroups.length).toBe(0);
  });

  it('lets placeholders stretch the bounding box', () => {
    const t = newTransformer();
    const hull = [new ElkRectangle(10, 20, 30, 40)];
    const placeholder = new ElkRectangle(-100, -200, 5, 6);
    const ee = new FakePlaceholderExtension(Direction.LEFT, new ElkRectangle(1, 1, 1, 1), placeholder);
    t.transform(new FakeConnectedComponents([new FakeComponent(hull, [ee])]));
    t.applyLayout();
    expect(t.getGlobalOffset().x).toBe(-placeholder.x);
    expect(t.getGlobalOffset().y).toBe(-placeholder.y);
    expect(t.getGraphSize().x).toBe(hull[0].x + hull[0].width - placeholder.x);
    expect(t.getGraphSize().y).toBe(hull[0].y + hull[0].height - placeholder.y);
  });
});

describe('ComponentsToCGraphTransformer.SPACING_HANDLER', () => {
  it('takes the minimum of the two spacings where the default handler takes the maximum', () => {
    const t = newTransformer();
    const ee = new FakePlaceholderExtension(Direction.LEFT, new ElkRectangle(1, 1, 1, 1), new ElkRectangle(2, 2, 2, 2));
    const cGraph = t.transform(new FakeConnectedComponents([new FakeComponent([new ElkRectangle(0, 0, 1, 1)], [ee])]));
    const hull = cGraph.cNodes[0];
    const placeholder = [...t.getExternalPlaceholder().values()][0].getSecond() as CRectNode;
    const handler = ComponentsToCGraphTransformer.SPACING_HANDLER;
    expect(handler.getHorizontalSpacing(hull, placeholder)).toBe(
      Math.min(hull.getHorizontalSpacing(), placeholder.getHorizontalSpacing()),
    );
    expect(handler.getVerticalSpacing(hull, placeholder)).toBe(
      Math.min(hull.getVerticalSpacing(), placeholder.getVerticalSpacing()),
    );
    expect(handler.getHorizontalSpacing(hull, placeholder)).toBeLessThan(
      DEFAULT_SPACING_HANDLER.getHorizontalSpacing(hull, placeholder),
    );
  });
});

describe('CRectNode', () => {
  it('reports the rectangle x as element position, applies the hitbox, and prints nothing', () => {
    const rect = new ElkRectangle(7, 8, 9, 10);
    const node = new CRectNode(() => TEST_SPACING, rect);
    node.hitbox.x = 11;
    node.hitbox.y = 12;
    expect(node.getElementPosition()).toBe(rect.x);
    node.applyElementPosition();
    expect([rect.x, rect.y]).toEqual([11, 12]);
    expect(node.getElementPosition()).toBe(11);
    expect(node.toString()).toBe('');
  });

  it('reads the outer spacing at call time', () => {
    let spacing = TEST_SPACING;
    const node = new CRectNode(() => spacing, new ElkRectangle(0, 0, 1, 1));
    spacing = TEST_SPACING + 1;
    expect(node.getHorizontalSpacing()).toBe(TEST_SPACING + 1);
  });
});

describe('getPlaceholder (the Java interface default)', () => {
  it('returns null when the implementation has no override and the override otherwise', () => {
    const plain = new FakeExtension(Direction.LEFT, new ElkRectangle(1, 1, 1, 1));
    expect(getPlaceholder(plain)).toBeNull();
    const rect = new ElkRectangle(2, 2, 2, 2);
    expect(getPlaceholder(new FakePlaceholderExtension(Direction.LEFT, rect, rect))).toBe(rect);
  });
});
