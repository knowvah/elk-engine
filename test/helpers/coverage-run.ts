// SPDX-License-Identifier: EPL-2.0

/** Whether this run is instrumented for coverage (vitest keeps its resolved config on the worker global). */
export function isCoverageRun(): boolean {
  const worker = (globalThis as { __vitest_worker__?: { config?: { coverage?: { enabled?: boolean } } } })
    .__vitest_worker__;
  return worker?.config?.coverage?.enabled === true;
}
