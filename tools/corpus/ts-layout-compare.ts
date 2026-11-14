// SPDX-License-Identifier: EPL-2.0
// Local TS-vs-oracle comparison of the corpus sweep (M5, AD-4, AD-5; sharded runner: mission ts-parity-dashboard, TP2).
// Reads the oracle sweep (`results.jsonl`, `run-a/`), lays every case out with the TS engine through the same
// pipeline as the oracle harness (import, overlay, engine, export) and classifies the result. The CLI runs the cases
// in forked shards with a per-case limit; `execute` / `runComparison` stay the in-process, synchronous path. Nothing
// from the sweep is committed; the JSON summary goes to the path given by `--out`.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadManifest, repoRoot, resolveModelsDir } from '../../test/corpus/corpus.js';
import { COMMITTED_CENSUS_RELATIVE, ELK_COMMIT_RELATIVE, ORACLE_DIR_ENV } from './census.js';
import {
  type CaseOutcome,
  type Summary,
  buildSweepSummary,
  compareCase,
  report,
  selectRows,
  summarize,
} from './ts-layout-classify.js';
import { type Dirs, liveDeps, resolveSweepDir } from './ts-layout-pipeline.js';
import { DEFAULT_TIMEOUT_MS, MAX_DEFAULT_SHARDS, type ShardOptions, runSharded } from './ts-layout-shards.js';

export type {
  AlgorithmSummary,
  CaseDeps,
  CaseOutcome,
  Category,
  InProcessCategory,
  Summary,
  SweepRow,
  TsOutcome,
  TsSweepSummary,
} from './ts-layout-classify.js';
export {
  CATEGORIES,
  SWEEP_CATEGORIES,
  classify,
  compareCase,
  lenientParse,
  neutraliseIdentity,
  overlayAlgorithm,
  report,
  selectRows,
  simpleClassName,
  summarize,
  summarizeSweep,
} from './ts-layout-classify.js';
export type { Dirs } from './ts-layout-pipeline.js';
export { inputOf, layoutToJson, liveDeps, registerTreeAlgorithms, resolveSweepDir } from './ts-layout-pipeline.js';

/** Every algorithm the oracle sweep lists, by short name. */
export const DEFAULT_ALGORITHMS: readonly string[] = [
  'box',
  'disco',
  'fixed',
  'force',
  'layered',
  'mrtree',
  'radial',
  'random',
  'rectpacking',
  'sporeCompaction',
  'sporeOverlap',
  'stress',
  'topdownpacking',
  'vertiflex',
];

export interface Options {
  readonly out: string | undefined;
  readonly sweepDir: string | undefined;
  readonly algorithms: readonly string[];
  readonly filter: string | undefined;
  /** Present only when `--shards` is given. */
  readonly shards?: number;
  /** Present only when `--timeout-ms` is given. */
  readonly timeoutMs?: number;
}

const RESULTS_FILE = 'results.jsonl';
const FLAG_VALUES: readonly string[] = ['--out', '--sweep-dir', '--algorithms', '--filter', '--shards', '--timeout-ms'];

function positiveInteger(flag: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${flag} requires a positive integer, got ${value}`);
  return parsed;
}

export function parseArgs(argv: readonly string[]): Options {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] as string;
    if (!FLAG_VALUES.includes(flag)) throw new Error(`Unknown argument ${flag}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`${flag} requires a value`);
    values.set(flag, value);
  }
  const algorithms = values.get('--algorithms')?.split(',') ?? DEFAULT_ALGORITHMS;
  const shards = values.get('--shards');
  const timeoutMs = values.get('--timeout-ms');
  return {
    out: values.get('--out'),
    sweepDir: values.get('--sweep-dir'),
    algorithms,
    filter: values.get('--filter'),
    ...(shards === undefined ? {} : { shards: positiveInteger('--shards', shards) }),
    ...(timeoutMs === undefined ? {} : { timeoutMs: positiveInteger('--timeout-ms', timeoutMs) }),
  };
}

/** Compares every selected sweep row of `dirs.sweepDir` and returns the summary. */
export function runComparison(opts: Options, dirs: Dirs): Summary {
  const jsonl = readFileSync(path.join(dirs.sweepDir, RESULTS_FILE), 'utf8');
  const deps = liveDeps(dirs);
  return summarize(selectRows(jsonl, opts.algorithms, opts.filter).map((row) => compareCase(row, deps)));
}

/** What `execute` needs from the process: the models directory, the oracle directory variable and the sinks. */
export interface Io {
  readonly modelsDir: string;
  readonly oracleEnv: string | undefined;
  readonly stdout: (text: string) => void;
  readonly writeFile: (file: string, text: string) => void;
}

/** Runs the comparison for `argv` in this process; the exit code is 0 without findings, 1 with findings. */
export function execute(argv: readonly string[], root: string, io: Io): number {
  const opts = parseArgs(argv);
  const sweepDir = resolveSweepDir(root, opts.sweepDir, io.oracleEnv);
  const summary = runComparison(opts, { root, modelsDir: io.modelsDir, sweepDir });
  if (opts.out !== undefined) io.writeFile(opts.out, `${JSON.stringify(summary, null, 2)}\n`);
  io.stdout(report(summary));
  return summary.findings.length === 0 ? 0 : 1;
}

/** `execute` for the sharded path: the worker script, its Node flags and environment can be overridden (tests). */
export interface ShardedIo extends Io {
  readonly worker?: Pick<ShardOptions, 'workerFile' | 'execArgv' | 'env' | 'startupTimeoutMs'>;
}

export function defaultShards(): number {
  return Math.min(availableParallelism(), MAX_DEFAULT_SHARDS);
}

function runOptions(opts: Options, dirs: Dirs, io: ShardedIo): ShardOptions {
  return {
    shards: opts.shards ?? defaultShards(),
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    dirs,
    ...io.worker,
  };
}

/** The commit of the ELK source the sweep was recorded against. */
function readElkCommit(root: string): string {
  return readFileSync(path.join(root, ELK_COMMIT_RELATIVE), 'utf8').trim();
}

/**
 * Compares the selected rows in forked shards with a per-case time limit (`ts-aborted` past it) and returns the
 * outcomes in row order. Reads the census in the parent only to fail early on a missing one.
 */
export async function runComparisonSharded(opts: Options, dirs: Dirs, io: ShardedIo): Promise<CaseOutcome[]> {
  const jsonl = readFileSync(path.join(dirs.sweepDir, RESULTS_FILE), 'utf8');
  readFileSync(path.join(dirs.root, COMMITTED_CENSUS_RELATIVE), 'utf8');
  return runSharded(selectRows(jsonl, opts.algorithms, opts.filter), runOptions(opts, dirs, io));
}

/** Like `execute`, in shards: `--out` gets the full `TsSweepSummary`, stdout the usual counts. */
export async function executeSharded(argv: readonly string[], root: string, io: ShardedIo): Promise<number> {
  const started = performance.now();
  const opts = parseArgs(argv);
  const dirs = { root, modelsDir: io.modelsDir, sweepDir: resolveSweepDir(root, opts.sweepDir, io.oracleEnv) };
  const run = runOptions(opts, dirs, io);
  const outcomes = await runComparisonSharded(opts, dirs, io);
  const summary = buildSweepSummary(outcomes, {
    elkCommit: readElkCommit(root),
    modelsCommit: loadManifest().commit,
    sweepDir: dirs.sweepDir,
    node: process.version,
    shards: run.shards,
    timeoutMs: run.timeoutMs,
    wallMs: Math.round(performance.now() - started),
  });
  if (opts.out !== undefined) io.writeFile(opts.out, `${JSON.stringify(summary, null, 2)}\n`);
  io.stdout(report(summary));
  return summary.findings.length === 0 ? 0 : 1;
}

/* v8 ignore start -- process wiring: environment, stdio and exit code */
async function main(argv: readonly string[]): Promise<number> {
  const resolved = resolveModelsDir();
  if ('skip' in resolved) throw new Error(resolved.skip);
  return executeSharded(argv, repoRoot(), {
    modelsDir: resolved.dir,
    oracleEnv: process.env[ORACLE_DIR_ENV],
    stdout: (text) => process.stdout.write(text),
    writeFile: (file, text) => writeFileSync(file, text),
  });
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`ts-layout-compare: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exitCode = 2;
  }
}
/* v8 ignore stop */
