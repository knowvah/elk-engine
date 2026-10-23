// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { Random } from '../../java/util/Random.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { NullElkProgressMonitor } from './NullElkProgressMonitor.js';
import { RandomLayoutProvider } from './RandomLayoutProvider.js';

// Expected values replay the draw sequence through Random.ts and transcribe the formulas of
// RandomLayoutProvider.java (line numbers in the comments). Unseeded runs are checked by invariants only.
const SEED = 1;
const ASPECT_RATIO = 2;
const SPACING = 10;
const PADDING = new ElkPadding(1, 2, 3, 4); // top, right, bottom, left
const MAX_BENDS = 5; // :134
const RAND_FACT = Math.fround(0.2); // :137 (a float literal widened to double)

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

function setup(seed: number | null): { root: ElkNode; a: ElkNode; b: ElkNode } {
  const root = ElkGraphUtil.createNode(null);
  root.setProperty(CoreOptions.ASPECT_RATIO, ASPECT_RATIO);
  root.setProperty(CoreOptions.SPACING_NODE_NODE, SPACING);
  root.setProperty(CoreOptions.PADDING, new ElkPadding(PADDING));
  if (seed !== null) {
    root.setProperty(CoreOptions.RANDOM_SEED, seed);
  }
  const a = ElkGraphUtil.createNode(root);
  a.setDimensions(100, 50);
  const b = ElkGraphUtil.createNode(root);
  b.setDimensions(40, 30);
  return { root, a, b };
}

function layout(root: ElkNode): RecordingMonitor {
  const monitor = new RecordingMonitor();
  new RandomLayoutProvider().layout(root, monitor);
  return monitor;
}

/** :90-108 for the two nodes of `setup` with `m` = 1 + number of outgoing edges. */
function drawSize(m: number): { drawWidth: number; drawHeight: number } {
  const nodesArea = 100 * 50 + 40 * 30;
  const drawArea = nodesArea + 2 * SPACING * SPACING * m * 2;
  const areaSqrt = Math.sqrt(drawArea);
  return {
    drawWidth: Math.max(areaSqrt * ASPECT_RATIO, 100),
    drawHeight: Math.max(areaSqrt / ASPECT_RATIO, 50),
  };
}

/** :111-115, drawing the two nodes' positions from `random` (sic: the left padding is added to y as well). */
function nodePositions(random: Random, m: number): [number, number][] {
  const { drawWidth, drawHeight } = drawSize(m);
  return [
    [100, 50],
    [40, 30],
  ].map(([w, h]) => {
    const x = PADDING.getLeft() + random.nextDouble() * (drawWidth - (w as number));
    const y = PADDING.getLeft() + random.nextDouble() * (drawHeight - (h as number));
    return [x, y];
  });
}

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('RandomLayoutProvider nodes', () => {
  it('places nodes with the replayed draw sequence and resizes the parent (:111-130)', () => {
    const { root, a, b } = setup(SEED);
    const monitor = layout(root);
    const [[ax, ay], [bx, by]] = nodePositions(new Random(SEED), 1);
    expect([a.getX(), a.getY()]).toEqual([ax, ay]);
    expect([b.getX(), b.getY()]).toEqual([bx, by]);
    const { drawWidth, drawHeight } = drawSize(1);
    expect(root.getWidth()).toBe(drawWidth + PADDING.getHorizontal() + PADDING.getLeft() + PADDING.getRight());
    expect(root.getHeight()).toBe(drawHeight + PADDING.getVertical() + PADDING.getTop() + PADDING.getBottom());
    expect(monitor.events).toEqual(['begin Random Layout 1', 'done']);
  });

  it('is deterministic for a fixed seed (:60-61)', () => {
    const first = setup(SEED);
    const second = setup(SEED);
    layout(first.root);
    layout(second.root);
    expect([first.a.getX(), first.a.getY(), first.b.getX(), first.b.getY()]).toEqual([
      second.a.getX(),
      second.a.getY(),
      second.b.getX(),
      second.b.getY(),
    ]);
  });

  it.each([null, 0])('keeps every node inside the draw area for seed %s (:62-64)', (seed) => {
    const { root, a, b } = setup(seed);
    layout(root);
    const { drawWidth, drawHeight } = drawSize(1);
    for (const node of [a, b]) {
      expect(node.getX()).toBeGreaterThanOrEqual(PADDING.getLeft());
      expect(node.getX() + node.getWidth()).toBeLessThanOrEqual(PADDING.getLeft() + drawWidth);
      expect(node.getY()).toBeGreaterThanOrEqual(PADDING.getLeft());
      expect(node.getY() + node.getHeight()).toBeLessThanOrEqual(PADDING.getLeft() + drawHeight);
    }
    expect([a.getWidth(), a.getHeight(), b.getWidth(), b.getHeight()]).toEqual([100, 50, 40, 30]);
  });

  it('returns immediately for a graph without children (:52-55)', () => {
    const root = ElkGraphUtil.createNode(null);
    root.setDimensions(7, 8);
    const monitor = layout(root);
    expect([root.getWidth(), root.getHeight()]).toEqual([7, 8]);
    expect(monitor.events).toEqual(['begin Random Layout 1', 'done']);
  });
});

describe('RandomLayoutProvider edges', () => {
  /** Replays :243-273 for an edge whose source and target anchors coincide (sic: both read the first source). */
  function expectedEdge(
    random: Random,
    node: [number, number],
    size: [number, number],
    totalWidth: number,
    totalHeight: number,
  ) {
    const halfW = size[0] / 2;
    const halfH = size[1] / 2;
    const cx = node[0] + halfW;
    const cy = node[1] + halfH;
    // :212-215 and :234-237: target == source, so the point is inside and is pushed out on one side each
    const start = [cx + halfW, cy];
    const end = [cx, cy + halfH];
    const bendsNum = random.nextInt(MAX_BENDS) + 1; // :243-246
    const xdiff = end[0]! - start[0]!;
    const ydiff = end[1]! - start[1]!;
    const maxRand = Math.sqrt(xdiff * xdiff + ydiff * ydiff) * RAND_FACT;
    const bends: [number, number][] = [];
    let x = start[0]!;
    let y = start[1]!;
    for (let i = 0; i < bendsNum; i++) {
      x += xdiff / (bendsNum + 1);
      y += ydiff / (bendsNum + 1);
      let randx = x + random.nextFloat() * maxRand - maxRand / 2;
      randx = randx < 0 ? 1 : randx > totalWidth ? totalWidth - 1 : randx;
      let randy = y + random.nextFloat() * maxRand - maxRand / 2;
      randy = randy < 0 ? 1 : randy > totalHeight ? totalHeight - 1 : randy;
      bends.push([randx, randy]);
    }
    return { start, end, bends };
  }

  it('adds a section with replayed start, end and bend points (:183-186, :217-273)', () => {
    const { root, a, b } = setup(SEED);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    layout(root);
    const random = new Random(SEED);
    const [[ax, ay]] = nodePositions(random, 2);
    const { drawWidth, drawHeight } = drawSize(2);
    const expected = expectedEdge(
      random,
      [ax, ay],
      [100, 50],
      drawWidth + PADDING.getHorizontal(),
      drawHeight + PADDING.getVertical(),
    );
    expect(edge.getSections().size()).toBe(1);
    const section = edge.getSections().get(0);
    expect([section.getStartX(), section.getStartY()]).toEqual(expected.start);
    expect([section.getEndX(), section.getEndY()]).toEqual(expected.end);
    expect(section.getBendPoints().size()).toBe(expected.bends.length);
    expect([...section.getBendPoints()].map((p) => [p.getX(), p.getY()])).toEqual(expected.bends);
  });

  it('keeps the single existing section and clears its bend points (:195, :242)', () => {
    const { root, a, b } = setup(SEED);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    const section = ElkGraphUtil.createEdgeSection(edge);
    const stale = section.getBendPoints();
    stale.add(ElkGraphUtil.createBendPoint(section, 999, 999));
    layout(root);
    expect(edge.getSections().get(0)).toBe(section);
    expect([...section.getBendPoints()].some((p) => p.getX() === 999)).toBe(false);
  });

  it('throws as the JVM for an edge with more than one section (:187-193, remove() without next())', () => {
    const { root, a, b } = setup(SEED);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    ElkGraphUtil.createEdgeSection(edge);
    ElkGraphUtil.createEdgeSection(edge);
    expect(() => layout(root)).toThrow(IllegalStateException);
  });

  it('adds the parent x of a port twice (:157-161)', () => {
    const { root, a, b } = setup(SEED);
    const port = ElkGraphUtil.createPort(a);
    port.setLocation(3, 4);
    port.setDimensions(2, 6);
    const edge = ElkGraphUtil.createSimpleEdge(port, b);
    layout(root);
    // anchor: x = 3 + 2 * parent.x + 1, y = 4 + 3 (:154-163); target == source, so start = (x + 1, y)
    const section = edge.getSections().get(0);
    expect(section.getStartX()).toBe(3 + 2 * a.getX() + 1 + 1);
    expect(section.getStartY()).toBe(4 + 3);
    expect(section.getEndX()).toBe(3 + 2 * a.getX() + 1);
    expect(section.getEndY()).toBe(4 + 3 + 3);
  });

  it('skips hierarchical edges (:122)', () => {
    const { root, a } = setup(SEED);
    const inner = ElkGraphUtil.createNode(a);
    const edge = ElkGraphUtil.createSimpleEdge(a, inner);
    layout(root);
    expect(edge.getSections().size()).toBe(0);
  });
});

/** The anchor helpers and the bend loop, whose branches the Java's source-for-target slip makes unreachable (:151-167). */
interface Internals {
  sourcePoint(source: Anchor, target: Anchor): [number, number];
  targetPoint(source: Anchor, target: Anchor): [number, number];
}
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

describe('RandomLayoutProvider border points for distinct anchors', () => {
  const provider = new RandomLayoutProvider() as unknown as Internals;
  const box = (x: number, y: number): Anchor => ({ x, y, width: 5, height: 3 });

  it.each([
    ['right/below', box(0, 0), box(20, 10), [5, 3]],
    ['left/above', box(0, 0), box(-20, -10), [-5, -3]],
    ['overlapping', box(0, 0), box(1, 1), [5, 1]],
    ['same row', box(0, 0), box(20, 0), [5, 0]],
  ])('sourcePoint %s (:198-215)', (_name, source, target, expected) => {
    expect(provider.sourcePoint(source, target)).toEqual(expected);
  });

  it.each([
    ['target left/above of source', box(20, 10), box(0, 0), [5, 3]],
    ['target right/below of source', box(-20, -10), box(0, 0), [-5, -3]],
    ['overlapping', box(1, 1), box(0, 0), [1, 3]],
    ['same row', box(20, 0), box(0, 0), [5, 0]],
  ])('targetPoint %s (:220-237)', (_name, source, target, expected) => {
    expect(provider.targetPoint(source, target)).toEqual(expected);
  });
});

describe('RandomLayoutProvider bend point clamping', () => {
  type Add = (
    section: unknown,
    random: Random,
    route: { start: { x: number; y: number }; end: { x: number; y: number }; bendsNum: number },
    drawWidth: number,
    drawHeight: number,
  ) => void;

  function bendPoints(start: [number, number], end: [number, number], drawWidth: number, drawHeight: number) {
    const edge = ElkGraphUtil.createSimpleEdge(setup(null).a, setup(null).b);
    const section = ElkGraphUtil.createEdgeSection(edge);
    const provider = new RandomLayoutProvider();
    const add = (provider as unknown as { addBendPoints: Add }).addBendPoints;
    const route = { start: { x: start[0], y: start[1] }, end: { x: end[0], y: end[1] }, bendsNum: 1 };
    add.call(provider, section, new Random(SEED), route, drawWidth, drawHeight);
    return [...section.getBendPoints()].map((p) => [p.getX(), p.getY()]);
  }

  it('replaces coordinates below zero by 1 (:259-260, :265-266)', () => {
    expect(bendPoints([-100, -100], [-100, -100], 50, 50)).toEqual([[1, 1]]);
  });

  it('replaces coordinates beyond the draw area by size - 1 (:261-262, :267-268)', () => {
    expect(bendPoints([100, 100], [100, 100], 50, 40)).toEqual([[49, 39]]);
  });
});
