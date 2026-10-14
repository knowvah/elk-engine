// SPDX-License-Identifier: EPL-2.0

/**
 * Measures every inventory function: directly from a whole-file lizard run
 * when lizard reported it, else via a standalone snippet (raw, then
 * type-stripped), else from the AST (`ast.ts`).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureByAst } from './ast.js';
import type { FileModel, FunctionInfo } from './inventory.js';
import { runLizard, type LizardFunction } from './lizard.js';
import { SNIPPET_FUNCTION_NAME, buildSnippet, sanitizePrivateNames } from './snippets.js';

type SnippetMethod = 'snippet' | 'snippet-stripped';
export type MeasureMethod = 'direct' | SnippetMethod | 'ast';

export interface Measured {
  readonly file: string;
  readonly fn: FunctionInfo;
  readonly nloc: number;
  readonly ccn: number;
  /** The larger of lizard's and the AST's count. */
  readonly params: number;
  readonly method: MeasureMethod;
}

export interface MeasureResult {
  readonly measured: Measured[];
}

interface Pending {
  readonly file: string;
  readonly model: FileModel;
  readonly fn: FunctionInfo;
}

const WORK_DIR_PREFIX = 'complexity-';

function simpleName(name: string): string {
  return name.replace(/^#/, '_');
}

/** The lizard function that is `fn`, or null: same span, preferring the same name. */
export function matchDirect(fn: FunctionInfo, candidates: readonly LizardFunction[]): LizardFunction | null {
  const spans = candidates.filter(
    (c) => c.startLine >= fn.startLine && c.startLine <= fn.bodyStartLine && c.endLine === fn.endLine,
  );
  const wanted = simpleName(fn.name);
  return spans.find((c) => c.name === wanted) ?? spans[0] ?? null;
}

function toMeasured(p: Pending, z: LizardFunction, method: MeasureMethod): Measured {
  return {
    file: p.file,
    fn: p.fn,
    nloc: z.nloc,
    ccn: z.ccn,
    params: Math.max(z.params, p.fn.paramCount),
    method,
  };
}

function measuredByAst(p: Pending): Measured {
  const { nloc, ccn } = measureByAst(p.model, p.fn);
  return { file: p.file, fn: p.fn, nloc, ccn, params: p.fn.paramCount, method: 'ast' };
}

/** Writes `contents` under `dir` as `<key>.ts`, runs lizard once, groups results by key. */
function runBatch(dir: string, contents: ReadonlyMap<string, string>): Map<string, LizardFunction[]> {
  const groups = new Map<string, LizardFunction[]>();
  if (contents.size === 0) return groups;
  mkdirSync(dir, { recursive: true });
  const keyByPath = new Map<string, string>();
  for (const [key, text] of contents) {
    const path = join(dir, `${key}.ts`);
    // lizard skips files whose content duplicates an earlier one: make each unique.
    writeFileSync(path, `${text}\n// ${key}\n`);
    keyByPath.set(path, key);
  }
  for (const z of runLizard(dir)) {
    const key = keyByPath.get(z.file);
    if (key !== undefined) groups.set(key, [...(groups.get(key) ?? []), z]);
  }
  return groups;
}

interface Tier {
  readonly measured: Measured[];
  readonly missing: Pending[];
}

function measureDirect(work: string, files: ReadonlyMap<string, FileModel>, pending: readonly Pending[]): Tier {
  const keyOfFile = new Map<string, string>();
  const sanitized = new Map<string, string>();
  for (const [file, model] of files) {
    const key = `d${keyOfFile.size}`;
    keyOfFile.set(file, key);
    sanitized.set(key, sanitizePrivateNames(model));
  }
  const groups = runBatch(join(work, 'direct'), sanitized);
  const tier: Tier = { measured: [], missing: [] };
  for (const p of pending) {
    const hit = matchDirect(p.fn, groups.get(keyOfFile.get(p.file) ?? '') ?? []);
    if (hit) tier.measured.push(toMeasured(p, hit, 'direct'));
    else tier.missing.push(p);
  }
  return tier;
}

/** The snippet's own function: named `f`, starting on line 1, ending on the last line. */
function snippetResult(group: readonly LizardFunction[], snippet: string): LizardFunction | null {
  const lineCount = snippet.split('\n').length - 1;
  const hit = group.find((z) => z.name === SNIPPET_FUNCTION_NAME && z.startLine === 1);
  return hit && hit.endLine === lineCount ? hit : null;
}

function measureSnippets(work: string, method: SnippetMethod, pending: readonly Pending[]): Tier {
  const strip = method === 'snippet-stripped';
  const snippets = new Map<string, string>();
  pending.forEach((p, i) => snippets.set(`s${i}`, buildSnippet(p.model, p.fn, strip)));
  const groups = runBatch(join(work, method), snippets);
  const tier: Tier = { measured: [], missing: [] };
  pending.forEach((p, i) => {
    const key = `s${i}`;
    const hit = snippetResult(groups.get(key) ?? [], snippets.get(key)!);
    if (hit) tier.measured.push(toMeasured(p, hit, method));
    else tier.missing.push(p);
  });
  return tier;
}

/** Measures every function of every file; always removes its temp directory. */
export function measureAll(files: ReadonlyMap<string, FileModel>): MeasureResult {
  const pending: Pending[] = [];
  for (const [file, model] of files) for (const fn of model.functions) pending.push({ file, model, fn });
  const work = mkdtempSync(join(tmpdir(), WORK_DIR_PREFIX));
  try {
    const direct = measureDirect(work, files, pending);
    const raw = measureSnippets(work, 'snippet', direct.missing);
    const stripped = measureSnippets(work, 'snippet-stripped', raw.missing);
    const byAst = stripped.missing.map((p) => measuredByAst(p));
    return { measured: [...direct.measured, ...raw.measured, ...stripped.measured, ...byAst] };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
