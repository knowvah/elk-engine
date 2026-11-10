// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the layered bundle's compaction classes (mission 7g, T21c, W14/F12): the components transformer and its
// locks, the components compaction loop, the one-dimensional compactor with its constraint and compaction algorithms, and the
// rectilinear convex hull. The compactor is built by the graph placers under `compaction.connectedComponents`, so each case
// replays one oracle row through `replayLoopsRow` while test-scoped wrappers on prototype methods capture the internal state
// (restored afterwards); the state is then compared with the row's recorded layout (L4, coordinates at 1e-6). A case with no row
// for its fact derives the expectation from the Java line it cites and says so; the `CompactionTest` and
// `RectlinearConvexHullTest` suites already hold the Java's own literals and are not duplicated.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLoopsRows, replayLoopsRow, type LoopsRow } from '../../../../test/helpers/layered-loops-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { Direction } from '../../../core/options/Direction.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { ComponentsCompactorInternalComponent } from '../components/ComponentsCompactorInternalComponent.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { CRectNode } from './components/ComponentsToCGraphTransformerCRectNode.js';
import { ComponentsToCGraphTransformer } from './components/ComponentsToCGraphTransformer.js';
import { OneDimensionalComponentsCompaction } from './components/OneDimensionalComponentsCompaction.js';
import type { CNode } from './oned/CNode.js';
import { OneDimensionalCompactor } from './oned/OneDimensionalCompactor.js';
import { ScanlineConstraintCalculator } from './oned/algs/ScanlineConstraintCalculator.js';
import { Timestamp } from './oned/algs/ScanlineConstraintCalculatorTimestamp.js';
import { RectilinearConvexHull } from './recthull/RectilinearConvexHull.js';
import type { Point } from './recthull/Point.js';
import { Quadrant } from './recthull/PointQuadrant.js';

const AD4 = 1e-6;
const ID_LONE_FOUR = 'sites/ComponentsCompactor/loneExternalPorts/fourSides';
const ID_LONE_NS = 'sites/ComponentsCompactor/loneExternalPorts/northSouth';
const ID_ESW = 'sites/ComponentsCompactor/threeSideExtension/ESW';
const ID_NSW = 'sites/ComponentsCompactor/threeSideExtension/NSW';
const ID_FLAT_SCENARIO = 'scenarios/ComponentsCompactor/flat-components/ORTHOGONAL';
const ID_FLAT01_ON = 'full/components-compaction/connected_components-flat01/on';
const ID_FLAT01_OFF = 'full/components-compaction/connected_components-flat01/off';

interface JsonShape {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly ports?: readonly JsonShape[];
  readonly children?: readonly JsonShape[];
  readonly layoutOptions?: Readonly<Record<string, string>>;
}

type Xy = readonly [number, number];
type Rect = readonly [number, number, number, number];
type AnyFn = (this: unknown, ...args: unknown[]) => unknown;

interface LockCall {
  readonly sides: string[];
  readonly lock: readonly [boolean, boolean, boolean, boolean];
  readonly spacing: number;
}

interface ConstraintNode {
  readonly hitbox: Rect;
  readonly group: unknown;
  readonly constraints: number[];
}

interface Captured {
  readonly locks: LockCall[];
  readonly components: ComponentsCompactorInternalComponent[];
  readonly hullSizes: number[];
  readonly graphSize: Xy[];
  readonly globalOffset: Xy[];
  readonly offsets: Xy[];
  readonly directions: string[];
  readonly runs: { run: number; delta: number }[];
  readonly extensions: { direction: string; spacing: number; placeholderSpacing: number | null }[];
  readonly placeholders: Map<string, number>;
  readonly constraintGraphs: ConstraintNode[][];
  readonly hullInputs: { points: Xy[]; rects: Rect[] }[];
}

interface XyLike {
  x: number;
  y: number;
}

const xy = (v: XyLike): Xy => [v.x, v.y];
const rectOf = (r: XyLike & { width: number; height: number }): Rect => [r.x, r.y, r.width, r.height];

interface Patch {
  readonly target: object;
  readonly name: string;
  readonly wrap: (original: AnyFn) => AnyFn;
}

function withPatches<T>(patches: readonly Patch[], body: () => T): T {
  const originals = patches.map((patch) => (patch.target as Record<string, AnyFn>)[patch.name]!);
  patches.forEach((patch, index) => {
    (patch.target as Record<string, AnyFn>)[patch.name] = patch.wrap(originals[index]!);
  });
  try {
    return body();
  } finally {
    patches.forEach((patch, index) => {
      (patch.target as Record<string, AnyFn>)[patch.name] = originals[index]!;
    });
  }
}

const transformerProto = ComponentsToCGraphTransformer.prototype as object;
const componentsCompactionProto = OneDimensionalComponentsCompaction.prototype as object;
const compactorProto = OneDimensionalCompactor.prototype as object;

function originId(node: LNode): string | null {
  const origin = node.getProperty(InternalProperties.ORIGIN) as ElkNode | null | undefined;
  return origin === null || origin === undefined ? null : origin.getIdentifier();
}

const lockPatch = (captured: Captured): Patch => ({
  target: transformerProto,
  name: 'setLock',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const cNode = args[0] as CNode;
      original.apply(this, args);
      const { left, right, up, down } = cNode.lock;
      captured.locks.push({
        sides: [...(args[1] as Iterable<unknown>)].map(String),
        lock: [left, right, up, down],
        spacing: cNode.getHorizontalSpacing(),
      });
      return undefined;
    },
});

const transformPatch = (captured: Captured): Patch => ({
  target: transformerProto,
  name: 'transform',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const ccs = args[0] as { getComponents(): ComponentsCompactorInternalComponent[] };
      captured.components.push(...ccs.getComponents());
      for (const component of ccs.getComponents()) {
        captured.hullSizes.push(component.getHull().length);
      }
      return original.apply(this, args);
    },
});

type ExtensionPair = { getSecond(): CNode };
type TransformerView = {
  getExternalExtensions(): Map<{ getDirection(): Direction }, ExtensionPair>;
  getExternalPlaceholder(): { keySet(): Direction[]; get(d: Direction): { size: number } & Iterable<ExtensionPair> };
  getGraphSize(): XyLike;
  getGlobalOffset(): XyLike;
};

function recordTransformer(captured: Captured, transformer: TransformerView): void {
  for (const [extension, pair] of transformer.getExternalExtensions()) {
    const direction = String(extension.getDirection());
    const placeholder = [...transformer.getExternalPlaceholder().get(extension.getDirection())][0];
    captured.extensions.push({
      direction,
      spacing: pair.getSecond().getHorizontalSpacing(),
      placeholderSpacing: placeholder === undefined ? null : placeholder.getSecond().getHorizontalSpacing(),
    });
  }
  for (const direction of transformer.getExternalPlaceholder().keySet()) {
    captured.placeholders.set(String(direction), transformer.getExternalPlaceholder().get(direction).size);
  }
  captured.graphSize.push(xy(transformer.getGraphSize()));
  captured.globalOffset.push(xy(transformer.getGlobalOffset()));
}

const applyLayoutPatch = (captured: Captured): Patch => ({
  target: transformerProto,
  name: 'applyLayout',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      recordTransformer(captured, this as unknown as TransformerView);
      return result;
    },
});

const offsetPatch = (captured: Captured): Patch => ({
  target: componentsCompactionProto,
  name: 'getOffset',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args) as XyLike;
      captured.offsets.push(xy(result));
      return result;
    },
});

const runPatch = (captured: Captured): Patch => ({
  target: componentsCompactionProto,
  name: 'compactRun',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const delta = original.apply(this, args) as number;
      captured.runs.push({ run: args[0] as number, delta });
      return delta;
    },
});

const directionPatch = (captured: Captured): Patch => ({
  target: compactorProto,
  name: 'changeDirection',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      captured.directions.push(String(args[0]));
      return original.apply(this, args);
    },
});

function constraintGraphOf(compactor: OneDimensionalCompactor): ConstraintNode[] {
  const nodes = compactor.cGraph.cNodes;
  return nodes.map((node) => ({
    hitbox: rectOf(node.hitbox),
    group: node.cGroup,
    constraints: node.constraints.map((constraint) => nodes.indexOf(constraint)),
  }));
}

const compactPatch = (captured: Captured): Patch => ({
  target: compactorProto,
  name: 'compact',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const self = this as OneDimensionalCompactor;
      if (self.direction === Direction.LEFT && captured.constraintGraphs.length === 0) {
        captured.constraintGraphs.push(constraintGraphOf(self));
      }
      return original.apply(this, args);
    },
});

const hullPatch = (captured: Captured): Patch => ({
  target: RectilinearConvexHull.prototype,
  name: 'splitIntoRectangles',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const rects = original.apply(this, args) as (XyLike & { width: number; height: number })[];
      const hull = this as unknown as { extremalPoints?: Iterable<Point> };
      captured.hullInputs.push({ points: [...(hull.extremalPoints ?? [])].map(xy), rects: rects.map(rectOf) });
      return rects;
    },
});

const rowsById = new Map<string, LoopsRow>();
function rowOf(id: string): LoopsRow {
  if (rowsById.size === 0) {
    for (const row of loadLoopsRows()) {
      rowsById.set(row.id, row);
    }
  }
  const row = rowsById.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  return row;
}

const captureCache = new Map<string, Captured>();
function capture(id: string): Captured {
  const cached = captureCache.get(id);
  if (cached !== undefined) {
    return cached;
  }
  const captured: Captured = {
    locks: [],
    components: [],
    hullSizes: [],
    graphSize: [],
    globalOffset: [],
    offsets: [],
    directions: [],
    runs: [],
    extensions: [],
    placeholders: new Map(),
    constraintGraphs: [],
    hullInputs: [],
  };
  const patches = [
    lockPatch(captured),
    transformPatch(captured),
    applyLayoutPatch(captured),
    offsetPatch(captured),
    runPatch(captured),
    directionPatch(captured),
    compactPatch(captured),
    hullPatch(captured),
  ];
  // the replay itself is compared by LayeredLoopsVectors / LayeredLoopsSites / ComponentsCompactor.test.ts; a case here
  // asserts the captured class-level fact only, so a failure names the class and not a row
  withPatches(patches, () => replayLoopsRow(rowOf(id)));
  captureCache.set(id, captured);
  return captured;
}

const layoutOf = (id: string): JsonShape => (rowOf(id).expected as unknown as { layout: JsonShape }).layout;
const inputOf = (id: string): JsonShape => (rowOf(id).input as unknown as { elk: JsonShape }).elk;
const descendants = (shape: JsonShape): JsonShape[] =>
  (shape.children ?? []).flatMap((child) => [child, ...descendants(child)]);
const sideOf = (port: JsonShape): string => port.layoutOptions!['port.side']!;
const inputPortsOf = (id: string): JsonShape[] => [...(inputOf(id).children![0]!.ports ?? [])];

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const SITE_ROWS = [ID_LONE_FOUR, ID_LONE_NS, ID_ESW, ID_NSW];
const DIRECTION_OF: Record<string, string> = { WEST: 'LEFT', EAST: 'RIGHT', NORTH: 'UP', SOUTH: 'DOWN' };

describe('ComponentsToCGraphTransformer: locks', () => {
  // Java literals of ComponentsToCGraphTransformer.java:163-189 (regulars) for one side; `Quadruplet.set(left, right, up, down)`
  const LOCK_OF_SIDE: Record<string, readonly [boolean, boolean, boolean, boolean]> = {
    NORTH: [true, true, true, false],
    EAST: [false, true, true, true],
    SOUTH: [true, true, false, true],
    WEST: [true, false, true, true],
  };
  const LOCK_ALL = [true, true, true, true] as const;

  // oracle: sites/ComponentsCompactor/threeSideExtension/{ESW,NSW}; ComponentsToCGraphTransformer.java:224-236 (triumvirates)
  it.each([ID_ESW, ID_NSW])(
    'locks every rectangle of a component with three external sides in all directions (%s)',
    (id) => {
      const { locks, components } = capture(id);
      const sides = new Set(inputPortsOf(id).map(sideOf));
      const threeSides = locks.filter((call) => call.sides.length === 3);
      expect(sides.size).toBe(3);
      expect(threeSides.length).toBeGreaterThan(0);
      for (const call of threeSides) {
        expect(new Set(call.sides)).toEqual(sides);
        expect(call.lock).toEqual(LOCK_ALL);
      }
      // one call per hull rectangle, extension and placeholder of the component
      const component = components[0]!;
      expect(locks).toHaveLength(component.getHull().length + 2 * component.getExternalExtensions().length);
    },
  );

  // oracle: sites/ComponentsCompactor/loneExternalPorts/fourSides; ComponentsToCGraphTransformer.java:181-200 (one side), :183-185 (no side)
  it('locks a one-sided lone port component per its side and an unconnected component completely', () => {
    const { locks } = capture(ID_LONE_FOUR);
    const bySide = new Map<string, Set<string>>();
    for (const call of locks) {
      const key = call.sides.join(',');
      bySide.set(key, (bySide.get(key) ?? new Set()).add(call.lock.map(String).join(',')));
    }
    expect([...bySide.keys()].sort()).toEqual([...inputPortsOf(ID_LONE_FOUR).map(sideOf), ''].sort());
    for (const port of inputPortsOf(ID_LONE_FOUR)) {
      expect([...bySide.get(sideOf(port))!]).toEqual([LOCK_OF_SIDE[sideOf(port)]!.map(String).join(',')]);
    }
    expect([...bySide.get('')!]).toEqual([LOCK_ALL.map(String).join(',')]);
  });
});

describe('ComponentsToCGraphTransformer: extensions, placeholders, size and offsets', () => {
  // oracle: scenarios/ComponentsCompactor/flat-components/ORTHOGONAL, full/components-compaction/connected_components-flat01/on;
  // ComponentsToCGraphTransformer.java:108 (getGraphSize), :248 (applyLayout): the flat rows have no
  // external port, so the compacted layout starts at 0 and the recorded container is the size plus the padding on both sides
  it.each([ID_FLAT_SCENARIO, ID_FLAT01_ON])(
    'reports the compacted size the recorded container wraps in its padding (%s)',
    (id) => {
      const layout = layoutOf(id);
      const pad = Math.min(...descendants(layout).flatMap((node) => [node.x, node.y]));
      const { graphSize } = capture(id);
      expect(graphSize).toHaveLength(1);
      expect(graphSize[0]![0]).toBeCloseTo(layout.width - 2 * pad, 6);
      expect(graphSize[0]![1]).toBeCloseTo(layout.height - 2 * pad, 6);
    },
  );

  // oracle: full/components-compaction/connected_components-flat01/{on,off}; ComponentsToCGraphTransformer.java:93 (getOffset),
  // OneDimensionalComponentsCompaction.java:299-301 (getOffset negates and adds the global offset)
  it('offsets each component by the difference between its recorded positions with and without compaction', () => {
    const { offsets, components } = capture(ID_FLAT01_ON);
    const off = new Map(descendants(layoutOf(ID_FLAT01_OFF)).map((node) => [node.id, node] as const));
    const on = new Map(descendants(layoutOf(ID_FLAT01_ON)).map((node) => [node.id, node] as const));
    expect(components).toHaveLength(5);
    expect(offsets).toHaveLength(components.length);
    components.forEach((component, index) => {
      const nodeId = originId(component.getNodes()[0]!)!;
      expect(offsets[index]![0]).toBeCloseTo(on.get(nodeId)!.x - off.get(nodeId)!.x, 6);
      expect(offsets[index]![1]).toBeCloseTo(on.get(nodeId)!.y - off.get(nodeId)!.y, 6);
    });
  });

  // oracle: sites/ComponentsCompactor/threeSideExtension/ESW; ComponentsToCGraphTransformer.java:158-168
  it.each([ID_ESW, ID_NSW, ID_LONE_FOUR])('prepares one extension and one placeholder per external port (%s)', (id) => {
    const { extensions, placeholders } = capture(id);
    const ports = inputPortsOf(id);
    expect(extensions.map((extension) => extension.direction).sort()).toEqual(
      ports.map((port) => DIRECTION_OF[sideOf(port)]!).sort(),
    );
    for (const port of ports) {
      expect(placeholders.get(DIRECTION_OF[sideOf(port)]!)).toBe(1);
    }
    expect(placeholders.size).toBe(ports.length);
  });

  // structural: ComponentsToCGraphTransformer.java:164: the placeholder has the individual spacing 1, the extension the
  // spacing the placers pass
  it('gives placeholders the spacing 1 and extensions the placer spacing', () => {
    const { extensions } = capture(ID_ESW);
    expect(extensions.length).toBe(3);
    const lockSpacings = capture(ID_ESW).locks.map((call) => call.spacing);
    const placerSpacing = Math.max(...lockSpacings);
    for (const extension of extensions) {
      expect(extension.placeholderSpacing).toBe(1);
      expect(extension.spacing).toBe(placerSpacing);
    }
    expect(Math.min(...lockSpacings)).toBe(1);
  });
});

describe('OneDimensionalComponentsCompaction: the compaction loop', () => {
  const RUN_DIRECTIONS = ['LEFT', 'RIGHT', 'LEFT', 'LEFT', 'UP', 'DOWN', 'UP', 'LEFT'];
  const MAX_ITERATION = 10;
  const MIN_ITERATIONS = 2;
  const EPSILON = 0.0001;

  // oracle: sites/ComponentsCompactor/loneExternalPorts/northSouth, sites/ComponentsCompactor/threeSideExtension/ESW,
  // scenarios/ComponentsCompactor/flat-components/ORTHOGONAL, full/components-compaction/connected_components-flat01/on;
  // OneDimensionalComponentsCompaction.java:155-170 (loop, finish) and compact(int) below it
  it.each([ID_LONE_NS, ID_ESW, ID_FLAT_SCENARIO, ID_FLAT01_ON])(
    'runs the direction sequence LEFT, RIGHT, LEFT, then UP, DOWN, UP once per run and finishes at LEFT (%s)',
    (id) => {
      const { directions, runs } = capture(id);
      // one run per loop iteration, one more for the final aligned run, then `finish()`
      expect(directions).toEqual([...Array.from({ length: runs.length }, () => RUN_DIRECTIONS).flat(), 'LEFT']);
    },
  );

  // oracle: the four rows above; OneDimensionalComponentsCompaction.java:155-158 (loop until no improvement, at least two runs)
  it.each([ID_LONE_NS, ID_ESW, ID_FLAT_SCENARIO, ID_FLAT01_ON])(
    'stops at the first run past the second without improvement (%s)',
    (id) => {
      const { runs } = capture(id);
      const loop = runs.slice(0, -1);
      const final = runs[runs.length - 1]!;
      expect(loop.map((entry) => entry.run)).toEqual(loop.map((_, index) => index));
      expect(final.run).toBe(0);
      expect(loop.length).toBeGreaterThanOrEqual(MIN_ITERATIONS);
      expect(loop.length).toBeLessThan(MAX_ITERATION);
      expect(loop[loop.length - 1]!.delta).toBeLessThanOrEqual(EPSILON);
      for (const entry of loop.slice(MIN_ITERATIONS - 1, -1)) {
        expect(entry.delta).toBeGreaterThan(EPSILON);
      }
    },
  );
});

describe('OneDimensionalCompactor and the scanline constraint calculator', () => {
  const EPSILON = 0.5;

  // structural: ScanlineConstraintCalculator.java:44, :86 (scanline), ConstraintsScanlineHandler (constraints point to the nearest node of another group on
  // the right whose vertical extent, shrunk by EPSILON on each side, overlaps); graph from oracle row flat01/on
  it('constrains each node only towards nodes of another group to its right, and every node with such a node', () => {
    const [nodes] = capture(ID_FLAT01_ON).constraintGraphs;
    expect(nodes!.length).toBeGreaterThan(10);
    const overlapsY = (a: Rect, b: Rect): boolean =>
      a[1] + EPSILON < b[1] + b[3] - EPSILON && b[1] + EPSILON < a[1] + a[3] - EPSILON;
    let constrained = 0;
    nodes!.forEach((node, index) => {
      for (const other of node.constraints) {
        const incoming = nodes![other]!;
        expect(incoming.group).not.toBe(node.group);
        expect(incoming.hitbox[0]).toBeGreaterThanOrEqual(node.hitbox[0] - AD4);
        expect(overlapsY(incoming.hitbox, node.hitbox)).toBe(true);
      }
      const hasRightNeighbour = nodes!.some(
        (candidate, other) =>
          other !== index &&
          candidate.group !== node.group &&
          candidate.hitbox[0] >= node.hitbox[0] + node.hitbox[2] - AD4 &&
          overlapsY(candidate.hitbox, node.hitbox),
      );
      if (hasRightNeighbour) {
        constrained++;
        expect(node.constraints.length).toBeGreaterThan(0);
      }
    });
    expect(constrained).toBeGreaterThan(0);
  });
});

describe('RectilinearConvexHull', () => {
  // oracle: full/components-compaction/connected_components-flat01/off; RectilinearConvexHull.java (splitIntoRectangles)
  it('covers the recorded nodes of each component with disjoint rectangles', () => {
    const { hullInputs, components } = capture(ID_FLAT01_ON);
    const off = new Map(descendants(layoutOf(ID_FLAT01_OFF)).map((node) => [node.id, node] as const));
    expect(hullInputs).toHaveLength(components.length);
    const area = (a: Rect, b: Rect): number =>
      Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) *
      Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
    // positions of the layered graph are those of the off row minus the padding of the compacted layout
    const pad = Math.min(...[...off.values()].flatMap((node) => [node.x, node.y]));
    components.forEach((component, index) => {
      const { rects } = hullInputs[index]!;
      rects.forEach((a, i) => rects.forEach((b, j) => i < j && expect(area(a, b)).toBeLessThan(AD4)));
      for (const node of component.getNodes()) {
        const recorded = off.get(originId(node)!)!;
        const nodeRect: Rect = [recorded.x - pad, recorded.y - pad, recorded.width, recorded.height];
        const covered = rects.reduce((sum, rect) => sum + area(rect, nodeRect), 0);
        expect(covered).toBeCloseTo(nodeRect[2] * nodeRect[3], 6);
      }
    });
  });
});

describe('Quadrant pair predicates', () => {
  // structural: Point.java:124-140 (isBothLeftOrBothRight, isOneLeftOneRight): the code is the spec, including its asymmetry
  // (the left quadrant comes first); the constants and their order are the enum's own
  const pairs = Quadrant.values().flatMap((a) => Quadrant.values().map((b) => [a, b] as const));

  it('tells two distinct quadrants of the same side apart from all other pairs', () => {
    expect(pairs).toHaveLength(16);
    for (const [a, b] of pairs) {
      expect(Quadrant.isBothLeftOrBothRight(a, b)).toBe(a !== b && a.isLeft() === b.isLeft());
    }
  });

  it('accepts exactly the pairs of a left quadrant followed by a right quadrant', () => {
    for (const [a, b] of pairs) {
      expect(Quadrant.isOneLeftOneRight(a, b)).toBe(a.isLeft() && !b.isLeft());
    }
  });
});

describe('OneDimensionalComponentsCompaction: the run delta', () => {
  // structural: OneDimensionalComponentsCompaction.java:158 (loop delta) and compact(int): the delta of a run is the sum of the groups' normalized
  // deltas after the horizontal compaction plus the sum after the vertical one; rows from the oracle
  function runDeltas(id: string): { returned: number; horizontal: number; vertical: number }[] {
    const log: { returned: number; horizontal: number; vertical: number }[] = [];
    const sums: number[] = [];
    const sumOf = (graph: { cGroups: { deltaNormalized: number }[] }): number =>
      graph.cGroups.reduce((sum, group) => sum + Math.abs(group.deltaNormalized), 0);
    const patches: Patch[] = [
      {
        // the last explicit call of a run precedes the horizontal delta sum of `prepareVertical` (Java :240)
        target: compactorProto,
        name: 'calculateGroupOffsets',
        wrap: (original) =>
          function (this: unknown, ...args: unknown[]) {
            sums.push(sumOf((this as { cGraph: { cGroups: { deltaNormalized: number }[] } }).cGraph));
            return original.apply(this, args);
          },
      },
      {
        target: componentsCompactionProto,
        name: 'compactRun',
        wrap: (original) =>
          function (this: unknown, ...args: unknown[]) {
            sums.length = 0;
            const returned = original.apply(this, args) as number;
            const graph = (this as { compactionGraph: { cGroups: { deltaNormalized: number }[] } }).compactionGraph;
            log.push({ returned, horizontal: sums[sums.length - 1]!, vertical: sumOf(graph) });
            return returned;
          },
      },
    ];
    withPatches(patches, () => replayLoopsRow(rowOf(id)));
    return log;
  }

  it.each([ID_ESW, ID_FLAT01_ON])('adds the horizontal and the vertical movement of a run (%s)', (id) => {
    const log = runDeltas(id);
    expect(log.some((entry) => entry.horizontal > 0)).toBe(true);
    for (const entry of log) {
      expect(entry.returned).toBeCloseTo(entry.horizontal + entry.vertical, 6);
    }
  });
});

describe('OneDimensionalComponentsCompaction: the extension dimensions', () => {
  interface ExtensionStep {
    readonly direction: string;
    readonly adelta: number;
    readonly before: Rect;
    readonly after: Rect;
    readonly frame: Xy;
  }

  /** Records each call of the private `updateExternalExtensionDimension(ee, pair)` with the node before and after it. */
  function extensionSteps(id: string): ExtensionStep[] {
    const steps: ExtensionStep[] = [];
    const patch: Patch = {
      target: componentsCompactionProto,
      name: 'updateExternalExtensionDimension',
      wrap: (original) =>
        function (this: unknown, ...args: unknown[]) {
          const [extension, pair] = args as [{ getDirection(): Direction }, { getFirst(): never; getSecond(): CNode }];
          const node = pair.getSecond();
          const group = pair.getFirst() as { deltaNormalized: number };
          const before = rectOf(node.hitbox);
          const result = original.apply(this, args);
          const topLeft = (this as { topLeft: XyLike }).topLeft;
          steps.push({
            direction: String(extension.getDirection()),
            adelta: group.deltaNormalized,
            before,
            after: rectOf(node.hitbox),
            frame: xy(topLeft),
          });
          return result;
        },
    };
    withPatches([patch], () => replayLoopsRow(rowOf(id)));
    return steps;
  }

  // structural: OneDimensionalComponentsCompaction.java:381-425 (updateExternalExtensionDimensions): LEFT/UP extensions stick to the top left of the drawing and
  // grow by the group's delta, RIGHT/DOWN extensions move by it and shrink, none below the extent 1; rows from the oracle
  it.each([ID_LONE_FOUR, ID_ESW, ID_NSW])('sticks, moves and resizes the extensions by the group delta (%s)', (id) => {
    const steps = extensionSteps(id);
    const MIN_EXTENT = 1;
    expect(new Set(steps.map((step) => step.direction)).size).toBeGreaterThan(2);
    for (const { direction, adelta, before, after, frame } of steps) {
      const expected: Record<string, Rect> = {
        LEFT: [frame[0], before[1], Math.max(MIN_EXTENT, before[2] + adelta), before[3]],
        RIGHT: [before[0] + adelta, before[1], Math.max(MIN_EXTENT, before[2] - adelta), before[3]],
        UP: [before[0], frame[1], before[2], Math.max(MIN_EXTENT, before[3] + adelta)],
        DOWN: [before[0], before[1] + adelta, before[2], Math.max(MIN_EXTENT, before[3] - adelta)],
      };
      expected[direction]!.forEach((value, index) => expect(after[index]).toBeCloseTo(value, 6));
    }
  });
});

describe('ScanlineConstraintCalculator: the timestamp order', () => {
  // structural: ScanlineConstraintCalculator.java:163 (constraintsScanlineComparator): equal coordinates sort the upper border (`low` false,
  // y + height) before the lower one (`low` true, y)
  it('orders the high border before the low border at an equal coordinate and by coordinate otherwise', () => {
    const compare = (
      new ScanlineConstraintCalculator() as unknown as {
        constraintsScanlineComparator(a: Timestamp, b: Timestamp): number;
      }
    ).constraintsScanlineComparator;
    const node = (y: number, height: number): CNode => new CRectNode(() => 0, new ElkRectangle(0, y, 1, height));
    const upper = node(0, 10);
    const lower = node(10, 5);
    expect(compare(new Timestamp(upper, false), new Timestamp(lower, true))).toBeLessThan(0);
    expect(compare(new Timestamp(lower, true), new Timestamp(upper, false))).toBeGreaterThan(0);
    expect(compare(new Timestamp(upper, true), new Timestamp(lower, true))).toBeLessThan(0);
    expect(compare(new Timestamp(upper, false), new Timestamp(upper, false))).toBe(0);
  });
});
