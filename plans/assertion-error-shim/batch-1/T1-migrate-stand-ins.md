<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: move the three stand-ins onto the shim

**Owner:** orchestrator. **Budget:** 30 min.

## Context

`src/java/lang/AssertionError.ts` is the shim (dev-assert D3). It sets `name = 'AssertionError'` and passes `detailMessage` to
`Error`. #114 lists three sites that still stand in for it by hand. The decisions are D1-D5 in
[decisions.md](../decisions.md). Read the Java at the pin before editing:

- `~/git/knowvah/elk/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplinesMath.java:51-55`
- For the two Xtext sites, the Xtext 2.36.0 Java cited in each file's `@see`. If no source is on disk, use `javap -p -c` on the
  Xtext jar from the p2 cache that `tools/oracle/java-tests.sh` resolves. Check two things: `CyclicLinkingException`'s superclass,
  and that `DefaultLinkingService.getLinkedObjects` throws `AssertionError`.

## Write-set

- `src/xtext/linking/impl/DefaultLinkingService.ts`, `src/xtext/linking/impl/DefaultLinkingService.test.ts`
- `src/xtext/linking/lazy/LazyLinkingResourceTypes.ts`, `src/xtext/linking/lazy/LazyLinkingResource.test.ts`
- `src/alg/layered/p5edges/splines/SplinesMath.ts`, `src/alg/layered/p5edges/splines/SplinesMath.test.ts`
- `test/architecture/exception-hierarchy.fitness.test.ts`
- `docs/translation-rules.md` (row `:670`)
- this mission's journal

## Read-set

`src/java/lang/AssertionError.ts`, `src/java/lang/AssertionError.test.ts`, `src/xtext/linking/lazy/LazyLinkingResource.ts:246-262`
and `:320-326`, `src/xtext/scoping/impl/AbstractScope.ts:154-163`,
`src/xtext/formatting2/internal/RegionTraceMissingException.ts:15-25`,
`src/alg/layered/p5edges/orthogonal/HyperEdgeCycleDetector.ts:19-32`, `src/alg/rectpacking/util/DrawingUtil.test.ts:100-103`.

## Steps

1. **Positive control.** Before editing, run the enumeration and journal its hits. It must find `LazyLinkingResourceTypes.ts:54`
   and `DefaultLinkingService.ts:59`:
   - `grep -rn "name = 'AssertionError'" src --include=*.ts`
   - an `ast-grep` pattern for `$E.name = 'AssertionError'`
   - `grep -rn "extends Error" src --include=*.ts`, read against Java parents for any other `AssertionError` stand-in
2. **Name readers (stop 2).** Enumerate the reads of a caught error's `.name` in `src/` (start from `AbstractScope.ts:159` and
   `RegionTraceMissingException.ts:23`). For each, show from the call graph whether a `CyclicLinkingException` can reach it.
   `CyclicLinkingException` is thrown only by `handleCyclicResolution` (`LazyLinkingResource.ts:320-326`), and is caught at
   `:255` for its own triple. Journal the result.
3. **Tests first (TDD).** Add the new assertions before the code, and see each one fail:
   - D1: a new `it` in `DefaultLinkingService.test.ts`: `instanceof AssertionError` and the exact message.
   - D2: a new `it` in `LazyLinkingResource.test.ts`: the error of `cyclic(...)` is `instanceof AssertionError`, has `name`
     `'CyclicLinkingException'`, and `String(e)` starts with `CyclicLinkingException: Cyclic resolution of lazy links`.
   - D3: a new `describe` in `SplinesMath.test.ts`: `Reflect.construct` throws an `AssertionError` with message
     `'Instantiating utility class SplinesMath.'`.
   - D4: the fitness edits (row, comments, the widened skip, and the additive `instanceof Exception` false assertion).
4. **Code.** Make the three edits of D1-D3, importing `AssertionError` from `src/java/lang/AssertionError.js` by relative path.
   Fix the class comments (`LazyLinkingResourceTypes.ts:44`, `SplinesMath.ts:54-56`).
5. **Docs.** Edit the row of D5. Run `grep -rn "AssertionError" docs` and fix any sentence that is now stale.
6. **Close.** Rerun the step-1 enumeration: the only hit left is in `src/java/lang/AssertionError.ts`. Run the quality gates of
   the README (typecheck, prettier on the changed files, the scoped suite). Then commit:
   `refactor(java): move the assertionerror stand-ins onto the shim`, with `Refs: #114`.

## Interface contracts

`CyclicLinkingException`'s constructor stays `(detailMessage: string, triple: LazyProxyInformation)`, and `readonly triple` stays.
`SplinesMath`'s static members are unchanged.

## Acceptance criteria

- Given a scope provider that returns null, when `getLinkedObjects` runs, then it throws an `AssertionError` (the shim's class)
  whose message is the Java template, and the existing test at `:64-71` passes unchanged.
- Given a cyclic resolution, when `handleCyclicResolution` throws, then the error is `instanceof AssertionError`, has `name`
  `'CyclicLinkingException'`, and is still caught at `LazyLinkingResource.ts:255` for its own triple (existing tests pass
  unchanged).
- Given `Reflect.construct(SplinesMath, [])`, when it runs, then it throws an `AssertionError` with message
  `'Instantiating utility class SplinesMath.'`.
- Given the fitness test, when it runs, then `CyclicLinkingException extends AssertionError` passes, the `Exception` case checks
  the same rows as at the base, and `CyclicLinkingException.prototype instanceof Exception` is `false`.
- Given `src/`, when the step-1 enumeration reruns, then its only hit is `src/java/lang/AssertionError.ts`.

## Observability

N/A. The mission adds no operation; it changes the classes of three exceptions.

## Rollback

Reversible: revert the commit. No data, ref or contract outside the port changes.
