<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: text-sizing-seam (auto-confirmed at planning, 2026-11-13)

These are in the queue form. A stop that blocks only part of the work: file it with
`gh issue create --label needs-ruling`, name the exact rows or files, journal it as a `ruling` row, leave those rows as they
are, and finish the rest. A stop that blocks the whole mission halts it: journal it, commit the work, and end with the halted
line the driver prompt names. A write outside a task's write-set is not a stop; journal why it was needed.

1. **Outside the worktree.** A change needs `../elk`, `../elk-end-label-*`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout,
   or an oracle patch other than `0003` → `needs-ruling`. Patch `0003` is the one the issue names (TX2); a change to `0001` or
   `0002` is not.
2. **Repeated failure.** The same gate check fails twice in a row (failures caused only by a timeout at high load do not
   count), or one location is edited three times in a row for the same check → halt that task with the diagnosis so far.
   `build.sh` failing twice for a reason other than load or network → halt as blocked.
3. **AD-13.** A byte diff in a landed ref, vector or golden other than the `patches` stamps of TX8 and the parity report's patch
   line; a landed test that passes only if its assertion changes (`layout-test-labels*.test.ts`,
   `SortByInputModelProcessorTest.test.ts` included); an expected value written by hand or taken from the TS side.
4. **Default changed (halts the mission).** Any TX7 check fails: a class outside `TestConfiguration` and the three new classes
   differs after the rebuild; a default-mode `java-tests.sh` outcome differs from the pre-patch baseline; the default-mode
   re-measure differs from `layered-label-metrics.json`. The patch must preserve ELK's behaviour by default (#52). Diagnose
   (mechanism, origin, chain, ruled out), journal, and halt: the fix is a patch change the maintainer reviews.
5. **Wrong platform (halts the mission).** `uname -sm` is not `Darwin arm64`, or `java -version` is not 21.0.1, at any oracle
   build, recording or JVM comparison (#52).
6. **Divergence.** A TS label size, layout or runner outcome differs from the oracle in fixed mode. Diagnosis mode applies; the
   default stance is "my port differs: find where". A mechanism in the new seam or the recorder is fixed in the task. A
   mechanism in landed `src/` is fixed at its origin only when the fix is local (one module, no landed expected value moves)
   and the artifact is journaled. Otherwise file `follow-up` with the artifact, list the rows in a pinned list naming the
   issue (pattern `test/helpers/layered-pipeline-pinned-rows.ts`), and finish; never alter an expected value.
7. **Locked decisions.** A change would contradict TX1–TX8, an earlier mission's rows, or AD-1…AD-16 (above all AD-4's 1e-6,
   AD-5's local sweeps, AD-14's frozen surface: no `src/` export changes).
8. **Coverage and limits.** Below 90/90/90/90; a file over 500 lines, a function over 30 NLOC, CCN over 10 or more than 5
   parameters (`npm run complexity`).
9. **Suite time.** `npm test` (every sweep directory `/nonexistent`) takes more than the planning baseline (75.9 s) plus 20 s
   at similar load.

## Push-forward (decide and journal, do not stop)

- Names of private helpers, test files and local constants; the exact rows of `label-sizing-texts.txt` (cover empty-adjacent
  one-character text, spaces, a surrogate pair, a line break, a 200-character text, and a text already in the snapshot).
- The label key format of `label-sizing.json` (an element path plus the label index is the suggestion), as long as the TS test
  derives the same key from the same graph.
- Which runner suites form the TX6(c) and TX7 set, as long as every suite the TS port runs through `defineLayoutTest` is in it
  (list them in the journal).
- Agent type per task, and the order of independent steps inside a task.
- Re-running a sweep or JVM run that failed only on load or timeout.
