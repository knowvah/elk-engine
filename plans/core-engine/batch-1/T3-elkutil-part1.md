<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — `ElkUtil` part 1 (Java `:84-706`)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T3): port elkutil port, resize and inside-part helpers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
`src/core/util/ElkUtil.ts` holds only `printElementPath` (94 lines; partial-port header). `ElkUtil.java` is 1,293
lines; T3 ports `:84-706`, T6 the rest. The providers and the engine call many of these. Keep the existing export
shape (`export const ElkUtil = { … } as const` plus named functions); keep Java names; Java overloads become one
function with optional/union parameters or distinct names only where TS forces it (journal each).

## Task
Port, in Java order: `calcPortSide`, `calcPortOffset`, both `resizeNode` overloads, `effectiveMinSizeConstraintFor`,
`applyConfiguredNodeScaling`, `computeChildAreaDimensions`, both `determineJunctionPoints` (+ private helpers),
`getLabelsBounds`, both `computeInsidePart`. Update the partial-port header to list what is ported. Tests come from
the Java source (no JUnit covers these); derive expected values by hand from the Java and cite `ElkUtil.java:<line>`.

## Write-set
`src/core/util/ElkUtil.ts`, `src/core/util/ElkUtil.test.ts`.

## Read-set
`J/util/ElkUtil.java:84-706`; `src/core/math/{KVector,KVectorChain,ElkPadding,ElkMargin}.ts`;
`src/core/options/{PortSide,SizeConstraint,SizeOptions,PortConstraints,CoreOptions}.ts` (symbols only);
`src/graph/util/ElkGraphUtil.ts` (symbols only); `docs/translation-rules.md` §§1-4.

## Interface contracts (outputs)
Java signatures, e.g. `calcPortSide(port: ElkPort, direction: Direction): PortSide`,
`resizeNode(node, newWidth, newHeight, movePorts, moveLabels): KVector`, `computeInsidePart(...)`,
`determineJunctionPoints(edge): KVectorChain`. Consumed by T6, T8, T12–T16.

## Acceptance criteria
- Given a port on each side of a node and each `Direction`, when `calcPortSide` runs, then the side equals the Java
  decision (`ElkUtil.java:100-158`), including the `UNDEFINED` fallbacks.
- Given a node with ports and labels and `resizeNode(node, w, h, true, true)`, when run, then ports and labels move by
  the Java ratios and the returned vector is the Java size change.
- Given edges sharing a source with diverging sections, when `determineJunctionPoints` runs, then the junction points
  equal the Java result (same order).
- `npm run complexity` clean on `ElkUtil.ts` (split at Java method boundaries only).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.

## Amendment (M10, M11 — user, 2026-10-23)
Write-set becomes `src/core/util/ElkUtil.ts`, `src/core/util/ElkUtil{Ports,Sizing,Junctions,Labels}.ts`,
`src/core/math/ElkRectangle.ts` (+ colocated tests, including `ElkUtil.test.ts`). Also port `getLabelsBounds` and the
`PortAdapter` `computeInsidePart` overload. See decisions.md M10/M11.
