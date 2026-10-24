<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Exceptions, small interfaces, `AlgorithmFactory`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T1): port core exceptions, small interfaces and algorithm factory`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5a (README). Later tasks need these leaf types: the resolver throws `UnsupportedConfigurationException`,
providers and the engine may throw `UnsupportedGraphException`, `GraphValidator` throws `GraphValidationException`,
`TestController` uses `IWhiteBoxTestable` and `ILayoutProcessor`; `GraphValidatorTest` (T11) builds algorithm data
with `new AlgorithmFactory(...)`. The generated `*LayouterOptions` do **not** use it: `tools/melk/emit.ts:420-436`
emits a per-algorithm `IFactory` class, as ELK's generated code does. AD-16: Java-named exceptions extend the Java parent chain
(`src/java/lang/{Exception,RuntimeException}.ts`, pattern in any existing `*Exception.ts`).

## Task
1. Port `J/UnsupportedConfigurationException.java`, `J/UnsupportedGraphException.java`,
   `J/validation/GraphValidationException.java` (keep its issue list accessor), `J/ITopdownLayoutProvider.java`,
   `J/testing/IWhiteBoxTestable.java`, `J/alg/ILayoutProcessor.java`, `J/util/AlgorithmFactory.java`.
   One class per file, Java names, `@see` headers, SPDX.
2. `AlgorithmFactory`: Java takes a `Class<? extends AbstractLayoutProvider>` (+ optional parameter, default `null`)
   and calls `newInstance()` then `initialize(parameter)`; TS takes the provider constructor. The two `catch` arms
   wrap reflection errors in `WrappedException` (5b); a TS constructor call cannot raise them, so omit the arms with a
   comment naming `AlgorithmFactory.java:52-58`.
3. Add the three exceptions to `test/architecture/exception-hierarchy.fitness.test.ts` with their Java parents.

## Write-set
The seven files above (+ colocated tests), `test/architecture/exception-hierarchy.fitness.test.ts`.

## Read-set
The seven Java files; `src/core/AbstractLayoutProvider.ts`; `src/core/util/IFactory.ts`, `InstancePool.ts`;
`src/java/lang/RuntimeException.ts`; `tools/melk/emit.ts:420-436` (factory emission, for comparison); `plans/elk-engine-skeleton/decisions.md#ad-16-exception-policy-approved-by-the-user-2026-10-15`.

## Interface contracts (outputs)
`new AlgorithmFactory(providerCtor: new () => AbstractLayoutProvider, parameter: string | null = null)` implementing
`IFactory<AbstractLayoutProvider>` (`create()`, `destroy(obj)`); consumed by T11.
`GraphValidationException(message, issues)`, `getIssues()`; consumed by T6, T11.
`ILayoutProcessor<G>.process(graph, monitor)`; `IWhiteBoxTestable` per Java; consumed by T7.

## Acceptance criteria
- Given each new exception, when the fitness test runs, then its prototype chain matches the Java parents (AD-16).
- Given an `AlgorithmFactory` over a test provider and parameter `"p"`, when `create()` runs twice, then two distinct
  instances are returned and each `initialize` received `"p"` (`AlgorithmFactory.java:44-63`).
- Given `destroy(provider)`, when called, then `provider.dispose()` ran once.
- Given `GraphValidationException` built with an issue list, when `getIssues()` is called, then the same list is
  returned and `message` equals the constructor message.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
