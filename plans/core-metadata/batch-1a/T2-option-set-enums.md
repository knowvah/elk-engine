<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Option-set enums

**Agent:** typescript-pro · **Commit:** `feat(T2): add the option-set enums`

## Context
Four enums carry static `EnumSet` factories that `.melk` defaults call (`ContentAlignment.topLeft()`,
`NodeLabelPlacement.fixed()`, …) and custom `valueOf` overloads for legacy names.

## Task
TDD. Port `ContentAlignment` (`centerCenter`, `topLeft`, `bottomRight`, `topCenter`),
`NodeLabelPlacement` (all 14 `inside*`/`outside*`/`fixed` factories, `isValid`, the custom
`valueOf`), `PortLabelPlacement` (`fixed`, `inside`, `outside`, `isFixed`, `isValid`), `SizeOptions`
(custom `valueOf`). (`ITopdownSizeApproximator` is T10: it needs T8's class token.)
Factories return a **fresh** `EnumSet` per call, as the Java does. Where a Java class has both the
enum `valueOf(String)` and a custom static `valueOf`, follow translation-rules §6.5 and journal the
resolution.

## Write-set
`src/core/options/{ContentAlignment,NodeLabelPlacement,PortLabelPlacement,SizeOptions}.ts`; one
`.test.ts` per file.

## Read-set
- `src/core/options/SizeConstraint.ts` (enum with `EnumSet` factories) and its test
- `src/java/util/EnumSet.ts` (interface contract in `plans/elkgraph-model/batch-1/T4-enums-enumset.md`)
- `docs/translation-rules.md` §6.3 and §6.5 (lines 343–376)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/options/{ContentAlignment,NodeLabelPlacement,PortLabelPlacement,SizeOptions}.java`

## Interface contract (consumed by T14, T15, T16)
Enum shape as in T1, plus the static factories under their Java names returning `EnumSet<E>`.

## Acceptance criteria
- Given `ContentAlignment.topLeft()`, then it contains exactly `V_TOP, H_LEFT`, and two calls return
  distinct sets.
- Given each `NodeLabelPlacement` factory, then its members (in ordinal order) match the Java.
- Given `NodeLabelPlacement.isValid` / `PortLabelPlacement.isValid` / `isFixed`, then every branch
  matches the Java (valid and invalid combinations asserted).
- Given the custom `valueOf` of `NodeLabelPlacement` and `SizeOptions` with a legacy name, then it
  returns the Java mapping; with an unknown name it throws as the Java does.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10; `@see` on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No change to `src/java/util/EnumSet.ts`; if it lacks an operation the Java needs, stop (write-set).
