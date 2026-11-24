// SPDX-License-Identifier: EPL-2.0
// The replay helpers must round-trip the whole ref (apply a recorded stop, dump, get the stop back) and must be able to fail:
// every mutation below perturbs one recorded value and has to be reported at the right path.
import { describe, expect, it } from 'vitest';
import { InternalProperties } from '../../src/alg/radial/InternalProperties.js';
import { RadialOptions } from '../../src/alg/radial/options/RadialOptions.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { KVector } from '../../src/core/math/KVector.js';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import {
  applyRadialStop,
  assertSameStop,
  buildFullState,
  buildStopState,
  collectNodes,
  compareStop,
  decodeHex,
  dumpRadial,
  encodeHex,
  formatDiffs,
  importRadialInput,
} from './radial-replay-dump.js';
import {
  fixedSectionsOf,
  isFullRow,
  loadRadialRows,
  radialRowById,
  stopsOf,
  type HexProp,
  type HexSection,
  type RadialDump,
  type RadialStop,
  type RadialStopsRow,
} from './radial-replay-rows.js';

const SMALL_ROW = 'stops/matrix/wide/rotate-a1';
const LABEL_ROW = 'stops/labels/inside-grow';
const PORT_ROW = 'stops/shapes/ports';
const ORDER_ROW = 'stops/matrix/wide/sorter-id';
const POSITION_ROW = 'stops/matrix/wide/sorter-polar';
const EPSILON_OUT = 1e-5;
const EPSILON_IN = 1e-7;

const stopsRow = (id: string): RadialStopsRow => radialRowById(id) as RadialStopsRow;
const lastStop = (id: string): RadialStop => stopsOf(stopsRow(id)).at(-1) as RadialStop;

const bump = (hex: string, by: number): string => encodeHex(decodeHex(hex) + by);
const replaceAt = <T>(list: readonly T[], index: number, value: T): T[] =>
  list.map((v, i) => (i === index ? value : v));

describe('hex helpers', () => {
  it('round-trips raw bits, including negative zero and infinities', () => {
    for (const value of [0, -0, 1.5, -2.25, Number.MIN_VALUE, Math.PI, Infinity, -Infinity]) {
      expect(Object.is(decodeHex(encodeHex(value)), value)).toBe(true);
    }
    expect(encodeHex(1)).toBe('3ff0000000000000');
    expect(encodeHex(-0)).toBe('8000000000000000');
  });

  it('encodes both NaN signs as the one canonical NaN (issue #72)', () => {
    expect(encodeHex(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(encodeHex(NaN)).toBe(CANONICAL_NAN_HEX);
  });
});

describe('apply a recorded stop and dump it again (the whole ref)', () => {
  it.each(loadRadialRows().map((row) => [row.id] as const))('%s', (id) => {
    const row = radialRowById(id);
    const graph = importRadialInput(row);
    if (isFullRow(row)) {
      applyRadialStop(graph, row.expected);
      assertSameStop(row.expected, dumpRadial(graph), id, 0);
      return;
    }
    const stops = stopsOf(row);
    if (stops.length === 0) {
      // the run threw before the first stop: nothing to apply, and no fixed sections to apply it with
      expect(() => fixedSectionsOf(stops)).toThrow('a row without a stop has no fixed sections');
      return;
    }
    const fixed = fixedSectionsOf(stops);
    for (const stop of stops) {
      applyRadialStop(graph, stop, fixed);
      assertSameStop(stop, dumpRadial(graph, stop.step), `${id} after ${stop.step}`, 0);
    }
  });

  it('a state is independent of the one before: applying the first stop after the last restores it', () => {
    const row = stopsRow(SMALL_ROW);
    const stops = stopsOf(row);
    const graph = importRadialInput(row);
    applyRadialStop(graph, stops.at(-1) as RadialStop, fixedSectionsOf(stops));
    applyRadialStop(graph, stops[0] as RadialStop, fixedSectionsOf(stops));
    expect(compareStop(stops[0] as RadialStop, dumpRadial(graph), 0)).toEqual([]);
    expect(dumpRadial(graph).edges).toEqual([]);
    expect(graph.hasProperty(InternalProperties.ROOT_NODE)).toBe(false);
  });

  it('buildStopState and buildFullState start from the recorded state', () => {
    const row = stopsRow(SMALL_ROW);
    const stops = stopsOf(row);
    const state = buildStopState(row, 3);
    expect(compareStop(stops[3] as RadialStop, dumpRadial(state), 0)).toEqual([]);
    expect(() => buildStopState(row, stops.length)).toThrow(`row ${SMALL_ROW} has no stop ${String(stops.length)}`);
    const full = loadRadialRows('full')[0];
    if (full === undefined || !isFullRow(full)) {
      throw new Error('no full row');
    }
    expect(compareStop(full.expected, dumpRadial(buildFullState(full)), 0)).toEqual([]);
  });
});

describe('dumpRadial reads the properties the stop format lists', () => {
  it('lists only set properties, in the recorder order, with typed values', () => {
    const graph = importRadialInput(stopsRow(POSITION_ROW));
    const [root, first] = collectNodes(graph) as [typeof graph, typeof graph];
    root.setProperty(InternalProperties.ROOT_NODE, first);
    root.setProperty(RadialOptions.RADIUS, 12.5);
    first.setProperty(RadialOptions.ORDER_ID, 7);
    first.setProperty(CoreOptions.POSITION, new KVector(1.5, -2));
    root.setProperty(RadialOptions.ROTATION_TARGET_ANGLE, 0.5);
    root.setProperty(CoreOptions.CHILD_AREA_WIDTH, 3);
    root.setProperty(CoreOptions.CHILD_AREA_HEIGHT, 4);
    const props = dumpRadial(graph).props.filter((p) => p[0] === 'root' || p[0] === first.getIdentifier());
    expect(props.map((p) => [p[0], p[1]])).toEqual([
      ['root', 'root'],
      ['root', 'radius'],
      ['root', 'targetAngle'],
      ['root', 'childAreaWidth'],
      ['root', 'childAreaHeight'],
      [first.getIdentifier(), 'orderId'],
      [first.getIdentifier(), 'position'],
    ]);
    const byName = new Map(props.map((p) => [`${String(p[0])}/${p[1]}`, p[2]]));
    expect(byName.get('root/root')).toBe(first.getIdentifier());
    expect(byName.get('root/radius')).toBe(encodeHex(12.5));
    expect(byName.get(`${String(first.getIdentifier())}/orderId`)).toBe(7);
    expect(byName.get(`${String(first.getIdentifier())}/position`)).toEqual([encodeHex(1.5), encodeHex(-2)]);
  });

  it('dumps edge sections, bend points and labels in the recorder order', () => {
    const graph = importRadialInput(stopsRow(LABEL_ROW));
    const [root, a] = collectNodes(graph) as [typeof graph, typeof graph];
    const edge = [...root.getContainedEdges()][0];
    if (edge === undefined) {
      throw new Error('the row has an edge');
    }
    const section = ElkGraphUtil.createEdgeSection(edge);
    section.setStartLocation(1, 2);
    section.setEndLocation(3, 4);
    ElkGraphUtil.createBendPoint(section, 5, 6);
    const dump = dumpRadial(graph);
    expect(dump.edges).toEqual([
      [
        edge.getIdentifier(),
        [[encodeHex(1), encodeHex(2), encodeHex(3), encodeHex(4), [[encodeHex(5), encodeHex(6)]]]],
      ],
    ]);
    const labelIds = dump.labels?.map((l) => l[0]);
    expect(labelIds?.[0]).toBe([...a.getLabels()][0]?.getIdentifier());
  });
});

describe('applyRadialStop refuses a stop that does not fit the graph', () => {
  const row = stopsRow(SMALL_ROW);
  const stops = stopsOf(row);
  const stop = stops[2] as RadialStop;
  const fixed = fixedSectionsOf(stops);

  it('node count and ids', () => {
    expect(() => applyRadialStop(importRadialInput(row), { ...stop, nodes: stop.nodes.slice(1) }, fixed)).toThrow(
      'the graph has 14 nodes, the stop 13',
    );
    const renamed = replaceAt(stop.nodes, 2, ['zz', ...(stop.nodes[2] as readonly string[]).slice(1)] as never);
    expect(() => applyRadialStop(importRadialInput(row), { ...stop, nodes: renamed }, fixed)).toThrow(
      'nodes[2] is n1 in the graph, zz in the stop',
    );
  });

  it('props on a missing node, sections of a missing edge, no fixed sections at all', () => {
    const props: HexProp[] = [...stop.props, ['nope', 'radius', encodeHex(1)]];
    expect(() => applyRadialStop(importRadialInput(row), { ...stop, props }, fixed)).toThrow(
      'sets radius on nope, which is not a node',
    );
    const edges = [...stop.edges, ['nope', [[encodeHex(0), encodeHex(0), encodeHex(0), encodeHex(0), []]]] as never];
    expect(() => applyRadialStop(importRadialInput(row), { ...stop, edges }, fixed)).toThrow(
      'sections for edge nope, which is not an edge of the graph',
    );
    expect(() => applyRadialStop(importRadialInput(row), stop)).toThrow('neither the stop nor `fixed` carries');
  });

  it('root prop naming a node that does not exist', () => {
    const props = stop.props.map((p) => (p[1] === 'root' ? ([p[0], p[1], 'ghost'] as HexProp) : p));
    expect(() => applyRadialStop(importRadialInput(row), { ...stop, props }, fixed)).toThrow(
      'the root prop names ghost, which is not a node',
    );
  });

  it('fixed sections that disagree in length', () => {
    expect(() => applyRadialStop(importRadialInput(row), stop, { ...fixed, margins: fixed.margins.slice(1) })).toThrow(
      'the graph has 14 nodes, the stop 13 margins',
    );
    expect(() =>
      applyRadialStop(importRadialInput(row), stop, {
        ...fixed,
        ports: [['x', ...(fixed.margins[0] as [string, string, string, string])]],
      }),
    ).toThrow('the graph has 0 ports, the stop 1');
  });

  it('applies ports and port labels of a row that has them', () => {
    const portRow = stopsRow(PORT_ROW);
    const portStops = stopsOf(portRow);
    const graph = importRadialInput(portRow);
    applyRadialStop(graph, portStops[0] as RadialStop);
    expect(dumpRadial(graph).ports).toEqual(portStops[0]?.ports);
    expect(portStops[0]?.ports?.length).toBeGreaterThan(0);
  });
});

describe('compareStop reports every perturbed value (mutation checks)', () => {
  const stop = lastStop(SMALL_ROW);
  const full = stopsOf(stopsRow(SMALL_ROW))[0] as RadialStop;
  const withFixed: RadialDump = { ...stop, ...fixedSectionsOf(stopsOf(stopsRow(SMALL_ROW))) };

  it('equal dumps have no differences, and a change within the tolerance is not one', () => {
    expect(compareStop(withFixed, withFixed)).toEqual([]);
    const node = stop.nodes[3] as readonly string[];
    const near = replaceAt(stop.nodes, 3, [node[0], bump(node[1] as string, EPSILON_IN), ...node.slice(2)] as never);
    expect(compareStop(stop, { ...stop, nodes: near })).toEqual([]);
    expect(compareStop(stop, { ...stop, nodes: near }, 0)).toHaveLength(1);
  });

  it('a perturbed node coordinate is reported with path, expected and actual', () => {
    const node = stop.nodes[3] as readonly string[];
    const moved = replaceAt(stop.nodes, 3, [
      node[0],
      node[1],
      bump(node[2] as string, EPSILON_OUT),
      ...node.slice(3),
    ] as never);
    const diffs = compareStop(stop, { ...stop, nodes: moved });
    expect(diffs).toEqual([
      {
        path: `nodes[3](${String(node[0])}).y`,
        expected: decodeHex(node[2] as string),
        actual: decodeHex(bump(node[2] as string, EPSILON_OUT)),
      },
    ]);
    expect(formatDiffs(diffs)).toContain(`nodes[3](${String(node[0])}).y: expected`);
  });

  it('a swapped node order is reported as id differences', () => {
    const swapped = [...stop.nodes];
    [swapped[1], swapped[2]] = [swapped[2] as never, swapped[1] as never];
    const paths = compareStop(stop, { ...stop, nodes: swapped }).map((d) => d.path);
    expect(paths).toContain(`nodes[1](${String(stop.nodes[1]?.[0])}).id`);
    expect(paths).toContain(`nodes[2](${String(stop.nodes[2]?.[0])}).id`);
  });

  it('a missing node is a length difference', () => {
    expect(compareStop(stop, { ...stop, nodes: stop.nodes.slice(1) })[0]).toEqual({
      path: 'nodes.length',
      expected: stop.nodes.length,
      actual: stop.nodes.length - 1,
    });
  });

  it('a perturbed property value (hex double) is reported by element and name', () => {
    const index = stop.props.findIndex((p) => p[1] === 'radius');
    const prop = stop.props[index] as HexProp;
    const props = replaceAt(stop.props, index, [prop[0], prop[1], bump(prop[2] as string, EPSILON_OUT)] as HexProp);
    expect(compareStop(stop, { ...stop, props })).toEqual([
      {
        path: `props[${String(index)}](root,radius)`,
        expected: decodeHex(prop[2] as string),
        actual: decodeHex(bump(prop[2] as string, EPSILON_OUT)),
      },
    ]);
  });

  it('a perturbed root id, order id and position are reported', () => {
    const rootIndex = stop.props.findIndex((p) => p[1] === 'root');
    const rootProp = stop.props[rootIndex] as HexProp;
    const props = replaceAt(stop.props, rootIndex, [rootProp[0], rootProp[1], 'n99'] as HexProp);
    expect(compareStop(stop, { ...stop, props })[0]).toEqual({
      path: `props[${String(rootIndex)}](root,root)`,
      expected: rootProp[2],
      actual: 'n99',
    });

    const ordered = lastStop(ORDER_ROW);
    const orderIndex = ordered.props.findIndex((p) => p[1] === 'orderId');
    const orderProp = ordered.props[orderIndex] as HexProp;
    const orderMutated = replaceAt(ordered.props, orderIndex, [
      orderProp[0],
      orderProp[1],
      (orderProp[2] as number) + 1,
    ] as HexProp);
    expect(compareStop(ordered, { ...ordered, props: orderMutated })).toEqual([
      {
        path: `props[${String(orderIndex)}](${String(orderProp[0])},orderId)`,
        expected: orderProp[2],
        actual: (orderProp[2] as number) + 1,
      },
    ]);

    const positioned = lastStop(POSITION_ROW);
    const positionIndex = positioned.props.findIndex((p) => p[1] === 'position');
    const positionProp = positioned.props[positionIndex] as HexProp;
    const [px, py] = positionProp[2] as readonly [string, string];
    const positionMutated = replaceAt(positioned.props, positionIndex, [
      positionProp[0],
      positionProp[1],
      [px, bump(py, EPSILON_OUT)],
    ] as HexProp);
    expect(compareStop(positioned, { ...positioned, props: positionMutated }).map((d) => d.path)).toEqual([
      `props[${String(positionIndex)}](${String(positionProp[0])},position).y`,
    ]);
  });

  it('a renamed or reordered property is a key difference', () => {
    const props = [...stop.props];
    [props[0], props[1]] = [props[1] as HexProp, props[0] as HexProp];
    expect(compareStop(stop, { ...stop, props }).map((d) => d.path)).toEqual([
      `props[0](${String(stop.props[0]?.[0])},${String(stop.props[0]?.[1])}).key`,
      `props[1](${String(stop.props[1]?.[0])},${String(stop.props[1]?.[1])}).key`,
    ]);
    expect(compareStop(stop, { ...stop, props: stop.props.slice(1) })[0]?.path).toBe('props.length');
  });

  it('a perturbed section point, a bend point count and an edge id are reported', () => {
    const edge = stop.edges[0] as readonly [string, readonly HexSection[]];
    const section = edge[1][0] as HexSection;
    const moved: HexSection = [section[0], section[1], bump(section[2], EPSILON_OUT), section[3], section[4]];
    const edges = replaceAt(stop.edges, 0, [edge[0], [moved]] as never);
    expect(compareStop(stop, { ...stop, edges })).toEqual([
      {
        path: `edges[0](${edge[0]}).sections[0].end.x`,
        expected: decodeHex(section[2]),
        actual: decodeHex(bump(section[2], EPSILON_OUT)),
      },
    ]);

    const bent: HexSection = [section[0], section[1], section[2], section[3], [[encodeHex(1), encodeHex(2)]]];
    const bentEdges = replaceAt(stop.edges, 0, [edge[0], [bent]] as never);
    expect(compareStop(stop, { ...stop, edges: bentEdges })[0]?.path).toBe(
      `edges[0](${edge[0]}).sections[0].bendPoints.length`,
    );

    const bentExpected = { ...stop, edges: bentEdges };
    const bentMoved: HexSection = [section[0], section[1], section[2], section[3], [[encodeHex(1), encodeHex(2.5)]]];
    const bentActual = { ...stop, edges: replaceAt(stop.edges, 0, [edge[0], [bentMoved]] as never) };
    expect(compareStop(bentExpected, bentActual).map((d) => d.path)).toEqual([
      `edges[0](${edge[0]}).sections[0].bendPoints[0].y`,
    ]);

    const renamed = replaceAt(stop.edges, 0, ['zz', edge[1]] as never);
    expect(compareStop(stop, { ...stop, edges: renamed })[0]?.path).toBe(`edges[0](${edge[0]}).id`);
    expect(compareStop(stop, { ...stop, edges: [] })[0]?.path).toBe('edges.length');
    const extraSection = replaceAt(stop.edges, 0, [edge[0], [section, section]] as never);
    expect(compareStop(stop, { ...stop, edges: extraSection })[0]?.path).toBe(`edges[0](${edge[0]}).sections.length`);
  });

  it('perturbed fixed sections (margins, padding, ports, labels) are reported, and only when the expected stop carries them', () => {
    const labelled = stopsOf(stopsRow(LABEL_ROW))[0] as RadialStop;
    const margin = labelled.margins?.[1] as readonly string[];
    const margins = replaceAt(labelled.margins ?? [], 1, [
      bump(margin[0] as string, EPSILON_OUT),
      ...margin.slice(1),
    ] as never);
    expect(compareStop(labelled, { ...labelled, margins }).map((d) => d.path)).toEqual(['margins[1].top']);
    const padding = replaceAt(labelled.padding ?? [], 0, [
      margin[0],
      margin[1],
      bump(margin[2] as string, EPSILON_OUT),
      margin[3],
    ] as never);
    expect(compareStop(labelled, { ...labelled, padding }).map((d) => d.path)).toContain('padding[0].bottom');
    expect(labelled.labels?.length).toBeGreaterThan(0);
    const label = labelled.labels?.[0] as readonly string[];
    const labels = replaceAt(labelled.labels ?? [], 0, [
      label[0],
      label[1],
      label[2],
      bump(label[3] as string, EPSILON_OUT),
      label[4],
    ] as never);
    expect(compareStop(labelled, { ...labelled, labels })).toEqual([
      {
        path: `labels[0](${String(label[0])}).width`,
        expected: decodeHex(label[3] as string),
        actual: decodeHex(bump(label[3] as string, EPSILON_OUT)),
      },
    ]);
    const ported = stopsOf(stopsRow(PORT_ROW))[0] as RadialStop;
    expect(compareStop(ported, { ...ported, ports: ported.ports?.slice(1) })[0]?.path).toBe('ports.length');
    // a later stop has no fixed sections: nothing to compare, nothing reported
    expect(full.ports).toBeDefined();
    expect(compareStop(stop, { ...stop, margins: [], padding: [], ports: [], labels: [] })).toEqual([]);
    expect(compareStop(stop, withFixed)).toEqual([]);
    expect(compareStop(withFixed, stop).map((d) => d.path)).toContain('margins.length');
  });

  it('step names are compared when both dumps have one', () => {
    expect(compareStop(stop, { ...stop, step: 'Other' })).toEqual([
      { path: 'step', expected: stop.step, actual: 'Other' },
    ]);
    expect(compareStop(stop, dumpRadial(importRadialInput(stopsRow(SMALL_ROW)))).length).toBeGreaterThan(0);
  });

  it('assertSameStop throws one readable message and caps the listing', () => {
    const moved = stop.nodes.map((n) => [n[0], bump(n[1], EPSILON_OUT), n[2], n[3], n[4]] as never);
    expect(() => assertSameStop(stop, { ...stop, nodes: moved }, 'ctx')).toThrow(
      /^ctx: 14 difference\(s\)\nnodes\[0\]\(root\)\.x: expected/,
    );
    expect(formatDiffs(compareStop(stop, { ...stop, nodes: moved }), 3).split('\n')).toHaveLength(4);
    expect(() => assertSameStop(stop, stop)).not.toThrow();
  });
});
