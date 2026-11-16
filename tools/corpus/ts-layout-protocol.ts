// SPDX-License-Identifier: EPL-2.0
// The IPC protocol between the sharded sweep's parent and its worker children, and the worker's testable core.
// Parent to child: one `case` message per case. Child to parent: `ready` once, then one `outcome` per case.
import { pathToFileURL } from 'node:url';
import { type CaseDeps, type CaseOutcome, type SweepRow, compareCase } from './ts-layout-classify.js';
import type { Dirs } from './ts-layout-pipeline.js';

export interface CaseMessage {
  readonly type: 'case';
  readonly row: SweepRow;
}

export interface ReadyMessage {
  readonly type: 'ready';
}

export interface OutcomeMessage {
  readonly type: 'outcome';
  readonly outcome: CaseOutcome;
}

/**
 * Test-only input: the path of a module exporting `createDeps(dirs): CaseDeps`, which replaces the live pipeline in the
 * worker. The CLI never sets it; the worker tests do, to run a case that never returns or exits the process.
 */
export const WORKER_DEPS_MODULE_ENV = 'TS_LAYOUT_WORKER_DEPS_MODULE';

function hasType(message: unknown, type: string): boolean {
  return typeof message === 'object' && message !== null && (message as { type?: unknown }).type === type;
}

export function isCaseMessage(message: unknown): message is CaseMessage {
  return hasType(message, 'case');
}

export function isReadyMessage(message: unknown): message is ReadyMessage {
  return hasType(message, 'ready');
}

export function isOutcomeMessage(message: unknown): message is OutcomeMessage {
  return hasType(message, 'outcome');
}

/** What the worker answers to one case message. */
export function handleCase(message: CaseMessage, deps: CaseDeps): OutcomeMessage {
  return { type: 'outcome', outcome: compareCase(message.row, deps) };
}

/** The worker's dependencies: the module named by {@link WORKER_DEPS_MODULE_ENV} when set, else `live(dirs)`. */
export async function loadWorkerDeps(
  dirs: Dirs,
  depsModule: string | undefined,
  live: (dirs: Dirs) => CaseDeps,
): Promise<CaseDeps> {
  if (depsModule === undefined || depsModule === '') return live(dirs);
  const loaded = (await import(pathToFileURL(depsModule).href)) as { createDeps?: (dirs: Dirs) => CaseDeps };
  if (typeof loaded.createDeps !== 'function') throw new Error(`${depsModule} does not export createDeps`);
  return loaded.createDeps(dirs);
}
