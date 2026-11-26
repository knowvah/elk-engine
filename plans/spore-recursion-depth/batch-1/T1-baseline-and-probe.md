<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: probe harness and baseline measurements

**Agent:** orchestrator. **Budget:** 110 min wall (mostly the compaction ladders). **Commit:** none (journal rows land with T4).

## Context

Issue #76's table measured isolated sites in cold JVMs with a scratch probe that is gone (`$TMPDIR/alg-packing/T14/`). D1, D5
and D6 need whole-pipeline numbers, and #70's journaled harness covers most of the work.

## Task

1. Build the D6 harness under `$TMPDIR/spore-recursion-depth/probe/` from the text in
   `plans/component-dfs-depth/decision-journal.md` § Scratch harness (and #67's base scripts it builds on):
   - `gen.mts <alg> chain <depth> <out.json>`: `alg` is `sporeOverlap` or `sporeCompaction`, the root `algorithm` is
     `org.eclipse.elk.sporeOverlap` or `org.eclipse.elk.sporeCompaction` (check the ids against
     `src/alg/spore/options/Spore*Options.ts`). The chain follows `SporeLayoutVectors.java:1870-1877` exactly: node `n<i>` at
     `x = 8·i` with 10 × 10 (overlap) or `x = 0.0625·i` with 200 × 20 (compaction), `y = 0`, no edges, default options.
   - `ts-run.mts`, `compare.mts`, `ts.sh`, `oracle.sh`, `grid.sh`: as journaled, with paths renamed. `ts-run.mts` calls
     `layoutToJson`, which registers both spore algorithms (`tools/corpus/ts-layout-pipeline.ts:85-86`).
   - Smoke run: each algorithm on a 2,000 chain: TS `ok`, oracle `ok`, `equal at 1e-6`. If a diff is an identity field (as
     disco's was in #70), use `neutraliseIdentity` from `tools/corpus/ts-layout-classify.ts` and journal it.
   - Report the smoke result so batch 2 can start.
2. Timing fit (D1): oracle and unconverted port (raised stack, step 4's snapshot) at 2,000 and 4,000 per algorithm. Fit the
   growth exponent from the two points and journal the estimate per depth. A depth whose port estimate exceeds 90 minutes leaves
   the grid.
3. Oracle ladders (D1): per algorithm, two ladders, each one cold JVM over ascending chains from 2,000 in steps of 1,000 up to
   the first `StackOverflowError` plus two depths above it, or to the time cap. Check `uptime` before each JVM and wait while it
   is above 12. Run under `nice -n 10`, detached and polled. Record time and status per depth, and the order of the cases. A
   heap exhaustion or timeout is journaled as not a stack result (stop 2). `D_oracle(alg)` is the deepest depth completed in any
   run; say whether the stack or the cap set it.
4. D5 references: `git archive <base> src tools test package.json tsconfig.json` into `$TMPDIR/spore-recursion-depth/base` with
   `node_modules` linked. Run the chain of each algorithm at `D_oracle(alg)` with `node --stack-size=7000` (raise the heap if
   needed). Keep the outputs under `$TMPDIR/spore-recursion-depth/ref/` with their `shasum`. Compare each with the oracle at
   1e-6, the pre-existing divergence check of stop 2.
5. TS brackets on the unconverted port (default stack, JIT): the chain per algorithm at 2,000, 2,500, 3,000, 4,000 (and on to
   `D_oracle` in steps if cheap). Record the first overflow depth and the repeating `src/alg/` frame (`Error.stackTraceLimit =
   200`), and compare with #76's table. A difference is journaled, not a stop.
6. Journal: the changed harness scripts verbatim, every ladder run, the fit, the TS brackets, the D5 settings and hashes, and the
   pre-existing-divergence result. Also journal `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD --
   plugins/org.eclipse.elk.alg.spore plugins/org.eclipse.elk.alg.common plugins/org.eclipse.elk.core` (empty at planning).
7. Mark batch 1 `[x]` in the README.

## Read-set

[decisions.md](../decisions.md) D1, D5, D6; `gh issue view 76 --comments`; `plans/component-dfs-depth/decision-journal.md`
lines 5-20 and 42 to the end; `tools/oracle/run.sh:1-20`; `tools/corpus/ts-layout-pipeline.ts:80-107`;
`test/golden/compare-json.ts`; `tools/vectors/SporeLayoutVectors.java:1865-1877`; `.agent-notes/component-dfs-depth.md`.

## Write-set

`plans/spore-recursion-depth/decision-journal.md`, the README batch table and `$TMPDIR/spore-recursion-depth/**`.

## Acceptance criteria

- Given the two ladders per algorithm, when T1 ends, then the journal holds `D_oracle` for `sporeOverlap` and
  `sporeCompaction`, the raw status of every depth, and whether the stack or the time cap set it.
- Given the timings at 2,000 and 4,000, when the grid is chosen, then the fit and every dropped depth are journaled.
- Given the raised stack, when the unconverted port runs at `D_oracle`, then two reference outputs exist with hashes, each
  compared with the oracle at 1e-6, and the result is journaled.
- Given the harness, when T1 ends, then its changed text is in the journal and no harness file lies under the repository.

**Observability:** N/A. No new observable operations. **Rollback:** Reversible. Nothing is committed.
