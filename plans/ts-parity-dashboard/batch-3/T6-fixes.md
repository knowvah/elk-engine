<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: fixes from triage, and the final TS summary

Decisions: TP6 ([decisions.md](../decisions.md)); stops 3, 14 and 15. Agent: typescript-pro (sonnet), one per fix if they
touch disjoint files. Read [agent-rules.md](../agent-rules.md) first.

## Task

1. For each (a) or (b) description from T5, write the test first:
   - (a) a unit case in the tool's test file;
   - (b) a unit test whose expected value comes from the oracle output file of the case, never from the TS result.

   Then fix the defect at its origin. One module per (b) fix; no landed expected value changes (stop 15).
2. Rerun the TS sweep for every algorithm a fix touches, using the T4 command with `--algorithms <list>`. Check that each fixed
   case is now `ok` and that no other case of those algorithms changed category. Any change in another case is a regression:
   diagnose it.
3. Write the final summary to `$TMPDIR/ts-parity-dashboard/ts-final.json`. This is one full TS sweep run after the last fix;
   rerun everything if any fix touched shared code (`src/core`, `src/graph`, `test/helpers`).
4. If a fixed case was annotated, remove its annotation; add an annotation for any finding the fixes leave open.

## Write-set

Per fix: the origin module and its colocated test, or `tools/corpus/*` and `test/corpus/*` (new test cases only),
`tools/corpus/ts-findings.json`. Landed tests are only added to, never changed.

## Acceptance criteria

- Given each (a)/(b) fix, when its test runs before the fix, then it fails, and after the fix it passes.
- Given the rerun, when it is compared with `ts-run-1.json`, then the only category changes are the fixed cases, and each of
  them is now `ok`.
- Given `ts-final.json`, when it is checked, then every reported case in it has an annotation, and `ts-findings.json` has no
  annotation for a case that is `ok`.
- Given the batch gate, when it runs, then `git diff --exit-code <base> -- test/golden/refs/` is clean.

**Observability:** N/A. **Rollback:** reversible; each fix is its own commit before the squash.
