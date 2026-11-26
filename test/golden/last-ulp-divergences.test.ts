// SPDX-License-Identifier: EPL-2.0
// The pins of the last-ulp `Math.*` entries of docs/conformance.md § 2 (AD-4 amendment of 2026-11-13, issue #74; mission
// last-ulp-bar, decisions D3-D5). The amendment: the conformance bar stays 1e-6, and a case the 1e-6 comparison reports is a
// known divergence only with a demonstrated last-ulp difference between HotSpot `Math.*` and V8 and an effect at or below
// 0.01 px on every position and size, with no discrete difference, pinned per case. Per entry this file pins:
//   mechanism  on every recorded input (test/golden/refs/java/last-ulp.json, tools/vectors/LastUlpVectors.java) V8's
//              `Math.sin` / `Math.cos` has the bits of `StrictMath`, and HotSpot's `Math` differs from it on exactly the listed
//              inputs, by one ulp, interpreted and compiled alike;
//   cause      with HotSpot's recorded bits substituted on those inputs, the port's output equals the oracle's bit for bit, so
//              the mechanism is the whole difference;
//   bound      the maximum absolute difference over every position and size (D3) is at or below the measured value, which is
//              at or below 0.01 px;
//   discrete   ids, counts, keys and non-numeric values are equal, and the 1e-6 comparison reports exactly the listed diffs.
// E1 (accepted, #68 B) is the radial layout of tests/layered/splines/sloppy_overlaps_2; E2 (inside 1e-6, so it needs no
// acceptance) is the `import` stops of six disco rows. No comparator, tolerance or landed assertion changes: this file only
// reads refs.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lenientParse, type SweepRow } from '../../tools/corpus/ts-layout-classify.js';
import { layoutToJson } from '../../tools/corpus/ts-layout-pipeline.js';
import { repoRoot } from '../corpus/corpus.js';
import {
  DISCO_STEPS,
  STEP_IMPORT,
  decodeHex,
  isHex,
  loadDiscoRows,
  stopOf,
  type StopsRow,
} from '../helpers/disco-replay-rows.js';
import { runStops } from '../helpers/disco-replay-stops.js';
import { canonicalHex } from '../helpers/double-hex.js';
import { compareLayout, DEFAULT_TOLERANCE, type Diff } from './compare-json.js';

/** The bar of the AD-4 amendment: the largest effect a last-ulp `Math.*` difference may have on a position or size. */
const LAST_ULP_BAR_PX = 0.01;
/** E1, measured against the oracle (mission last-ulp-bar, T1 and T4): 4.55e-13, at `layoutOptions.childAreaHeight`. */
const MEASURED_MAX_E1 = 4.547473508864641e-13;
/** E2, measured against `disco.json` (T1 and T4): 8.53e-14, at an edge contour point of three `bends` rows. */
const MEASURED_MAX_E2 = 8.526512829121202e-14;
/** The self-check plants a difference of twice the bar. */
const PLANTED = 2 * LAST_ULP_BAR_PX;
const PLANTED_DIGITS = 12;

const ROOT = repoRoot();
const REF_FILE = path.join(ROOT, 'test', 'golden', 'refs', 'java', 'last-ulp.json');
const E1 = 'E1';
const E2 = 'E2';
const GROUP_MATH = 'math';
const GROUP_LAYOUT = 'layout';
const LAYOUT_OPTIONS_KEY = 'layoutOptions';
const HEX_PREFIX = '0x';
const SIGN_BIT = 63n;
const HEAVY = { timeout: 60_000 } as const;

type MathFn = 'sin' | 'cos';

interface MathRow {
  readonly id: string;
  readonly group: typeof GROUP_MATH;
  readonly entry: string;
  readonly fn: MathFn;
  readonly x: string;
  readonly cold: string;
  readonly warm: string;
  readonly strict: string;
}

interface LayoutRow {
  readonly id: string;
  readonly group: typeof GROUP_LAYOUT;
  readonly entry: string;
  readonly run: string;
  readonly caseId: string;
  readonly algorithm: string;
  readonly input: string;
  readonly childAreaHeight: string;
  readonly runsAgree: boolean;
  readonly output: unknown;
}

interface RefFile {
  readonly jdk: string;
  readonly arch: string;
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly rows: readonly (MathRow | LayoutRow)[];
}

const ref = JSON.parse(readFileSync(REF_FILE, 'utf8')) as RefFile;
const mathRows = ref.rows.filter((row): row is MathRow => row.group === GROUP_MATH);
const layoutRows = ref.rows.filter((row): row is LayoutRow => row.group === GROUP_LAYOUT);
const mathRowsOf = (entry: string): readonly MathRow[] => mathRows.filter((row) => row.entry === entry);

// ------------------------------------------------------------------------------------------------------------
// Mechanism

const bitsOf = (hex: string): bigint => BigInt(`${HEX_PREFIX}${hex}`);

/** Whether two doubles (as hex bits) are neighbours: the same sign and bit patterns one apart. */
function oneUlpApart(a: string, b: string): boolean {
  const x = bitsOf(a);
  const y = bitsOf(b);
  return x >> SIGN_BIT === y >> SIGN_BIT && (x > y ? x - y : y - x) === 1n;
}

/** The ids of the rows on which V8's `Math.<fn>` does not have the bits of `StrictMath.<fn>`. */
function v8DiffersFromStrict(rows: readonly MathRow[]): string[] {
  return rows.filter((row) => canonicalHex(Math[row.fn](decodeHex(row.x))) !== row.strict).map((row) => row.id);
}

/** The ids of the rows on which the warmed HotSpot `Math.<fn>` does not have the bits of `StrictMath.<fn>`. */
const hotspotDiffersFromStrict = (rows: readonly MathRow[]): string[] =>
  rows.filter((row) => row.warm !== row.strict).map((row) => row.id);

/**
 * Runs `body` with `Math.sin` and `Math.cos` returning HotSpot's recorded value on every recorded input of `entry` where
 * HotSpot differs from `StrictMath`, and V8's value everywhere else.
 */
function withHotspotMath<T>(entry: string, body: () => T): T {
  for (const fn of ['sin', 'cos'] as const) {
    const recorded = new Map(
      mathRowsOf(entry)
        .filter((row) => row.fn === fn && row.warm !== row.strict)
        .map((row) => [row.x, decodeHex(row.warm)] as const),
    );
    const native = Math[fn];
    vi.spyOn(Math, fn).mockImplementation((x: number) => recorded.get(canonicalHex(x)) ?? native(x));
  }
  try {
    return body();
  } finally {
    vi.restoreAllMocks();
  }
}

// ------------------------------------------------------------------------------------------------------------
// The D3 delta

/** The D3 measure of one comparison: the largest absolute difference over the numbers, and every discrete difference. */
interface Delta {
  max: number;
  /** Where `max` was found. */
  at: string;
  /** Numbers compared. */
  numbers: number;
  /** Numbers that are not bit-identical. */
  differing: number;
  /** Paths where ids, counts, keys or non-numeric values differ. */
  readonly discrete: string[];
}

/** What a walker treats as a number: the two doubles of a pair of leaves, or `null` when the pair is not numeric. */
type NumberPair = (expected: unknown, actual: unknown, inOptions: boolean) => readonly [number, number] | null;

const newDelta = (): Delta => ({ max: 0, at: '', numbers: 0, differing: 0, discrete: [] });

const isPlain = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function addNumber(pair: readonly [number, number], at: string, into: Delta): void {
  const [expected, actual] = pair;
  into.numbers++;
  if (Object.is(expected, actual)) return;
  into.differing++;
  const difference = Math.abs(expected - actual);
  // A NaN or infinite difference is not a small delta: it is reported as discrete.
  if (!Number.isFinite(difference)) into.discrete.push(at);
  else if (difference > into.max) {
    into.max = difference;
    into.at = at;
  }
}

function walkObjects(e: Record<string, unknown>, a: Record<string, unknown>, at: string, ctx: WalkContext): void {
  const keys = Object.keys(e);
  if (keys.join('\u0000') !== Object.keys(a).join('\u0000')) {
    ctx.into.discrete.push(`${at} keys`);
    return;
  }
  for (const key of keys) {
    walk(e[key], a[key], `${at}.${key}`, { ...ctx, inOptions: ctx.inOptions || key === LAYOUT_OPTIONS_KEY });
  }
}

interface WalkContext {
  readonly pair: NumberPair;
  readonly inOptions: boolean;
  readonly into: Delta;
}

/** Walks two JSON values together: lists by position and length, objects by their keys in order, leaves by `pair` or by identity. */
function walk(e: unknown, a: unknown, at: string, ctx: WalkContext): void {
  const pair = ctx.pair(e, a, ctx.inOptions);
  if (pair !== null) addNumber(pair, at, ctx.into);
  else if (Array.isArray(e) && Array.isArray(a)) {
    if (e.length !== a.length) ctx.into.discrete.push(`${at} length`);
    else e.forEach((item, i) => walk(item, a[i], `${at}[${String(i)}]`, ctx));
  } else if (isPlain(e) && isPlain(a)) walkObjects(e, a, at, ctx);
  else if (!Object.is(e, a)) ctx.into.discrete.push(at);
}

/** A decimal number as the ELK exporter writes a `double` or `int` option value. */
const DECIMAL = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

/**
 * An ELK JSON layout (D3): every JSON number is a position or a size (`x`, `y`, `width`, `height`, section start, end, bend and
 * junction points), and so is a layout option whose value is a decimal string (`childAreaHeight`, `childAreaWidth`, `radius`).
 * Every other string, an option list such as a padding included, must be equal.
 */
const layoutPair: NumberPair = (e, a, inOptions) => {
  if (typeof e === 'number' && typeof a === 'number') return [e, a];
  if (inOptions && typeof e === 'string' && typeof a === 'string' && DECIMAL.test(e) && DECIMAL.test(a)) {
    return [Number(e), Number(a)];
  }
  return null;
};

/** A step dump of `disco.json` (D3): every 16-hex string is a double; integers, strings and booleans must be equal. */
const hexPair: NumberPair = (e, a) =>
  typeof e === 'string' && isHex(e) && typeof a === 'string' && isHex(a) ? [decodeHex(e), decodeHex(a)] : null;

function deltaOf(pair: NumberPair, expected: unknown, actual: unknown, into: Delta = newDelta()): Delta {
  walk(expected, actual, '$', { pair, inOptions: false, into });
  return into;
}

describe('the D3 delta cannot pass vacuously', () => {
  const layout = (height: string, bendX: number, id = 'n1'): unknown => ({
    id: 'root',
    layoutOptions: { childAreaHeight: height, 'elk.padding': '[top=12.0,left=12.0,bottom=12.0,right=12.0]' },
    children: [{ id, x: 10, y: 20, width: 30, height: 40 }],
    edges: [{ id: 'e1', sections: [{ id: 's0', startPoint: { x: 1, y: 2 }, bendPoints: [{ x: bendX, y: 5 }] }] }],
  });

  it('finds a planted 0.02 px difference in a size-valued option string', () => {
    const delta = deltaOf(layoutPair, layout('100.5', 7), layout(String(100.5 + PLANTED), 7));
    expect(delta.max).toBeCloseTo(PLANTED, PLANTED_DIGITS);
    expect(delta.max).toBeGreaterThan(LAST_ULP_BAR_PX);
    expect(delta.at).toBe('$.layoutOptions.childAreaHeight');
    expect(delta.discrete).toEqual([]);
  });

  it('finds a planted 0.02 px difference in a bend point', () => {
    const delta = deltaOf(layoutPair, layout('100.5', 7), layout('100.5', 7 + PLANTED));
    expect(delta.max).toBeCloseTo(PLANTED, PLANTED_DIGITS);
    expect(delta.at).toBe('$.edges[0].sections[0].bendPoints[0].x');
    expect({ numbers: delta.numbers, differing: delta.differing }).toEqual({ numbers: 9, differing: 1 });
  });

  it('finds a planted 0.02 px difference in a hex double of a step dump', () => {
    const dump = (x: number): unknown => ({ step: 'import', elements: [{ ref: 'e1', shape: [[canonicalHex(x)]] }] });
    const delta = deltaOf(hexPair, dump(3), dump(3 + PLANTED));
    expect(delta.max).toBeCloseTo(PLANTED, PLANTED_DIGITS);
    expect(delta.at).toBe('$.elements[0].shape[0][0]');
  });

  it('reports an id, a count, a key, a non-numeric option and a non-finite number as discrete, not as a delta', () => {
    const base = layout('100.5', 7);
    expect(deltaOf(layoutPair, base, layout('100.5', 7, 'n2')).discrete).toEqual(['$.children[0].id']);
    expect(deltaOf(layoutPair, base, { ...(base as object), children: [] }).discrete).toEqual(['$.children length']);
    expect(deltaOf(layoutPair, base, { ...(base as object), extra: 1 }).discrete).toEqual(['$ keys']);
    expect(
      deltaOf(layoutPair, { layoutOptions: { p: '[top=1.0]' } }, { layoutOptions: { p: '[top=1.5]' } }).discrete,
    ).toEqual(['$.layoutOptions.p']);
    expect(deltaOf(layoutPair, { x: 1 }, { x: Number.NaN })).toMatchObject({ max: 0, discrete: ['$.x'] });
    // Outside layoutOptions a decimal string is text: a label reading "7" is not a size.
    expect(deltaOf(layoutPair, { text: '7' }, { text: '7.02' }).discrete).toEqual(['$.text']);
  });
});

// ------------------------------------------------------------------------------------------------------------
// The ref

describe('last-ulp.json: the recorded evidence', () => {
  it('was recorded on the reference platform and holds the counted rows', () => {
    expect({ jdk: ref.jdk, arch: ref.arch }).toEqual({ jdk: '21.0.1', arch: 'aarch64' });
    expect(ref.rowCounts).toEqual({ math: 334, layout: 2 });
    expect({ math: mathRows.length, layout: layoutRows.length }).toEqual({ math: 334, layout: 2 });
    expect(new Set(ref.rows.map((row) => row.id)).size).toBe(ref.rows.length);
  });

  it('has one row per line of tools/vectors/last-ulp-inputs.txt, in order', () => {
    const lines = readFileSync(path.join(ROOT, 'tools', 'vectors', 'last-ulp-inputs.txt'), 'utf8')
      .split('\n')
      .filter((line) => line !== '' && !line.startsWith('#'));
    expect(mathRows.map((row) => `${row.entry} ${row.fn} ${row.x}`)).toEqual(lines);
  });

  it('records the same HotSpot bits interpreted (cold) and compiled (warm) on every input', () => {
    expect(mathRows.filter((row) => row.cold !== row.warm).map((row) => row.id)).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------------------
// E1

const E1_CASE = 'retarget/radial/default/tests/layered/splines/sloppy_overlaps_2';
const E1_ALGORITHM = 'org.eclipse.elk.radial';
const E1_VARIANT = 'default';
const E1_MODEL = 'tests/layered/splines/sloppy_overlaps_2';
const E1_INPUT = 'test/golden/inputs/tests/layered/splines/sloppy_overlaps_2.elkt';
const E1_SOURCE = 'elkt';
const E1_ORACLE_HEIGHT = '2561.1171089266686';
const E1_PORT_HEIGHT = '2561.117108926668';
/** The inputs of `EadesRadial.java:102` (`Math.sin`) on which HotSpot is one ulp from `StrictMath` and V8. */
const E1_HOTSPOT_DIVERGENT = [
  'math/E1/sin/3ff88c45f46b0994',
  'math/E1/sin/3ff9b7b0b41d509e',
  'math/E1/sin/4012fee9d7296ab4',
];
/** The row the 8a entry of docs/conformance.md quotes. */
const E1_DOCUMENTED = { id: 'math/E1/sin/3ff9b7b0b41d509e', x: 1.6073462520335293, hotspot: 0.9993321258384178 };
const E1_DOCUMENTED_V8 = 0.9993321258384177;
/** Everything the 1e-6 comparison reports for E1: one option string. */
const E1_DIFFS: readonly Diff[] = [
  { path: 'layoutOptions.childAreaHeight', kind: 'value', expected: E1_ORACLE_HEIGHT, actual: E1_PORT_HEIGHT },
];
const E1_NUMBERS = 56;
const E1_DIFFERING = 18;

const E1_ROW: SweepRow = {
  caseId: E1_CASE,
  tier: 'retarget',
  algorithm: E1_ALGORITHM,
  variant: E1_VARIANT,
  modelId: E1_MODEL,
  verdict: 'ok',
  ms: 0,
};

/** The port's layout of the E1 case, through the pipeline of the TS sweep (read `.elkt`, retarget, lay out, export). */
const layoutE1 = (): unknown =>
  lenientParse(layoutToJson(readFileSync(path.join(ROOT, E1_INPUT), 'utf8'), E1_SOURCE, E1_ROW));

describe('E1: radial sloppy_overlaps_2, Math.sin in EadesRadial (accepted, #68 B)', () => {
  const rows = mathRowsOf(E1);
  const oracleRuns = layoutRows.filter((row) => row.entry === E1);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mechanism: V8 equals StrictMath on all 14 inputs and HotSpot differs on the three listed, by one ulp', () => {
    expect(rows).toHaveLength(14);
    expect(v8DiffersFromStrict(rows)).toEqual([]);
    expect(hotspotDiffersFromStrict(rows)).toEqual(E1_HOTSPOT_DIVERGENT);
    expect(rows.filter((row) => row.warm !== row.strict && !oneUlpApart(row.warm, row.strict))).toEqual([]);
  });

  it('mechanism: the documented input has the documented values', () => {
    const row = rows.find((candidate) => candidate.id === E1_DOCUMENTED.id);
    expect(row).toBeDefined();
    expect(decodeHex(row!.x)).toBe(E1_DOCUMENTED.x);
    expect(decodeHex(row!.warm)).toBe(E1_DOCUMENTED.hotspot);
    expect(decodeHex(row!.strict)).toBe(E1_DOCUMENTED_V8);
    expect(Math.sin(E1_DOCUMENTED.x)).toBe(E1_DOCUMENTED_V8);
  });

  it('the oracle gives one layout, cold and warm, with the documented childAreaHeight', () => {
    expect(oracleRuns.map((row) => row.run)).toEqual(['cold', 'warm']);
    expect(oracleRuns.map((row) => row.runsAgree)).toEqual([true, true]);
    expect(oracleRuns.map((row) => row.childAreaHeight)).toEqual([E1_ORACLE_HEIGHT, E1_ORACLE_HEIGHT]);
    expect(oracleRuns.map((row) => [row.caseId, row.algorithm, row.input])).toEqual([
      [E1_CASE, E1_ALGORITHM, E1_INPUT],
      [E1_CASE, E1_ALGORITHM, E1_INPUT],
    ]);
    expect(oracleRuns[1]!.output).toEqual(oracleRuns[0]!.output);
  });

  it.each(oracleRuns.map((row) => [row.run, row] as const))(
    'discrete: against the %s oracle run the 1e-6 comparison reports the one option string and nothing else',
    (_run, row) => {
      const port = layoutE1();
      expect(compareLayout(row.output, port, { tol: DEFAULT_TOLERANCE }).diffs).toEqual(E1_DIFFS);
      expect(compareLayout(row.output, port).diffs).toEqual(E1_DIFFS);
      expect(deltaOf(layoutPair, row.output, port).discrete).toEqual([]);
    },
  );

  it.each(oracleRuns.map((row) => [row.run, row] as const))(
    'bound: against the %s oracle run every position and size is within the measured delta, itself within 0.01 px',
    (_run, row) => {
      const delta = deltaOf(layoutPair, row.output, layoutE1());
      expect({ numbers: delta.numbers, differing: delta.differing }).toEqual({
        numbers: E1_NUMBERS,
        differing: E1_DIFFERING,
      });
      expect(delta.max).toBeGreaterThan(0);
      expect(delta.max).toBeLessThanOrEqual(MEASURED_MAX_E1);
      expect(MEASURED_MAX_E1).toBeLessThanOrEqual(LAST_ULP_BAR_PX);
    },
  );

  it('cause: with HotSpot sin on the three inputs the port equals the oracle bit for bit', () => {
    const port = withHotspotMath(E1, layoutE1);
    const delta = deltaOf(layoutPair, oracleRuns[0]!.output, port);
    expect(delta).toMatchObject({ max: 0, numbers: E1_NUMBERS, differing: 0, discrete: [] });
    expect(compareLayout(oracleRuns[0]!.output, port, { tol: 0 }).diffs).toEqual([]);
    expect((port as { layoutOptions: Record<string, unknown> }).layoutOptions['childAreaHeight']).toBe(
      E1_ORACLE_HEIGHT,
    );
  });
});

// ------------------------------------------------------------------------------------------------------------
// E2

/** The inputs of `getOrthogonalPoints` (`ElkGraphTransformer.java:636-639`) on which HotSpot is one ulp from `StrictMath` and V8. */
const E2_HOTSPOT_DIVERGENT = [
  'math/E2/cos/4008419a95808064',
  'math/E2/cos/4009960e4ec3b3c0',
  'math/E2/cos/4009a7c5bcd0ad90',
  'math/E2/cos/400a3f39c609f372',
  'math/E2/cos/c004fdd99e670326',
  'math/E2/cos/c004fdd99e67032a',
  'math/E2/cos/c009cc41478374ca',
  'math/E2/cos/c00a025c1307d9cc',
  'math/E2/cos/c00da26bc7fc7cfc',
  'math/E2/sin/3fefd9ec03069d5a',
  'math/E2/sin/3ff6dcc57bb565fc',
  'math/E2/sin/4012482f090f700b',
  'math/E2/sin/bfebd3aa21ed42e0',
  'math/E2/sin/bff0993a3deb999c',
];
/** The stops rows of `disco.json` with a field that is not bit-identical, and how many such fields their `import` stop has. */
const E2_IMPORT_STOPS: Readonly<Record<string, number>> = {
  'stops/multi6/spacing60': 1,
  'stops/multi6/combo2': 1,
  'stops/bends/default': 9,
  'stops/bends/thickness3': 4,
  'stops/bends/thickMixed': 8,
  'stops/bends/junctions': 9,
};
const E2_FIELDS = 32;

describe('E2: disco getOrthogonalPoints, Math.sin and Math.cos (inside 1e-6)', () => {
  const rows = mathRowsOf(E2);
  const stopsRows: readonly StopsRow[] = loadDiscoRows('stops').filter((row) => row.id in E2_IMPORT_STOPS);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** The delta of one step of one row, and of the six `import` stops together. */
  const importDeltas = (): { perRow: Record<string, number>; all: Delta; later: Delta } => {
    const all = newDelta();
    const later = newDelta();
    const perRow: Record<string, number> = {};
    for (const row of stopsRows) {
      const run = runStops(row);
      const before = all.differing;
      deltaOf(hexPair, stopOf(row, STEP_IMPORT), run[STEP_IMPORT], all);
      perRow[row.id] = all.differing - before;
      for (const step of DISCO_STEPS) {
        if (step !== STEP_IMPORT) deltaOf(hexPair, stopOf(row, step), run[step], later);
      }
    }
    return { perRow, all, later };
  };

  it('mechanism: V8 equals StrictMath on all 320 inputs and HotSpot differs on the 9 cos and 5 sin listed, by one ulp', () => {
    expect(rows.filter((row) => row.fn === 'sin')).toHaveLength(160);
    expect(rows.filter((row) => row.fn === 'cos')).toHaveLength(160);
    expect(v8DiffersFromStrict(rows)).toEqual([]);
    expect(hotspotDiffersFromStrict(rows)).toEqual(E2_HOTSPOT_DIVERGENT);
    expect(rows.filter((row) => row.warm !== row.strict && !oneUlpApart(row.warm, row.strict))).toEqual([]);
  });

  it('names the six stops rows of disco.json', () => {
    expect(stopsRows.map((row) => row.id).sort()).toEqual(Object.keys(E2_IMPORT_STOPS).sort());
  });

  it(
    'bound and discrete: the 32 fields of the six import stops are within the measured delta, itself within 1e-6',
    HEAVY,
    () => {
      const { perRow, all, later } = importDeltas();
      expect(perRow).toEqual(E2_IMPORT_STOPS);
      expect(all.differing).toBe(E2_FIELDS);
      expect(all.discrete).toEqual([]);
      expect(all.max).toBeGreaterThan(0);
      expect(all.max).toBeLessThanOrEqual(MEASURED_MAX_E2);
      expect(MEASURED_MAX_E2).toBeLessThanOrEqual(DEFAULT_TOLERANCE);
      expect(MEASURED_MAX_E2).toBeLessThanOrEqual(LAST_ULP_BAR_PX);
      // Every later stop of the six rows is bit-identical: the contour difference moves no cell.
      expect(later).toMatchObject({ max: 0, differing: 0, discrete: [] });
      expect(later.numbers).toBeGreaterThan(0);
    },
  );

  it(
    'cause: with HotSpot sin and cos on the 14 inputs the six import stops equal the oracle bit for bit',
    HEAVY,
    () => {
      const { all, later } = withHotspotMath(E2, importDeltas);
      expect(all).toMatchObject({ max: 0, differing: 0, discrete: [] });
      expect(later).toMatchObject({ max: 0, differing: 0, discrete: [] });
      expect(all.numbers).toBeGreaterThan(0);
    },
  );
});
