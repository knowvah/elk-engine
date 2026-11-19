<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: sweeps, suites, triage

**Agent:** orchestrator. **Runbook:** §§ 9, 10. **Decisions:** D5.4, D7, D8. **Before side:** `$B` (read-only).

## Task

1. **Corpus sweep.** Run `tools/oracle/sweep.sh` under `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions
   -XX:hashCode=2"` (8 shards: start it only at load ≤ 12, and only while T2's recorder is not running or the load
   allows it). Then run `npx tsx tools/corpus/ts-layout-compare.ts --out "$TMPDIR/ts-final.json"` and the case-by-case
   verdict diff against `$B/corpus.jsonl` (the runbook's `node -e` script). Expected changes:
   - `native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking`: `throws`
     `UnsupportedConfigurationException` on both sides (#84);
   - `sporeOverlap`/`sporeCompaction`: the about 790 `nondeterministic` cases become `ok` or `throws`, the #79 cases
     settle on one verdict, and the ptolemy `Invalid hitboxes for scanline overlap calculation.` throws go (#1244);
   - rectpacking cases with `desiredPosition` ties or `placeBeside` may change (#1237, #1239).
   Any other verdict change is stop 4. Rerun the sweep once to show the spore verdicts are now stable: a byte comparison
   of `results.jsonl` across two runs, journaled.
2. **New TS findings** (stop 7). For every `mismatch`, `oracle-only-throw` or `ts-only-throw` in `sporeOverlap` or
   `sporeCompaction`, enter diagnosis mode. Dump the first differing node or coordinate from both sides
   (`tools/oracle/run.sh --cases`), then instrument the port and the oracle at the importer, the overlap-removal
   iterations and `updateGraph`. A port defect with a mechanism is fixed in T5's files, with a regression test and a
   journal row. Anything irreducible is filed `needs-ruling` with the case ids. Journal the counts per category before
   and after.
3. **#79 retirement (D5.4).** Remove the `issue: 79` entries of `tools/corpus/ts-findings.json` whose cases now compare
   `ok` or `both-throw`. Rewrite the spore entries of `NONDETERMINISM_SOURCES` (`tools/corpus/parity-report.ts:69-73`)
   to match the new Java (seeded since `8bca22f4`). Remove them if no spore case is `nondeterministic` any more. Then
   update the assertions `test/corpus/parity-report.test.ts` makes about those strings (`:212-219`), and journal before
   and after. Run `npx tsx tools/corpus/parity-report.ts --write --ts-summary "$TMPDIR/ts-final.json"` and
   `npx vitest run test/corpus/parity-report.test.ts`.
4. **Phase and language sweeps.** Run the eleven sweeps of the § 9 table (`elkj-sweep.sh --jobs 6` alone, after T2,
   about 5.5 h). Then run the consumer tests with `--silent=false`, without the `/nonexistent` overrides, and journal
   their indicator lines. Compare each with `$B` (the runbook's `cmp`/`diff` loop). A `DIFF` without a #104 row is stop 4.
5. **JUnit counts (§ 10).** Run `java-tests.sh` over the ported classes and diff against `$B/java-tests.txt`. Add
   `NestedModelOrderConfigurationTest` (it is in `alg.layered.test`). Use a scratch copy of `java-tests.sh` in `$TMPDIR`
   with `alg.rectpacking.test` and `alg.spore.test` added to `TEST_BUNDLES`, never an edit in place. With it, run
   `InteractiveNodeReordererTest`, `CompactionTest`, `RandomSeedTest` and `ScanlineOverlapRemovalTest` on the oracle; all
   pass, and the counts are journaled. Then run `PIPELINE_SUITES_FULL=1 ELK_MODELS_DIR="$ELK_MODELS_DIR" npx vitest run
   src/alg/layered` and compare the counts with `docs/conformance.md`.
6. **Leftovers check** (§ 12 last row): no `ts-layout-worker` and no ELK JVM is left running.

## Write-set

`docs/parity-report.md` (generated); `tools/corpus/ts-findings.json`; `tools/corpus/parity-report.ts` (the spore entries
of `NONDETERMINISM_SOURCES` only); `test/corpus/parity-report.test.ts` (D5.4 strings only). Fixes under stop 7 go in
`src/alg/spore/**` and colocated tests. Local sweep outputs (not committed).

## Acceptance criteria

- Given the new corpus sweep, when it is diffed against `$B/corpus.jsonl`, then every changed verdict has a #104 row.
  The `modelOrderCycleBreaking` case is `throws` with `UnsupportedConfigurationException` on both sides.
- Given two consecutive corpus sweeps, when their `sporeOverlap` and `sporeCompaction` verdicts are compared, then they
  are equal.
- Given the TS sweep, when `ts-final.json` is read, then every spore finding has a fix with a mechanism or a
  `needs-ruling` issue number in the journal.
- Given the ported JUnit classes, when the counts are diffed against `$B/java-tests.txt`, then only the added classes
  differ. The four spore and rectpacking classes report `failures=0` on the oracle.

## Observability / rollback

N/A: no new observable operations. Journal wall times for the runbook. Reversible.
