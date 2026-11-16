// SPDX-License-Identifier: EPL-2.0
import { ChildProcess, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CaseOutcome,
  type Dirs,
  type SweepRow,
  type TsSweepSummary,
  DEFAULT_ALGORITHMS,
  CATEGORIES,
  SWEEP_CATEGORIES,
  compareCase,
  executeSharded,
  layoutToJson,
  liveDeps,
  parseArgs,
  runComparison,
  selectRows,
  summarize,
  summarizeSweep,
} from '../../tools/corpus/ts-layout-compare.js';
import {
  WORKER_DEPS_MODULE_ENV,
  handleCase,
  isCaseMessage,
  isOutcomeMessage,
  isReadyMessage,
  loadWorkerDeps,
} from '../../tools/corpus/ts-layout-protocol.js';
import { runSharded, shardItems } from '../../tools/corpus/ts-layout-shards.js';
import { SAME_OUTPUT } from '../helpers/ts-layout-worker-deps.js';

const ALG = 'org.eclipse.elk.box';
const HOOK_MODULE = fileURLToPath(new URL('../helpers/ts-layout-worker-deps.ts', import.meta.url));
const TSX = ['--import', 'tsx'];
const HOOK_ENV = { [WORKER_DEPS_MODULE_ENV]: HOOK_MODULE };
const TIMEOUT_MS = 500;
const WALL_LIMIT_MS = 10_000;
const SLOW_TEST_MS = 60_000;
const ALGORITHM_COUNT = 14;

const row = (caseId: string, over: Partial<SweepRow> = {}): SweepRow => ({
  caseId,
  tier: 'retarget',
  algorithm: ALG,
  variant: 'default',
  modelId: 'tests/m',
  verdict: 'ok',
  ms: 10,
  ...over,
});

const cleanups: (() => void)[] = [];
// Every child this test process starts asynchronously (the runner's `fork`) goes through `ChildProcess.prototype.spawn`;
// the spy records those instances, so the checks below look only at processes this test forked.
let forkSpy: MockInstance;
beforeEach(() => {
  // `spawn` is Node's internal method behind `fork` and `spawn`; @types/node does not declare it.
  forkSpy = vi.spyOn(ChildProcess.prototype as unknown as { spawn: (options: unknown) => void }, 'spawn');
});
afterEach(() => {
  forkSpy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

/**
 * Pids of the processes this test forked that are still children of this process: a worker the runner failed to
 * reap. Not every child of the test process (#87): the vitest worker also has short-lived children the runner never
 * started, and a check over all children failed whenever it caught one of them exiting. Requiring the pid to still be
 * a child of this process keeps a reused pid from counting.
 */
function liveForkedPids(): number[] {
  const forked = new Set(
    (forkSpy.mock.contexts as unknown as ChildProcess[]).map((c) => c.pid).filter((pid): pid is number => pid !== undefined),
  );
  if (forked.size === 0) return [];
  const table = execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' });
  return table
    .split('\n')
    .map((line) => /^\s*(\d+)\s+(\d+)\s*$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .filter((m) => Number(m[2]) === process.pid && forked.has(Number(m[1])))
    .map((m) => Number(m[1]));
}

function fixture(): { dirs: Dirs; cleanup: () => void } {
  const base = mkdtempSync(path.join(tmpdir(), 'ts-layout-shards-'));
  const dirs = { root: path.join(base, 'repo'), modelsDir: path.join(base, 'models'), sweepDir: path.join(base, 'sweep') };
  mkdirSync(path.join(dirs.root, 'test', 'corpus', 'generated'), { recursive: true });
  mkdirSync(path.join(dirs.root, 'tools', 'oracle'), { recursive: true });
  mkdirSync(path.join(dirs.modelsDir, 'tests'), { recursive: true });
  mkdirSync(path.join(dirs.sweepDir, 'run-a'), { recursive: true });
  writeFileSync(path.join(dirs.root, 'tools', 'oracle', 'ELK_COMMIT'), 'abc123\n');
  writeFileSync(
    path.join(dirs.root, 'test', 'corpus', 'census.json'),
    JSON.stringify({ models: [{ id: 'tests/m', source: 'json' }] }),
  );
  const graph = JSON.stringify({ id: 'root', children: [{ id: 'a', width: 10, height: 10 }] });
  writeFileSync(path.join(dirs.modelsDir, 'tests', 'm.json'), graph);
  const cleanup = (): void => rmSync(base, { recursive: true, force: true });
  cleanups.push(cleanup);
  return { dirs, cleanup };
}

function writeSweep(dirs: Dirs, rows: readonly SweepRow[], outputs: ReadonlyMap<string, string>): void {
  writeFileSync(path.join(dirs.sweepDir, 'results.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n'));
  for (const [name, text] of outputs) writeFileSync(path.join(dirs.sweepDir, 'run-a', name), text);
}

const stripTime = (o: CaseOutcome): CaseOutcome => ({ ...o, tsMs: 0 });

describe('shardItems', () => {
  it('deals round-robin and never makes more shards than items', () => {
    expect(shardItems([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 3, 5],
      [2, 4],
    ]);
    expect(shardItems([1, 2], 8)).toEqual([[1], [2]]);
    expect(shardItems([], 4)).toEqual([[]]);
  });
});

describe('worker protocol', () => {
  it('recognises its three message types and nothing else', () => {
    expect(isCaseMessage({ type: 'case', row: row('a') })).toBe(true);
    expect(isReadyMessage({ type: 'ready' })).toBe(true);
    expect(isOutcomeMessage({ type: 'outcome' })).toBe(true);
    expect(isOutcomeMessage({ type: 'ready' })).toBe(false);
    expect(isCaseMessage(null)).toBe(false);
    expect(isCaseMessage('case')).toBe(false);
  });

  it('answers a case with its compared outcome', () => {
    const deps = { readOracleOutput: () => SAME_OUTPUT, runTs: () => SAME_OUTPUT };
    const reply = handleCase({ type: 'case', row: row('c1') }, deps);
    expect(reply.type).toBe('outcome');
    expect(reply.outcome).toMatchObject({ caseId: 'c1', algorithm: ALG, category: 'ok', detail: '', oracleMs: 10 });
  });

  it('loads the live dependencies unless a deps module is named, and rejects a module without createDeps', async () => {
    const dirs = { root: 'r', modelsDir: 'm', sweepDir: 's' };
    const live = { readOracleOutput: () => 'live', runTs: () => 'live' };
    expect(await loadWorkerDeps(dirs, undefined, () => live)).toBe(live);
    expect(await loadWorkerDeps(dirs, '', () => live)).toBe(live);
    const hooked = await loadWorkerDeps(dirs, HOOK_MODULE, () => live);
    expect(hooked.runTs(row('x'))).toBe(SAME_OUTPUT);
    const noExport = fileURLToPath(new URL('../helpers/graph-overlay.ts', import.meta.url));
    await expect(loadWorkerDeps(dirs, noExport, () => live)).rejects.toThrow('does not export createDeps');
  });
});

describe('parseArgs sharding flags', () => {
  it('adds shards and timeoutMs only when given, and requires positive integers', () => {
    const parsed = parseArgs(['--shards', '3', '--timeout-ms', '250']);
    expect(parsed).toMatchObject({ shards: 3, timeoutMs: 250, algorithms: DEFAULT_ALGORITHMS });
    expect(Object.keys(parseArgs([]))).toEqual(['out', 'sweepDir', 'algorithms', 'filter']);
    expect(() => parseArgs(['--shards', '0'])).toThrow('--shards requires a positive integer, got 0');
    expect(() => parseArgs(['--timeout-ms', 'x'])).toThrow('--timeout-ms requires a positive integer, got x');
  });

  it('defaults to the 14 algorithms of the oracle sweep and counts ts-aborted before excluded', () => {
    expect(DEFAULT_ALGORITHMS).toHaveLength(ALGORITHM_COUNT);
    expect(DEFAULT_ALGORITHMS).toContain('sporeCompaction');
    expect(SWEEP_CATEGORIES.slice(-2)).toEqual(['ts-aborted', 'excluded']);
    expect(CATEGORIES).toEqual(SWEEP_CATEGORIES.filter((c) => c !== 'ts-aborted'));
  });
});

describe('runSharded with a worker that hangs or exits', () => {
  const dirs = { root: 'r', modelsDir: 'm', sweepDir: 's' };

  it('aborts a hung case by timeout, a dying case by exit code, and compares the cases after each', async () => {
    const rows = [row('a/ok1'), row('b/hang'), row('c/ok2'), row('d/die'), row('e/ok3'), row('f/skip', { verdict: 'nondeterministic' })];
    const started = performance.now();
    const outcomes = await runSharded(rows, { shards: 1, timeoutMs: TIMEOUT_MS, dirs, execArgv: TSX, env: HOOK_ENV });
    expect(performance.now() - started).toBeLessThan(WALL_LIMIT_MS);
    expect(outcomes.map((o) => [o.caseId, o.category, o.detail])).toEqual([
      ['a/ok1', 'ok', ''],
      ['b/hang', 'ts-aborted', 'timeout'],
      ['c/ok2', 'ok', ''],
      ['d/die', 'ts-aborted', 'exit 3'],
      ['e/ok3', 'ok', ''],
      ['f/skip', 'excluded', 'nondeterministic'],
    ]);
    expect(outcomes[1]?.tsMs).toBeGreaterThanOrEqual(TIMEOUT_MS);
    expect(liveForkedPids()).toEqual([]);
  }, SLOW_TEST_MS);

  it('spreads cases over shards and keeps the order of the rows', async () => {
    const rows = [row('a/hang'), row('b/ok'), row('c/ok'), row('d/die')];
    const outcomes = await runSharded(rows, { shards: 2, timeoutMs: TIMEOUT_MS, dirs, execArgv: TSX, env: HOOK_ENV });
    expect(outcomes.map((o) => [o.caseId, o.category, o.detail])).toEqual([
      ['a/hang', 'ts-aborted', 'timeout'],
      ['b/ok', 'ok', ''],
      ['c/ok', 'ok', ''],
      ['d/die', 'ts-aborted', 'exit 3'],
    ]);
    expect(liveForkedPids()).toEqual([]);
  }, SLOW_TEST_MS);

  it('records a child that exits before it is ready and one that never announces itself', async () => {
    const base = mkdtempSync(path.join(tmpdir(), 'ts-layout-silent-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const silent = path.join(base, 'silent.mjs');
    writeFileSync(silent, 'setInterval(() => {}, 1000);\n');
    const missing = path.join(base, 'missing.mjs');
    const common = { shards: 1, timeoutMs: TIMEOUT_MS, dirs, execArgv: [] as string[], startupTimeoutMs: TIMEOUT_MS };
    const [dead] = await runSharded([row('x/ok')], { ...common, workerFile: missing });
    expect([dead?.category, dead?.detail]).toEqual(['ts-aborted', 'exit 1']);
    const [mute] = await runSharded([row('y/ok')], { ...common, workerFile: silent });
    expect([mute?.category, mute?.detail]).toEqual(['ts-aborted', 'startup timeout']);
    expect(liveForkedPids()).toEqual([]);
  }, SLOW_TEST_MS);

  it('returns no outcomes and starts no child for no rows', async () => {
    expect(await runSharded([], { shards: 2, timeoutMs: TIMEOUT_MS, dirs, execArgv: TSX })).toEqual([]);
    expect(forkSpy).not.toHaveBeenCalled();
    expect(liveForkedPids()).toEqual([]);
  });
});

describe('executeSharded over a fixture sweep', () => {
  it('equals the in-process comparison on the same rows, with the live pipeline in two shards', async () => {
    const { dirs } = fixture();
    const good = row('retarget/box/default/tests/m');
    const bad = row('retarget/box/default/tests/m2');
    const skipped = row('retarget/box/default/x', { verdict: 'nondeterministic' });
    const ts = JSON.parse(layoutToJson(JSON.stringify({ id: 'root', children: [{ id: 'a', width: 10, height: 10 }] }), 'json', good)) as {
      children: { x: number }[];
    };
    const shifted = { ...ts, children: [{ ...ts.children[0], x: (ts.children[0]?.x ?? 0) + 1 }] };
    writeSweep(
      dirs,
      [good, bad, skipped],
      new Map([
        ['retarget__box__default__tests__m.json', JSON.stringify(ts)],
        ['retarget__box__default__tests__m2.json', JSON.stringify(shifted)],
      ]),
    );
    const out = path.join(path.dirname(dirs.root), 'summary.json');
    let printed = '';
    const io = {
      modelsDir: dirs.modelsDir,
      oracleEnv: undefined,
      stdout: (text: string) => {
        printed += text;
      },
      writeFile: (file: string, text: string) => writeFileSync(file, text),
      worker: { execArgv: TSX },
    };
    const argv = ['--sweep-dir', dirs.sweepDir, '--algorithms', 'box', '--shards', '2', '--out', out];
    expect(await executeSharded(argv, dirs.root, io)).toBe(1);
    const written = JSON.parse(readFileSync(out, 'utf8')) as TsSweepSummary;

    const syncSummary = runComparison({ out: undefined, sweepDir: undefined, algorithms: ['box'], filter: undefined }, dirs);
    const deps = liveDeps(dirs);
    const syncCases = selectRows(readFileSync(path.join(dirs.sweepDir, 'results.jsonl'), 'utf8'), ['box'], undefined)
      .map((r) => stripTime(compareCase(r, deps)))
      .sort((a, b) => (a.caseId < b.caseId ? -1 : 1));
    const strip = <T extends { tsMs: number }>(x: T): T => ({ ...x, tsMs: 0 });
    expect(written.cases.map(stripTime)).toEqual(syncCases);
    expect(written.findings.map(stripTime)).toEqual(syncSummary.findings.map(stripTime));
    // The in-process summary has no `ts-aborted` key (the landed M5 test pins its six); the sweep adds it as 0 here.
    expect(Object.fromEntries(Object.entries(written.byAlgorithm).map(([k, v]) => [k, strip(v)]))).toEqual(
      Object.fromEntries(
        Object.entries(syncSummary.byAlgorithm).map(([k, v]) => [
          k,
          strip({ ...v, counts: { ...v.counts, 'ts-aborted': 0 } }),
        ]),
      ),
    );
    expect(written.cases.map((c) => c.category)).toEqual(['ok', 'mismatch', 'excluded']);
    expect(written).toMatchObject({ elkCommit: 'abc123', sweepDir: dirs.sweepDir, node: process.version, shards: 2, timeoutMs: 120_000 });
    expect(written.wallMs).toBeGreaterThan(0);
    expect(printed).toContain(`${ALG}: planned=3 ok=1 mismatch=1 both-throw=0 ts-only-throw=0 oracle-only-throw=0 ts-aborted=0 excluded=1`);
    expect(printed).toContain('findings=1');
    expect(liveForkedPids()).toEqual([]);
  }, SLOW_TEST_MS);

  it('writes every case once and reports an aborted case as a finding', async () => {
    const { dirs } = fixture();
    const rows = [row('r/ok1'), row('r/hang'), row('r/ok2'), row('r/die'), row('r/skip', { verdict: 'x' })];
    writeSweep(dirs, rows, new Map());
    const out = path.join(path.dirname(dirs.root), 'summary.json');
    let printed = '';
    const io = {
      modelsDir: dirs.modelsDir,
      oracleEnv: undefined,
      stdout: (text: string) => {
        printed += text;
      },
      writeFile: (file: string, text: string) => writeFileSync(file, text),
      worker: { execArgv: TSX, env: HOOK_ENV },
    };
    const argv = ['--sweep-dir', dirs.sweepDir, '--algorithms', 'box', '--shards', '2', '--timeout-ms', String(TIMEOUT_MS), '--out', out];
    expect(await executeSharded(argv, dirs.root, io)).toBe(1);
    const written = JSON.parse(readFileSync(out, 'utf8')) as TsSweepSummary;
    const planned = Object.values(written.byAlgorithm).reduce((n, a) => n + a.planned, 0);
    expect(written.cases).toHaveLength(planned);
    expect(new Set(written.cases.map((c) => c.caseId)).size).toBe(rows.length);
    expect(written.cases.map((c) => c.caseId)).toEqual(['r/die', 'r/hang', 'r/ok1', 'r/ok2', 'r/skip']);
    expect(written.findings.map((f) => [f.caseId, f.detail])).toEqual([
      ['r/hang', 'timeout'],
      ['r/die', 'exit 3'],
    ]);
    expect(written.byAlgorithm[ALG]?.counts['ts-aborted']).toBe(2);
    expect(written.timeoutMs).toBe(TIMEOUT_MS);
    expect(printed).toContain('ts-aborted=2');
    expect(printed).toContain('findings=2');
    expect(liveForkedPids()).toEqual([]);
    expect(summarizeSweep(written.cases).byAlgorithm[ALG]?.planned).toBe(rows.length);
    expect(() => summarize(written.cases)).toThrow('Case r/die: category ts-aborted is not counted here');
  }, SLOW_TEST_MS);

  it('exits 0 with no findings and writes nothing without --out', async () => {
    const { dirs } = fixture();
    writeSweep(dirs, [row('s/ok')], new Map());
    const writes: string[] = [];
    const io = {
      modelsDir: dirs.modelsDir,
      oracleEnv: undefined,
      stdout: () => undefined,
      writeFile: (file: string) => writes.push(file),
      worker: { execArgv: TSX, env: HOOK_ENV },
    };
    expect(await executeSharded(['--sweep-dir', dirs.sweepDir, '--algorithms', 'box', '--shards', '1'], dirs.root, io)).toBe(0);
    expect(writes).toEqual([]);
    expect(liveForkedPids()).toEqual([]);
  }, SLOW_TEST_MS);
});
