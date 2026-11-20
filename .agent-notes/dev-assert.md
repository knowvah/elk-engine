<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: dev-assert (issue #45, 2026-11-19)

Planning-time notes are in `dev-assert-planning.md`. Journal: `plans/dev-assert/decision-journal.md`. Inventory of the
143 Java `assert` statements: `plans/dev-assert/inventory.md`.

## Observation: a Vitest setup file shares the module graph of each test file, so one flag in `src/` is enough

- **Context**: T1, enabling `devAssert` for the whole suite (D4).
- **Finding**: `test.setupFiles` runs `test/setup/dev-assertions.ts` once per test file, in that file's worker and module
  registry, before the test file itself. The `setAssertionsEnabled(true)` call there and the
  `devAssert` calls reached from the test use the same instance of `src/java/lang/DevAssert.ts`. A test that switches
  the flag (`DevAssert.test.ts`) affects only its own file, because files are isolated; it still restores the flag in
  `finally`. `ELK_DEV_ASSERTIONS=off npx vitest run` runs the suite with the production default.
- **Impact**: no `define`, no `globalThis` flag and no per-test wiring is needed. A new test that needs assertions off
  for one step should switch the flag around that step and restore it.
- **Confidence**: High

## Observation: the oracle and every vector recorder run without `-ea`; `JAVA_TOOL_OPTIONS=-ea` turns it on for both

- **Context**: T7, telling a port defect from a Java-faithful assertion (D7).
- **Finding**: `JAVA_TOOL_OPTIONS=-ea tools/oracle/run.sh <outDir> <input>` enables assertions in the ELK jars for a
  layout; the JVM prints `Picked up JAVA_TOOL_OPTIONS: -ea` and dies with the `AssertionError` stack on the first
  failure (the harness does not catch it, so run one input per call). The recorders take it the same way:
  `JAVA_TOOL_OPTIONS=-ea ELK_VECTORS_CACHE=off tools/vectors/<name>-vectors.sh "$TMPDIR/<dir>"` writes to the given
  directory, touches no cache, and stops at the first row whose Java assert fires (about a minute for
  `layered-framework`, `layered-site` and `layered-loops`). A recorder catches `RuntimeException`, and
  `AssertionError` is not one.
- **Impact**: a row that is built in code (options with no text form such as `wrapping.cutting.cuts`, a direct call such
  as `LGraphUtil.createExternalPortDummy`) cannot be checked with `run.sh`; the recorder with `-ea` into `$TMPDIR` can.
  Never point it at `test/golden/refs/`.
- **Confidence**: High

## Observation: thirteen Java asserts fire under `-ea` on inputs the suite replays

- **Context**: T7, the first full run with 143 restored sites: 234 failures from twelve sites, a thirteenth behind one
  of them.
- **Finding**: none was a port defect. Four fire on layouts ELK itself runs (issue #112): `BoxLayoutProvider.java:738`
  and `:754` (a strict `>` where `placeInnerBoxes` passes the current size), `EndLabelPreprocessor.java:377` (an end
  label without a size), `SingleEdgeGraphWrapper.java:193` (int overflow on the `Integer.MIN_VALUE` sentinel). Nine are
  driven on purpose by a port-written unit test or a JVM site vector that pins what a JVM without `-ea` does next
  (issue #113): `InstancePool.java:59`, `NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212`,
  `LGraphUtil.java:821` and `:907`, `LNode.java:165`, `HighDegreeNodeLayeringProcessor.java:255`,
  `EdgeLabelSideSelection.java:58`, `ForsterConstraintResolver.java:239`. Those thirteen sites are comments of the form
  "Java: `assert …;` (File.java:line). Not a devAssert yet: … (issue #N)".
- **Impact**: a test that drives an "unreachable" Java arm or an invalid state now meets a `devAssert` if the Java has
  an `assert` there. New tests of that kind should run that step with assertions off, or assert the `AssertionError`.
  When #112 or #113 is ruled, grep for "Not a devAssert yet".
- **Confidence**: High

## Observation: reverting one firing site can uncover the next one behind it

- **Context**: T7, after the twelve sites were made comments.
- **Finding**: `Group.setHeight` (`BoxLayoutProvider.java:754`) threw first in the one test that also violates
  `Group.setWidth` (`:738`); the second showed only on the rerun. The oracle needed its own input to prove it
  (`setHeight` throws first there too): one box with `nodeSize.minimum: "(0, 500)"`.
- **Impact**: after leaving a firing site out, rerun the tests that fired on it before counting the sites.
- **Confidence**: High

## Observation: grouping test failures by the first `src/` frame under `devAssert` finds the sites

- **Context**: T7, 234 failures in 28 files.
- **Finding**: `npx vitest run --reporter=json --outputFile=<file>` gives `failureMessages` with stacks; the first
  `src/…ts:line` frame that is not `DevAssert.ts` is the site. Failures without such a frame were all consequences
  (a later step of a replay that lost its state, a twin test that needs the baseline row).
- **Impact**: triage per site, not per test.
- **Confidence**: High

## Observation: the load limit for JVM runs is hard to meet on the shared machine

- **Context**: D7 oracle checks; the queue rules ask for a one-minute load below 12.
- **Finding**: the load stayed between 15 and 70 for most of the session (this mission's full-suite runs and other
  sessions). It fell below 12 only for a minute or two at a time; the waits were between one and nine minutes, and
  one nine-minute wait ended without a window.
- **Impact**: plan the JVM checks right after a test run finishes, and keep each one short.
- **Confidence**: Medium (one session)
