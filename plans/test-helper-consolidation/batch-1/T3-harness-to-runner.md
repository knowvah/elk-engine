<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: the three harness suites onto `defineLayoutTest`

## Context

Issue #46 item 4. `test/helpers/elkt-layout-harness.ts` (`layoutElkt`) predates `test/helpers/layout-test-runner.ts`
and serves three suites. Their Java classes run under `@RunWith(LayoutTestRunner.class)` with `@Algorithm`,
`@DefaultConfiguration`, `@GraphResourceProvider`, `@Configurator`; the harness never applied `@DefaultConfiguration`.
Decision [D4](../decisions.md#d4-the-three-harness-suites-run-through-definelayouttest).

## Write-set

- Modify `src/core/issues/Issue457Test.test.ts`, `src/core/issues/Issue489Test.test.ts`,
  `src/alg/common/issues/Issue475Test.test.ts`
- Modify `test/helpers/layout-test-runner.test.ts` (only to port a harness case with no equivalent)
- Delete `test/helpers/elkt-layout-harness.ts`, `test/helpers/elkt-layout-harness.test.ts`
- Modify `docs/architecture/core-engine.md:282` (one clause: retired in #46, the suites use `layout-test-runner.ts`)

## Read-set

- The three ported tests; their Java at `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/issues/Issue{457,489}Test.java`
  and `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/issues/Issue475Test.java`
- `test/helpers/layout-test-runner.ts:1-30` (annotation map), `:85-100`, `:419-449`; `test/helpers/layout-test-sources.ts:30-40`
  (`inputsRoot`: vendored `test/golden/inputs/` unless `PIPELINE_SUITES_FULL=1`)
- A suite already on the runner with `configurators` and `defaultConfiguration`, e.g. under `src/alg/layered/issues/`
- `test/helpers/elkt-layout-harness.test.ts`, `test/helpers/layout-test-runner.test.ts`

## Steps

1. Record the counts and titles of the four files (`npx vitest run <files>`).
2. Convert each suite: `defineLayoutTest({ name: 'Issue457Test', algorithm, graphs: [{ path }], configurators: { … },
   defaultConfiguration: true, afterLayout: { testProperLabelCoordinates: (graph) => { …unchanged body… } } })`.
   Graph paths and configurator bodies as the Java lists them (489 has two graphs, 475 two configurators). The
   `expect` lines move into the check function unchanged. `Issue475Test.test.ts:50-53` asserts, per configuration,
   that each child's `NODE_SIZE_FIXED_GRAPH_SIZE` equals what the configurator set (`expectFixed`, a port-added check,
   frozen by AD-13). The runner gives a check only the graph, so carry the value the way the runner's order allows:
   each configurator also sets a suite-local `expectedFixed`, and the one check reads it. This is sound only because
   the runner realises an experiment (configurator included) inside its first check and runs checks in order
   (`layout-test-runner.ts:1-12`, `:277-330`); confirm both before relying on it and say so in a comment. If that
   ordering does not hold, 475 stays on the harness (stop 3) and the harness stays.
3. Run the three suites. If one fails: stop 5 (diagnose on the test side, keep that suite on the harness, report).
4. Map each `elkt-layout-harness.test.ts` case to a `layout-test-runner.test.ts` case asserting the same behaviour
   (configurator runs before layout on the loaded graph; the algorithm reaches every node and no edge; a missing model
   throws). Port any unmatched case into `layout-test-runner.test.ts` against `buildLayoutTests`. Report the mapping.
5. When all three suites pass on the runner, delete the harness and its test; fix the doc line.
6. `npm run typecheck`; `npx prettier --check` the changed files; rerun step 1's files.

## Acceptance criteria

- Given the converted suites, when they run, then Issue457 has 1 case, Issue489 2, Issue475 2, all passing, with the
  Java `@Test` names in their titles.
- Given `git diff` of the three suites, when inspected, then every `expect` line of the old file appears unchanged.
- Given the deleted harness test, when the mapping is read, then each of its 3 cases has a named runner-test
  equivalent or a ported case.
- Given a suite that fails with defaults, when T3 ends, then that suite and the harness are unchanged and the report
  carries the diagnosis for a `follow-up` issue.

## Observability / rollback

N/A — test code only. Reversible.
