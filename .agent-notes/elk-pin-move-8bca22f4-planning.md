<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations: ELK pin move e7eaea57 → 8bca22f4 (issue #104, 2026-11-18)

## Observation: the rectpacking `sort` recorder copies the comparator instead of calling it

- **Context**: checking #104's expectation that the 213 `sort` rows of #75 change.
- **Finding**: `tools/vectors/RectPackingVectors.java` `sortOutcome` (`:1670`) runs `Collections.sort` with a lambda copied
  from `InteractiveNodeReorderer.java:56-63`. It never reaches the plugin class, so a re-record at `8bca22f4` alone leaves
  every `sort` row as it was.
- **Impact**: the recorder's copy has to follow eclipse-elk/elk#1237 (brief D1). Any recorder that copies Java code
  needs the same check on a pin move.
- **Confidence**: High

## Observation: two spore tests hard-code the unseeded jitter

- **Context**: listing the AD-13 assertion sites for the maintainer.
- **Finding**: `src/alg/spore/ElkGraphImporter.test.ts:166-169` and `src/alg/spore/SporeLayoutVectors.test.ts:229-232`
  assert `invariants.runsAgree === false` and one distinct dump per run. With `randomSeed = 1` both are false premises.
- **Impact**: brief D5.7 approves them under #104's #1242 row. A re-recorded `runsAgree: false` would be a finding.
- **Confidence**: High

## Observation: the spore `throws/overlap/scanlineHitboxes` row may stop throwing

- **Context**: reading the recorder's self-checks against eclipse-elk/elk#1244.
- **Finding**: `SporeLayoutVectors.java` refuses a row that is planned `throws` but runs (`:633-636`). The `hitboxes`
  input (`:1876`) exists to reach `ScanlineOverlapCheck`'s "Invalid hitboxes" throw, and #1244 removes the coincident
  centres that cause it.
- **Impact**: the row may need re-planning as a full row (brief D4, the #1215 precedent of #99).
- **Confidence**: Medium (not run; the recorder decides)

## Observation: `Math.random` is not in the `Math.*` call-site fitness list

- **Context**: planning the spore port's fitness impact.
- **Finding**: `test/architecture/math-call-sites.json` lists transcendental functions (`atan2`, `cos`, …) only. No
  fitness test tracks `Math.random`. It appears in `src/alg/spore/ElkGraphImporter.ts`, `src/alg/layered/p3order/MedianHeuristic.ts`
  and `src/java/util/Random.ts`.
- **Impact**: removing the spore calls changes no fitness file.
- **Confidence**: High

## Observation: environment at planning

- **Context**: preconditions for #104.
- **Finding**: `../elk` HEAD is `8bca22f4`, with ` M .gitignore` and `?? .idea/` (not ours). It also has five
  `elk-fixes/*` worktrees registered. `../elk-oracle` is absent. `$B` holds all twelve sweep files plus the trees and
  `java-tests.txt`. The baseline at `9c420f07`: format, typecheck and complexity exit 0; coverage 49,429 passed, 99
  skipped, 98.92/97/98.84/98.92 (`coverage-logs/coverage-20261118-090634-68839.log`), run while the 1-minute load was
  above 26.
- **Impact**: the executor need not rerun the baseline on an unchanged tree.
- **Confidence**: High
