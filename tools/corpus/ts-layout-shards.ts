// SPDX-License-Identifier: EPL-2.0
// Parent side of the sharded TS sweep (TP2): rows are dealt round-robin to forked workers, one case at a time over IPC.
// The parent times every case. A case past its limit gets SIGKILL (a synchronous endless loop cannot be interrupted
// from inside the child), and a child that dies is recorded the same way; either way the shard continues with a fresh
// child, so one hang or crash costs one case, not the sweep.
import { type ChildProcess, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  type CaseDeps,
  type CaseOutcome,
  type SweepRow,
  abortedOutcome,
  compareCase,
  isRunnable,
} from './ts-layout-classify.js';
import { isOutcomeMessage, isReadyMessage } from './ts-layout-protocol.js';
import type { Dirs } from './ts-layout-pipeline.js';

export const DEFAULT_TIMEOUT_MS = 120_000;
export const MAX_DEFAULT_SHARDS = 8;
/** How long a fresh child may take to load the engine and announce `ready`; independent of the per-case limit. */
export const STARTUP_TIMEOUT_MS = 60_000;
export const WORKER_FILE: string = fileURLToPath(new URL('./ts-layout-worker.ts', import.meta.url));
const DETAIL_TIMEOUT = 'timeout';
const DETAIL_STARTUP_TIMEOUT = 'startup timeout';

export interface ShardOptions {
  readonly shards: number;
  readonly timeoutMs: number;
  readonly dirs: Dirs;
  /** The worker script; defaults to {@link WORKER_FILE}. */
  readonly workerFile?: string;
  /** Node flags of the child (tsx loaders); defaults to the parent's `process.execArgv`. */
  readonly execArgv?: readonly string[];
  /** The limit for a fresh child to announce `ready`; defaults to {@link STARTUP_TIMEOUT_MS}. */
  readonly startupTimeoutMs?: number;
  /** Extra environment of the children, added to the parent's. */
  readonly env?: Readonly<Record<string, string>>;
}

type Wait<T> = { kind: 'value'; value: T } | { kind: 'timeout' } | { kind: 'exit'; detail: string };

/** Round-robin split (as `sweep.ts`): item `i` goes to shard `i % n`; never more shards than items. */
export function shardItems<T>(items: readonly T[], shards: number): T[][] {
  const count = Math.max(1, Math.min(shards, items.length));
  const out: T[][] = Array.from({ length: count }, () => []);
  items.forEach((item, i) => out[i % count]?.push(item));
  return out;
}

/** Waits for the first message `guard` accepts, the child's exit, or `ms` to pass. */
function waitFor<T>(child: ChildProcess, guard: (message: unknown) => message is T, ms: number): Promise<Wait<T>> {
  return new Promise((resolve) => {
    const finish = (result: Wait<T>): void => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('exit', onExit);
      child.off('error', onError);
      resolve(result);
    };
    const onMessage = (message: unknown): void => {
      if (guard(message)) finish({ kind: 'value', value: message });
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void =>
      finish({ kind: 'exit', detail: `exit ${String(code ?? signal)}` });
    const onError = (): void => finish({ kind: 'exit', detail: 'exit error' });
    const timer = setTimeout(() => finish({ kind: 'timeout' }), ms);
    child.on('message', onMessage);
    child.on('exit', onExit);
    child.on('error', onError);
  });
}

/** Kills the child with SIGKILL if it still runs and resolves once it is gone. */
function reap(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
    child.kill('SIGKILL');
  });
}

function spawnWorker(opts: ShardOptions): ChildProcess {
  return fork(opts.workerFile ?? WORKER_FILE, [JSON.stringify(opts.dirs)], {
    execArgv: [...(opts.execArgv ?? process.execArgv)],
    env: { ...process.env, ...opts.env },
  });
}

/** A fresh child that has announced `ready`, or the detail of why it did not. */
async function startWorker(opts: ShardOptions): Promise<{ child: ChildProcess } | { failed: string }> {
  const child = spawnWorker(opts);
  const ready = await waitFor(child, isReadyMessage, opts.startupTimeoutMs ?? STARTUP_TIMEOUT_MS);
  if (ready.kind === 'value') return { child };
  await reap(child);
  return { failed: ready.kind === 'timeout' ? DETAIL_STARTUP_TIMEOUT : ready.detail };
}

/** Sends one case and settles it: the child's outcome, or `ts-aborted` with the child killed. */
async function settleCase(
  child: ChildProcess,
  row: SweepRow,
  timeoutMs: number,
): Promise<{ outcome: CaseOutcome; alive: boolean }> {
  const start = performance.now();
  const answered = waitFor(child, isOutcomeMessage, timeoutMs);
  child.send({ type: 'case', row });
  const result = await answered;
  if (result.kind === 'value') return { outcome: result.value.outcome, alive: true };
  const detail = result.kind === 'timeout' ? DETAIL_TIMEOUT : result.detail;
  await reap(child);
  return { outcome: abortedOutcome(row, detail, performance.now() - start), alive: false };
}

/** Rows that are `excluded` never reach a child; nothing in them is read. */
const UNREACHABLE_DEPS: CaseDeps = {
  readOracleOutput: () => {
    throw new Error('an excluded case reads no oracle output');
  },
  runTs: () => {
    throw new Error('an excluded case runs no TS layout');
  },
};

interface ShardRun {
  readonly index: number;
  readonly row: SweepRow;
}

/** Runs one shard's cases in order, replacing the child after every abort; the child never outlives the shard. */
async function runShard(items: readonly ShardRun[], opts: ShardOptions, results: CaseOutcome[]): Promise<void> {
  let child: ChildProcess | null = null;
  try {
    for (const { index, row } of items) {
      if (!isRunnable(row)) {
        results[index] = compareCase(row, UNREACHABLE_DEPS);
        continue;
      }
      if (child === null) {
        const started = await startWorker(opts);
        if ('failed' in started) {
          results[index] = abortedOutcome(row, started.failed, 0);
          continue;
        }
        child = started.child;
      }
      const settled = await settleCase(child, row, opts.timeoutMs);
      results[index] = settled.outcome;
      if (!settled.alive) child = null;
    }
  } finally {
    if (child !== null) await reap(child);
  }
}

/** Compares `rows` in `opts.shards` worker processes; the outcomes are in the order of `rows`. */
export async function runSharded(rows: readonly SweepRow[], opts: ShardOptions): Promise<CaseOutcome[]> {
  const results: CaseOutcome[] = new Array<CaseOutcome>(rows.length);
  const runs = rows.map((row, index) => ({ index, row }));
  await Promise.all(shardItems(runs, opts.shards).map((items) => runShard(items, opts, results)));
  return results;
}
