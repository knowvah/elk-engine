<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: ELK pin move e7eaea57 → 8bca22f4 (issue #104, 2026-11-18)

Planning-time notes are in `elk-pin-move-8bca22f4-planning.md`. Runbook: `docs/architecture/elk-upgrade.md`. Journal:
`plans/elk-pin-move-8bca22f4/decision-journal.md`.

## Observation: `npm run melk:generate` writes only `Core` and `Labels`

- **Context**: runbook section 6 after `SPOrE.melk` and `Layered.melk` changed.
- **Finding**: without arguments the generator emits its `DEFAULT_BUNDLES` (`tools/melk/generate.ts`); `git diff --stat src/`
  was empty and seven `test/melk` freshness and registry tests failed. `npm run melk:generate -- Layered SPOrE` wrote the four
  changed option files.
- **Impact**: after a `.melk` copy changes, name the bundle. The runbook's section 6 now says so.
- **Confidence**: High

## Observation: hand-written unit tests that transcribe one Java statement are AD-13 sites of a pin move

- **Context**: porting eclipse-elk/elk#1237 and #1244.
- **Finding**: planning looked for assertion sites with a keyword grep (`Math.random`, `runsAgree`, `nondetermin`) and found
  three. Two more were unit tests whose expected values restate the changed Java line: the tie test of
  `compareDesiredPositions` (`-1` in both directions) and "two nodes ending at identical centres collapse into one nodeMap
  entry" (`updateGraph`). The second cannot pass under the new Java and is issue #105.
- **Impact**: when planning a pin move, list for every hunk the tests that cite its old line range or name its method
  (`git grep -n '<Name>.java:<old lines>' -- '*.test.ts'`, and the test files of the ported class), and put each in the
  ruling request.
- **Confidence**: High

## Observation: the 213 classified `sort` rows recorded the JVM, not a port difference

- **Context**: issue #75 after the comparator became a total order.
- **Finding**: `Array.prototype.sort` reproduces all 640 re-recorded rows with the new comparator and with the old `-1`
  comparator. V8's sort kept ties in model order under the inconsistent comparator; the JDK's threw or split them.
- **Impact**: a classified list of "the port differs" can be the oracle reacting to undefined behaviour; test the old code
  against the new ref before assuming the port changed.
- **Confidence**: High

## Observation: a stack frame recorded in a ref moves with every line inserted above it

- **Context**: triage of the re-recorded refs.
- **Finding**: four refs and one sweep changed only in a `frame` field: `layered-compound.json` and the compound sweep
  (`ElkGraphImporter.java:1146` → `:1205`), `spore-layout.json` (`:69` → `:72`), `rectpacking.json`
  (`InteractiveNodeReorderer.java:68` → `:75`). No test compares the line number, only the class and file.
- **Impact**: such rows are content by the normalizing loop but need no port change; check them against the `-U0` hunks
  before reading anything else into them.
- **Confidence**: High

## Observation: the seeded spore shift is `(centre + d) - centre`, not `d`

- **Context**: writing the proposed replacement test for #105.
- **Finding**: `updateGraph` shifts the centre in place and translates the node by `center.clone().sub(oldCenter)`, so the
  rectangle moves by the rounded difference of the two centres. An expectation written as `rect.x + d` was off by one ulp.
- **Impact**: derive expected values from the Java statement order, not from the intent.
- **Confidence**: High

## Observation: `NaN` rectangles still reach "Invalid hitboxes" in `sporeOverlap`

- **Context**: #104 expected the ptolemy scanline throws to go with eclipse-elk/elk#1244; 27 corpus cases still throw.
- **Finding**: the scanline `TreeSet` orders nodes with `Double.compare`, under which two `NaN` keys are equal. The `NaN`
  comes from a compound node without a size: `ElkUtil.resizeNode` scales its ports by `newSize / oldSize` with `oldSize` 0.
  `KVector.equals` is false for `NaN`, so `shiftUntilUnique` never sees the centre as taken. The port throws alike.
- **Impact**: a `sporeOverlap` throw on a hierarchical ptolemy model is this, not a jitter effect; issue #108.
- **Confidence**: High for the scanline mechanism, Medium for the first `NaN` (read in the Java, traced in the port only)

## Observation: fixing the stale parent row left one arm without a row

- **Context**: branch counts of `CompactionPlacement.ts` after eclipse-elk/elk#1239.
- **Finding**: the false arm of `rows.size() > nextRowIndex` (`Compaction.java:325`, `:416`) was reached only by the two
  `arm/staleParentRow*` rows through the defect; it has 0 hits now. Issue #107.
- **Impact**: a row written to reach an arm through a defect loses its purpose when the defect is fixed; check branch counts
  after porting a fix.
- **Confidence**: High

## Observation: wall times and load on the shared machine

- **Context**: running the lanes of the runbook beside the `elkj` recorder.
- **Finding**: the 33 short recorders took 5 minutes in one lane, the regens 7 (6 of them `regen-elkj-refs.sh`), the ten
  phase and language sweeps 26. The corpus sweep (8 shards, two JVMs per case) pushed the 1-minute load to 95 for two
  minutes; a full vitest run beside the phase sweep pushed it past 80. A spore-only second sweep
  (`sweep.sh --filter /spore --shards 4 --out <scratch>`) took 16 s and was enough to show the verdicts stable.
- **Impact**: the load check before a start says nothing about what the job itself adds; never start the corpus sweep or
  a full test run beside another multi-process job.
- **Confidence**: High

## Observation: the "before" list of ported JUnit classes was one move old

- **Context**: `diff $B/java-tests.txt` in runbook section 10.
- **Finding**: `$B/ported-classes.txt` held 92 classes; the fresh list holds 100: the 7 classes #99 ported after that file
  was written, and the one this move adds. The diff shows 8 added lines and no changed line.
- **Impact**: regenerate the list on the "before" side right before a move, or expect the added lines.
- **Confidence**: High

## Observation: a patch held for a ruling was proven by its test only

- **Context**: applying `needs-ruling-updateGraph-collapse.patch` after the ruling of #105 (2026-11-19) and rerunning the gates.
- **Finding**: the patch had been run once before the halt (192 of 192) and reverted. Applied, it left `const PADDING = 8` of
  `ElkGraphImporter.test.ts` without a use (the patch drops the only assertion that read it), and `npm run codeql` reported
  `js/unused-local-variable`; format, typecheck, complexity and the full suite were green. `tsc` does not report it:
  no `tsconfig` sets `noUnusedLocals`.
- **Impact**: before parking a patch for a ruling, run CodeQL (gate 6) on the patched tree as well as the test, and say so in
  the issue; otherwise the session that resumes finds a red gate the ruling did not cover.
- **Confidence**: High
