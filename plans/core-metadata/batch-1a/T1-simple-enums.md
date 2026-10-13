<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — 11 simple `core.options` enums

**Agent:** typescript-pro · **Commit:** `feat(T1): add the simple core option enums`

## Context
`CoreOptions` (T14) types and defaults reference every `core.options` enum. Three already exist
(`Direction`, `PortSide`, `SizeConstraint`, mission 2); this task ports the eleven that carry no
`EnumSet` factories. Enums follow translation-rules §6.3, in the exact shape of
`src/core/options/Direction.ts`.

## Task
TDD. Port `Alignment`, `EdgeCoords`, `EdgeLabelPlacement` (`isEndLabelPlacement`), `EdgeRouting`,
`EdgeType`, `HierarchyHandling`, `LabelSide` (`opposite`), `PortAlignment`, `PortConstraints`
(`isPosFixed`, `isRatioFixed`, `isOrderFixed`, `isSideFixed`), `ShapeCoords`, `TopdownNodeTypes`.
Keep constant order, Javadoc summaries and every branch of each method.

## Write-set
`src/core/options/{Alignment,EdgeCoords,EdgeLabelPlacement,EdgeRouting,EdgeType,HierarchyHandling,
LabelSide,PortAlignment,PortConstraints,ShapeCoords,TopdownNodeTypes}.ts` and one colocated
`.test.ts` per file.

## Read-set
- `src/core/options/Direction.ts` (shape to copy) and `Direction.test.ts`
- `docs/translation-rules.md` §6.3 (lines 343–352)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/options/<Name>.java`

## Interface contract (consumed by T14's generated `CoreOptions`, T15, T16)
Each enum: `static readonly <CONST>`, `static values(): readonly E[]`, `static valueOf(name): E`
(throws `IllegalArgumentException` like `Direction`), `ordinal()`, `name()`, `toString()`,
`compareTo(other)`. Methods keep the Java names.

## Acceptance criteria
- Given each enum, when calling `values()`, then the names and ordinals equal the Java declaration
  order.
- Given `valueOf` with an unknown name, then it throws as `Direction.valueOf` does.
- Given `LabelSide.ABOVE.opposite()`, then `BELOW`; `UNKNOWN`/`INLINE` follow the Java `switch`.
- Given each `PortConstraints` constant, then `isPosFixed/isRatioFixed/isOrderFixed/isSideFixed`
  return the Java truth table (all 6 × 4 cases asserted).
- Given `EdgeLabelPlacement.HEAD/TAIL/CENTER`, then `isEndLabelPlacement` is `true/true/false`.

## Quality bar
README gates; 100% coverage of the new files; functions ≤ 30 NLOC, CCN ≤ 10; `@see` on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not touch `Direction`, `PortSide`, `SizeConstraint`. No `TopdownSizeApproximator` (C1).
