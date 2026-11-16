// SPDX-License-Identifier: EPL-2.0
// Test-only dependencies for the sharded sweep's worker (loaded through TS_LAYOUT_WORKER_DEPS_MODULE): a case id with
// `hang` never returns (a synchronous endless loop only the parent's SIGKILL ends), one with `die` exits the process
// with code 3, every other case lays out to the same text the oracle "wrote", so it compares `ok`.
import type { CaseDeps } from '../../tools/corpus/ts-layout-classify.js';

export const HANG_MARK = 'hang';
export const DIE_MARK = 'die';
export const DIE_EXIT_CODE = 3;
export const SAME_OUTPUT = JSON.stringify({ id: 'root', children: [{ id: 'n1', x: 1, y: 2 }] });

export function createDeps(): CaseDeps {
  return {
    readOracleOutput: () => SAME_OUTPUT,
    runTs: (row) => {
      if (row.caseId.includes(HANG_MARK))
        for (;;) {
          // never returns
        }
      if (row.caseId.includes(DIE_MARK)) process.exit(DIE_EXIT_CODE);
      return SAME_OUTPUT;
    },
  };
}
