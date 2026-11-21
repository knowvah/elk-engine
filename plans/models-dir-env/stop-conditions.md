<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: models-dir-env (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or
   another repository. The scratch clone lives under `$TMPDIR` only and is removed at the end of T1; the pinned models
   checkout is read, never written (no symlink is created inside it or next to it).
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.

## Partial stops (file and continue)

3. **The proof cannot run as D2 describes** (the clone cannot resolve `node_modules`, vitest refuses the root, the
   default path happens to exist above `$TMPDIR`). Change the clone's layout, not the test files: for example
   `npm ci --ignore-scripts --offline` in the clone, or a deeper nesting. If no layout works, journal what was tried,
   keep D2 step 3 as the evidence and file `needs-ruling` naming D2 steps 1-2.
4. **A test changes outcome in a way D1 does not explain.** After the fix, in the queue worktree with
   `ELK_MODELS_DIR` unset, any test of the two files (or of the full suite) passes, fails or skips differently from
   the base. Enter diagnosis mode (mechanism, origin `file:line`, causal chain, ruled out). A census drift or golden
   failure that appears only under the variable is an AD-13 case: do not edit `census.json`, the manifest or any
   assertion; file `needs-ruling` naming the test and rows.
5. **More would change.** The fix needs an edit to `test/corpus/corpus.ts`, another caller, or an assertion, title
   literal or expected value: do not make it; file `needs-ruling` with the file and reason.

## Mechanics

6. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far.
7. **Load.** Before the full suite, check `uptime`; above 12, wait; run under `nice -n 10`. Never start the full suite
   beside another multi-process job.

## Push-forward (decide and journal, do not stop)

- Renaming `defaultResolution` in `corpus.test.ts` (D1) and the comment, if any, beside either call.
- The scratch clone's layout and how `node_modules` reaches it.
- Runbook wording around the deleted paragraph (D3).
- `follow-up` issues for anything else found on the way (for example other test files that pass a literal env to a
  resolver, if any turn up).
