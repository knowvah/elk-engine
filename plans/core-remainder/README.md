<!-- SPDX-License-Identifier: EPL-2.0 -->

# Core remainder — Mission Brief (mission 5b; roadmap row 5b)

## Objective

Port the rest of `org.eclipse.elk.core` to `src/core/`, completing the bundle (R1):
- `alg/*` beyond `ILayoutProcessor`, chiefly `AlgorithmAssembler` and `LayoutProcessorConfiguration`, which every
  algorithm bundle uses;
- `LayoutConfigurator` and `ElkSpacings`;
- the rest of `ElkMath`, plus `BezierSpline` and `CubicSplineInterpolator`;
- `ElkGraphAdapters`, `util/selection/*`, `comments/*`, `PropertyConstantsDelegator`;
- the small util classes `WrappedException`, `DefaultFactory`, `Triple`, `Quadruple` and `AbstractRandomListAccessor`.

The comments code needs three JDK shims: `java.awt.geom.Rectangle2D` (R3), a narrow `java.util.regex.Pattern` and
`Character` predicates (R2). All three are written from the Javadoc only and proven by new JVM vectors.

Exit (roadmap revision 2026-10-23, row 5b):
- the listed core JUnit tests are ported and green: `LayoutConfiguratorTest`, `SpacingConfigurationTest`,
  `AlgorithmAssemblerTest`, `LayoutProcessorConfigurationTest`, `BezierSplineTest`, `CubicSplineInterpolatorTest`, and
  the rest of `ElkMathTest`, including its 4 rectangle cases;
- the `.elkt` layout harness uses `LayoutConfigurator` as Java's `TestAlgorithm` does (T12);
- `CommentAttacher` matches about 10 oracle scenarios (R6).

Internal only: nothing is exported from `src/index.ts` (AD-14). `core.util.persistence` stays out of scope (AD-11).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). These also apply:
   - AD-1…AD-16: `plans/elk-engine-skeleton/decisions.md`
   - C1–C10 and the standing rules: `plans/core-metadata/decisions.md`
   - J-decisions: `plans/elk-json-adapter/decisions.md`
   - G1–G8: `plans/graph-text/decisions.md`
   - D1–D9: `plans/grandom/decisions.md`
   - M1–M17: `plans/core-engine/decisions.md`
3. Read `.agent-notes/` (at least `core-engine.md`, `core-engine-planning.md`, `core-remainder-planning.md`,
   `grandom.md`, `vector-cache-and-key-line.md`) and state what affects the approach.
4. Set up the branch:
   - If `feature/core-remainder` does not exist: `git switch -c feature/core-remainder` from `main`, then
     `git add plans/core-remainder .agent-notes/core-remainder-planning.md && git commit -m "docs(plans): add core-remainder mission brief"`.
   - Otherwise: `git switch feature/core-remainder`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work happens on `feature/core-remainder`, branched from `main`.

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus one `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 13):**
  1. Keep the per-task history on a local `feature/core-remainder-backup` branch.
  2. Regroup the branch into **at most 5 commits** by layer, each body listing its task ids. Before regrouping, the
     final tree must be byte-identical to the backup.
  3. Verify that each commit typechecks and passes the suite on its own.
  4. Journal the regrouping.
- The executor **never signs, pushes, opens a PR, or merges**. At the end it hands the user these commands
  (YubiKey PIN + touch per commit):

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/core-remainder
gh pr create --base main --head feature/core-remainder   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit" (never rebase: it drops signatures)
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK core Java (the spec), called `J` below | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/` |
| ELK core tests | `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/` |
| ELK test framework (`TestAlgorithm`) | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/` |
| Oracle (comment scenarios, T14) | `$ELK_ORACLE_DIR`; pattern `tools/vectors/elkr-vectors.sh` + `vector-cache.sh` |
| Collections inventory (AD-10) | `docs/translation-rules-collections.md` §2.1 (V2, V3), §2.2 (I28, I29) |
| Translation rules | `docs/translation-rules.md` §6.2 (default methods), §6.5 (overloads), §6.3 (enums) |
| Patterns to mirror | `src/core/util/ElkUtil*.ts` (section modules), `src/guava/*`, `src/java/lang/Int64.ts`, `src/emf/common/util/*` |
| JDK | JDK 21 on PATH |

- **AD-9:** never read OpenJDK or Guava source; use the Javadoc plus vectors only. EMF source (EPL) may be read.
- **Never edit `tools/vectors/vector-cache.sh`** or `tools/vectors/JavaVectors.java`.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>` and `npm run complexity`. After every
batch the orchestrator runs these **alone**, never concurrently with JVM jobs, because coverage times out under load:

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + ~10 s (stop 12)
git diff --exit-code main -- test/golden/refs/ test/corpus/   # landed vectors/goldens/corpus frozen (AD-13)
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # after T12 and at mission end
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- The `git diff main` check excludes the new files that T2 and T14 add under `test/golden/refs/java/`. Those must be
  byte-stable across two recordings, and the recording must leave every landed file unchanged.
- Parallel agents never run `npm run coverage`, because `coverage/` is shared, and never commit, because the index is
  shared. The orchestrator commits each task.
- `npm run docs:build` must be green before T21 is marked done.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the current task's write-set needs changing. Colocated `.test.ts` files count as part
   of the task. Complexity-only rewrites are excepted (see push-forward).
2. **Repeated failure:** the same gate check fails twice in a row.
3. **Locked decisions:** a change would contradict R1–R7 or the pre-made list, AD-1…AD-16, earlier missions'
   decisions (C, J, G, D, M) or the standing rules (M10, M12, M15, M16, few commits).
4. **AD-13:**
   - any byte diff in a landed ref, vector or golden;
   - a test that can only pass by changing its assertion;
   - a landed issue-test or golden assertion that changes when T12 switches the harness.
5. **Divergence without a named mechanism:** a TS result differs from a JUnit expectation or a JVM vector, and the
   mechanism (`file:line`, causal chain, ruled out) cannot be named. Instrument the oracle or the JDK and dump values
   first; never edit the expected value.
6. **Shim specification:**
   - a shim's behaviour (`Rectangle2D`, `Pattern`, `JavaCharacter`, `Int64` use) cannot be decided from the Javadoc
     plus vectors;
   - the work seems to need OpenJDK or Guava source (AD-9);
   - `NodeReferenceMatcher` needs a regex construct beyond R2's list.
7. **Unicode tables:** a `character.json` range disagrees with the JDK 21 Javadoc definition of its predicate. This is
   a recording or JDK-version problem: escalate it, do not patch around it.
8. **Oracle and vectors:**
   - a recorder is not byte-stable across two runs;
   - a comment scenario gives different attachments on two oracle runs, or has a tie that cannot be designed out;
   - fewer than 8 usable scenarios remain.
9. **Out-of-bounds dependency:**
   - an API beyond the Java surface (test-local helpers excepted), or any `src/index.ts` export, seems needed;
   - a runtime dependency or a non-EPL-compatible dev dependency seems necessary;
   - a Node built-in appears in `src/`.
10. **Complexity limits:** a file cannot meet them with splits at Java method or section boundaries. Watch
    `ElkMath.distanceFromBezierSegment` and its helpers, `CommentAttacher`, `NodeReferenceMatcher` and
    `AlgorithmAssembler.build`.
11. **AD-10 order dependence:** an identity-hash-ordered site turns out to change an observable result in a JUnit
    case or a scenario vector.
12. **Suite time:** the mission adds more than about 10 s to `npm test` over the baseline in
    [decisions.md](decisions.md#baseline) (compare at similar load), or the `character.json` replay takes more than 1 s.
13. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- **Overloads:** naming per translation-rules §6.5 (`approximateBezierSegment`, `intersects`, `contains`,
  `configure`, …).
- **Splits:** private helper splits inside a Java method at section boundaries for complexity, keeping Java order and
  names. Complexity-only, semantics-neutral rewrites are allowed outside the write-set too; verify them with
  `npm run complexity`.
- **File layout:** nested classes and enums go in their own files with prefixed names (M15), e.g. `BezierCurve`,
  `NormalizationFunction`, the `ElkGraphAdapters` classes and the `ElkSpacings` builders.
- **Test content:**
  - case design for the T2 and T14 recorders within R6's constraints;
  - scenario input format and file names;
  - unit-test cases derived from the Java source where no JUnit exists.
- **AD-10 sites:** journal each identity-hashed site (insertion order) and draft its inventory row; T21 lands the rows.
- **Unreachable Java branches:** e.g. `DefaultFactory`'s reflection catch. Keep them, or comment them with the Java
  lines, and journal the choice.
- **EMF source:** find the source for `AbstractTreeIterator` locally if available; otherwise port it from EMF's
  Javadoc.
- **Prose typos:** ELK prose typos per the CLAUDE.md carve-out, listed in `docs/conformance.md`.
- **Wording:** test names, commit messages, journal wording and `.agent-notes/core-remainder.md` entries.
- **Pre-existing violations:** a 1–3 line fix in a file already being touched, after grepping for references. This
  includes widening `AbstractLayoutProvider.initialize` or the `IElkProgressMonitor` getters to nullable if one of
  those files is touched anyway.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1](batch-1/overview.md) | Util basics, JDK vectors, ElkMath 1, processor configuration, LayoutConfigurator | T1–T5 | — | [x] |
| [2](batch-2/overview.md) | AlgorithmAssembler, ElkSpacings, JDK shims, ElkMath 2 | T6–T10 | 1 | [x] |
| [3](batch-3/overview.md) | Splines, harness switch, comments base, comment vectors | T11–T14 | 2 | [x] |
| [4](batch-4/overview.md) | Filters and matchers, CommentAttacher, ElkGraphAdapters, selection | T15–T18 | 3 | [x] |
| [5](batch-5/overview.md) | NodeReferenceMatcher + comment oracle replay, PropertyConstantsDelegator | T19–T20 | 4 | [x] |
| [6](batch-6/overview.md) | Docs, inventory and roadmap | T21 | 5 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-10-24)

**Tasks:** 21/21 planned tasks landed, one commit each (`T1`…`T21`), plus `docs(plans)` batch markers. T9 stopped once (stop 6) and resumed after the user's R2
amendment.

**Exit evidence (roadmap row 5b):** the listed JUnit ports are green (`LayoutConfiguratorTest`,
`SpacingConfigurationTest`, `AlgorithmAssemblerTest`, `LayoutProcessorConfigurationTest`, `BezierSplineTest`,
`CubicSplineInterpolatorTest`, the full `ElkMathTest` including its 4 rectangle cases). The `.elkt` harness uses
`LayoutConfigurator` (T12) and both golden sets regenerate byte-identical. 18 of 18 `comments.json` oracle scenarios
replay equal (R6 asked for about 10). The JDK shims replay `awt.json` (2,842 rows), `regex.json` (5,044),
`character.json`, `regex-boundary.json` and `stream-sum.json` (1,035) with no row skipped; landed vectors, goldens
and corpus are unchanged.

**Decisions:** R1–R7 and P1–P9 as planned. Two user amendments to R2 during execution: JVM `\b` and per-code-point
case maps come from the recorded `regex-boundary.json` (T9), and `summingDouble`/`averagingDouble` is pinned by
`stream-sum.json` (T16). Flagged for review: `ElkSpacings.ELK_OPTION_TARGET_FILTER` never filters (verbatim);
identity-hashed sites are in insertion order with inventory rows I31–I37 in `docs/translation-rules-collections.md`;
`AbstractLayoutProvider.initialize` and the `IElkProgressMonitor` getters are still typed non-null.

**Quality gates (final, whole branch):** format:check, typecheck and complexity clean; coverage green at normal load —
404 files, 19,389 passed + 69 skipped, 99.28 % lines, 97.13 % branches, 99.27 % functions; `npm test` 53.2 s at load
about 7 against the 66.3 s baseline (stop 12 not tripped); the `character.json` replay did not trip stop 12. Batch 1's first
coverage run failed at foreign load about 180 (timeouts only) and passed at load about 28. `docs:build` green.

**Follow-ups:** 7a `LayeredSpacings` builds on `AbstractSpacingsBuilder` and must not rely on
`ELK_OPTION_TARGET_FILTER`; every algorithm mission uses `AlgorithmAssembler`; widen the nullable signatures when next
touched; a `devAssert` helper (T7 omitted the `ElkSpacings` asserts); the `StringBuilder` shim drops constructor
arguments; files added under `tools/vectors/` make the next `elkt`/`elkj`/`elkr` recorder runs cold once; a JDK upgrade
that changes `character.json` or `regex-boundary.json` is journaled, never patched around (runbook in
`docs/architecture/core-engine.md`). Roadmap revision 2026-10-24 records the same.
