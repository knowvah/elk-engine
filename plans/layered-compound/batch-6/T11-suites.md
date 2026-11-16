<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Issue suites and graph.json methods

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11): port the 7h issue suites and graph.json methods`
Scratch: `$TMPDIR/7h/T11/`.

## Context

Mission 7h, H6, H13. The 9 `JT/issues` suites of [java-baseline.md](../java-baseline.md) are the last unported files of the
97. They run through the F7 runner (`test/helpers/layout-test-runner.ts`, `layout-test-sources.ts`) over T1's vendored inputs,
with the Java's own assertions (AD-13; "no assertion the Java lacks", F16). `Issue628Test` has four `@Configurator`s.
`Issue734Test extends TestGraphCreator` (landed as `test/helpers/TestGraphCreator.ts` or under `src/`; find it). The graph.json
methods are `JG/EdgeCoordsTest.xtend` (one method over five inline `INCLUDE_CHILDREN` graphs), `LayoutOptionsTest.exportLayoutOptions`
(`JG/LayoutOptionsTest.xtend`: the `elk.direction` key once layered's metadata is registered) and
`IndividualSpacingsTest.importIndividualSpacingsTest`.

## Task

1. Port the 9 suites to `src/alg/layered/issues/Issue<N>Test.test.ts` in the landed issue-suite style (for example
   `Issue870Test.test.ts`), keeping every `@Test` method, provider and configurator.
2. H13: `Issue665Test` and `Issue700Test` keep the Java's providers. One exported constant `STRESS_PENDING` (in
   `test/helpers/layout-test-sources.ts` if that is the runner's filter seam, else a new `test/helpers/stress-pending.ts`) lists
   exactly `tickets/layered/665_includeChildrenDoesntStop.elkt` and `examples/hierarchy/hierarchicalLayoutMixing.elkt`, cites
   H13's issue number, and is applied to those two suites only. Add a test that the filter has exactly those two paths and
   removes exactly 3 cases (1 + 2). Every other case runs.
3. graph.json: add `EdgeCoordsTest.test.ts` beside the others (the whole file, verbatim graphs, the Xtend assertions), the
   `exportLayoutOptions` and `importIndividualSpacingsTest` cases into their files, and replace each "Deferred … 7h" header line by
   a "Ported" line. If a method still cannot pass for a reason other than layered (as the `LayoutOptionsTest` header explains),
   diagnose it. A case that can only pass by changing its expectation is stop 3.
4. Run the oracle suites (java-baseline.md, both parts) only if T11 needs a recount. The orchestrator's end run is stop 18's.

## Write-set

`src/alg/layered/issues/Issue{316,455,552,596,628,665,700,701,734}Test.test.ts`, `src/graph/json/EdgeCoordsTest.test.ts`,
`src/graph/json/{LayoutOptionsTest,IndividualSpacingsTest,TransferLayoutTest}.test.ts` (added cases and header lines only),
the `STRESS_PENDING` file.

## Read-set

`JT/issues/Issue{316,455,552,596,628,665,700,701,734}Test.java`, `JG/{EdgeCoordsTest,LayoutOptionsTest,IndividualSpacingsTest}.xtend`,
`src/alg/layered/issues/Issue870Test.test.ts`, `Issue433Test.test.ts`, `test/helpers/layout-test-runner.ts`,
`layout-test-sources.ts`, `decisions.md` H6, H13, F7, F16.

## Acceptance criteria

- Given the 9 suites, when run, then every non-filtered case passes, and the case counts equal the oracle's runs minus H13's 3
  (4, 2, 1, 1, 4, 0, 2, 6, 3).
- Given `STRESS_PENDING`, then a test pins its two paths and the 3 removed cases.
- Given the three graph.json files, then the deferred methods run and pass with the Xtend assertions.
- Given a search for `.test.ts` ports of the 97 `JT` files, then all 97 exist.

## Observability / Rollback

N/A. Reversible.
