// SPDX-License-Identifier: EPL-2.0
// Structural tests of the routing-row loader (L4: no hand-derived numbers; rows are synthetic or the landed 7d rows).
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../corpus/corpus.js';
import { ENUM_TYPES } from './layered-site-replay-registry.js';
import { importRow } from './layered-phase-replay-rows.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import {
  CALL_OP,
  P5_EDGE_ROUTING,
  ROUTING_ROW_GROUPS,
  isCallRow,
  isGeometryRow,
  loadRoutingRows,
  registerRoutingEnums,
  phaseRowOf,
} from './layered-routing-replay-rows.js';

const ZERO = '0000000000000000';
const PAIR = [ZERO, ZERO];
const ROUTING_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const PLACEMENT_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const GEOMETRY = {
  nodes: { 'g0/n0': { pos: PAIR, size: PAIR, margin: [ZERO, ZERO, ZERO, ZERO] } },
  layers: [PAIR],
  graph: { size: PAIR, offset: PAIR },
  edges: { 'g0/e0': { bendPoints: [PAIR], junctionPoints: [PAIR] } },
};
const ORDER = { layers: [], layerless: ['g0/n0'], hidden: [], edges: [], changed: [], ports: { 'g0/n0': [] } };
const RESULT = { type: 'vector', value: PAIR };

function row(id: string, group: string, expected: object, steps: unknown = null, prefix: unknown = []): object {
  return {
    id,
    group,
    input: { elk: {} },
    target: null,
    options: {},
    steps,
    prefix: steps === null ? prefix : null,
    expected,
  };
}

function fileOf(rows: object[]): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'routing-rows-')), 'rows.json');
  writeFileSync(file, JSON.stringify({ rows }));
  return file;
}

const withGeometry = (geometry: object, extra: object = {}): object => ({ ...ORDER, geometry, ...extra });

describe('loadRoutingRows', () => {
  it('has the four groups of the two ref files', () => {
    expect(ROUTING_ROW_GROUPS).toEqual(['models', 'scenarios', 'sites', 'calls']);
    expect(P5_EDGE_ROUTING).toBe('P5_EDGE_ROUTING');
    expect(CALL_OP).toBe('call');
  });

  it('loads a row of the 7e shape with its routing geometry', () => {
    const [loaded] = loadRoutingRows(fileOf([row('models/ok', 'models', withGeometry(GEOMETRY))])).filter(
      isGeometryRow,
    );
    expect(loaded?.id).toBe('models/ok');
    expect(loaded?.expected.geometry.graph).toEqual(GEOMETRY.graph);
    expect(loaded?.expected.geometry.edges).toEqual(GEOMETRY.edges);
    expect(loaded?.expected.geometry.splines).toBeUndefined();
  });

  it('loads a slim calls row (steps and result only) and concatenates the files in the order given', () => {
    const steps = [
      ['importGraph', null],
      [CALL_OP, 'SplinesMath.intersect'],
    ];
    const first = fileOf([row('models/a', 'models', withGeometry(GEOMETRY))]);
    const second = fileOf([
      row('calls/b', 'calls', { result: RESULT }, steps),
      row('scenarios/c', 'scenarios', withGeometry(GEOMETRY), []),
    ]);
    const rows = loadRoutingRows(first, second);
    expect(rows.map((r) => r.id)).toEqual(['models/a', 'calls/b', 'scenarios/c']);
    expect(rows.map((r) => r.group)).toEqual(['models', 'calls', 'scenarios']);
    const [, call] = rows;
    expect(call && isCallRow(call) ? call.expected.result : null).toEqual(RESULT);
    expect(rows.filter(isCallRow)).toHaveLength(1);
    expect(rows.filter(isGeometryRow)).toHaveLength(2);
  });

  it('loads a calls row whose result value is null', () => {
    const steps = [
      ['importGraph', null],
      [CALL_OP, 'SplinesMath.intersect'],
    ];
    const file = fileOf([row('calls/null', 'calls', { result: { type: 'vector', value: null } }, steps)]);
    expect(loadRoutingRows(file)[0]?.expected).toEqual({ result: { type: 'vector', value: null } });
  });

  it('loads both landed ref files, in the group counts of the oracle recorder', () => {
    const rows = loadRoutingRows(ROUTING_FILE, STEPS_FILE);
    const count = (group: string): number => rows.filter((r) => r.group === group).length;
    expect([count('models'), count('scenarios'), count('sites'), count('calls')]).toEqual([666, 94, 25, 158]);
    expect(rows).toHaveLength(666 + 94 + 25 + 158);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('rejects the landed 7d rows by name (the first is checked): the placement geometry has no graph and edges', () => {
    const first = (JSON.parse(readFileSync(PLACEMENT_FILE, 'utf8')) as { rows: { id: string }[] }).rows[0]!;
    expect(() => loadRoutingRows(PLACEMENT_FILE)).toThrow(
      `row ${first.id}: expected.geometry.graph and expected.geometry.edges are required (missing or malformed: graph, edges)`,
    );
  });

  it('names the member that is missing: only edges, or only graph', () => {
    const { edges: _edges, ...noEdges } = GEOMETRY;
    const { graph: _graph, ...noGraph } = GEOMETRY;
    expect(() => loadRoutingRows(fileOf([row('models/noedges', 'models', withGeometry(noEdges))]))).toThrow(
      /row models\/noedges: .*\(missing or malformed: edges\)/,
    );
    expect(() => loadRoutingRows(fileOf([row('models/nograph', 'models', withGeometry(noGraph))]))).toThrow(
      /row models\/nograph: .*\(missing or malformed: graph\)/,
    );
  });

  it('rejects a graph whose size or offset is not a pair, and a splines member that is not a map', () => {
    const badGraph = { ...GEOMETRY, graph: { size: PAIR, offset: 'x' } };
    expect(() => loadRoutingRows(fileOf([row('models/badgraph', 'models', withGeometry(badGraph))]))).toThrow(
      /row models\/badgraph: .*graph/,
    );
    const badSplines = { ...GEOMETRY, splines: [] };
    expect(() => loadRoutingRows(fileOf([row('models/badsplines', 'models', withGeometry(badSplines))]))).toThrow(
      'row models/badsplines: expected.geometry.splines is not a map of start edge paths',
    );
  });

  it('rejects a calls row without a result, or with an unknown result type, naming the row', () => {
    const steps = [[CALL_OP, 'Rectangle.union']];
    expect(() => loadRoutingRows(fileOf([row('calls/nores', 'calls', {}, steps)]))).toThrow(
      /row calls\/nores: expected\.result of a calls row must be/,
    );
    const bad = { result: { type: 'string', value: 'x' } };
    expect(() => loadRoutingRows(fileOf([row('calls/badres', 'calls', bad, steps)]))).toThrow(/row calls\/badres/);
    expect(() => loadRoutingRows(fileOf([row('calls/nosteps', 'calls', { result: RESULT }, null, [])]))).toThrow(
      'row calls/nosteps: a calls row needs steps',
    );
  });

  it('still applies the placement checks: ports, nodes and layers', () => {
    const { ports: _ports, ...noPorts } = ORDER;
    expect(() =>
      loadRoutingRows(fileOf([row('models/noports', 'models', { ...noPorts, geometry: GEOMETRY })])),
    ).toThrow(/row models\/noports: expected\.ports/);
    const { layers: _layers, ...noLayers } = GEOMETRY;
    expect(() => loadRoutingRows(fileOf([row('models/nolayers', 'models', withGeometry(noLayers))]))).toThrow(
      /row models\/nolayers: expected\.geometry is missing/,
    );
  });

  it('applies the 7b structural checks: malformed row, unknown group, steps xor prefix, no rows array', () => {
    expect(() => loadRoutingRows(fileOf([{ id: 'x' }]))).toThrow(/row 0 is malformed/);
    expect(() => loadRoutingRows(fileOf([row('models/g', 'nodes', withGeometry(GEOMETRY))]))).toThrow(
      /row models\/g: unknown group "nodes"/,
    );
    const both = { ...row('models/both', 'models', withGeometry(GEOMETRY)), steps: [] };
    expect(() => loadRoutingRows(fileOf([both]))).toThrow(/row models\/both: exactly one of steps and prefix/);
    const empty = path.join(mkdtempSync(path.join(tmpdir(), 'routing-rows-')), 'empty.json');
    writeFileSync(empty, '{}');
    expect(() => loadRoutingRows(empty)).toThrow(`${empty}: no "rows" array`);
  });
});

describe('phaseRowOf', () => {
  it('hands the same row to the 7b helpers', () => {
    const [loaded] = loadRoutingRows(fileOf([row('models/same', 'models', withGeometry(GEOMETRY))]));
    expect(phaseRowOf(loaded!)).toBe(loaded);
  });
});

describe('registerRoutingEnums', () => {
  it('knows EdgeRouting as soon as the rows helper is imported, and is idempotent', () => {
    const registered = ENUM_TYPES.EdgeRouting;
    expect(registered?.name).toBe('EdgeRouting');
    expect(registered?.valueOf('SPLINES').name()).toBe('SPLINES');
    registerRoutingEnums();
    expect(ENUM_TYPES.EdgeRouting).toBe(registered);
  });

  it('lets a row with the EdgeRouting option import, with only the routing helper loaded', () => {
    LayoutMetaDataService.initElkReflect();
    const input = { elk: { id: 'root', children: [{ id: 'a', width: 10, height: 10 }] } };
    const options = { 'org.eclipse.elk.edgeRouting': { t: 'enum', c: 'EdgeRouting', n: 'SPLINES' } };
    const file = fileOf([{ ...(row('models/routed', 'models', withGeometry(GEOMETRY)) as object), input, options }]);
    const [loaded] = loadRoutingRows(file).filter(isGeometryRow);
    const { graph } = importRow(phaseRowOf(loaded!));
    expect(graph.getProperty(CoreOptions.EDGE_ROUTING)).toBe(EdgeRouting.SPLINES);
  });
});
