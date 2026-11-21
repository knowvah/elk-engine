<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: fitness test red, carry the bundles, JVM baseline

## Context

The script carries two of the thirteen test bundles the port cites. See [README](../README.md#objective),
[D1](../decisions.md#d1-carry-every-cited-test-bundle-in-test_bundles) (the list),
[D3](../decisions.md#d3-a-fitness-test-keeps-the-list-complete) (the test),
[D4](../decisions.md#d4-the-class-list-includes-the-xtend-suites-143-at-planning-not-124) (the class list) and
[D5](../decisions.md#d5-evidence-before-and-after-on-the-pinned-oracle) (the before/after evidence).

## Read-set

- `tools/oracle/java-tests.sh` (all 131 lines; `:3-10` header, `:34` `TEST_BUNDLES`, `:59-79` `build_classpath`)
- `test/architecture/staged-classes.fitness.test.ts:1-60` (the fs-walk fitness-test style)
- `tools/vectors/label-sizing-vectors.sh:20-31` (read only, never edit: D2)

## Write-set

`tools/oracle/java-tests.sh` (header comment and `TEST_BUNDLES` only),
`test/architecture/java-tests-bundles.fitness.test.ts` (new), `plans/java-tests-bundles/decision-journal.md`.

## Steps

1. **Before run**, landed script unedited (`uptime` first; detached, `nice -n 10`, polled):
   D4's `git grep … | sort -u`, then `grep '^org\.eclipse\.elk\.alg\.layered\.test/'`, then D4's `sed`, into
   `$TMPDIR/java-tests-bundles/before-classes.txt` (expect 100 lines); run
   `MODELS_REPO="$ELK_MODELS_DIR" tools/oracle/java-tests.sh $(cat …)` into `before.txt`. Journal the class count,
   total runs (expect 51,299), failures (expect 0) and wall time.
2. Write the D3 fitness test: SPDX header, a header comment naming #97 and D3, named constants for the citation
   regex, the script path and `org.eclipse.elk.alg.test`, helpers under 30 NLOC.
3. **Red:** `npx vitest run test/architecture/java-tests-bundles.fitness.test.ts`. Journal the failure: the
   missing-bundle list must be exactly the eleven new bundles of D1; anything else is a discrepancy (stop 4's
   diagnosis rule applies to the test too).
4. Apply D1 to `TEST_BUNDLES` and the header comment. Rerun the test: green. `bash -n tools/oracle/java-tests.sh`;
   `shellcheck` if installed (journal the result or its absence). `tools/oracle/java-tests.sh` with no argument still
   exits 1 with the usage line.
5. **After run:** D4's two commands verbatim (with `$TMPDIR/java-tests-bundles/` for the outputs). Expect 143 lines,
   every `failures=0`. Compare: `diff <(grep '\.alg\.layered\.' after.txt) before.txt` is empty (adjust the filter if
   the layered FQCN prefix differs, and journal it), and the 43 other lines match the D5 probe list. Journal all 143
   lines (a fenced block in one `gate` row, or a collapsed table) with totals per bundle and overall, and the wall time.
6. `npx prettier --check` on the test. `git diff --stat` shows the two files only. Journal a `fix` row; commit.

## Interface contracts

T2 relies on: D4's two commands produce the 143-line `java-tests.txt` with the new script; the measured total runs and
wall time are in the journal (T2 writes them into § 10).

## Acceptance criteria

- Given the base `java-tests.sh`, when the fitness test runs, then it fails and lists exactly the eleven bundles
  `alg.common.test`, `alg.disco.test`, `alg.force.test`, `alg.mrtree.test`, `alg.radial.test`,
  `alg.rectpacking.test`, `alg.spore.test`, `alg.topdown.test`, `core.test`, `graph.json.test`, `graph.test`
  (each `org.eclipse.elk.`-prefixed).
- Given the edited script, when the fitness test runs, then it passes, and its sanity case finds a `graph.json.test`
  `.xtend` citation.
- Given D4's commands on the pinned oracle, when they run, then 143 classes print `failures=0` in one call.
- Given the before and after runs, then the 100 layered lines are identical, and the 43 others equal D5's probe.
- Given `git diff <base> -- tools/vectors/ test/golden/refs/`, then it is empty.

## Observability

N/A: a developer tool; the per-class output line format is unchanged.

## Rollback

Reversible: revert the commit. No data, cache or oracle state is touched.
