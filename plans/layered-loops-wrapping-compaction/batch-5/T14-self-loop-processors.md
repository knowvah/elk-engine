<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Self-loop processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T14): port the self-loop processors`
Scratch: `$TMPDIR/7g/T14/`.

## Context

W1, W3, W8, W13. `J/intermediate/{SelfLoopPreProcessor (125), SelfLoopPortRestorer (93), SelfLoopRouter (112),
SelfLoopPostProcessor (78), DummySelfLoopProcessor (187)}.java`. The first four are enum arms (wired in T15);
`DummySelfLoopProcessor` has no caller (W1) and runs only through the `processor` step op (W3, T2's registry). The arms still throw
at plan build until T15, so rows replay with the classes injected (`factoriesWith`).

## Task

1. Port `JT/intermediate/SelfLoopPreprocessorTest.java` (5 runs) **first** to
   `src/alg/layered/intermediate/SelfLoopPreprocessorTest.test.ts`, Java literals unchanged (it calls the processor directly).
2. Port the five processors (`ILayoutProcessor<LGraph>`, monitor calls as the Java), using T5, T9, T10, T13.
3. Register `DummySelfLoopProcessor` with T2's `registerStepProcessor` from the vectors test that needs it (not from `src/`).
4. Replay every `scenarios/<Class>/*` row and the `models` rows stopping at the four self-loop arms with the classes injected,
   and the `processor DummySelfLoopProcessor` scenario rows.

## Write-set

`src/alg/layered/intermediate/{SelfLoopPreProcessor,SelfLoopPortRestorer,SelfLoopRouter,SelfLoopPostProcessor,DummySelfLoopProcessor}.ts`,
their `.test.ts` files, `SelfLoopPreprocessorTest.test.ts`.

## Read-set

The five Java files and the test, T5/T9/T10/T13's TS files, `src/alg/layered/intermediate/NorthSouthPortPreprocessor.ts:30-45`
(the Javadoc dependency), T2's helpers, `decisions.md` W1, W3, W8, W13.

## Acceptance criteria

- Given `SelfLoopPreprocessorTest`, when run, then its 5 cases pass with the Java's assertions unchanged.
- Given a self-loop `scenarios` or `models` row, when replayed with the classes injected, then the dump equals the row (AD-4).
- Given a `processor DummySelfLoopProcessor` row, when replayed, then the dump equals the row and every branch of `process` is
  covered by some row (or is U with its Java line).
- Given a fresh process, when each module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A. Reversible.
