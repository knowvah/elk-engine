<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: C3 move the cancellation and diagnostic stand-ins (typescript-pro)

**Goal:** the Xtext and Equinox classes that 4c T12d parked in `src/xtext/linking/lazy/` live in the files their Java
packages name (AD-7), with no behaviour change.

## Context

`src/xtext/linking/lazy/LazyLinkingResourceCancel.ts` holds `CancelIndicator` + `NULL_CANCEL_INDICATOR`
(Xtext `util/CancelIndicator`), `OperationCanceledException` (Equinox `org.eclipse.core.runtime`, D7),
`OperationCanceledError` (Xtext `service`) and the `checkCanceled`/`propagateAsErrorIfCancelException` functions
(Xtext `service/OperationCanceledManager`; `LazyLinkingResource.ts:75` documents that the injected manager is these
functions). `LazyLinkingResourceExceptionDiagnostic.ts` holds `ExceptionDiagnostic` (Xtext `diagnostics`).

## Write-set

- Delete: `src/xtext/linking/lazy/LazyLinkingResourceCancel.ts`, `LazyLinkingResourceExceptionDiagnostic.ts`;
  move `LazyLinkingResourceCancel.test.ts` to the new homes
- Create: `src/xtext/util/CancelIndicator.ts`, `src/xtext/service/OperationCanceledError.ts`,
  `src/xtext/service/OperationCanceledManager.ts` (the two functions, as now), `src/xtext/diagnostics/ExceptionDiagnostic.ts`,
  `src/equinox/core/runtime/OperationCanceledException.ts`, and their colocated tests
- Update imports: `src/xtext/linking/lazy/LazyLinkingResource.ts` (+ its `:75` comment), `LazyLinkingResource.test.ts`,
  `test/architecture/exception-hierarchy.fitness.test.ts` (import paths only, lines 43-46)
- D7 amendment: `test/architecture/module-boundaries.fitness.test.ts` (lines 19-40, 95-100, ~500-510, plus a new
  `src/equinox` describe block modelled on lines 411-445); `tools/bundle-deps.ts` only if it lists third-party dirs

## Read-set

- The two files above (whole); `LazyLinkingResource.ts:25-80, 110-125, 210-225`
- `decisions.md#d7-equinox-class-and-boundary-rule`
- Xtext 2.36.0 `OperationCanceledManager.java`, `OperationCanceledError.java`, `CancelIndicator.java`,
  `ExceptionDiagnostic.java` (for the `@see` paths only)

## Rules

- A move, not a rewrite: bodies, messages, `name`s and parents unchanged; the test count and every assertion
  unchanged except the D7-amended boundary message and the new `src/equinox` cases.
- One class per file; `@see` to the real Java file (the Equinox class cites
  `org.eclipse.equinox.common/src/org/eclipse/core/runtime/OperationCanceledException.java`).
- `src/equinox` imports only `src/equinox` and `src/java`; `src/xtext` may import it; nothing else does.

## Acceptance criteria

- Given the move, when `npm test` runs, then the number of tests and every pre-existing assertion except D7's
  boundary message are unchanged, and `grep -r LazyLinkingResourceCancel src test` finds nothing.
- Given the D7 rule, when the boundary fitness test runs, then `src/equinox` → `src/java` passes,
  `src/equinox` → `src/xtext` fails with the new message, and `src/core` → `src/equinox` fails.
- Given the SPDX and exception-hierarchy fitness tests, then they pass (`OperationCanceledException` still extends
  `RuntimeException`, `OperationCanceledError` still extends `Error`).
- Any further fitness change needed: stop 3/4.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.

## Commit

`refactor(T5): move cancellation and diagnostic stand-ins to their packages`; body cites C3 and the D7 amendment.
