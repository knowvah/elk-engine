<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: java-tests-bundles (issue #97, 2026-11-20)

Planning-time notes are in `java-tests-bundles-planning.md`. Journal: `plans/java-tests-bundles/decision-journal.md`;
the 143-line baseline is `plans/java-tests-bundles/java-baseline.md`.

## Observation: the scratch-copy recipes for `java-tests.sh` are obsolete

- **Context**: `TEST_BUNDLES` of `tools/oracle/java-tests.sh` went from two bundles to the thirteen a TS test cites.
- **Finding**: every ported JUnit class runs with the landed script: `MODELS_REPO=$ELK_MODELS_DIR nice -n 10
tools/oracle/java-tests.sh <classes>`. The `sed` recipes in `plans/*/java-baseline.md`, in earlier briefs and in the
  past-tense records of `docs/conformance.md` (`:1615`, `:2350`) are history; their line-17 `ROOT=` rewrite no longer
  matches the script either (the header grew by one line).
- **Impact**: do not copy the script for a run. A port that cites a new test bundle fails
  `test/architecture/java-tests-bundles.fitness.test.ts` until the bundle is added to `TEST_BUNDLES`; the script
  itself dies naming a bundle the oracle has not built.
- **Confidence**: High

## Observation: Xtend suites are cited as `.xtend` and run as compiled JUnit 4 classes

- **Context**: building the class list for the oracle run.
- **Finding**: the eight `graph.json.test` Xtend suites are cited in TS as `…/src/…Test.xtend`. Their FQCN is the
  path with `.xtend` dropped, exactly as for `.java`, and `JUnitCore` runs the class from the bundle's
  `target/classes`. The runbook's grep is `Test\.(java|xtend)`; its `sed` uses `#` as the delimiter because of the
  `|` in the alternation.
- **Impact**: a class count from a `.java`-only grep is short by eight (the issue said 124 where the list is 143).
- **Confidence**: High

## Observation: thirteen bundles on the classpath change no layered count and cost about 30 s

- **Context**: the before run (two bundles, 100 layered classes) and the after run (thirteen bundles, 143 classes),
  both under `nice -n 10` at a 1-minute load near 3.
- **Finding**: the 100 layered lines are byte-identical (51,299 runs, 0 failures). Wall time 402 s before, 432 s
  after; the 43 added classes are 278 runs. The total at the `8bca22f4` pin is 51,577 runs.
- **Impact**: section 10 of the upgrade runbook takes about 7 minutes; a changed count after a pin move is a content
  finding, not a classpath effect.
- **Confidence**: High

## Observation: `label-sizing-vectors.sh` keeps its own two-bundle `TEST_BUNDLES`

- **Context**: a repo-wide grep for statements about the script's bundle list after the edit.
- **Finding**: `tools/vectors/label-sizing-vectors.sh:33` has its own `TEST_BUNDLES` (layered and alg), and its header
  (`:11`) says its classpath "is the one of tools/oracle/java-tests.sh", which is now a superset. Its `THIRD_PARTY`
  comment (`:25`, "Same list") is still true. The fitness test parses `java-tests.sh` only.
- **Impact**: the comment fix is issue #136; it needs the cold re-records, because any edit under `tools/vectors/`
  changes the vector cache's input hash. `java-tests.sh` itself is an input of no recorder cache and no sweep stamp
  (`VC_INPUT_DIRS` is `tools/vectors` and two corpus directories), so editing it reruns nothing.
- **Confidence**: High

## Observation: a citation-scanning test must not hold a full citation itself

- **Context**: writing the fitness test's "the scan finds something" case.
- **Finding**: the test walks `test/` too, so a literal `<bundle>/src/…Test.xtend` path in the test file would
  satisfy its own sanity case. The test asserts on the bundle name of any `.xtend` citation instead, and the regex
  source does not match itself (its dots and slashes are escaped).
- **Impact**: keep full citation paths out of that file; the same holds for any later test that scans `test/`.
- **Confidence**: High
