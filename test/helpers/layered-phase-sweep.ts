// SPDX-License-Identifier: EPL-2.0
// The TS side of the phase sweep (mission 7b, T10, B6): reads test/corpus/.phase-sweep/results.jsonl, written by
// tools/oracle/phase-sweep.sh through tools/vectors/LayeredPhaseVectors.java --sweep, and hashes a phase dump the way
// the recorder does (`PhaseSweep.phaseCanonical` in the recorder): `edges` and `changed` sorted by path, every C4 value
// rewritten so neither side needs the other's number formatting or Java class naming, then JSON with object keys sorted
// recursively and no whitespace, SHA-256 of the UTF-8 text.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Expected } from './layered-phase-replay-dump.js';
import type { PhaseRow } from './layered-phase-replay-rows.js';

const TEXT_ENCODING = 'utf8';
const MODEL_EXTENSION = '.json';
export const STATUS_REFUSED = 'refused';
export const STATUS_THROWS = 'throws';
export const STATUS_TIMEOUT = 'timeout';

/** What the TS side replays of a case: the model level, the options and the prefix the oracle ran. */
export interface SweepReplay {
  readonly id: string;
  readonly model: string;
  readonly target: string | null;
  readonly prefix: readonly string[];
  readonly options: Readonly<Record<string, unknown>>;
}
/** A case the oracle ran to the end, with the hash of its canonical dump. */
export interface SweepOk extends SweepReplay {
  readonly sha256: string;
}
export interface SweepRefused {
  readonly id: string;
  readonly status: typeof STATUS_REFUSED;
  readonly processor: string;
}
/** A case the oracle threw on; `prefix` is null when even the plan could not be built. */
export interface SweepThrows extends Omit<SweepReplay, 'prefix'> {
  readonly status: typeof STATUS_THROWS;
  readonly prefix: readonly string[] | null;
  readonly class: string;
  readonly message: string;
}
export interface SweepTimeout {
  readonly id: string;
  readonly status: typeof STATUS_TIMEOUT;
  readonly reason?: string;
}
export type SweepLine = SweepOk | SweepRefused | SweepThrows | SweepTimeout;

export function isOk(line: SweepLine): line is SweepOk {
  return !('status' in line);
}

export function isThrows(line: SweepLine): line is SweepThrows {
  return 'status' in line && line.status === STATUS_THROWS;
}

/** `JSON.stringify` of the value with every object's keys sorted (UTF-16 order, as `TreeMap<String,...>` sorts). */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonical(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const members = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
    return `{${members.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function canonicalHash(value: unknown): string {
  return createHash('sha256').update(canonical(value), TEXT_ENCODING).digest('hex');
}

const HEX_DIGITS = 16;
const FLOAT64_BYTES = 8;
const NUMBER_TAG = 'number';

/** The 16 lowercase hex digits of the raw IEEE-754 bits of a double. */
function doubleBits(value: number): string {
  const view = new DataView(new ArrayBuffer(FLOAT64_BYTES));
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(HEX_DIGITS).padStart(HEX_DIGITS, '0');
}

const lastSegment = (name: string): string => name.slice(Math.max(name.lastIndexOf('.'), name.lastIndexOf('$')) + 1);

/** The recorder's `c4Free`: int/double values become hex bits, enum and set classes their last segment. */
export function c4Free(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(c4Free);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const record = value as Record<string, unknown>;
  const tag = record['t'];
  if (tag === 'int' || tag === 'double' || tag === NUMBER_TAG) {
    return { t: NUMBER_TAG, v: doubleBits(Number(record['v'])) };
  }
  const out = Object.fromEntries(Object.entries(record).map(([key, member]) => [key, c4Free(member)]));
  if (tag === 'enum') {
    out['c'] = lastSegment(record['c'] as string);
  } else if (tag === 'set') {
    out['c'] = (record['items'] as readonly unknown[]).length === 0 ? null : lastSegment(record['c'] as string);
  }
  return out;
}

/** The canonical hash of a phase dump: `edges`/`changed` sorted by path, C4 values rewritten (see the header). */
export function phaseHash(expected: Expected): string {
  const byPath = (a: { readonly path: string }, b: { readonly path: string }): number =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  return canonicalHash(
    c4Free({
      ...expected,
      edges: [...expected.edges].sort(byPath),
      changed: [...expected.changed].sort(byPath),
    }),
  );
}

/** The lines of a `results.jsonl`, in file order. */
export function readSweep(file: string): SweepLine[] {
  return readFileSync(file, TEXT_ENCODING)
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as SweepLine);
}

const NOTHING_EXPECTED: Expected = { layers: [], layerless: [], hidden: [], edges: [], changed: [] };

/** The pipeline row an ok case replays: the model file inline, the recorded options and prefix. */
export function sweepRow(line: SweepReplay, modelsDir: string): PhaseRow {
  const elk = readFileSync(path.join(modelsDir, line.model + MODEL_EXTENSION), TEXT_ENCODING);
  return {
    id: line.id,
    group: 'models',
    input: { elk },
    target: line.target,
    options: line.options,
    steps: null,
    prefix: line.prefix,
    expected: NOTHING_EXPECTED,
  };
}
