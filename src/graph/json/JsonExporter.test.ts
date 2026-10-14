// SPDX-License-Identifier: EPL-2.0
// Mirrors rows of the `export` and `optionText` vectors (test/golden/refs/java/graph-json.json, T3) with ElkGraphs
// built by hand: the importer is not part of this task, so each mirrored fixture of
// tools/vectors/graph-json-scenarios/ is rebuilt with ElkGraphUtil (identifiers, geometry and option values as
// imported) and exported with the row's flags and `new Random(1)` (J4; the oracle's exportSeed=1). Every flag
// combination of a row group is replayed; the complete round-trip (fixture -> import -> export) runs in T15.
//
// Mirrored row groups (id prefix before "/<flag bits>"; all rows of the group, throws rows included):
//   ok-basic, ok-basic+unknown, ok-basic+seed+clear=nodes+clear=ports+clear=edges, ok-basic+foreignTarget,
//   ok-basic+foreignSource, export-rich (64), export-rich+unknown (64), export-ids-duplicate+seed (16 + 64),
//   export-rich+seed, ok-duplicate-ids+seed, ok-ids-numeric+seed, export-ids-empty+seed, export-ids-missing+seed
//   (+clear=nodes+clear=ports+clear=edges+clear=sections, +clear=nodes@0,2, +clear=nodes@1+clear=sections@0),
//   ok-sections-linked+seed+clear=sections+clear=edges, ok-individual-spacings, ok-individual-spacings+unknown,
//   ok-junction-points, ok-single-section, ok-sections-linked, ok-root-only.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LayoutOptionData } from '../../core/data/LayoutOptionData.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkMargin } from '../../core/math/ElkMargin.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { KVector } from '../../core/math/KVector.js';
import { KVectorChain } from '../../core/math/KVectorChain.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { EdgeLabelPlacement } from '../../core/options/EdgeLabelPlacement.js';
import { PortAlignment } from '../../core/options/PortAlignment.js';
import { PortConstraints } from '../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../core/options/PortSide.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { IndividualSpacings } from '../../core/util/IndividualSpacings.js';
import { Streams } from '../../gson/internal/Streams.js';
import { JsonWriter } from '../../gson/stream/JsonWriter.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { Random } from '../../java/util/Random.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import type { ElkShape } from '../ElkShape.js';
import { Property } from '../properties/Property.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { JsonExporter } from './JsonExporter.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/graph-json.json', import.meta.url);
const PRETTY_INDENT = '  ';
const SEED = 1;
const UNKNOWN_OPTION = new Property<string>('my.unknown.option');
const UNKNOWN_VALUE = 'v';
const NULL_POINTER = 'java.lang.NullPointerException';

interface Flags {
  prettyPrint: boolean;
  shortLayoutOptionKeys: boolean;
  omitZeroPositions: boolean;
  omitZeroDimension: boolean;
  omitLayout: boolean;
  omitUnknownLayoutOptions: boolean;
}
interface ExportRow {
  id: string;
  flags: Flags;
  text?: string;
  throws?: { class: string; message: string | null };
}
interface OptionTextRow {
  option: string;
  valueInput: string;
  text: string | null;
}
const VECTORS = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { export: ExportRow[]; optionText: OptionTextRow[] };

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

// ---- running an export the way ElkGraphJson.toJson does (Gson text: J8) ----

function exportText(root: ElkNode, flags: Flags, random: Random = new Random(SEED)): string {
  const exporter = new JsonExporter(random);
  exporter.setOptions(
    flags.omitZeroPositions,
    flags.omitZeroDimension,
    flags.omitLayout,
    flags.shortLayoutOptionKeys,
    flags.omitUnknownLayoutOptions,
  );
  const writer = new JsonWriter();
  writer.setSerializeNulls(false);
  if (flags.prettyPrint) writer.setIndent(PRETTY_INDENT);
  Streams.write(exporter.export(root), writer);
  return writer.toString();
}

/** Replays every recorded row `<prefix>/<bits>` against a fresh graph from `build`. */
function replay(prefix: string, count: number, build: () => ElkNode): void {
  const rows = VECTORS.export.filter((row) => row.id.startsWith(`${prefix}/`));
  describe(prefix, () => {
    it(`has ${count} recorded rows`, () => {
      expect(rows).toHaveLength(count);
    });
    it.each(rows)('$id', (row) => {
      if (row.throws !== undefined) {
        // J5/D10: the JVM's NullPointerException is a TypeError
        expect(row.throws.class).toBe(NULL_POINTER);
        expect(() => exportText(build(), row.flags)).toThrow(TypeError);
      } else {
        expect(exportText(build(), row.flags)).toBe(row.text);
      }
    });
  });
}

// ---- graph building helpers ----

/** x, y, width, height. */
type Geometry = readonly [number, number, number, number];
const NO_GEOMETRY: Geometry = [0, 0, 0, 0];

function shape<T extends ElkShape>(element: T, id: string | null, [x, y, w, h]: Geometry): T {
  element.setIdentifier(id);
  element.setLocation(x, y);
  element.setDimensions(w, h);
  return element;
}

function node(parent: ElkNode | null, id: string | null, geometry: Geometry = NO_GEOMETRY): ElkNode {
  return shape(ElkGraphUtil.createNode(parent), id, geometry);
}

function port(parent: ElkNode, id: string | null, geometry: Geometry = NO_GEOMETRY): ElkPort {
  return shape(ElkGraphUtil.createPort(parent), id, geometry);
}

function label(parent: ElkGraphElement, text: string, id: string | null = null, geometry: Geometry = NO_GEOMETRY) {
  return shape(ElkGraphUtil.createLabelWithText(text, parent), id, geometry);
}

function edge(id: string | null, sources: ElkConnectableShape[], targets: ElkConnectableShape[]): ElkEdge {
  const e = ElkGraphUtil.createHyperedge(sources, targets);
  e.setIdentifier(id);
  return e;
}

function section(
  parent: ElkEdge,
  id: string | null,
  start: [number, number],
  end: [number, number],
  bends: Array<[number, number]> = [],
): ElkEdgeSection {
  const s = ElkGraphUtil.createEdgeSection(parent);
  s.setIdentifier(id);
  s.setStartLocation(...start);
  s.setEndLocation(...end);
  for (const [x, y] of bends) ElkGraphUtil.createBendPoint(s, x, y);
  return s;
}

function chain(...points: Array<[number, number]>): KVectorChain {
  const result = new KVectorChain();
  for (const [x, y] of points) result.add(new KVector(x, y));
  return result;
}

function spacings(nodeNode?: number, edgeEdge?: number, edgeNode?: number): IndividualSpacings {
  const result = new IndividualSpacings();
  if (nodeNode !== undefined) result.setProperty(CoreOptions.SPACING_NODE_NODE, nodeNode);
  if (edgeEdge !== undefined) result.setProperty(CoreOptions.SPACING_EDGE_EDGE, edgeEdge);
  if (edgeNode !== undefined) result.setProperty(CoreOptions.SPACING_EDGE_NODE, edgeNode);
  return result;
}

/** The "unknown" mod of GraphJsonVectors: the root, its first child and the first edge get an unknown option. */
function addUnknown(root: ElkNode): ElkNode {
  root.setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
  if (!root.getChildren().isEmpty()) root.getChildren().get(0).setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
  const edges = [root, ...root.getChildren()].flatMap((n) => [...n.getContainedEdges()]);
  if (edges.length > 0) edges[0]!.setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
  return root;
}

// ---- the mirrored fixtures ----

/** ok-basic.json, as imported. */
function okBasic(ids = true): ElkNode {
  const id = (s: string): string | null => (ids ? s : null);
  const root = node(null, id('root'), [1, 2.5, 100, 80.25]);
  label(root, 'Root', 'rl', [1, 2, 30, 10]);
  const rp = port(root, id('rp'), [0, 10, 5, 5]);
  label(rp, 'P', null, [0, 0, 4, 4]);
  const a = node(root, id('a'), [10, 10, 30, 20]);
  label(a, 'A');
  const ap = port(a, id('ap'), [30, 5, 4, 4]);
  node(a, id('a1'), [2, 2, 5, 5]);
  const b = node(root, id('b'), [60, 10, 30, 20]);
  const e1 = edge(id('e1'), [a], [b]);
  label(e1, 'E', 'el', [1, 1, 5, 5]);
  edge(id('e2'), [ap], [b]);
  return root;
}

/** The options of the root of export-rich.json. */
function richRootOptions(root: ElkNode): void {
  root.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
  root.setProperty(CoreOptions.PADDING, new ElkPadding(1, 4, 3, 2));
  root.setProperty(CoreOptions.NODE_LABELS_PADDING, new ElkPadding(5, 5, 5, 5));
  root.setProperty(CoreOptions.SPACING_NODE_NODE, 22.5);
  root.setProperty(CoreOptions.PORT_ALIGNMENT_NORTH, PortAlignment.CENTER);
  root.setProperty(CoreOptions.FONT_SIZE, 12);
  root.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORTS, SizeConstraint.NODE_LABELS));
  root.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
  root.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
  root.setProperty(
    CoreOptions.PORT_LABELS_PLACEMENT,
    EnumSet.of(PortLabelPlacement.INSIDE, PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE),
  );
  root.setProperty(CoreOptions.DEBUG_MODE, true);
  root.setProperty(CoreOptions.RANDOM_SEED, 5);
  root.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.box');
  root.setProperty(CoreOptions.SPACING_INDIVIDUAL, spacings(6, 4));
}

/** The edges e2 (two sections, options) and e3 (one section from source and target points) of export-rich.json. */
function richEdges(a: ElkNode, ap: ElkPort, b: ElkNode): void {
  const e2 = edge('e2', [ap, a], [b]);
  e2.setProperty(CoreOptions.BEND_POINTS, chain([1, 2], [3, 4]));
  e2.setProperty(CoreOptions.JUNCTION_POINTS, chain([7, 8]));
  e2.setProperty(CoreOptions.EDGE_THICKNESS, 2);
  const bends: Array<[number, number]> = [
    [5, 0],
    [5, 10],
  ];
  section(e2, 's1', [0, 0], [10, 10], bends).setIncomingShape(ap);
  section(e2, 's2', [10, 10], [20, 10]).setOutgoingShape(b);
  section(edge('e3', [a], [b]), null, [1, 2], [3, 4], [[2, 2]]);
}

/** export-rich.json, as imported. */
function exportRich(): ElkNode {
  const root = node(null, 'root', [3, 4, 300, 200]);
  richRootOptions(root);
  label(root, 'Root', 'rl', [1, 2, 30, 10]).setProperty(CoreOptions.FONT_NAME, 'Arial');
  label(root, 'zero');
  const rp = port(root, 'rp', [0, 0, 5, 0]);
  rp.setProperty(CoreOptions.PORT_SIDE, PortSide.WEST);
  rp.setProperty(CoreOptions.PORT_INDEX, 2);
  label(rp, 'P', null, [0, 0, 4, 4]);
  const a = node(root, 'a', [10, 0, 30, 20]);
  a.setProperty(CoreOptions.POSITION, new KVector(5, 6));
  a.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(30, 20));
  a.setProperty(CoreOptions.MARGINS, new ElkMargin(1, 1, 1, 1));
  const ap = port(a, 'ap', [30, 5, 4, 4]);
  port(a, 'ap2');
  const a1 = node(a, 'a1', [0, 2, 0, 5]);
  const b = node(root, 'b', [60, 10, 0, 0]);
  label(edge('e1', [a], [b]), 'E', 'el', [1, 1, 5, 5]);
  richEdges(a, ap, b);
  edge('e4', [a1], [b]);
  return root;
}

/** export-ids-duplicate.json, as imported (the last of equal ids wins as the target of an id reference). */
function idsDuplicate(): ElkNode {
  const r = node(null, 'r');
  const a1 = node(r, 'a', [1, 0, 0, 0]);
  port(a1, 'p', [1, 0, 0, 0]);
  port(a1, 'p', [2, 0, 0, 0]);
  port(a1, 'p', [3, 0, 0, 0]);
  node(r, 'a', [2, 0, 0, 0]);
  const a3 = node(r, 'a', [3, 0, 0, 0]);
  const b = node(r, 'b');
  const e = edge('e', [b], [b]);
  section(e, 's', [0, 0], [1, 1]);
  const second = section(e, 's', [1, 1], [2, 2]);
  second.getIncomingSections().add(second);
  edge('e', [a3], [b]);
  edge('e', [b], [a3]);
  return r;
}

/** ok-individual-spacings.json, as imported. */
function individualSpacings(): ElkNode {
  const r = node(null, 'r');
  node(r, 'a').setProperty(CoreOptions.SPACING_INDIVIDUAL, spacings(5, 3.5));
  node(r, 'b').setProperty(CoreOptions.SPACING_INDIVIDUAL, spacings(11, undefined, 4));
  node(r, 'c').setProperty(CoreOptions.SPACING_INDIVIDUAL, new IndividualSpacings());
  const d = node(r, 'd');
  const dSpacings = new IndividualSpacings();
  dSpacings.setProperty(CoreOptions.DIRECTION, Direction.LEFT);
  d.setProperty(CoreOptions.SPACING_INDIVIDUAL, dSpacings);
  return r;
}

/** ok-junction-points.json, as imported. */
function junctionPoints(): ElkNode {
  const r = node(null, 'r');
  const a = node(r, 'a');
  const b = node(r, 'b');
  edge('e1', [a], [b]); // the fixture's top-level junctionPoints are not imported as an option
  edge('e2', [a], [b]).setProperty(CoreOptions.JUNCTION_POINTS, chain([1.5, 2], [3, 4.5]));
  edge('e3', [a], [b]).setProperty(CoreOptions.JUNCTION_POINTS, chain());
  return r;
}

/** ok-single-section.json, as imported (the importer sets the shapes of a single-section edge). */
function singleSection(): ElkNode {
  const r = node(null, 'r');
  const a = node(r, 'a');
  const ap = port(a, 'ap');
  const b = node(r, 'b');
  const c = node(r, 'c');
  const unit = (e: ElkEdge, id: string): ElkEdgeSection => section(e, id, [0, 0], [1, 1]);
  const plain = unit(edge('plain', [a], [b]), 'p1');
  plain.setIncomingShape(a);
  plain.setOutgoingShape(b);
  const ports = unit(edge('ports', [ap], [b]), 'p2');
  ports.setIncomingShape(ap);
  ports.setOutgoingShape(b);
  unit(edge('hyper', [a, b], [c]), 'p3');
  const two = edge('two', [a], [c]);
  unit(two, 'p4');
  section(two, 'p5', [1, 1], [2, 2]);
  unit(edge('half', [b], [c]), 'p6').setIncomingShape(c);
  const set = unit(edge('set', [b], [c]), 'p7');
  set.setIncomingShape(c);
  set.setOutgoingShape(b);
  edge('none', [b], [c]);
  return r;
}

/** ok-sections-linked.json, as imported (a section link is mirrored on the other section by EMF). */
function sectionsLinked(): ElkNode {
  const r = node(null, 'r');
  const a = node(r, 'a');
  const b = node(r, 'b');
  const j = node(r, 'j');
  const e = edge('e', [a], [b, j]);
  const s44 = section(e, '44', [0, 0], [5, 5]);
  s44.setIncomingShape(a);
  const s1 = section(e, 's1', [5, 5], [9, 9]);
  s1.setOutgoingShape(b);
  const s45 = section(e, '45', [5, 5], [9, 1]);
  s45.setOutgoingShape(j);
  s44.getOutgoingSections().add(s1);
  s44.getOutgoingSections().add(s45);
  const e2 = edge('e2', [b], [a]);
  section(e2, 't2', [1, 1], [2, 2]).getIncomingSections().add(s1);
  return r;
}

/** ok-duplicate-ids.json, as imported (an id reference resolves to the last element registered with that id). */
function duplicateIds(): ElkNode {
  const r = node(null, 'r');
  const a1 = node(r, 'a', [1, 0, 0, 0]);
  port(a1, 'p', [1, 0, 0, 0]);
  const p2 = port(a1, 'p', [2, 0, 0, 0]);
  const a2 = node(r, 'a', [2, 0, 0, 0]);
  const b = node(r, 'b');
  edge('e', [a2], [b]);
  edge('e', [b], [a2]);
  edge('f', [a2, p2], [b]);
  return r;
}

/** ok-ids-numeric.json, as imported (numeric ids are the strings of their value; 3 and 3.0 reference the node "3.0"). */
function numericIds(): ElkNode {
  const r = node(null, 'r');
  node(r, '3', [1, 0, 0, 0]);
  const n2 = node(r, '3.0', [2, 0, 0, 0]);
  const n3 = node(r, '3', [3, 0, 0, 0]);
  const n4 = node(r, '2147483648', [4, 0, 0, 0]);
  const n5 = node(r, '7', [5, 0, 0, 0]);
  const n6 = node(r, '-4', [6, 0, 0, 0]);
  edge('1', [n2], [n3]);
  edge('2', [n4], [n5]);
  edge('2', [n6], [n2]);
  edge('1.0', [n2], [n3]);
  return r;
}

/** export-ids-empty.json, as imported. */
function emptyIds(): ElkNode {
  const root = node(null, '');
  node(root, '', [1, 0, 0, 0]);
  const second = node(root, '', [2, 0, 0, 0]);
  const n1 = node(root, 'n1');
  edge('', [n1], [second]);
  return root;
}

/** Which elements (pre-order indexes, or all) of export-ids-missing.json lose their identifier. */
interface Cleared {
  nodes?: readonly number[] | 'all';
  ports?: readonly number[] | 'all';
  edges?: readonly number[] | 'all';
  sections?: readonly number[] | 'all';
}

function clear(elements: ReadonlyArray<{ setIdentifier(id: string | null): void }>, which?: Cleared['nodes']): void {
  elements.forEach((element, index) => {
    if (which === 'all' || which?.includes(index)) element.setIdentifier(null);
  });
}

/** export-ids-missing.json, as imported, with the clear= mods of GraphJsonVectors applied. */
function missingIds(cleared: Cleared): ElkNode {
  const r = node(null, 'r');
  const a = node(r, 'a');
  const ap = port(a, 'ap');
  const bp = port(a, 'bp');
  const b = node(r, 'b');
  const n1 = node(r, 'n1');
  const c = node(r, 'c');
  const x = edge('x', [a], [b]);
  const q = section(x, 'q', [0, 0], [1, 1]);
  const w = section(x, 'w', [1, 1], [2, 2]);
  const y = edge('y', [b], [c]);
  const z = edge('z', [ap], [c]);
  clear([r, a, b, n1, c], cleared.nodes);
  clear([ap, bp], cleared.ports);
  clear([x, y, z], cleared.edges);
  clear([q, w], cleared.sections);
  return r;
}

/** Applies the foreignTarget/foreignSource mods: the first edge's endpoint 0 becomes a node outside the graph. */
function foreign(root: ElkNode, side: 'sources' | 'targets'): ElkNode {
  const first = [root, ...root.getChildren()].flatMap((n) => [...n.getContainedEdges()])[0]!;
  (side === 'sources' ? first.getSources() : first.getTargets()).set(0, ElkGraphUtil.createNode(null));
  return root;
}

/** The clear=nodes/ports/edges mods: every identifier is null. */
function clearIds(): ElkNode {
  const root = okBasic(false);
  return root;
}

const PAIRWISE = 16;
const ALL = 64;

describe('JsonExporter replay of the export vectors', () => {
  replay('ok-basic', PAIRWISE, () => okBasic());
  replay('ok-basic+unknown', PAIRWISE, () => addUnknown(okBasic()));
  replay('ok-basic+seed+clear=nodes+clear=ports+clear=edges', PAIRWISE, clearIds);
  replay('ok-basic+foreignTarget', PAIRWISE, () => foreign(okBasic(), 'targets'));
  replay('ok-basic+foreignSource', PAIRWISE, () => foreign(okBasic(), 'sources'));
  replay('export-rich', ALL, exportRich);
  replay('export-rich+unknown', ALL, () => addUnknown(exportRich()));
  replay('export-rich+seed', PAIRWISE, exportRich);
  replay('export-ids-duplicate+seed', PAIRWISE + ALL, idsDuplicate);
  replay('ok-duplicate-ids+seed', PAIRWISE, duplicateIds);
  replay('ok-ids-numeric+seed', PAIRWISE, numericIds);
  replay('export-ids-empty+seed', PAIRWISE, emptyIds);
  const all = 'all' as const;
  const missing = 'export-ids-missing+seed';
  replay(`${missing}+clear=nodes+clear=ports+clear=edges+clear=sections`, PAIRWISE, () =>
    missingIds({ nodes: all, ports: all, edges: all, sections: all }),
  );
  replay(`${missing}+clear=nodes@0,2`, PAIRWISE, () => missingIds({ nodes: [0, 2] }));
  replay(`${missing}+clear=nodes@1+clear=sections@0`, PAIRWISE, () => missingIds({ nodes: [1], sections: [0] }));
  replay('ok-sections-linked+seed+clear=sections+clear=edges', PAIRWISE, () => {
    const root = sectionsLinked();
    const edges = [...root.getContainedEdges()];
    clear(edges, all);
    clear(
      edges.flatMap((e) => [...e.getSections()]),
      all,
    );
    return root;
  });
  replay('ok-individual-spacings', PAIRWISE, individualSpacings);
  replay('ok-individual-spacings+unknown', PAIRWISE, () => addUnknown(individualSpacings()));
  replay('ok-junction-points', PAIRWISE, junctionPoints);
  replay('ok-single-section', PAIRWISE, singleSection);
  replay('ok-sections-linked', PAIRWISE, sectionsLinked);
  replay('ok-root-only', PAIRWISE, () => node(null, 'only'));
});

describe('JsonExporter behaviour', () => {
  const COMPACT: Flags = {
    prettyPrint: false,
    shortLayoutOptionKeys: true,
    omitZeroPositions: true,
    omitZeroDimension: true,
    omitLayout: false,
    omitUnknownLayoutOptions: true,
  };

  it('uses its defaults without setOptions (omit zeros, short keys, drop unknown options)', () => {
    const root = node(null, 'r');
    root.setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
    root.setProperty(CoreOptions.DIRECTION, Direction.DOWN);
    const writer = new JsonWriter();
    writer.setSerializeNulls(false);
    Streams.write(new JsonExporter().export(root), writer);
    expect(writer.toString()).toBe('{"id":"r","layoutOptions":{"direction":"DOWN"}}');
  });

  it('resets its state between exports, so generated ids restart', () => {
    const exporter = new JsonExporter(new Random(SEED));
    const root = node(null, null);
    const first = exporter.export(root).toString();
    expect(first).toBe('{"id":"n0"}');
    expect(exporter.export(root).toString()).toBe(first);
  });

  it('draws the collision suffix from the injected random, zero padded to six digits', () => {
    const root = node(null, 'r');
    node(root, 'x');
    node(root, 'x');
    const draws = new Random(SEED);
    const expected = String(draws.nextInt(1000000)).padStart(6, '0');
    const text = exportText(root, COMPACT);
    expect(text).toBe(`{"id":"r","children":[{"id":"x"},{"id":"x_g${expected}"}]}`);
  });

  it('fails an unknown edge endpoint with a TypeError (J5: formatError is not thrown)', () => {
    const root = node(null, 'r');
    const a = node(root, 'a');
    edge('e', [a], [a]);
    root.getContainedEdges().get(0).getSources().set(0, ElkGraphUtil.createNode(null));
    expect(() => exportText(root, COMPACT)).toThrow(TypeError);
  });

  it('emptyIfNull returns an empty iterator for null and the iterator itself otherwise', () => {
    const exporter = new JsonExporter();
    expect(exporter.emptyIfNull<number>(null).next().done).toBe(true);
    const iterator = [1, 2][Symbol.iterator]();
    expect(exporter.emptyIfNull(iterator)).toBe(iterator);
  });
});

describe('JsonExporter option text (optionText vectors)', () => {
  const FULL_KEYS: Flags = {
    prettyPrint: false,
    shortLayoutOptionKeys: false,
    omitZeroPositions: true,
    omitZeroDimension: true,
    omitLayout: false,
    omitUnknownLayoutOptions: false,
  };
  const service = (): LayoutMetaDataService => LayoutMetaDataService.getInstance();
  const parsedRows = (): Array<[OptionTextRow, LayoutOptionData, unknown]> =>
    VECTORS.optionText.map((row) => {
      const data = service().getOptionDataBySuffix(row.option)!;
      return [row, data, data.parseValue(row.valueInput)];
    });

  it('has the recorded rows', () => {
    expect(VECTORS.optionText).toHaveLength(parsedRows().length);
    expect(VECTORS.optionText.length).toBeGreaterThan(0);
  });

  it.each(VECTORS.optionText.map((row, index) => ({ ...row, index })))(
    '$option <- "$valueInput"',
    ({ index, option, text }) => {
      const [, data, parsed] = parsedRows()[index]!;
      if (parsed === null) {
        // a value parseValue rejects is not set
        expect(text).toBeNull();
        return;
      }
      if (data.getId() === CoreOptions.SPACING_INDIVIDUAL.getId()) {
        // written through individualSpacings, not layoutOptions; its Java toString is the row text
        expect(String(parsed)).toBe(text);
        return;
      }
      const root = node(null, 'r');
      root.setProperty(data, parsed);
      const json = JSON.parse(exportText(root, FULL_KEYS)) as { layoutOptions: Record<string, string> };
      expect(json.layoutOptions[data.getId()]).toBe(text);
      expect(data.getId().endsWith(option.split('.').pop()!)).toBe(true);
    },
  );
});
