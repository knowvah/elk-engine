// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the ComponentsCompactor classes (mission 7g, T21c, W14/F12). The compactor is constructed by the three graph
// placers under `compaction.connectedComponents`, so every case replays one oracle row through `replayLoopsRow` while
// test-scoped wrappers on prototype methods capture the compactor's internal state (restored afterwards); the assertion then
// compares that state with the row's recorded layout (L4: every literal is read from the row, coordinates at 1e-6). Cases with
// no row for the fact derive the expectation from the Java line they cite and say so.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLoopsRows, replayLoopsRow, type LoopsRow } from '../../../../test/helpers/layered-loops-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ComponentsCompactor } from './ComponentsCompactor.js';
import { ComponentsCompactorEdgeTransformer } from './ComponentsCompactorEdgeTransformer.js';
import type { ComponentsCompactorInternalComponent } from './ComponentsCompactorInternalComponent.js';
import type { LGraph } from '../graph/LGraph.js';
import { KVector } from '../../../core/math/KVector.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';

const AD4 = 1e-6;

const ID_LONE_FOUR = 'sites/ComponentsCompactor/loneExternalPorts/fourSides';
const ID_LONE_NS = 'sites/ComponentsCompactor/loneExternalPorts/northSouth';
const ID_ESW = 'sites/ComponentsCompactor/threeSideExtension/ESW';
const ID_NSW = 'sites/ComponentsCompactor/threeSideExtension/NSW';
const ID_FLAT_SCENARIO = 'scenarios/ComponentsCompactor/flat-components/ORTHOGONAL';
const ID_FLAT01_ON = 'full/components-compaction/connected_components-flat01/on';
const ID_FLAT01_OFF = 'full/components-compaction/connected_components-flat01/off';

/** The layout of an ELK JSON element of a row (`expected.layout`). */
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
interface XyLike {
  x: number;
  y: number;
}
interface FrameFields {
  graphTopLeft: XyLike;
  graphBottomRight: XyLike;
}

interface ExtensionSnapshot {
  readonly direction: string;
  readonly rect: Rect;
  readonly placeholder: Rect | null;
}

interface ComponentSnapshot {
  readonly sides: string[];
  readonly regularOnCreation: boolean;
  readonly hull: Rect[];
  readonly extensions: ExtensionSnapshot[];
  readonly component: ComponentsCompactorInternalComponent;
}

interface DummySnapshot {
  readonly side: string;
  readonly extPos: Xy;
  readonly extSize: Xy;
  readonly pos: Xy;
  readonly size: Xy;
  readonly ports: number;
}

interface CompactCapture {
  readonly graphs: LGraph[];
  readonly spacing: number;
  readonly before: Map<string, Xy>;
  readonly after: Map<string, Xy>;
  readonly graphSize: Xy;
  readonly offset: Xy;
  readonly frameTopLeft: Xy;
  readonly frameBottomRight: Xy;
  readonly externalPorts: { readonly side: string; readonly pos: Xy }[];
}

interface Captured {
  readonly compacts: CompactCapture[];
  readonly components: ComponentSnapshot[];
  readonly dummies: DummySnapshot[];
  readonly extPortPositions: { side: string; from: Xy; to: Xy }[];
}

const rectOf = (r: ElkRectangle): Rect => [r.x, r.y, r.width, r.height];
const xy = (v: XyLike): Xy => [v.x, v.y];

/** The identifier of a layered node's origin (`ElkNode`), or null when it has none. */
function originId(node: LNode): string | null {
  const origin = node.getProperty(InternalProperties.ORIGIN) as ElkNode | null | undefined;
  return origin === null || origin === undefined ? null : origin.getIdentifier();
}

function snapshotPositions(graphs: readonly LGraph[]): Map<string, Xy> {
  const positions = new Map<string, Xy>();
  for (const graph of graphs) {
    for (const node of graph.getLayerlessNodes()) {
      const id = originId(node);
      if (id !== null) {
        positions.set(id, xy(node.getPosition()));
      }
    }
  }
  return positions;
}

type AnyFn = (this: unknown, ...args: unknown[]) => unknown;

/** A test-scoped wrapper of `target[name]`: receives the original and returns the replacement. */
interface Patch {
  readonly target: object;
  readonly name: string;
  readonly wrap: (original: AnyFn) => AnyFn;
}

/** Applies the patches for the duration of `body` and restores every original afterwards. */
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

const compactorProto = ComponentsCompactor.prototype as object;
const edgeTransformerProto = ComponentsCompactorEdgeTransformer.prototype as object;

function compactPatch(captured: Captured): Patch {
  return {
    target: compactorProto,
    name: 'compact',
    wrap: (original) =>
      function (this: unknown, ...args: unknown[]) {
        const graphs = args[0] as LGraph[];
        const before = snapshotPositions(graphs);
        const result = original.apply(this, args);
        const self = this as ComponentsCompactor;
        const frame = this as unknown as FrameFields;
        captured.compacts.push({
          graphs,
          spacing: args[2] as number,
          before,
          after: snapshotPositions(graphs),
          graphSize: xy(self.getGraphSize()),
          offset: xy(self.getOffset()),
          frameTopLeft: xy(frame.graphTopLeft),
          frameBottomRight: xy(frame.graphBottomRight),
          externalPorts: externalPortsOf(graphs),
        });
        return result;
      },
  };
}

function externalPortsOf(graphs: readonly LGraph[]): { side: string; pos: Xy }[] {
  return graphs.flatMap((graph) =>
    graph
      .getLayerlessNodes()
      .filter((node) => node.getType() === NodeType.EXTERNAL_PORT)
      .map((node) => ({
        side: String(node.getProperty(InternalProperties.EXT_PORT_SIDE)),
        pos: xy(node.getPosition()),
      })),
  );
}

function snapshotComponent(component: ComponentsCompactorInternalComponent): ComponentSnapshot {
  return {
    sides: [...component.getExternalExtensionSides()].map(String),
    regularOnCreation: component.containsRegularNodes,
    hull: component.getHull().map(rectOf),
    extensions: component.getExternalExtensions().map((extension) => ({
      direction: String(extension.getDirection()),
      rect: rectOf(extension.getRepresentor()),
      placeholder: extension.getPlaceholder === undefined ? null : rectOf(extension.getPlaceholder()!),
    })),
    component,
  };
}

const componentPatch = (captured: Captured): Patch => ({
  target: compactorProto,
  name: 'transformLGraph',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const component = original.apply(this, args) as ComponentsCompactorInternalComponent;
      captured.components.push(snapshotComponent(component));
      return component;
    },
});

const dummyPatch = (captured: Captured): Patch => ({
  target: compactorProto,
  name: 'createDummyNode',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const extPortDummy = (args[0] as LGraph).getLayerlessNodes()[0]!;
      const extPos = xy(extPortDummy.getPosition());
      const extSize = xy(extPortDummy.getSize());
      const side = String(extPortDummy.getProperty(InternalProperties.EXT_PORT_SIDE));
      const dummy = original.apply(this, args) as LNode;
      captured.dummies.push({
        side,
        extPos,
        extSize,
        pos: xy(dummy.getPosition()),
        size: xy(dummy.getSize()),
        ports: dummy.getPorts().length,
      });
      return dummy;
    },
});

const extPortPatch = (captured: Captured): Patch => ({
  target: edgeTransformerProto,
  name: 'getExternalPortPosition',
  wrap: (original) =>
    function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args) as { x: number; y: number };
      captured.extPortPositions.push({ side: String(args[1]), from: xy(args[0] as XyLike), to: xy(result) });
      return result;
    },
});

/** Replays a row with the compactor's internals observed; cached per row id. */
const captureCache = new Map<string, Captured>();
function capture(id: string): Captured {
  const cached = captureCache.get(id);
  if (cached !== undefined) {
    return cached;
  }
  const captured: Captured = { compacts: [], components: [], dummies: [], extPortPositions: [] };
  const patches = [compactPatch(captured), componentPatch(captured), dummyPatch(captured), extPortPatch(captured)];
  // the replay itself is compared by LayeredLoopsVectors / LayeredLoopsSites / ComponentsCompactor.test.ts; a case here
  // asserts the captured class-level fact only, so a failure names the class and not a row
  withPatches(patches, () => replayLoopsRow(rowOf(id)));
  captureCache.set(id, captured);
  return captured;
}

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

/** The recorded layout of the element the compactor ran for (`expected.layout`): the compound `c`, or the root. */
const layoutOf = (id: string): JsonShape => (rowOf(id).expected as unknown as { layout: JsonShape }).layout;
/** The imported graph of a row (`input.elk`). */
const inputOf = (id: string): JsonShape => (rowOf(id).input as unknown as { elk: JsonShape }).elk;

function descendants(shape: JsonShape): JsonShape[] {
  return (shape.children ?? []).flatMap((child) => [child, ...descendants(child)]);
}

const sideOf = (port: JsonShape): string => port.layoutOptions!['port.side']!;

/** The ports of the compound the site rows import (`c`), in input order. */
const inputPortsOf = (id: string): JsonShape[] => [...(inputOf(id).children![0]!.ports ?? [])];

function recordedPort(id: string, side: string): JsonShape {
  const port = (layoutOf(id).ports ?? []).find((candidate) => sideOf(candidate) === side);
  if (port === undefined) {
    throw new Error(`no ${side} port in ${id}`);
  }
  return port;
}

function compactOf(id: string): CompactCapture {
  const { compacts } = capture(id);
  expect(compacts).toHaveLength(1);
  return compacts[0]!;
}

/**
 * The padding the row shows: the recorded position of every regular node minus the position the compactor left it at (the
 * compacted layout starts at 0, the padding is uniform: the two axes and every node must agree).
 */
function paddingOf(id: string): number {
  const { after } = compactOf(id);
  const pads = descendants(layoutOf(id)).flatMap((node) => {
    const placed = after.get(node.id);
    return placed === undefined ? [] : [node.x - placed[0], node.y - placed[1]];
  });
  expect(pads.length).toBeGreaterThan(1);
  for (const pad of pads) {
    expect(pad).toBeCloseTo(pads[0]!, 6);
  }
  return pads[0]!;
}

const bounds = (rects: readonly Rect[]): Rect => {
  const minX = Math.min(...rects.map((r) => r[0]));
  const minY = Math.min(...rects.map((r) => r[1]));
  return [
    minX,
    minY,
    Math.max(...rects.map((r) => r[0] + r[2])) - minX,
    Math.max(...rects.map((r) => r[1] + r[3])) - minY,
  ];
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const SITE_ROWS = [ID_LONE_FOUR, ID_LONE_NS, ID_ESW, ID_NSW];

describe('ComponentsCompactor.compact: size and offsets', () => {
  // oracle: sites/ComponentsCompactor/{loneExternalPorts/{fourSides,northSouth},threeSideExtension/{ESW,NSW}}, scenarios/ComponentsCompactor/flat-components/ORTHOGONAL,
  // full/components-compaction/connected_components-flat01/on; ComponentsCompactor.java:181-189 (getGraphSize)
  it.each([...SITE_ROWS, ID_FLAT_SCENARIO, ID_FLAT01_ON])(
    'getGraphSize is the recorded container size minus its padding (%s)',
    (id) => {
      const pad = paddingOf(id);
      const layout = layoutOf(id);
      const size = compactOf(id).graphSize;
      expect(size[0]).toBeCloseTo(layout.width - 2 * pad, 6);
      expect(size[1]).toBeCloseTo(layout.height - 2 * pad, 6);
    },
  );

  // oracle: full/components-compaction/connected_components-flat01/{on,off}; ComponentsCompactor.java:130-145 (applyPositions)
  it('moves every node by the difference of its recorded positions in the compacted and the uncompacted variant', () => {
    const { before, after, offset } = compactOf(ID_FLAT01_ON);
    const off = new Map(descendants(layoutOf(ID_FLAT01_OFF)).map((node) => [node.id, node] as const));
    const on = descendants(layoutOf(ID_FLAT01_ON));
    expect(on.length).toBeGreaterThan(1);
    for (const node of on) {
      const uncompacted = off.get(node.id)!;
      expect(after.get(node.id)![0] - before.get(node.id)![0]).toBeCloseTo(node.x - uncompacted.x, 6);
      expect(after.get(node.id)![1] - before.get(node.id)![1]).toBeCloseTo(node.y - uncompacted.y, 6);
    }
    // no external edge: the offset the compactor reports is zero
    expect(Math.abs(offset[0])).toBeLessThan(AD4);
    expect(Math.abs(offset[1])).toBeLessThan(AD4);
  });

  // oracle: full/components-compaction/connected_components-flat01/off; ComponentsCompactor.java:90-113 (compact: the graph frame)
  it('takes the graph frame from the bounds of the uncompacted layout', () => {
    const { frameTopLeft, frameBottomRight } = compactOf(ID_FLAT01_ON);
    const pad = paddingOf(ID_FLAT01_ON);
    const rects = descendants(layoutOf(ID_FLAT01_OFF)).map((node): Rect => [node.x, node.y, node.width, node.height]);
    const [x, y, width, height] = bounds(rects);
    expect(frameTopLeft[0]).toBeCloseTo(x - pad, 6);
    expect(frameTopLeft[1]).toBeCloseTo(y - pad, 6);
    expect(frameBottomRight[0]).toBeCloseTo(x + width - pad, 6);
    expect(frameBottomRight[1]).toBeCloseTo(y + height - pad, 6);
  });

  // oracle: full/components-compaction/connected_components-flat01/off; ComponentsCompactor.java:201-234 (transformLGraph: hull of a component)
  it('builds the hull of each component around the nodes of the uncompacted layout', () => {
    const { components } = capture(ID_FLAT01_ON);
    const pad = paddingOf(ID_FLAT01_ON);
    const off = new Map(descendants(layoutOf(ID_FLAT01_OFF)).map((node) => [node.id, node] as const));
    expect(components).toHaveLength(5);
    for (const { component, hull } of components) {
      const nodes = component.getNodes().map((node) => off.get(originId(node)!)!);
      const [x, y, width, height] = bounds(nodes.map((node): Rect => [node.x, node.y, node.width, node.height]));
      const [hx, hy, hw, hh] = bounds(hull);
      // bend points of inner edges (:371-379) may widen the hull beyond the nodes, never narrow it
      expect(hx).toBeLessThanOrEqual(x - pad + AD4);
      expect(hy).toBeLessThanOrEqual(y - pad + AD4);
      expect(hx + hw).toBeGreaterThanOrEqual(x - pad + width - AD4);
      expect(hy + hh).toBeGreaterThanOrEqual(y - pad + height - AD4);
    }
  });
});

describe('ComponentsCompactor: external ports', () => {
  // oracle: sites/ComponentsCompactor/{loneExternalPorts/{fourSides,northSouth},threeSideExtension/{ESW,NSW}}; ComponentsCompactor.java:136-145 (adjust positions of external ports),
  // :536-548 (getExternalPortPosition)
  it.each(SITE_ROWS)('leaves each external port dummy at the recorded port coordinate minus the padding (%s)', (id) => {
    const pad = paddingOf(id);
    const { externalPorts } = compactOf(id);
    const ports = inputPortsOf(id);
    expect(externalPorts).toHaveLength(ports.length);
    for (const { side, pos } of externalPorts) {
      const recorded = recordedPort(id, side);
      const alongSide = side === 'WEST' || side === 'EAST' ? [pos[1], recorded.y] : [pos[0], recorded.x];
      expect(alongSide[0]! + pad).toBeCloseTo(alongSide[1]!, 6);
    }
  });

  // structural: each of the four branches of Java :536-548 (min for WEST/NORTH, max for EAST/SOUTH), from the recorded calls
  it('moves a port position outwards to the frame and never inwards', () => {
    const calls = capture(ID_LONE_FOUR).extPortPositions;
    const { frameTopLeft: tl, frameBottomRight: br } = compactOf(ID_LONE_FOUR);
    expect(new Set(calls.map((call) => call.side))).toEqual(new Set(['WEST', 'NORTH', 'EAST', 'SOUTH']));
    for (const { side, from, to } of calls) {
      const expected: Record<string, Xy> = {
        WEST: [Math.min(from[0], tl[0]), from[1]],
        NORTH: [from[0], Math.min(tl[1], from[1])],
        EAST: [Math.max(br[0], from[0]), from[1]],
        SOUTH: [from[0], Math.max(br[1], from[1])],
      };
      expect(to[0]).toBeCloseTo(expected[side]![0], 6);
      expect(to[1]).toBeCloseTo(expected[side]![1], 6);
    }
    // the outward move is what the oracle records: at least one call moved its port
    expect(calls.some((call) => call.to[0] !== call.from[0] || call.to[1] !== call.from[1])).toBe(true);
  });
});

describe('ComponentsCompactor: lone external-port components', () => {
  const SHIFT: Record<string, Xy> = { WEST: [2, 0], NORTH: [0, 2], EAST: [-2, 0], SOUTH: [0, -2] };
  const MIN_DUMMY_EXTENT = 1;

  // oracle: sites/ComponentsCompactor/loneExternalPorts/{fourSides,northSouth}; ComponentsCompactor.java:113, 205-206
  it.each([ID_LONE_FOUR, ID_LONE_NS])(
    'makes one regular-looking component per external port and one for x (%s)',
    (id) => {
      const { components, compacts } = capture(id);
      const ports = inputPortsOf(id);
      expect(compacts[0]!.graphs).toHaveLength(ports.length + inputOf(id).children![0]!.children!.length);
      const lone = components.filter((snapshot) => !snapshot.regularOnCreation);
      expect(lone.map((snapshot) => snapshot.sides)).toEqual(ports.map((port) => [sideOf(port)]));
      // line 113: a component with external extension sides counts as containing regular nodes afterwards
      expect(components.every((snapshot) => snapshot.component.containsRegularNodes)).toBe(true);
      expect(components.filter((snapshot) => snapshot.sides.length === 0)).toHaveLength(1);
    },
  );

  // oracle: sites/ComponentsCompactor/loneExternalPorts/{fourSides,northSouth}; ComponentsCompactor.java:310-345 (createDummyNode)
  it.each([ID_LONE_FOUR, ID_LONE_NS])('creates the dummy node of each lone port at the port side (%s)', (id) => {
    const { dummies } = capture(id);
    const ports = inputPortsOf(id);
    expect(dummies.map((dummy) => dummy.side)).toEqual(ports.map(sideOf));
    ports.forEach((port, index) => {
      const dummy = dummies[index]!;
      // the extent along the side is the recorded port's size; the other one is lifted to the minimum
      const alongSide = sideOf(port) === 'WEST' || sideOf(port) === 'EAST' ? 1 : 0;
      expect(dummy.size[alongSide]).toBeCloseTo(port[alongSide === 1 ? 'height' : 'width'], 6);
      expect(dummy.size[1 - alongSide]).toBe(Math.max(MIN_DUMMY_EXTENT, dummy.extSize[1 - alongSide]!));
      expect(dummy.pos[0]).toBeCloseTo(dummy.extPos[0] + SHIFT[sideOf(port)]![0], 6);
      expect(dummy.pos[1]).toBeCloseTo(dummy.extPos[1] + SHIFT[sideOf(port)]![1], 6);
      expect(dummy.ports).toBe(1);
    });
  });

  // oracle: sites/ComponentsCompactor/loneExternalPorts/fourSides; ComponentsCompactor.java:310 (createDummyNode), :361 (componentHullPoints)
  it('uses the dummy rectangle as the hull of a lone port component', () => {
    const { components, dummies } = capture(ID_LONE_FOUR);
    const lone = components.filter((snapshot) => !snapshot.regularOnCreation);
    expect(lone).toHaveLength(dummies.length);
    lone.forEach((snapshot, index) => {
      const dummy = dummies[index]!;
      expect(snapshot.hull).toHaveLength(1);
      expect(snapshot.hull[0]).toEqual([dummy.pos[0], dummy.pos[1], dummy.size[0], dummy.size[1]]);
    });
  });
});

describe('ComponentsCompactor: external extensions', () => {
  const DIRECTION_OF: Record<string, string> = { WEST: 'LEFT', EAST: 'RIGHT', NORTH: 'UP', SOUTH: 'DOWN' };

  // oracle: sites/ComponentsCompactor/threeSideExtension/{ESW,NSW}; ComponentsCompactor.java:231-297 (one extension per side)
  it.each([ID_ESW, ID_NSW])('creates one union extension per connected side, in the recorded port order (%s)', (id) => {
    const { components } = capture(id);
    const sides = inputPortsOf(id).map(sideOf);
    const connected = components.find((snapshot) => snapshot.sides.length > 0)!;
    expect(new Set(connected.sides)).toEqual(new Set(sides));
    expect(connected.extensions.map((extension) => extension.direction)).toEqual(
      connected.sides.map((side) => DIRECTION_OF[side]),
    );
    expect(connected.extensions.every((extension) => extension.placeholder !== null)).toBe(true);
  });

  // structural: Java :238-290 (the four `case`s): each extension ends at the frame, each placeholder lies on the frame edge of its side
  it.each([ID_LONE_FOUR, ID_ESW, ID_NSW])('anchors extension and placeholder rectangles to the frame (%s)', (id) => {
    const { frameTopLeft: tl, frameBottomRight: br } = compactOf(id);
    const extensions = capture(id).components.flatMap((snapshot, index) =>
      snapshot.extensions.map((extension) => ({
        extension,
        side: snapshot.sides[snapshot.extensions.indexOf(extension)]!,
        index,
      })),
    );
    expect(extensions.length).toBeGreaterThan(2);
    for (const { extension, side } of extensions) {
      const [x, y, w, h] = extension.rect;
      const [px, py, pw, ph] = extension.placeholder!;
      const edge: Record<string, readonly [number, number]> = {
        WEST: [x - tl[0], px - tl[0]],
        NORTH: [y - tl[1], py - tl[1]],
        EAST: [x + w - br[0], px + pw - br[0]],
        SOUTH: [y + h - br[1], py + ph - br[1]],
      };
      expect(edge[side]![0]).toBeCloseTo(0, 6);
      expect(edge[side]![1]).toBeCloseTo(0, 6);
    }
  });
});

describe('ComponentsCompactorEdgeTransformer.getPortPositionOnMargin', () => {
  // structural: ComponentsCompactor.java:550-568 (no recorded row has a node margin at an external edge's inner port, so no
  // oracle row discriminates the four arms): the anchor moves outwards by the node's margin of the port's side
  const MARGINS = { top: 3, right: 5, bottom: 7, left: 11 };

  it.each([
    [PortSide.NORTH, [0, -MARGINS.top]],
    [PortSide.EAST, [MARGINS.right, 0]],
    [PortSide.SOUTH, [0, MARGINS.bottom]],
    [PortSide.WEST, [-MARGINS.left, 0]],
  ] as const)('moves the anchor of a %s port outwards by that side margin', (side, shift) => {
    const node = new LNode(null);
    Object.assign(node.getMargin(), MARGINS);
    const port = new LPort();
    port.setNode(node);
    port.setSide(side);
    port.getPosition().reset().add(new KVector(13, 17));
    const anchor = port.getAbsoluteAnchor().clone();
    const transformer = new ComponentsCompactorEdgeTransformer(new KVector(0, 0), new KVector(1, 1));
    const result = transformer.getPortPositionOnMargin(port);
    expect([result.x, result.y]).toEqual([anchor.x + shift[0], anchor.y + shift[1]]);
  });
});
