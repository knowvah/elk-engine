<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — `IntermediateProcessorStrategy`, every arm throwing

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T2): port the intermediate processor strategy enum`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7b (README), S3 and B9. The 7b phases declare their processors through this enum, so it must exist before
the phase classes; the processor classes do not exist yet, so every `create()` arm throws (L1 first clause) and T8
wires the ten 7b arms after batch 2. Pattern: `S/options/CycleBreakingStrategy.ts` (enum shape, `notPorted`,
`values()`/`valueOf`, `ordinal`).

## Task

1. `S/intermediate/IntermediateProcessorStrategy.ts`: the 63 members in Java order with the Java javadoc kept as
   comments; `create()` as a `switch` whose every arm throws
   `new UnsupportedOperationException('<Class> is ported in mission <7x>')` per the B9 member table, with no
   processor import; `ILayoutProcessorFactory<LGraph>` implemented as the Java enum does. The `default` arm throws the
   Java `IllegalArgumentException` message verbatim (`J/intermediate/IntermediateProcessorStrategy.java:365`).
2. `IntermediateProcessorStrategy.test.ts`: names and ordinals in Java order (L4 allows Java constants), `valueOf`
   round trip, and one case per arm asserting the exception class and message (the 7b arms assert the 7b message now;
   T8 rewrites those ten cases).

## Write-set

`S/intermediate/IntermediateProcessorStrategy.ts`, `S/intermediate/IntermediateProcessorStrategy.test.ts`.

## Read-set

`J/intermediate/IntermediateProcessorStrategy.java`, `S/options/CycleBreakingStrategy.ts` (+ test),
`src/core/alg/{ILayoutProcessorFactory,ILayoutProcessor}.ts`, `decisions.md` B9.

## Interface contract (consumed by T6, T7, T8)

`IntermediateProcessorStrategy.<MEMBER>` with `name()`, `ordinal()`, `create(): ILayoutProcessor<LGraph>`;
`IntermediateProcessorStrategy.values()` and `valueOf(name)`.

## Acceptance criteria

- Given `values()`, when compared with the Java enum, then names and ordinals match for all 63 members.
- Given any member, when `create()` runs, then it throws naming the class and its mission; the file imports no
  processor class.
- Given `npm run complexity`, when run, then the file is clean (split the switch at section comments if needed).

## Observability / Rollback

N/A. Reversible.
