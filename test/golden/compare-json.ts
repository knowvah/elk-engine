// SPDX-License-Identifier: EPL-2.0
//
// Semantic comparator for ELK JSON layout results (AD-4): structure exact,
// numeric values within an absolute tolerance. Pure; no I/O.

export interface Diff {
  /** JSON-path-like location; keyed arrays use ids: `children[id=n1].x`. */
  path: string;
  kind: 'structure' | 'value' | 'type' | 'missing' | 'extra';
  expected?: unknown;
  actual?: unknown;
}

export interface CompareOptions {
  /** Absolute numeric tolerance. Default 1e-6. */
  tol?: number;
}

export const DEFAULT_TOLERANCE = 1e-6;
export const DEFAULT_MAX_DIFFS = 20;
const ID_KEY = 'id';

type JsonKind = 'null' | 'array' | 'object' | 'number' | 'string' | 'boolean' | 'other';
type Obj = Record<string, unknown>;

interface Ctx {
  tol: number;
  diffs: Diff[];
}

function kindOf(v: unknown): JsonKind {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'object') return 'object';
  if (t === 'number') return 'number';
  if (t === 'string') return 'string';
  if (t === 'boolean') return 'boolean';
  return 'other';
}

function joinKey(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function push(ctx: Ctx, diff: Diff): void {
  ctx.diffs.push(diff);
}

function idOf(v: unknown): string | undefined {
  if (kindOf(v) !== 'object') return undefined;
  const id = (v as Obj)[ID_KEY];
  return typeof id === 'string' ? id : undefined;
}

/** Id -> element map (empty for `[]`), or undefined when not uniquely keyed. */
function keyedMap(arr: readonly unknown[]): Map<string, unknown> | undefined {
  const map = new Map<string, unknown>();
  for (const el of arr) {
    const id = idOf(el);
    if (id === undefined || map.has(id)) return undefined;
    map.set(id, el);
  }
  return map;
}

function compareNumber(e: number, a: number, path: string, ctx: Ctx): void {
  if (Object.is(e, a) || e === a) return;
  if (!Number.isFinite(e) || !Number.isFinite(a)) {
    push(ctx, { path, kind: 'value', expected: e, actual: a });
    return;
  }
  if (Math.abs(e - a) <= ctx.tol) return;
  push(ctx, { path, kind: 'value', expected: e, actual: a });
}

function comparePrimitive(e: unknown, a: unknown, path: string, ctx: Ctx): void {
  if (e !== a) push(ctx, { path, kind: 'value', expected: e, actual: a });
}

function compareObject(e: Obj, a: Obj, path: string, ctx: Ctx): void {
  for (const key of Object.keys(e)) {
    const sub = joinKey(path, key);
    if (key in a) compareValue(e[key], a[key], sub, ctx);
    else push(ctx, { path: sub, kind: 'missing', expected: e[key] });
  }
  for (const key of Object.keys(a)) {
    if (!(key in e)) push(ctx, { path: joinKey(path, key), kind: 'extra', actual: a[key] });
  }
}

function comparePositional(e: unknown[], a: unknown[], path: string, ctx: Ctx): void {
  if (e.length !== a.length) {
    push(ctx, { path, kind: 'structure', expected: e.length, actual: a.length });
    return;
  }
  e.forEach((el, i) => {
    compareValue(el, a[i], `${path}[${String(i)}]`, ctx);
  });
}

function compareKeyed(
  e: Map<string, unknown>,
  a: Map<string, unknown>,
  path: string,
  ctx: Ctx,
): void {
  for (const [id, el] of e) {
    const sub = `${path}[id=${id}]`;
    if (a.has(id)) compareValue(el, a.get(id), sub, ctx);
    else push(ctx, { path: sub, kind: 'structure', expected: el });
  }
  for (const [id, el] of a) {
    if (!e.has(id)) push(ctx, { path: `${path}[id=${id}]`, kind: 'structure', actual: el });
  }
}

function compareArray(e: unknown[], a: unknown[], path: string, ctx: Ctx): void {
  const ke = keyedMap(e);
  const ka = keyedMap(a);
  if (ke !== undefined && ka !== undefined) compareKeyed(ke, ka, path, ctx);
  else comparePositional(e, a, path, ctx);
}

function compareSameKind(kind: JsonKind, e: unknown, a: unknown, path: string, ctx: Ctx): void {
  switch (kind) {
    case 'object':
      compareObject(e as Obj, a as Obj, path, ctx);
      return;
    case 'array':
      compareArray(e as unknown[], a as unknown[], path, ctx);
      return;
    case 'number':
      compareNumber(e as number, a as number, path, ctx);
      return;
    default:
      comparePrimitive(e, a, path, ctx);
  }
}

function compareValue(e: unknown, a: unknown, path: string, ctx: Ctx): void {
  const ke = kindOf(e);
  if (ke !== kindOf(a)) {
    push(ctx, { path, kind: 'type', expected: e, actual: a });
    return;
  }
  compareSameKind(ke, e, a, path, ctx);
}

export function compareLayout(
  expected: unknown,
  actual: unknown,
  opts: CompareOptions = {},
): { ok: boolean; diffs: Diff[] } {
  const ctx: Ctx = { tol: opts.tol ?? DEFAULT_TOLERANCE, diffs: [] };
  compareValue(expected, actual, '', ctx);
  return { ok: ctx.diffs.length === 0, diffs: ctx.diffs };
}

function show(v: unknown): string {
  return typeof v === 'number' ? String(v) : (JSON.stringify(v) ?? String(v));
}

function formatDiff(d: Diff): string {
  const sides: string[] = [];
  if ('expected' in d) sides.push(`expected ${show(d.expected)}`);
  if ('actual' in d) sides.push(`actual ${show(d.actual)}`);
  return `${d.kind} ${d.path}: ${sides.join(', ')}`;
}

export function formatDiffs(diffs: Diff[], max: number = DEFAULT_MAX_DIFFS): string {
  const lines = diffs.slice(0, max).map(formatDiff);
  if (diffs.length > max) lines.push(`… ${String(diffs.length - max)} more`);
  return lines.join('\n');
}
