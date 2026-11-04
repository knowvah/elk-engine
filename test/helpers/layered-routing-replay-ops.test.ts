// SPDX-License-Identifier: EPL-2.0
// Structural tests of the routing replay: which factories the prefix asks for, in which order, how a `calls` row
// decodes its arguments and summarises its result, and the errors of both.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { KVector } from '../../src/core/math/KVector.js';
import { Direction } from '../../src/core/options/Direction.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex } from './layered-framework-replay.js';
import type { Factories } from './layered-phase-replay-ops.js';
import { compareCall } from './layered-routing-replay-compare.js';
import { runCall, runRoutingPrefix, runRoutingSteps, summarise } from './layered-routing-replay-ops.js';
import { routingDump } from './layered-routing-replay-dump.js';
import { importDumpOf } from './layered-phase-replay-dump.js';
import { runSteps } from './layered-phase-replay-ops.js';
import {
  CALL_OP,
  P5_EDGE_ROUTING,
  phaseRowOf,
  isCallRow,
  loadRoutingRows,
  type CallResult,
  type CallRow,
  type RoutingRow,
} from './layered-routing-replay-rows.js';
import type { PhaseStep } from './layered-phase-replay-rows.js';

const noop = { process: () => undefined } as unknown as ILayoutProcessor<LGraph>;
const NODE_WIDTH = 10;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const INPUT = {
  elk: {
    id: 'root',
    children: [
      { id: 'a', width: NODE_WIDTH, height: 10, ports: [{ id: 'a0' }] },
      { id: 'b', width: 10, height: 10 },
    ],
  },
};
const PORT = 'g0/n0/p0';
const BIG_MOVE = 2e-6;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

function recording(): { factories: Factories; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    factories: {
      createProcessor: (name) => {
        calls.push(`processor ${name}`);
        return noop;
      },
      createPhase: (phase, strategy) => {
        calls.push(`phase ${phase} ${strategy}`);
        return noop;
      },
    },
  };
}

function rowWith(
  prefix: string[] | null,
  steps: RoutingRow['steps'] = null,
  group: RoutingRow['group'] = 'models',
): RoutingRow {
  return {
    id: 'models/synthetic',
    group,
    input: INPUT,
    target: null,
    options: {},
    steps,
    prefix,
    expected: {
      layers: [],
      layerless: [],
      hidden: [],
      edges: [],
      changed: [],
      ports: {},
      geometry: { nodes: {}, layers: [], graph: { size: ['', ''], offset: ['', ''] }, edges: {} },
    },
  };
}

const DECLARED: CallResult = { type: 'double', value: encodeHex(0) };

/** A slim `calls` row as the recorder writes it: `expected` is the result alone. */
const callRow = (steps: PhaseStep[], result: CallResult = DECLARED): CallRow => ({
  id: 'calls/synthetic',
  group: 'calls',
  input: INPUT,
  target: null,
  options: {},
  steps: [['importGraph', null], ...steps],
  prefix: null,
  expected: { result },
});

describe('runRoutingPrefix', () => {
  it('asks the factories for each entry in order: phases P1 to P5 and the six 7e processors', () => {
    const entries = [
      'P1_CYCLE_BREAKING/GREEDY',
      'P2_LAYERING/NETWORK_SIMPLEX',
      'P3_NODE_ORDERING/LAYER_SWEEP',
      'P4_NODE_PLACEMENT/BRANDES_KOEPF',
      'HYPEREDGE_DUMMY_MERGER',
      'HIERARCHICAL_PORT_POSITION_PROCESSOR',
      'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR',
      'NORTH_SOUTH_PORT_POSTPROCESSOR',
      `${P5_EDGE_ROUTING}/ORTHOGONAL`,
      'LONG_EDGE_JOINER',
      'FINAL_SPLINE_BENDPOINTS_CALCULATOR',
    ];
    const { factories, calls } = recording();
    const graph = runRoutingPrefix(rowWith(entries), factories);
    expect(calls).toEqual([
      'phase P1_CYCLE_BREAKING GREEDY',
      'phase P2_LAYERING NETWORK_SIMPLEX',
      'phase P3_NODE_ORDERING LAYER_SWEEP',
      'phase P4_NODE_PLACEMENT BRANDES_KOEPF',
      'processor HYPEREDGE_DUMMY_MERGER',
      'processor HIERARCHICAL_PORT_POSITION_PROCESSOR',
      'processor LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR',
      'processor NORTH_SOUTH_PORT_POSTPROCESSOR',
      'phase P5_EDGE_ROUTING ORTHOGONAL',
      'processor LONG_EDGE_JOINER',
      'processor FINAL_SPLINE_BENDPOINTS_CALCULATOR',
    ]);
    expect(graph.getLayerlessNodes().length).toBe(2);
  });

  it('rejects a phase it does not know, naming it', () => {
    expect(() => runRoutingPrefix(rowWith(['P6_EDGE_POSTPROCESSING/X']), recording().factories)).toThrow(
      'prefix entry P6_EDGE_POSTPROCESSING/X names the unknown phase P6_EDGE_POSTPROCESSING',
    );
  });

  it('rejects a row without a prefix, naming the row', () => {
    expect(() => runRoutingPrefix(rowWith(null), recording().factories)).toThrow('row models/synthetic has no prefix');
  });
});

describe('runRoutingSteps', () => {
  it('replays a step row exactly as runSteps does on the phase row', () => {
    const row = rowWith(
      null,
      [['importGraph', null], ['normalise'], ['runProcessor', 'LONG_EDGE_JOINER']],
      'scenarios',
    );
    const first = recording();
    const second = recording();
    const viaWrapper = runRoutingSteps(row, first.factories);
    const direct = runSteps(phaseRowOf(row), second.factories);
    expect(first.calls).toEqual(['processor LONG_EDGE_JOINER']);
    expect(first.calls).toEqual(second.calls);
    expect(viaWrapper.getLayerlessNodes()).toHaveLength(direct.getLayerlessNodes().length);
    expect(routingDump(viaWrapper, importDumpOf(viaWrapper))).toEqual(routingDump(direct, importDumpOf(direct)));
  });
});

describe('runCall', () => {
  const { factories } = recording();

  it('summarises a KVector as a vector and compareCall reports a 2e-6 difference from its twin', () => {
    const callers = { 'Fake.make': (x: number) => new KVector(x, -3) };
    const row = callRow([[CALL_OP, 'Fake.make', ['double', encodeHex(1.5)]]]);
    const result = runCall(row, recording().factories, callers);
    expect(result).toEqual({ type: 'vector', value: [encodeHex(1.5), encodeHex(-3)] });
    const twin = summarise(new KVector(1.5 + BIG_MOVE, -3));
    const diffs = compareCall(result, twin);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.message).toContain('[0]');
    expect(compareCall(result, summarise(new KVector(1.5, -3)))).toEqual([]);
  });

  it('runs the steps before the call, then decodes a port by path, a double, a boolean, an int and enums', () => {
    const { factories: recorded, calls } = recording();
    const seen: unknown[][] = [];
    const callers = {
      'Fake.take': (...args: unknown[]) => {
        seen.push(args);
        return true;
      },
    };
    const row = callRow([
      ['runProcessor', 'LONG_EDGE_JOINER'],
      [
        CALL_OP,
        'Fake.take',
        ['port', PORT],
        ['double', encodeHex(-0.25)],
        ['boolean', false],
        ['int', 5],
        ['enum', 'PortSide.NORTH'],
        ['enum', 'org.eclipse.elk.core.options.Direction.LEFT'],
      ],
    ]);
    expect(runCall(row, recorded, callers)).toEqual({ type: 'boolean', value: true });
    expect(calls).toEqual(['processor LONG_EDGE_JOINER']);
    const [port, double, flag, int, side, direction] = seen[0]!;
    expect((port as LPort).getNode()?.getSize().x).toBe(NODE_WIDTH);
    expect(double).toBe(decodeHex(encodeHex(-0.25)));
    expect(flag).toBe(false);
    expect(int).toBe(5);
    expect(side).toBe(PortSide.NORTH);
    expect(direction).toBe(Direction.LEFT);
  });

  it('decodes a node by path to the very node of the replayed graph, after a layers step', () => {
    const callers = { 'Fake.layer': (node: LNode) => node.getLayer() !== null };
    const row = callRow([
      ['layers', [['g0/n0'], ['g0/n1']]],
      [CALL_OP, 'Fake.layer', ['node', 'g0/n1']],
    ]);
    expect(runCall(row, factories, callers)).toEqual({ type: 'boolean', value: true });
    expect(runCall(callRow([[CALL_OP, 'Fake.layer', ['node', 'g0/n1']]]), factories, callers)).toEqual({
      type: 'boolean',
      value: false,
    });
  });

  it('decodes a vector to a KVector and vectors to a KVector list', () => {
    const seen: unknown[][] = [];
    const callers = {
      'Fake.take': (...args: unknown[]) => {
        seen.push(args);
        return 0;
      },
    };
    const pairs = [
      [encodeHex(1), encodeHex(2)],
      [encodeHex(-3.5), encodeHex(0.25)],
    ];
    runCall(
      callRow([[CALL_OP, 'Fake.take', ['vector', encodeHex(7), encodeHex(-8)], ['vectors', pairs]]]),
      factories,
      callers,
    );
    const [vector, vectors] = seen[0] as [KVector, KVector[]];
    expect(vector).toBeInstanceOf(KVector);
    expect([vector.x, vector.y]).toEqual([7, -8]);
    expect(vectors.map((v) => [v.x, v.y])).toEqual([
      [1, 2],
      [-3.5, 0.25],
    ]);
  });

  it('builds a rectangle in the row order and a nubs through the injected constructors', () => {
    const rectangle = vi.fn((...sides: number[]) => ({ sides }));
    const nubs = vi.fn((clamped: boolean, dim: number, points: KVector[]) => ({ clamped, dim, points }));
    const seen: unknown[][] = [];
    const callers = {
      'Fake.take': (...args: unknown[]) => {
        seen.push(args);
        return 0;
      },
    };
    const quad = [1, 2, 3, 4].map(encodeHex);
    const points = [[encodeHex(0), encodeHex(9)]];
    const row = callRow([[CALL_OP, 'Fake.take', ['rectangle', ...quad], ['nubs', true, 3, points]]]);
    runCall(row, factories, callers, { constructors: { rectangle, nubs } });
    expect(rectangle).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(nubs).toHaveBeenCalledTimes(1);
    const [clamped, dim, built] = nubs.mock.calls[0]!;
    expect([clamped, dim, built.map((v) => [v.x, v.y])]).toEqual([true, 3, [[0, 9]]]);
    expect(seen[0]).toEqual([{ sides: [1, 2, 3, 4] }, { clamped: true, dim: 3, points: built }]);
  });

  it('names the row and the kind when a needed constructor is not supplied', () => {
    const callers = { 'Fake.take': () => 0 };
    const quad = [1, 2, 3, 4].map(encodeHex);
    expect(() => runCall(callRow([[CALL_OP, 'Fake.take', ['rectangle', ...quad]]]), factories, callers)).toThrow(
      'row calls/synthetic: argument kind rectangle needs a constructors.rectangle builder',
    );
    expect(() =>
      runCall(callRow([[CALL_OP, 'Fake.take', ['nubs', false, 3, []]]]), factories, callers, {
        constructors: { rectangle: () => 0 },
      }),
    ).toThrow('row calls/synthetic: argument kind nubs needs a constructors.nubs builder');
  });

  it('gives a null return the type the row declares, and compareCall treats null exactly', () => {
    const callers = { 'Fake.none': () => null };
    const declared: CallResult = { type: 'vector', value: null };
    const result = runCall(callRow([[CALL_OP, 'Fake.none']], declared), factories, callers);
    expect(result).toEqual({ type: 'vector', value: null });
    expect(compareCall(result, declared)).toEqual([]);
    const vector: CallResult = { type: 'vector', value: [encodeHex(1), encodeHex(2)] };
    expect(compareCall(result, vector)).toHaveLength(1);
    expect(compareCall(vector, declared)).toHaveLength(1);
    expect(() => summarise(null)).toThrow('cannot summarise the call result null');
  });

  it('decodes every argument of the landed calls rows, through their layers, normalise and runProcessor steps', () => {
    const rows = loadRoutingRows(STEPS_FILE).filter(isCallRow);
    const names = rows.flatMap((r) => r.steps.filter(([op]) => op === CALL_OP).map(([, name]) => name as string));
    const callers = Object.fromEntries(names.map((name) => [name, () => null]));
    const constructors = { rectangle: () => ({}), nubs: () => ({}) };
    const results = rows.map((r) => runCall(r, recording().factories, callers, { constructors }));
    expect(rows).toHaveLength(names.length);
    expect(results).toEqual(rows.map((r) => ({ type: r.expected.result.type, value: null })));
  });

  it('rejects a call that is not the last step, a missing caller, an unknown argument and an unknown enum', () => {
    const callers = { 'Fake.make': () => 1 };
    expect(() => runCall(callRow([]), factories, callers)).toThrow(
      'row calls/synthetic: a calls row ends with exactly one call step',
    );
    expect(() => runCall(callRow([[CALL_OP, 'Fake.make'], ['normalise']]), factories, callers)).toThrow(
      /ends with exactly one call step/,
    );
    expect(() => runCall(callRow([[CALL_OP, 'Fake.other']]), factories, callers)).toThrow(
      'row calls/synthetic: no caller is registered for Fake.other',
    );
    expect(() => runCall(callRow([[CALL_OP, 'Fake.make', ['string', 'x']]]), factories, callers)).toThrow(
      /unknown call argument \["string","x"\]/,
    );
    expect(() => runCall(callRow([[CALL_OP, 'Fake.make', ['enum', 'Colour.RED']]]), factories, callers)).toThrow(
      'row calls/synthetic: enum argument Colour.RED names no known enum type',
    );
    expect(() => runCall(callRow([[CALL_OP, 'Fake.make', ['enum', 'RED']]]), factories, callers)).toThrow(
      /enum argument RED names no known enum type/,
    );
  });

  it('accepts enum types given by the caller', () => {
    const Colour = { valueOf: (name: string): string => `colour ${name}` };
    const callers = { 'Fake.name': (c: string) => c.length };
    const row = callRow([[CALL_OP, 'Fake.name', ['enum', 'Colour.RED']]]);
    expect(runCall(row, factories, callers, { enums: { Colour } })).toEqual({
      type: 'double',
      value: encodeHex('colour RED'.length),
    });
  });
});

describe('summarise', () => {
  it('names a number a double and a boolean a boolean', () => {
    expect(summarise(-0)).toEqual({ type: 'double', value: encodeHex(-0) });
    expect(summarise(false)).toEqual({ type: 'boolean', value: false });
  });

  it('names an object with the four Rectangle getters, or an ElkMargin, a rectangle in top, right, bottom, left order', () => {
    const rectangle = { getTop: () => 1, getRight: () => 2, getBottom: () => 3, getLeft: () => 4 };
    const expected = { type: 'rectangle', value: [1, 2, 3, 4].map(encodeHex) };
    expect(summarise(rectangle)).toEqual(expected);
    expect(summarise(new ElkMargin(1, 2, 3, 4))).toEqual(expected);
  });

  it('names an object with the spline getters a nubs, with the label position only when it is set', () => {
    const spline = (label: KVector | null): object => ({
      getControlPoints: () => [new KVector(1, 2), new KVector(3, 4)],
      getKnotVector: () => [0, 0.5, 1],
      getDim: () => 3,
      getOuterBox: () => ({ getTop: () => 1, getRight: () => 2, getBottom: () => 3, getLeft: () => 4 }),
      getFirstLabelPosition: () => label,
    });
    const base = {
      controlPoints: [
        [encodeHex(1), encodeHex(2)],
        [encodeHex(3), encodeHex(4)],
      ],
      knotVector: [0, 0.5, 1].map(encodeHex),
      dim: 3,
      outerBox: [1, 2, 3, 4].map(encodeHex),
    };
    expect(summarise(spline(null))).toEqual({ type: 'nubs', value: base });
    expect(summarise(spline(new KVector(5, 6)))).toEqual({
      type: 'nubs',
      value: { ...base, firstLabelPosition: [encodeHex(5), encodeHex(6)] },
    });
    const { getFirstLabelPosition: _label, ...plain } = spline(null) as Record<string, unknown>;
    expect(summarise(plain)).toEqual({ type: 'nubs', value: base });
  });

  it('rejects a value it has no shape for', () => {
    expect(() => summarise({ x: 1 })).toThrow('cannot summarise the call result [object Object]');
    expect(() => summarise('text')).toThrow('cannot summarise the call result text');
    expect(() => summarise(null)).toThrow('cannot summarise the call result null');
  });
});
