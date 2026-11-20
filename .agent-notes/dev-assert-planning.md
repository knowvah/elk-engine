<!-- SPDX-License-Identifier: EPL-2.0 -->

# dev-assert: planning facts (2026-11-19, issue #45)

## Observation: 143 Java `assert` statements in scope at 8bca22f4, all in ported files

- **Context**: planning #45. `grep -rnE '^\s*assert[ (]'` over `core`, `core.debug.grandom`, `alg.common`, `alg.layered`,
  `alg.mrtree`, `alg.force` (`*.java`, `*.xtend`); every other in-scope or deferred bundle has 0.
- **Finding**: 143 statements in 70 files (core 9, grandom 2, common 4, layered 126, mrtree 1, force 1). Every file
  has a TS port. § 6.8 says 141 with `'^\s*assert '` (no `assert(` form). About 90 `src/` comments mention an omitted
  assert; the rest were dropped without a trace or replaced by `throw new Error` (`OrthogonalSelfLoopRouter.ts:200,283,396`,
  `OrthogonalSelfLoopRouterSlotPositions.ts:119`).
- **Impact**: the T2 inventory starts from the Java grep, not from the comments.
- **Confidence**: High

## Observation: ELK's Tycho build runs JUnit with assertions enabled

- **Context**: deciding whether the TS suite runs with assertions on.
- **Finding**: `build/pom.xml:358-361` sets `tycho-surefire-plugin` `<enableAssertions>true</enableAssertions>`.
  `SelfLoopHolderTest.testNonSelfLoopGraph` (Java `:45-51`) relies on it: it expects `install` to throw
  `AssertionError`. The TS port passes today only because its `fail()` throws a test-local `AssertionError`. The oracle
  layout harness (`tools/oracle/run.sh`) runs without `-ea`; `JAVA_TOOL_OPTIONS=-ea` turns it on per run.
- **Impact**: a firing assertion in a ported JUnit test is a port defect. In a layout input, it needs an `-ea` oracle
  run to tell port from Java.
- **Confidence**: High

## Observation: the module-globals ALLOWLIST is empty

- **Context**: choosing the enable switch.
- **Finding**: `test/architecture/module-globals.fitness.test.ts` `ALLOWLIST = {}`; no top-level `let` exists in `src/`.
  `DevAssert.ts::assertionsEnabled` is the first reviewed entry.
- **Impact**: the reviewer of #45 sees the first module global; D2 records why.
- **Confidence**: High

## Observation: planning baseline at 98085a3b

- **Context**: Phase 8 pre-flight, load average 54-65.
- **Finding**: `format:check` (apart from the planner's own progress file), `typecheck` and `complexity` clean. The
  full `npx vitest run` with the sweep dirs set to `/nonexistent`: 49,474 passed, 93 skipped, 2 failed, both
  "Test timed out in 5000ms" (`NodeReferenceMatcher.test.ts` regex.json row, `NetworkSimplexTest.testDeltas`). Both
  pass alone (11/11, 2.3 s). 190.8 s wall time.
- **Impact**: under high load, a 5000 ms timeout is load-induced. Rerun the file alone once before treating it as a
  failure (stop 7 does not count it).
- **Confidence**: High
