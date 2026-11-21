<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: the layout-test runner registers force and stress (ruling item 1, D1)

## Context

`realize` in `test/helpers/layout-test-runner.ts:264` calls `registerLayered()` only. In Java,
`PlainJavaInitialization.initializePlainJavaLayout()` (`test/org.eclipse.elk.alg.test/.../PlainJavaInitialization.java:42-81`)
registers every provider for every runner suite, `ForceMetaDataProvider` and `StressMetaDataProvider` included. If
`elk.stress` is not registered, the two models fail, as 8b's evidence shows.

## Read-set

`test/helpers/layout-test-runner.ts:30-60, 255-275`, `test/helpers/layered-framework-replay.ts:160-172`,
`test/helpers/force-replay-dump.ts:60-75`, `src/alg/force/options/{Force,Stress}MetaDataProvider.ts`,
`src/core/data/LayoutMetaDataService.ts:316-330, 455-470`, `test/helpers/layout-test-runner.test.ts`, issue #120.

## Write-set

`test/helpers/layout-test-runner.ts`, `test/helpers/layout-test-runner.test.ts`.

## Steps (TDD)

1. **Red.** In `layout-test-runner.test.ts`, write tests that:
   - after the registration helper runs, `getAlgorithmData('org.eclipse.elk.stress')` and
     `getAlgorithmData('org.eclipse.elk.force')` resolve, by id and by the suffixes `stress` and `force`
     (`getAlgorithmDataBySuffix`);
   - after a second call, the category `org.eclipse.elk.force` still lists each algorithm exactly once (the #120 guard);
   - a spec built with `buildLayoutTests` registers them through `realize`. Use a stress child in a `GraphBuilder` graph,
     laid out with layered at the root, and assert that the child's nodes got positions other than the origin. Keep the
     assertion specific.
2. **Green.** Add the helper, with a `@see` comment citing `PlainJavaInitialization.java`. Register
   `new ForceMetaDataProvider(), new StressMetaDataProvider()`, each guarded by a probe (`getAlgorithmData(id) === null`
   or an option probe, push-forward). Call it in `realize` right after `registerLayered()`.
3. Run every runner suite: `npx vitest run src/alg/layered` plus any other file that imports `layout-test-runner`
   (grep). Compare passed/skipped/failed per file with the pre-change run. Any difference is stop 4.

## Acceptance criteria

- Given a fresh service, when the helper runs twice, then `elk.stress` and `elk.force` resolve and the force category
  lists each once.
- Given a runner spec whose graph has an `elk.stress` child, when its case runs, then it passes and the child's nodes
  are placed.
- Given every other runner suite, when run before and after, then the per-file counts are identical.

## Interface contract (consumed by T4)

Every `defineLayoutTest`/`buildLayoutTests` experiment has `elk.layered`, `elk.force` and `elk.stress` registered
before its graph is provided.

## Observability

N/A. Evidence: the per-file counts, before and after, in the journal.

## Rollback

Reversible: revert the commit.
