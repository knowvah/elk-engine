// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import {
  allFourSides,
  FakeComponent,
  FakeConnectedComponents,
  FakeExtension,
  FakePlaceholderExtension,
  TEST_SPACING,
} from '../../../../../test/helpers/components-compaction.js';
import type { CGraph } from '../oned/CGraph.js';
import type { CNode } from '../oned/CNode.js';
import { OneDimensionalComponentsCompaction } from './OneDimensionalComponentsCompaction.js';

/**
 * Structure tests (L4): wiring, container order and termination. The numeric behaviour is proven through
 * `ComponentsCompactor` oracle rows. Private members are reached by index access to observe the order in
 * which the placeholder helpers walk their direction sets (OneDimensionalComponentsCompaction.java:65-66).
 */

interface Internals {
  compactionGraph: CGraph;
  addPlaceholders(dir: 'HORZ' | 'VERT'): void;
  removePlaceholders(dir: 'HORZ' | 'VERT'): void;
  updatePlaceholders(dir: 'HORZ' | 'VERT'): void;
  topLeft: { x: number; y: number };
  transformer: {
    getExternalPlaceholder(): { get(d: Direction): Iterable<{ getSecond(): CNode | null }> };
    getExternalExtensions(): Map<
      unknown,
      { getFirst(): { deltaNormalized: number } | null; getSecond(): CNode | null }
    >;
  };
  updateExternalExtensionDimensions(dir: 'HORZ' | 'VERT'): void;
}

function internals(c: object): Internals {
  return c as unknown as Internals;
}

function placeholderExt(
  direction: Direction,
  representor: ElkRectangle,
  placeholder: ElkRectangle,
): FakePlaceholderExtension {
  return new FakePlaceholderExtension(direction, representor, placeholder);
}

describe('OneDimensionalComponentsCompaction.compact', () => {
  it('leaves a fully locked single component where it is and reports its bounding box', () => {
    const hull = [new ElkRectangle(10, 20, 30, 40), new ElkRectangle(50, 60, 70, 80)];
    const originals = hull.map((r) => new ElkRectangle(r));
    const comp = new FakeComponent(hull);
    const compaction = OneDimensionalComponentsCompaction.init(new FakeConnectedComponents([comp]), TEST_SPACING);
    compaction.compact(new BasicProgressMonitor());
    hull.forEach((rect, i) => expect(rect.equals(originals[i])).toBe(true));
    const left = Math.min(...originals.map((r) => r.x));
    const top = Math.min(...originals.map((r) => r.y));
    expect(compaction.getGraphSize().x).toBe(Math.max(...originals.map((r) => r.x + r.width)) - left);
    expect(compaction.getGraphSize().y).toBe(Math.max(...originals.map((r) => r.y + r.height)) - top);
    // offset = -(old - new) + globalOffset, old == new here
    expect(compaction.getOffset(comp).x + 0).toBe(-left);
    expect(compaction.getOffset(comp).y + 0).toBe(-top);
  });

  it('terminates with external extensions in all four directions and detaches their nodes', () => {
    const hull = [new ElkRectangle(10, 20, 30, 40)];
    const extensions = [Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN].map((d, i) =>
      placeholderExt(d, new ElkRectangle(i, i, 1, 1), new ElkRectangle(100 + i, 100 + i, 2, 2)),
    );
    const plain = new FakeExtension(Direction.LEFT, new ElkRectangle(0, 0, 1, 1));
    const compaction = OneDimensionalComponentsCompaction.init(
      new FakeConnectedComponents([new FakeComponent(hull, [...extensions, plain], allFourSides())]),
      TEST_SPACING,
    );
    compaction.compact(new BasicProgressMonitor());
    const size = compaction.getGraphSize();
    expect(Number.isFinite(size.x)).toBe(true);
    expect(Number.isFinite(size.y)).toBe(true);
    expect(size.x).toBeGreaterThanOrEqual(hull[0].width);
    expect(size.y).toBeGreaterThanOrEqual(hull[0].height);
    for (const pair of internals(compaction).transformer.getExternalExtensions().values()) {
      expect(pair.getSecond()?.cGroup).toBeNull();
    }
  });
});

describe('OneDimensionalComponentsCompaction placeholder helpers', () => {
  function setup(): { c: Internals; byDirection: Map<Direction, ElkRectangle> } {
    const hull = [new ElkRectangle(10, 20, 30, 40)];
    const byDirection = new Map<Direction, ElkRectangle>();
    // registered in the order RIGHT, DOWN, LEFT, UP: the walk must follow the direction sets, not this order
    const extensions = [Direction.RIGHT, Direction.DOWN, Direction.LEFT, Direction.UP].map((d, i) => {
      const placeholder = new ElkRectangle(100 + i, 200 + i, 2, 2);
      byDirection.set(d, placeholder);
      return placeholderExt(d, new ElkRectangle(i, i, 1, 1), placeholder);
    });
    const compaction = OneDimensionalComponentsCompaction.init(
      new FakeConnectedComponents([new FakeComponent(hull, extensions)]),
      TEST_SPACING,
    );
    return { c: internals(compaction), byDirection };
  }

  function placeholderRects(c: Internals): ElkRectangle[] {
    return c.compactionGraph.cNodes.slice(1).map((n) => n.hitbox);
  }

  it('adds the horizontal placeholders LEFT before RIGHT and the vertical ones UP before DOWN', () => {
    const { c, byDirection } = setup();
    c.addPlaceholders('HORZ');
    expect(placeholderRects(c)[0].equals(byDirection.get(Direction.LEFT) as ElkRectangle)).toBe(true);
    expect(placeholderRects(c)[1].equals(byDirection.get(Direction.RIGHT) as ElkRectangle)).toBe(true);
    c.addPlaceholders('VERT');
    const added = placeholderRects(c).slice(2);
    expect(added[0].equals(byDirection.get(Direction.UP) as ElkRectangle)).toBe(true);
    expect(added[1].equals(byDirection.get(Direction.DOWN) as ElkRectangle)).toBe(true);
    // each placeholder's group joins the graph's group list
    expect(c.compactionGraph.cGroups.length).toBe(1 + 4);
  });

  it('removes what it added', () => {
    const { c } = setup();
    c.addPlaceholders('HORZ');
    c.addPlaceholders('VERT');
    c.removePlaceholders('HORZ');
    c.removePlaceholders('VERT');
    expect(c.compactionGraph.cNodes.length).toBe(1);
    expect(c.compactionGraph.cGroups.length).toBe(1);
  });

  it('shifts horizontal placeholders in y and vertical ones in x by the parent group delta', () => {
    const { c, byDirection } = setup();
    const group = c.compactionGraph.cGroups[0];
    group.deltaNormalized = TEST_SPACING;
    const before = new Map([...byDirection].map(([d, r]) => [d, new ElkRectangle(r)]));
    // the placeholder hitboxes are copies; read them through the transformer
    const hit = (d: Direction): ElkRectangle =>
      [...c.transformer.getExternalPlaceholder().get(d)][0].getSecond()?.hitbox as ElkRectangle;
    c.updatePlaceholders('VERT'); // iterates UP/DOWN: x moves
    expect(hit(Direction.UP).x).toBe((before.get(Direction.UP) as ElkRectangle).x + TEST_SPACING);
    expect(hit(Direction.DOWN).x).toBe((before.get(Direction.DOWN) as ElkRectangle).x + TEST_SPACING);
    expect(hit(Direction.UP).y).toBe((before.get(Direction.UP) as ElkRectangle).y);
    expect(hit(Direction.LEFT).x).toBe((before.get(Direction.LEFT) as ElkRectangle).x);
    c.updatePlaceholders('HORZ'); // iterates LEFT/RIGHT: y moves
    expect(hit(Direction.LEFT).y).toBe((before.get(Direction.LEFT) as ElkRectangle).y + TEST_SPACING);
    expect(hit(Direction.RIGHT).y).toBe((before.get(Direction.RIGHT) as ElkRectangle).y + TEST_SPACING);
    expect(hit(Direction.LEFT).x).toBe((before.get(Direction.LEFT) as ElkRectangle).x);
  });
});

describe('OneDimensionalComponentsCompaction.updateExternalExtensionDimensions', () => {
  function setup(): { c: Internals; nodes: Map<Direction, CNode> } {
    const extensions = [Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN].map(
      (d, i) => new FakeExtension(d, new ElkRectangle(10 + i, 20 + i, 30, 40)),
    );
    const compaction = OneDimensionalComponentsCompaction.init(
      new FakeConnectedComponents([new FakeComponent([new ElkRectangle(0, 0, 1, 1)], extensions)]),
      TEST_SPACING,
    );
    const c = internals(compaction);
    c.topLeft = { x: -TEST_SPACING, y: -TEST_SPACING };
    const nodes = new Map<Direction, CNode>();
    for (const [ee, pair] of c.transformer.getExternalExtensions()) {
      nodes.set((ee as FakeExtension).getDirection(), pair.getSecond() as CNode);
    }
    return { c, nodes };
  }

  it('stretches the horizontal extensions to the left border or by the delta, vertical ones untouched', () => {
    const { c, nodes } = setup();
    const delta = TEST_SPACING;
    for (const pair of c.transformer.getExternalExtensions().values()) {
      (pair.getFirst() as { deltaNormalized: number }).deltaNormalized = delta;
    }
    const left = new ElkRectangle((nodes.get(Direction.LEFT) as CNode).hitbox);
    const right = new ElkRectangle((nodes.get(Direction.RIGHT) as CNode).hitbox);
    const up = new ElkRectangle((nodes.get(Direction.UP) as CNode).hitbox);
    c.updateExternalExtensionDimensions('HORZ');
    const l = (nodes.get(Direction.LEFT) as CNode).hitbox;
    const r = (nodes.get(Direction.RIGHT) as CNode).hitbox;
    expect(l.x).toBe(c.topLeft.x);
    expect(l.width).toBe(Math.max(1, left.width + delta));
    expect(r.x).toBe(right.x + delta);
    expect(r.width).toBe(Math.max(1, right.width - delta));
    expect((nodes.get(Direction.UP) as CNode).hitbox.equals(up)).toBe(true);
  });

  it('stretches the vertical extensions to the top border or by the delta, horizontal ones untouched', () => {
    const { c, nodes } = setup();
    const delta = TEST_SPACING;
    for (const pair of c.transformer.getExternalExtensions().values()) {
      (pair.getFirst() as { deltaNormalized: number }).deltaNormalized = delta;
    }
    const up = new ElkRectangle((nodes.get(Direction.UP) as CNode).hitbox);
    const down = new ElkRectangle((nodes.get(Direction.DOWN) as CNode).hitbox);
    const left = new ElkRectangle((nodes.get(Direction.LEFT) as CNode).hitbox);
    c.updateExternalExtensionDimensions('VERT');
    const u = (nodes.get(Direction.UP) as CNode).hitbox;
    const d = (nodes.get(Direction.DOWN) as CNode).hitbox;
    expect(u.y).toBe(c.topLeft.y);
    expect(u.height).toBe(Math.max(1, up.height + delta));
    expect(d.y).toBe(down.y + delta);
    expect(d.height).toBe(Math.max(1, down.height - delta));
    expect((nodes.get(Direction.LEFT) as CNode).hitbox.equals(left)).toBe(true);
  });
});
