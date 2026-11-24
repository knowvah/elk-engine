<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: probe harness and baseline measurements

**Agent:** orchestrator. **Budget:** 60 min wall (mostly JVM and mrtree runs). **Commit:** none (journal rows land with T5).

## Context

Issue #67's table was measured by mission 8a's T19 with a scratch probe that was not kept. Decisions D1, D5 and D6 need
fresh, recorded numbers and a harness the three batch-2 tracks share.

## Task

1. Build the D6 harness under `$TMPDIR/tree-recursion-depth/probe/`:
   - `gen.ts <alg> <shape> <depth> <out.json>`: ELK JSON, root `algorithm` set to `org.eclipse.elk.mrtree`, `.radial` or
     `.vertiflex`; nodes 10 x 10; path `n0 -> n1 -> ... `; caterpillar a spine `s0 -> s1 -> ...` with one leaf `l_i` per spine
     node. Default options otherwise. Ids are stable so runs compare.
   - `oracle.sh <dir>`: writes a `cases.jsonl` (`mode` `layout`) and runs `tools/oracle/run.sh --cases` under `nice -n 10`
     (check `uptime` first; wait above 12), `ELK_SWEEP_TIMEOUT_MS` large enough for mrtree at 7,000 (measure; start at
     600000).
   - `ts-run.ts <in.json> <out.json>`: imports `tools/corpus/ts-layout-pipeline.ts` (`registerTreeAlgorithms`, `layoutToJson`),
     run as `node --import tsx [--stack-size=<k>] ts-run.ts ...` in a fresh process per case; prints one JSON line:
     `{"status":"ok"|"overflow"|"threw","frame":"<innermost src/alg frame>","ms":...}`.
   - `compare.ts <expected.json> <actual.json>`: `compareLayout` from `test/golden/compare-json.ts` at 1e-6; exit 1 on diffs.
2. Oracle brackets: two cold runs of the six shapes on the grid 2,000, 2,500, ..., 10,000 (stop a shape's grid at its first
   overflow, plus one depth beyond to confirm). Record `D_oracle(shape)` per D1.
3. TS brackets (default stack, JIT): the same grid up to `D_oracle`; record the first overflow depth and its innermost
   `src/alg/` frame per shape. Compare with the issue's table; a difference is journaled, not a stop.
4. D5 references: at the base sha, run the unconverted port on each shape at `D_oracle` with a raised stack. Try
   `node --stack-size=<k>` with `k` below `ulimit -s` (in KB) minus a margin; if no `k` completes, run `layoutToJson` inside a
   `worker_threads` `Worker` with `resourceLimits.stackSizeMb` raised (and `--stack-size` passed via `execArgv` if needed).
   Keep the six outputs under `$TMPDIR/tree-recursion-depth/ref/` and their `shasum`. Compare each against the oracle at 1e-6
   (pre-existing divergence check, stop 2).
5. Journal: the harness text verbatim (D6), both oracle runs, the TS brackets, the D5 stack setting and hashes, the
   pre-existing-divergence result, and the bundle shas
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.{mrtree,radial,vertiflex} plugins/org.eclipse.elk.core`.
6. Mark batch 1 `[x]` in the README.

## Read-set

[decisions.md](../decisions.md) D1, D5, D6; issue #67 (`gh issue view 67 --comments`); `tools/oracle/run.sh:1-20`;
`tools/corpus/ts-layout-pipeline.ts:55-107`; `test/golden/compare-json.ts:1-30, 150-175`; `tools/oracle/harness/TimedRunner.java`
(the case thread uses the default `-Xss`); `docs/architecture/alg-trees.md:278-293`.

## Write-set

`plans/tree-recursion-depth/decision-journal.md`, the README batch table, `$TMPDIR/tree-recursion-depth/**`.

## Acceptance criteria

- Given two cold oracle runs, when T1 ends, then the journal has `D_oracle` for all six shapes and the raw per-depth status.
- Given the base sha, when the TS grid runs, then each shape's first overflow depth and frame are journaled.
- Given the raised stack, when the unconverted port runs at `D_oracle`, then six reference outputs exist with hashes, each
  compared to the oracle at 1e-6 (result journaled).
- Given the harness, when T1 ends, then its text is in the journal and no harness file is under the repository.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible; nothing committed.
