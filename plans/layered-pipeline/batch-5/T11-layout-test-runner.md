<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — The JUnit runner subset

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11): add the layout test runner subset`
Scratch: a private subdirectory `<scratchpad>/T11/`.

**Rules (F16).** Ports of Java suites add no assertion the Java lacks.

## Context

Mission 7f, F7. `framework/LayoutTestRunner.java` (361 lines), `ExperimentRunner`, `WhiteboxRecorder.java` (101 lines) and the annotations
under `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/` are read for semantics only, not ported line by
line: each `@GraphResourceProvider`/`@GraphProvider` graph × each `@Configurator`, `@DefaultConfiguration` applying `DefaultConfigurator` defaults,
`@TestAfterProcessor(cls)` and `@TestBeforeProcessor(cls)` capturing at the matching `TestController` notifications, `@FailIfNotExecuted`, `@OnlyOnRootNode`, and
plain `@Test` running on the laid-out graph.

## Task

1. `test/helpers/layout-test-runner.ts`:
   ```ts
   defineLayoutTest({
     name, graphs: GraphSource[], configurators?: Record<string, (g: ElkNode) => void>,
     defaultConfiguration?: boolean,
     afterLayout?: Record<string, (g: ElkNode) => void>,
     afterProcessor?: { cls: ProcessorClass, check: (g: LGraph) => void, failIfNotExecuted?: boolean, onlyOnRoot?: boolean }[],
     beforeProcessor?: same,
   })
   ```
   emitting one vitest `it` per graph × configurator × check. `GraphSource` = vendored path plus optional `FileNameFilter`-equivalent regex (resolved under
   `test/golden/inputs`; under `$ELK_MODELS_DIR` when `PIPELINE_SUITES_FULL=1` and the env is set), or a builder function. Layout goes through `LayeredLayoutProvider`,
   `setTestController`, `RecursiveGraphLayoutEngine` as the Java's `ExperimentRunner` does, processors notified through the landed `TestController`.
2. A run in which a plan arm throws naming a later mission fails with that message plainly so T12 can reallocate.
3. `src/alg/layered/issues/Issue587Test.test.ts`: `JT/issues/Issue587Test.java` end to end, three configurators, `testNoException` as the runner's pass.
4. Structural tests with a tiny fake provider: `failIfNotExecuted` fails when the processor did not run, `onlyOnRoot` skips non-roots, the filter selects by file name.

## Write-set

`test/helpers/layout-test-runner.{ts,test.ts}`, `src/alg/layered/issues/Issue587Test.test.ts`.

## Read-set

`framework/{LayoutTestRunner,ExperimentRunner,ExperimentStatement,WhiteboxRecorder}.java`, `framework/io/FileNameFilter.java`, `framework/annotations/*.java`,
`framework/config/{TestConfiguration,ConfiguratorTestConfiguration}.java`, `framework/graph/GraphFromFile.java`, `JT/issues/Issue587Test.java`, `src/core/testing/{TestController,IWhiteBoxTestable}.ts`,
`decisions.md` F7, F16.

## Interface contract (consumed by T12)

`defineLayoutTest` as above; the helper's `layout(graph, configurator)` for suites that call the provider directly.

## Acceptance criteria

- Given `Issue587Test`, when run, then three cases pass (the oracle's `runs=3`).
- Given an `afterProcessor` check with `failIfNotExecuted`, when the plan lacks the class, then the case fails naming the class.
- Given a graph whose plan needs a 7g arm, when run, then the failure names `SelfLoopPreProcessor` and 7g.

## Observability / Rollback

N/A — no new observable operations. Reversible.
