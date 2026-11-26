<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: regeneration, sweeps, fitness test and docs

**Agent:** orchestrator. **Budget:** 100 min (stop 11; the phase sweep dominates).

## Task

1. **Recorders (D7 step 2).** Check `uptime` (wait above 12). For each recorder T2 changed, run its
   `tools/vectors/<name>-vectors.sh` under `nice -n 10` into `$TMPDIR/canonical-nan/after/<name>/` (the vector cache is
   cold for a changed recorder; planning measured seconds to about a minute each). Diff each output with its ref:
   - identical: journal `regen` row (recorder, seconds, identical);
   - differs only at NaN tokens (check every changed line: the old and new token both decode to NaN): copy the output over
     the ref, journal recorder, file, count of tokens, "patch: issue #72";
   - any other difference: stop 3.
   A recorder that fails to compile or run is a T2 defect: fix it inside T2's write-set (2-fix cap) and journal it.
2. **Sweeps (D7 step 3).** For each sweep whose Java T2 changed (planning expects phase, order, placement, routing,
   pipeline, labels; loops and compound only if their files changed), run `tools/oracle/<sweep>-sweep.sh --force` detached
   (`nohup nice -n 10 bash -c '…; echo "exit $?"'`), polling at most 9 min at a time. Compare the new `results.jsonl` with
   T1's copy by id: same ids, status, class, processor; list every `ok` id whose hash changed. For each changed id (all of
   them if 10 or fewer, else 10 chosen across sweeps plus a count), dump it with the base recorder (`git show
   <base>:<file>` into `$TMPDIR`, run with the sweep's `--dump`) and the new one, canonicalise NaN tokens in the old dump,
   and require byte equality (stop 4 otherwise). Then run each changed sweep's TS test
   (`npx vitest run test/corpus/<sweep>-sweep.test.ts`, stride per the push-forward rule) and journal its pass counts.
3. **Fitness test (D5).** Write `test/architecture/canonical-nan.fitness.test.ts` in the style of the other
   `*.fitness.test.ts` (read `math-call-sites.fitness.test.ts` for file walking). Allowlist entries are an array of
   `{ file, reason }` in the test. Add a test that every allowlist entry still matches (no stale entries). It must pass on
   the tree and fail if a `doubleToRawLongBits` call is added to any recorder (check once by hand, then revert).
4. **Docs (D6).** Add the conformance entry after the non-finite row of the comparator table in `docs/conformance.md`, and
   fix the sentences T1 listed. Run `npx prettier --check docs/conformance.md` and `npm run docs:build`.
5. Commit (`test(golden): hash nan canonically across layout comparisons` or better), mark T4 done.

## Write-set

`test/architecture/canonical-nan.fitness.test.ts`, `docs/conformance.md`, `test/golden/refs/java/*.json` (NaN-only
changes, D7), fixes inside T2's or T3's write-set for a defect this task finds, the journal, the README table.

## Acceptance criteria

- Given every changed recorder, when rerun, then each output is identical to its ref or differs only at NaN tokens, and
  each case is journaled.
- Given every changed sweep, when rerun, then statuses are unchanged and every changed hash is proven NaN-only by dump.
- Given the fitness test, when a `doubleToRawLongBits` call is added to a layout recorder, then it fails; on the final tree
  it passes and has no stale allowlist entry.
- Given `docs/conformance.md`, when read at the non-finite row, then the canonical-NaN rule, its reason and the JDK-shim
  exception are stated.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the commit; refs regenerate by
script).
