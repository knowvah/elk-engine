// SPDX-License-Identifier: EPL-2.0
// The TS twin of the dumps of tools/vectors/DiscoVectors.java (mission 8b, T7; the header of that file is the contract):
//   dumpDCGraph / dumpComponent / dumpElement / dumpExtension   the DCGraph as the `import` stop records it: elements sorted by
//                          (kind rank, bounds minX, minY, width, height by Double.compare, ref), extensions by (direction ordinal, offset x,
//                          offset y, width), props sorted by option id. `kind` and `ref` come from the ElkGraph the element was made from,
//                          which a DCGraph does not know: the caller passes an `Identify` function (T9: the transformer's mapping; T7: the
//                          identities of the rebuild);
//   dumpDCPolyomino / rle   a DCPolyomino as the `polys` stop records it (the extension triples sorted by (direction ordinal, second, third),
//                          cells one run-length string per grid row: "<count><char>" pairs, "_" empty, "X" blocked, "w" weakly blocked);
//   rebuildDCGraph          the inverse for the import stop: a DCGraph with the recorded components, elements (polygon, parent coordinates,
//                          extensions), dimensions, inset and properties;
//   compareJson             a readable diff (path, expected, actual); ids, list lengths and order, key order, strings, integers and booleans
//                          exact, doubles (16-hex strings, both sides) within `tol`, counting the raw-bit identical and the merely close ones.
// What the rebuild cannot restore (not in the dump): the order of a component's elements (the dump is sorted, so the rebuild inserts in
// that order; Java's order is hash derived, FD4); the ElkGraph an element came from (kind and ref are kept beside the graph, not in it);
// `componentSpacing` (an argument of the transformer, returned beside the graph); a property whose option the registered metadata does not
// know (rejected by name).
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayoutOptionDataType } from '../../src/core/data/LayoutOptionDataType.js';
import type { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { MapPropertyHolder } from '../../src/graph/properties/MapPropertyHolder.js';
import { PolyominoOptions } from '../../src/alg/common/compaction/options/PolyominoOptions.js';
import type { PlanarGrid } from '../../src/alg/common/polyomino/structures/PlanarGrid.js';
import type { Polyomino } from '../../src/alg/common/polyomino/structures/Polyomino.js';
import { DCComponent } from '../../src/alg/disco/graph/DCComponent.js';
import { DCDirection } from '../../src/alg/disco/graph/DCDirection.js';
import { DCElement } from '../../src/alg/disco/graph/DCElement.js';
import { DCExtension } from '../../src/alg/disco/graph/DCExtension.js';
import { DCGraph } from '../../src/alg/disco/graph/DCGraph.js';
import type { DCPolyomino } from '../../src/alg/disco/structures/DCPolyomino.js';
import { DisCoMetaDataProvider } from '../../src/alg/disco/options/DisCoMetaDataProvider.js';
import { DisCoOptions } from '../../src/alg/disco/options/DisCoOptions.js';
import { compare as doubleCompare } from '../../src/java/lang/DoubleCompare.js';
import { compareTo as stringCompare } from '../../src/java/lang/JavaString.js';
import type { JavaEnum } from '../../src/java/lang/JavaClass.js';
import {
  decodeHex,
  ELEMENT_KINDS,
  encodeHex,
  isHex,
  STEP_IMPORT,
  type ComponentEntry,
  type DirectionName,
  type ElementEntry,
  type ElementKind,
  type ExtensionEntry,
  type Hex,
  type HexPoint,
  type ImportStop,
  type PolyEntry,
  type PropEntry,
} from './disco-replay-rows.js';

/** The tolerance of AD-4 for numeric coordinates and sizes. */
export const TOLERANCE = 1e-6;

const PROBE_OPTION = 'org.eclipse.elk.disco.componentCompaction.strategy';
const POLYOMINO_PROBE_OPTION = 'org.eclipse.elk.polyomino.fill';

/** Registers the polyomino and DisCo option models once per module registry (the service keeps the core options only). */
export function registerDisco(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(POLYOMINO_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new PolyominoOptions());
  }
  if (service.getOptionData(PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new DisCoMetaDataProvider(), new DisCoOptions());
  }
}

// ------------------------------------------------------------------------------------------------------------
// dump

/** What a DCElement was made from: its kind and the id of the ElkGraph element (the recorder's `kind` and `ref`). */
export interface ElementIdentity {
  readonly kind: ElementKind;
  readonly ref: string;
}
export type Identify = (element: DCElement) => ElementIdentity;

const point = (v: KVector): HexPoint => [encodeHex(v.x), encodeHex(v.y)];

export function dumpExtension(extension: DCExtension): ExtensionEntry {
  return {
    dir: extension.getDirection().name() as DirectionName,
    offset: point(extension.getOffset()),
    width: encodeHex(extension.getWidth()),
  };
}

function compareExtensions(a: DCExtension, b: DCExtension): number {
  return (
    a.getDirection().ordinal() - b.getDirection().ordinal() ||
    doubleCompare(a.getOffset().x, b.getOffset().x) ||
    doubleCompare(a.getOffset().y, b.getOffset().y) ||
    doubleCompare(a.getWidth(), b.getWidth())
  );
}

/** One DCElement in the recorder's `element` shape (`DCElement.getCoords` flattens the polygon, as the recorder does). */
export function dumpElement(element: DCElement, identity: ElementIdentity): ElementEntry {
  const b = element.getBounds();
  const coords = element.getCoords();
  const shape: HexPoint[] = [];
  for (let k = 0; k + 1 < coords.length; k += 2) {
    shape.push([encodeHex(coords[k]!), encodeHex(coords[k + 1]!)]);
  }
  const parentCoords = element.getParentcoords();
  return {
    kind: identity.kind,
    ref: identity.ref,
    shape,
    bounds: [encodeHex(b.x), encodeHex(b.y), encodeHex(b.width), encodeHex(b.height)],
    parentCoords: parentCoords === null ? null : point(parentCoords),
    extensions: [...element.getExtensions()].sort(compareExtensions).map(dumpExtension),
  };
}

interface RankedElement {
  readonly entry: ElementEntry;
  readonly bounds: readonly number[];
}

function compareRanked(a: RankedElement, b: RankedElement): number {
  let result = ELEMENT_KINDS.indexOf(a.entry.kind) - ELEMENT_KINDS.indexOf(b.entry.kind);
  for (let k = 0; result === 0 && k < a.bounds.length; k++) {
    result = doubleCompare(a.bounds[k]!, b.bounds[k]!);
  }
  return result !== 0 ? result : stringCompare(a.entry.ref, b.entry.ref);
}

/** One component in the import stop's shape; `first` is the id of the DFS start node of the split (not known to a DCGraph). */
export function dumpComponent(
  component: DCComponent,
  index: number,
  first: string,
  identify: Identify,
): ComponentEntry {
  const ranked: RankedElement[] = [...component.getElements()].map((element) => {
    const b = element.getBounds();
    return { entry: dumpElement(element, identify(element)), bounds: [b.x, b.y, b.width, b.height] };
  });
  ranked.sort(compareRanked);
  const dims = component.getDimensionsOfBoundingRectangle();
  return {
    index,
    first,
    id: component.getId(),
    offset: point(component.getOffset()),
    minCorner: point(component.getMinCorner()),
    bounds: point(dims),
    elements: ranked.map((r) => r.entry),
  };
}

/** The value of a property in the recorder's `propValue` form (the option's type tells an INT from a DOUBLE). */
export function dumpPropValue(property: IProperty<unknown>, value: unknown): PropEntry | readonly HexPoint[] | null {
  const data = LayoutMetaDataService.getInstance().getOptionData(property.getId());
  const type = data === null ? null : data.getType();
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return type === LayoutOptionDataType.INT ? value : encodeHex(value);
  }
  if (value instanceof ElkPadding || value instanceof ElkMargin) {
    return [value.top, value.right, value.bottom, value.left].map(encodeHex);
  }
  if (value instanceof KVector) {
    return point(value) as unknown as readonly string[];
  }
  if (value instanceof KVectorChain) {
    return [...value].map(point);
  }
  if (typeof value === 'object' && Symbol.iterator in value) {
    return [...(value as Iterable<JavaEnum>)].map((o) => o.name()).sort(stringCompare);
  }
  return (value as JavaEnum).name();
}

/** The explicitly set properties of a holder, sorted by option id (the recorder's `propsJson`). */
export function dumpProps(holder: MapPropertyHolder): Record<string, PropEntry> {
  const entries: [string, PropEntry][] = [];
  for (const [property, value] of holder.getAllProperties()) {
    entries.push([property.getId(), dumpPropValue(property, value) as PropEntry]);
  }
  entries.sort((a, b) => stringCompare(a[0], b[0]));
  return Object.fromEntries(entries);
}

/**
 * The DCGraph as the import stop records it. `firsts[i]` is the DFS start node id of component i; `componentSpacing` is the
 * transformer's argument (not stored in the graph).
 */
export function dumpDCGraph(
  graph: DCGraph,
  identify: Identify,
  firsts: readonly string[],
  componentSpacing: number,
): ImportStop {
  const dimensions = graph.getDimensions();
  return {
    step: STEP_IMPORT,
    componentSpacing: encodeHex(componentSpacing),
    inset: encodeHex(graph.getInset()),
    dimensions: dimensions === null ? null : point(dimensions),
    props: dumpProps(graph),
    components: [...graph.getComponents()].map((c, i) => dumpComponent(c, i, firsts[i]!, identify)),
  };
}

/** One run-length coded string per grid row (the recorder's `rle`). */
export function rle(grid: PlanarGrid): string[] {
  const rows: string[] = [];
  for (let y = 0; y < grid.getHeight(); y++) {
    let row = '';
    let prev = '';
    let run = 0;
    for (let x = 0; x < grid.getWidth(); x++) {
      const ch = grid.isEmpty(x, y) ? '_' : grid.isBlocked(x, y) ? 'X' : grid.isWeaklyBlocked(x, y) ? 'w' : '?';
      if (ch === '?') {
        throw new Error('grid cell in the fourth state');
      }
      if (ch === prev) {
        run++;
      } else {
        row += run > 0 ? `${String(run)}${prev}` : '';
        prev = ch;
        run = 1;
      }
    }
    rows.push(run > 0 ? `${row}${String(run)}${prev}` : row);
  }
  return rows;
}

/** A DCPolyomino in the `polys` stop's shape (the recorder's `polyJson`). */
export function dumpDCPolyomino(p: DCPolyomino, component: number): PolyEntry {
  const extensions = [...(p as Polyomino).getPolyominoExtensions()]
    .sort(
      (a, b) =>
        a.getFirst().ordinal() - b.getFirst().ordinal() || a.getSecond() - b.getSecond() || a.getThird() - b.getThird(),
    )
    .map((e) => ({ dir: e.getFirst().name() as DirectionName, offset: e.getSecond(), width: e.getThird() }));
  return {
    component,
    id: p.getId(),
    x: p.getX(),
    y: p.getY(),
    w: p.getWidth(),
    h: p.getHeight(),
    centerX: p.getCenterX(),
    centerY: p.getCenterY(),
    cellSizeX: encodeHex(p.getCellSizeX()),
    cellSizeY: encodeHex(p.getCellSizeY()),
    offset: point(p.getOffset()),
    cells: rle(p),
    extensions,
  };
}

// ------------------------------------------------------------------------------------------------------------
// rebuild

const decodePoint = (p: HexPoint): KVector => new KVector(decodeHex(p[0]), decodeHex(p[1]));

/** The text `LayoutOptionData.parseValue` takes for a recorded list: a padding or margin (four hex doubles) or an enum set. */
function listText(list: readonly string[]): string {
  if (list.length === 4 && list.every(isHex)) {
    const [top, right, bottom, left] = list.map((h) => String(decodeHex(h)));
    return `top=${top!},right=${right!},bottom=${bottom!},left=${left!}`;
  }
  return `[${list.join(',')}]`;
}

/** Sets a recorded property on the holder through the registered option data (the option's type tells how to read the entry). */
export function restoreProp(holder: MapPropertyHolder, id: string, entry: PropEntry): void {
  const data: LayoutOptionData | null = LayoutMetaDataService.getInstance().getOptionData(id);
  if (data === null) {
    throw new Error(`property ${id}: no registered option (registerDisco not called?)`);
  }
  let text: string;
  if (Array.isArray(entry)) {
    text = listText(entry as readonly string[]);
  } else if (data.getType() === LayoutOptionDataType.DOUBLE && typeof entry === 'string') {
    text = String(decodeHex(entry));
  } else {
    text = String(entry);
  }
  const value = data.parseValue(text);
  if (value === null) {
    throw new Error(`property ${id}: the recorded value ${JSON.stringify(entry)} does not parse`);
  }
  holder.setProperty(data, value);
}

/** A rebuilt DCGraph with what the dump knows beside it. */
export interface RebuiltDCGraph {
  readonly graph: DCGraph;
  /** The components in DCGraph order. */
  readonly components: readonly DCComponent[];
  /** Kind and ref of every element, by identity. */
  readonly identities: ReadonlyMap<DCElement, ElementIdentity>;
  /** The DFS start node id per component. */
  readonly firsts: readonly string[];
  readonly componentSpacing: number;
}

function rebuildElement(entry: ElementEntry): DCElement {
  const element = new DCElement(new KVectorChain(entry.shape.map(decodePoint)));
  if (entry.parentCoords !== null) {
    element.setParentCoords(decodePoint(entry.parentCoords));
  }
  for (const ext of entry.extensions) {
    const width = decodeHex(ext.width);
    const offset = decodePoint(ext.offset);
    const bounds = element.getBounds();
    // The constructor derives the offset from the attachment point; the recorded offset is restored bit for bit afterwards
    // (the cell arithmetic of DCPolyomino truncates, so a one-ulp error could move an extension by a cell).
    const direction = DCDirection.valueOf(ext.dir);
    const half = width / 2;
    const middle = new KVector(offset.x + bounds.x, offset.y + bounds.y);
    if (direction.isHorizontal()) {
      middle.add(0, half);
    } else {
      middle.add(half, 0);
    }
    const extension = new DCExtension(element, direction, middle, width);
    extension.getOffset().x = offset.x;
    extension.getOffset().y = offset.y;
  }
  return element;
}

/** Rebuilds a DCGraph from the `import` stop: components, elements with polygons and extensions, ids, offsets, dimensions, props. */
export function rebuildDCGraph(stop: ImportStop): RebuiltDCGraph {
  registerDisco();
  const identities = new Map<DCElement, ElementIdentity>();
  const groups: DCElement[][] = stop.components.map((c) =>
    c.elements.map((entry) => {
      const element = rebuildElement(entry);
      identities.set(element, { kind: entry.kind, ref: entry.ref });
      return element;
    }),
  );
  const graph = new DCGraph(groups, decodeHex(stop.inset));
  const components = [...graph.getComponents()];
  components.forEach((component, i) => {
    const entry = stop.components[i]!;
    component.setId(entry.id);
    component.setOffset(decodePoint(entry.offset));
  });
  if (stop.dimensions !== null) {
    graph.setDimensions(decodePoint(stop.dimensions));
  }
  for (const [id, entry] of Object.entries(stop.props)) {
    restoreProp(graph, id, entry);
  }
  return {
    graph,
    components,
    identities,
    firsts: stop.components.map((c) => c.first),
    componentSpacing: decodeHex(stop.componentSpacing),
  };
}

// ------------------------------------------------------------------------------------------------------------
// compare

/** A comparison result: the differences (empty when equal) and how the 16-hex doubles matched. */
export interface Comparison {
  readonly differences: string[];
  /** Hex pairs equal bit for bit. */
  hexExact: number;
  /** Hex pairs different in bits but within the tolerance. */
  hexClose: number;
}

/** Whether two doubles are equal (NaN equals NaN) or differ by at most `tol`. */
export function closeEnough(expected: number, actual: number, tol: number): boolean {
  if (Number.isNaN(expected) || Number.isNaN(actual)) {
    return Number.isNaN(expected) && Number.isNaN(actual);
  }
  if (expected === actual) {
    return true;
  }
  return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= tol;
}

function compareHex(expected: Hex, actual: Hex, tol: number, at: string, result: Comparison): void {
  if (expected === actual) {
    result.hexExact++;
  } else if (closeEnough(decodeHex(expected), decodeHex(actual), tol)) {
    result.hexClose++;
  } else {
    result.differences.push(
      `${at}: expected ${String(decodeHex(expected))} (${expected}), got ${String(decodeHex(actual))} (${actual})`,
    );
  }
}

function compareInto(expected: unknown, actual: unknown, tol: number, at: string, result: Comparison): void {
  if (typeof expected === 'string' && isHex(expected) && typeof actual === 'string' && isHex(actual)) {
    compareHex(expected, actual, tol, at, result);
  } else if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      result.differences.push(`${at}: length ${String(expected.length)} expected, got ${String(actual.length)}`);
      return;
    }
    expected.forEach((item, i) => compareInto(item, actual[i], tol, `${at}[${String(i)}]`, result));
  } else if (isPlain(expected) && isPlain(actual)) {
    const keys = Object.keys(expected);
    if (keys.join('\u0000') !== Object.keys(actual).join('\u0000')) {
      result.differences.push(`${at}: keys [${keys.join(',')}] expected, got [${Object.keys(actual).join(',')}]`);
      return;
    }
    for (const key of keys) {
      compareInto(expected[key], actual[key], tol, `${at}.${key}`, result);
    }
  } else if (!Object.is(expected, actual)) {
    result.differences.push(`${at}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const isPlain = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Compares a recorded value with a TS dump at the AD-4 bar: ids, counts, list order, key order and non-numeric values exact, every
 * 16-hex double (on both sides) within `tol`. Pass `into` to accumulate the hex counters over many comparisons.
 */
export function compareJson(
  expected: unknown,
  actual: unknown,
  tol: number = TOLERANCE,
  at = '$',
  into: Comparison = { differences: [], hexExact: 0, hexClose: 0 },
): Comparison {
  compareInto(expected, actual, tol, at, into);
  return into;
}

/** The first `limit` differences as one readable block. */
export const formatDifferences = (comparison: Comparison, limit = 12): string =>
  comparison.differences.slice(0, limit).join('\n');
