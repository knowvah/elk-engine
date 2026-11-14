<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: corpus size comparison and fixed-mode runner parity

**Agent:** orchestrator. **Decisions:** TX6(b), TX6(c). **Writes:** `test/corpus/label-sizing-sweep.test.ts`. Scratch under
`$TMPDIR/text-sizing-seam/T4/`.

## Read-set

- `test/corpus/labels-sweep.test.ts` (the skip-gated sweep-test pattern: env directory, skip message, `describe.skipIf`)
- `test/golden/label-sizing.test.ts` and `test/helpers/layout-test-text-measurer.ts` (T3: reuse the key derivation, do not
  copy it; export it from T3's module if needed and journal that)
- `$ELK_ORACLE_DIR/label-sizing/label-sizing-corpus.json` (T2 step 4); `test/corpus/corpus.ts` (`MODELS_DIR_ENV`, the
  model path)
- `tools/oracle/java-tests.sh:1-17` and the T1 journal row that lists the runner suites

## Steps

1. **Corpus sizes (TX6(b)).** `label-sizing-sweep.test.ts` reads `LABEL_SIZING_SWEEP_DIR` (default
   `$ELK_ORACLE_DIR/label-sizing`) and the models directory. It skips with a message naming both when either is missing. For
   every model in `label-sizing-corpus.json`, it loads the `.elkt` through the TS loader, sizes it with
   `FIXED_ADVANCE_TEXT_MEASURER`, and compares the key sets and every size exactly. It reports all mismatching models in
   one failure message (cap 20 lines, plus the count). Run it locally with the directory present, and journal the number of
   models and labels compared. The full-suite gate runs it with `LABEL_SIZING_SWEEP_DIR=/nonexistent` (add it to the README's
   `SWEEPS` list, which already names the other sweep directories).
2. **Runner parity (TX6(c)).** Check `uptime`. Run `java-tests.sh` over the runner suites with
   `JAVA_TOOL_OPTIONS="-Dorg.eclipse.elk.alg.test.textMeasurer=fixed"` (the script adds `-XX:hashCode=2` itself), detached
   under `nice -n 10`, and keep the per-class lines and each failing class's JUnitCore output. Run the TS runner suites with
   `ELK_TEST_TEXT_MEASURER=fixed npx vitest run <files>` and collect `runs` and failures per suite, plus the names of failing
   cases. Compare them class by class: `runs`, `failures`, and the failing case names. Journal the table. Any difference is
   stop 6: diagnose (instrument the oracle in scratch, never `../elk`).
3. Journal both results as `sweep` rows. The fixed-mode suite outcomes are evidence only. They are not committed as
   expectations.

## Acceptance criteria

- Given the corpus output and the models directory, when the sweep test runs, then every one of the corpus models (759 at
  planning) matches on key sets and sizes, or each mismatch has a stop-6 artifact.
- Given either directory missing, when the full suite runs, then the test is skipped with a message naming the variable.
- Given both runners in fixed mode, when they run the same suites, then `runs`, `failures` and failing case names are equal
  class by class.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (delete the test).
