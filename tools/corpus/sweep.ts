// SPDX-License-Identifier: EPL-2.0
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { loadManifest, loadVariantNames, repoRoot, resolveModelsDir } from '../../test/corpus/corpus.js';
import {
  type Census,
  type CensusModel,
  COMMITTED_CENSUS_RELATIVE,
  DEFAULT_ORACLE_RELATIVE,
  ELK_ALGORITHM_PREFIX,
  ELK_COMMIT_RELATIVE,
  ORACLE_DIR_ENV,
  RUN_SCRIPT_RELATIVE,
  STATUS_OK,
  STATUS_ORACLE_ERROR,
  caseOutputName,
} from './census.js';

export type Tier = 'native' | 'retarget' | 'generated';
export type Status = 'ok' | 'throws' | 'oracle-error' | 'timeout';
export type Verdict = Status | 'nondeterministic';

/** `message` is null when the Java exception has none (e.g. StackOverflowError). */
export type ExceptionInfo = { class: string; message: string | null };

/** One oracle run of one case; `output` holds the produced file's bytes (latin1) when status is ok. */
export interface RunResult {
  status: Status;
  exception?: ExceptionInfo;
  output?: string;
  ms: number;
}

/** `name` is `<algorithmSuffix>-<shape>`; `input` the absolute path of its committed .json. */
export type GeneratedModel = { name: string; input: string };

export interface PlannedCase {
  caseId: string;
  tier: Tier;
  algorithm: string;
  variant: string;
  modelId: string;
  /** Relative to the models dir (native, retarget) or absolute (generated). */
  input: string;
  /** True when the case sends `algorithm` to the oracle. */
  override: boolean;
}

export type Plan = { cases: PlannedCase[]; parseErrors: string[] };

export interface OracleCase {
  id: string;
  input: string;
  mode: typeof LAYOUT_MODE;
  algorithm?: string;
  variant: string;
}

export type SweepRecord = Pick<PlannedCase, 'caseId' | 'tier' | 'algorithm' | 'variant' | 'modelId'> & {
  verdict: Verdict;
  exception?: ExceptionInfo;
  ms: number;
};

export interface SweepOptions {
  filter: string | undefined;
  limit: number | undefined;
  shards: number;
  out: string | undefined;
  planOnly: boolean;
}

export interface ShardRun {
  results: Map<string, RunResult>;
  exitCode: number | null;
  stderrTail: string;
}

type Model = Pick<PlannedCase, 'modelId' | 'input'>;
export const LAYOUT_MODE = 'layout';
export const DEFAULT_VARIANT = 'default';
export const MAX_DEFAULT_SHARDS = 8;
export const PROGRESS_INTERVAL = 1000;
export const GENERATED_TIER_PREFIX = 'generated';
export const HARNESS_FAULT_CLASS = 'SweepHarnessFault';
const STATUSES: readonly string[] = [STATUS_OK, 'throws', STATUS_ORACLE_ERROR, 'timeout'];
const SEGMENT = '/';
const NAME_SEPARATOR = '-';
const RESULTS_FILE = 'results.jsonl';
const SUMMARY_FILE = 'summary.json';
const RUN_A_DIR = 'run-a';
const RUN_B_DIR = 'run-b';
const SHARDS_DIR = 'shards';
const SWEEP_DIR = 'sweep';
const GENERATED_DIR_RELATIVE = path.join('test', 'corpus', 'generated');
const GENERATED_EXTENSION = '.json';
const STDERR_TAIL_BYTES = 4000;
const MAX_BUFFER = 64 * 1024 * 1024;
const EXIT_THROWS = 1;
const FLAG_PLAN_ONLY = '--plan-only';
const VALUE_FLAGS: readonly string[] = ['--filter', '--limit', '--shards', '--out'];

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function suffixOf(algorithm: string): string {
  return algorithm.startsWith(ELK_ALGORITHM_PREFIX) ? algorithm.slice(ELK_ALGORITHM_PREFIX.length) : algorithm;
}

function makeCase(tier: Tier, algorithm: string, variant: string, model: Model, override: boolean): PlannedCase {
  const caseId = [tier, suffixOf(algorithm), variant, model.modelId].join(SEGMENT);
  return { caseId, tier, algorithm, variant, ...model, override };
}

function planModel(m: CensusModel, algorithms: readonly string[], variants: readonly string[]): PlannedCase[] {
  const model = { modelId: m.id, input: `${m.id}.${m.source}` };
  const native = variants.map((v) => makeCase('native', m.rootAlgorithm, v, model, false));
  const retarget = algorithms
    .filter((a) => a !== m.rootAlgorithm)
    .map((a) => makeCase('retarget', a, DEFAULT_VARIANT, model, true));
  return [...native, ...retarget];
}

function planGenerated(g: GeneratedModel, algorithms: readonly string[], variants: readonly string[]): PlannedCase[] {
  const algorithm = `${ELK_ALGORITHM_PREFIX}${g.name.split(NAME_SEPARATOR)[0] ?? ''}`;
  if (!algorithms.includes(algorithm)) {
    throw new Error(`Generated model ${g.name} names unlisted algorithm ${algorithm}`);
  }
  const model = { modelId: `${GENERATED_TIER_PREFIX}${SEGMENT}${g.name}`, input: g.input };
  return variants.map((v) => makeCase('generated', algorithm, v, model, true));
}

/**
 * Pure case plan (D2, D6, OR-1, refinements 3-4). Generated modelId is
 * `generated/<name>`, so its caseId is `generated/<alg>/<variant>/generated/<name>`.
 */
export function planCases(
  census: readonly CensusModel[],
  algorithms: readonly string[],
  variants: readonly string[],
  generated: readonly GeneratedModel[],
): Plan {
  const parsed = census.filter((m) => m.parse === 'ok');
  const cases = [
    ...parsed.flatMap((m) => planModel(m, algorithms, variants)),
    ...generated.flatMap((g) => planGenerated(g, algorithms, variants)),
  ].sort((a, b) => compareStrings(a.caseId, b.caseId));
  const parseErrors = census.filter((m) => m.parse === 'error').map((m) => m.id);
  return { cases, parseErrors: parseErrors.sort(compareStrings) };
}

function sameException(a: ExceptionInfo | undefined, b: ExceptionInfo | undefined): boolean {
  return a?.class === b?.class && a?.message === b?.message;
}

/** D4/D5 verdict from two separate-JVM runs: oracle-error > timeout > determinism. */
export function verdictOf(runA: RunResult, runB: RunResult): Verdict {
  const statuses = [runA.status, runB.status];
  if (statuses.includes(STATUS_ORACLE_ERROR)) return STATUS_ORACLE_ERROR;
  if (statuses.includes('timeout')) return 'timeout';
  if (runA.status === STATUS_OK && runB.status === STATUS_OK) {
    return runA.output === runB.output ? STATUS_OK : 'nondeterministic';
  }
  if (runA.status === 'throws' && runB.status === 'throws') {
    return sameException(runA.exception, runB.exception) ? 'throws' : 'nondeterministic';
  }
  return 'nondeterministic';
}

/** Keeps cases whose id contains `filter`, then an even stride sample of `limit` cases. */
export function selectCases(
  cases: readonly PlannedCase[],
  filter: string | undefined,
  limit: number | undefined,
): PlannedCase[] {
  const filtered = filter === undefined ? [...cases] : cases.filter((c) => c.caseId.includes(filter));
  if (limit === undefined || limit >= filtered.length) return filtered;
  return Array.from({ length: limit }, (_, i) => filtered[Math.floor((i * filtered.length) / limit)] as PlannedCase);
}

/** Round-robin split so slow algorithms spread over shards; never more shards than cases. */
export function shardCases(cases: readonly PlannedCase[], shards: number): PlannedCase[][] {
  const count = Math.max(1, Math.min(shards, cases.length));
  const out: PlannedCase[][] = Array.from({ length: count }, () => []);
  cases.forEach((c, i) => out[i % count]?.push(c));
  return out;
}

export function toOracleCase(c: PlannedCase, dirs: { modelsDir: string }): OracleCase {
  const input = c.tier === 'generated' ? c.input : path.join(dirs.modelsDir, c.input);
  const base: OracleCase = {
    id: c.caseId,
    input,
    mode: LAYOUT_MODE,
    variant: c.variant,
  };
  return c.override ? { ...base, algorithm: c.algorithm } : base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseException(value: unknown): ExceptionInfo | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const { class: cls, message } = value;
  return typeof cls === 'string' && (typeof message === 'string' || message === null) ? { class: cls, message } : null;
}

/** Boundary validation of one oracle stdout line; undefined for noise or malformed lines. */
export function parseResultLine(line: string): { id: string; result: RunResult } | undefined {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const { id, status, ms } = value;
  const exception = parseException(value['exception']);
  if (typeof id !== 'string' || typeof ms !== 'number' || exception === null) return undefined;
  if (typeof status !== 'string' || !STATUSES.includes(status)) return undefined;
  const result: RunResult = { status: status as Status, ms };
  if (exception !== undefined) result.exception = exception;
  return { id, result };
}

function positiveInt(flag: string, value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${flag} needs a positive integer, got "${value}"`);
  return n;
}

function applyFlag(opts: SweepOptions, flag: string, value: string): void {
  if (flag === '--filter') opts.filter = value;
  else if (flag === '--limit') opts.limit = positiveInt(flag, value);
  else if (flag === '--shards') opts.shards = positiveInt(flag, value);
  else opts.out = value;
}

export function parseArgs(argv: readonly string[]): SweepOptions {
  const opts: SweepOptions = {
    filter: undefined,
    limit: undefined,
    shards: Math.min(availableParallelism(), MAX_DEFAULT_SHARDS),
    out: undefined,
    planOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] as string;
    if (flag === FLAG_PLAN_ONLY) {
      opts.planOnly = true;
    } else if (VALUE_FLAGS.includes(flag)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${flag} requires a value`);
      applyFlag(opts, flag, value);
    } else {
      throw new Error(`Unknown argument ${flag}`);
    }
  }
  return opts;
}

/** Runs one `run.sh --cases` process; stdout lines are validated, stderr is only kept as a tail. */
export function runShard(
  script: string,
  casesFile: string,
  outDir: string,
  onResult: (id: string, result: RunResult) => void,
): Promise<ShardRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(script, ['--cases', casesFile, outDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const results = new Map<string, RunResult>();
    let stderrTail = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString('utf8')).slice(-STDERR_TAIL_BYTES);
    });
    createInterface({ input: child.stdout }).on('line', (line) => {
      const parsed = parseResultLine(line);
      if (parsed === undefined) return;
      results.set(parsed.id, parsed.result);
      onResult(parsed.id, parsed.result);
    });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ results, exitCode, stderrTail }));
  });
}

function fault(message: string): RunResult {
  return {
    status: STATUS_ORACLE_ERROR,
    exception: { class: HARNESS_FAULT_CLASS, message },
    ms: 0,
  };
}

/** Attaches the produced file's bytes to an ok result; a missing file is a harness fault. */
function withOutput(result: RunResult | undefined, file: string, label: string, run: ShardRun): RunResult {
  if (result === undefined) {
    return fault(
      `no result line from run ${label} (shard exit ${String(run.exitCode)}): ${run.stderrTail.slice(-300)}`,
    );
  }
  if (result.status !== STATUS_OK) return result;
  try {
    return { ...result, output: readFileSync(file).toString('latin1') };
  } catch (err) {
    return fault(`run ${label} reported ok but ${file} is unreadable: ${String(err)}`);
  }
}

function pickException(verdict: Verdict, a: RunResult, b: RunResult): ExceptionInfo | undefined {
  if (verdict === 'ok' || verdict === 'nondeterministic') return undefined;
  const source = [a, b].find((r) => r.status === verdict) ?? a;
  return source.exception;
}

export function reconcile(
  planned: PlannedCase,
  runs: { a: ShardRun; b: ShardRun },
  dirs: { a: string; b: string },
): SweepRecord {
  const name = caseOutputName(planned.caseId);
  const fileB = path.join(dirs.b, name);
  const a = withOutput(runs.a.results.get(planned.caseId), path.join(dirs.a, name), 'A', runs.a);
  const b = withOutput(runs.b.results.get(planned.caseId), fileB, 'B', runs.b);
  rmSync(fileB, { force: true });
  const verdict = verdictOf(a, b);
  const { caseId, tier, algorithm, variant, modelId } = planned;
  const record: SweepRecord = { caseId, tier, algorithm, variant, modelId, verdict, ms: Math.max(a.ms, b.ms) };
  const exception = pickException(verdict, a, b);
  return exception === undefined ? record : { ...record, exception };
}

interface SweepContext {
  script: string;
  modelsDir: string;
  sweepDir: string;
  total: number;
  startedAt: number;
  done: { count: number };
}

function reportProgress(ctx: SweepContext): void {
  ctx.done.count += 1;
  if (ctx.done.count % PROGRESS_INTERVAL !== 0) return;
  const elapsed = Math.round((Date.now() - ctx.startedAt) / 1000);
  process.stderr.write(`sweep: ${ctx.done.count}/${ctx.total} cases, ${elapsed}s elapsed\n`);
}

function reportShardFailure(index: number, label: string, run: ShardRun): void {
  if (run.exitCode === 0 || run.exitCode === EXIT_THROWS) return;
  process.stderr.write(
    `sweep: shard ${index} run ${label} exited ${String(run.exitCode)}: ${run.stderrTail.slice(-500)}\n`,
  );
}

async function executeShard(ctx: SweepContext, index: number, cases: readonly PlannedCase[]): Promise<SweepRecord[]> {
  const casesFile = path.join(ctx.sweepDir, SHARDS_DIR, `shard-${index}.jsonl`);
  const lines = cases.map((c) => JSON.stringify(toOracleCase(c, ctx)));
  writeFileSync(casesFile, `${lines.join('\n')}\n`);
  const dirs = {
    a: path.join(ctx.sweepDir, RUN_A_DIR),
    b: path.join(ctx.sweepDir, RUN_B_DIR),
  };
  const noop = (): void => undefined;
  const a = await runShard(ctx.script, casesFile, dirs.a, noop);
  reportShardFailure(index, 'A', a);
  const b = await runShard(ctx.script, casesFile, dirs.b, () => reportProgress(ctx));
  reportShardFailure(index, 'B', b);
  return cases.map((c) => reconcile(c, { a, b }, dirs));
}

function prepareSweepDir(sweepDir: string): void {
  rmSync(sweepDir, { recursive: true, force: true });
  for (const sub of [SHARDS_DIR, RUN_A_DIR, RUN_B_DIR]) mkdirSync(path.join(sweepDir, sub), { recursive: true });
}

/** Runs every planned case twice across `shards` concurrent run.sh processes. */
export async function runSweep(
  ctx: SweepContext,
  cases: readonly PlannedCase[],
  shards: number,
): Promise<SweepRecord[]> {
  prepareSweepDir(ctx.sweepDir);
  const parts = await Promise.all(shardCases(cases, shards).map((s, i) => executeShard(ctx, i, s)));
  rmSync(path.join(ctx.sweepDir, SHARDS_DIR), { recursive: true, force: true });
  rmSync(path.join(ctx.sweepDir, RUN_B_DIR), { recursive: true, force: true });
  return parts.flat().sort((a, b) => compareStrings(a.caseId, b.caseId));
}

function listAlgorithms(script: string): string[] {
  const run = spawnSync(script, ['--list-algorithms'], {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
  });
  if (run.status !== 0) throw new Error(`run.sh --list-algorithms failed (${run.status}): ${run.stderr}`);
  const parsed: unknown = JSON.parse(run.stdout);
  if (!Array.isArray(parsed) || !parsed.every((a) => typeof a === 'string')) {
    throw new Error(`Unexpected --list-algorithms output: ${run.stdout}`);
  }
  return parsed as string[];
}

function listGenerated(root: string): GeneratedModel[] {
  const dir = path.join(root, GENERATED_DIR_RELATIVE);
  return readdirSync(dir)
    .filter((f) => f.endsWith(GENERATED_EXTENSION))
    .sort(compareStrings)
    .map((f) => ({
      name: f.slice(0, -GENERATED_EXTENSION.length),
      input: path.join(dir, f),
    }));
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}

function resolveOracleDir(root: string): string {
  const override = process.env[ORACLE_DIR_ENV];
  return override !== undefined && override !== ''
    ? path.resolve(override)
    : path.resolve(root, DEFAULT_ORACLE_RELATIVE);
}

function writeOutputs(sweepDir: string, records: readonly SweepRecord[], summary: object): void {
  const lines = records.map((r) => JSON.stringify(r));
  writeFileSync(path.join(sweepDir, RESULTS_FILE), `${lines.join('\n')}\n`);
  writeFileSync(path.join(sweepDir, SUMMARY_FILE), `${JSON.stringify(summary, null, 2)}\n`);
}

function buildPlan(root: string, opts: SweepOptions): Plan {
  const census = JSON.parse(readFileSync(path.join(root, COMMITTED_CENSUS_RELATIVE), 'utf8')) as Census;
  const algorithms = listAlgorithms(path.join(root, RUN_SCRIPT_RELATIVE)); // also compiles the harness once
  const plan = planCases(census.models, algorithms, loadVariantNames(), listGenerated(root));
  return { ...plan, cases: selectCases(plan.cases, opts.filter, opts.limit) };
}

async function executeSweep(root: string, modelsDir: string, plan: Plan, opts: SweepOptions): Promise<number> {
  const elkCommit = readFileSync(path.join(root, ELK_COMMIT_RELATIVE), 'utf8').trim();
  const modelsCommit = loadManifest().commit;
  const sweepDir = opts.out ?? path.join(resolveOracleDir(root), SWEEP_DIR, `${elkCommit}-${modelsCommit}`);
  const startedAt = Date.now();
  const script = path.join(root, RUN_SCRIPT_RELATIVE);
  const ctx = { script, modelsDir, sweepDir, total: plan.cases.length, startedAt, done: { count: 0 } };
  const records = await runSweep(ctx, plan.cases, opts.shards);
  const wallMs = Date.now() - startedAt;
  const { parseErrors } = plan;
  writeOutputs(sweepDir, records, { elkCommit, modelsCommit, cases: records.length, wallMs, parseErrors });
  const verdicts = countBy(records, (r) => `${r.tier}:${r.verdict}`);
  process.stdout.write(`${JSON.stringify({ cases: records.length, wallMs, shards: opts.shards, verdicts })}\n`);
  return records.some((r) => r.verdict === STATUS_ORACLE_ERROR) ? 1 : 0;
}

async function main(argv: readonly string[]): Promise<number> {
  const opts = parseArgs(argv);
  const root = repoRoot();
  const resolved = resolveModelsDir();
  if ('skip' in resolved) throw new Error(resolved.skip);
  const plan = buildPlan(root, opts);
  if (!opts.planOnly) return executeSweep(root, resolved.dir, plan, opts);
  const { cases, parseErrors } = plan;
  process.stdout.write(
    `${JSON.stringify({ cases: cases.length, byTier: countBy(cases, (c) => c.tier), parseErrors })}\n`,
  );
  return 0;
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err: unknown) => {
      process.stderr.write(`sweep: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
      process.exitCode = 2;
    },
  );
}
