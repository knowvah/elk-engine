<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `ElkUtil` part 2 (Java `:707-1293`) + `ElkUtilTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port elkutil translation, vector chain and visitor helpers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
T3 ported `ElkUtil.java:84-706`. This task ports the rest; afterwards `ElkUtil` is complete except the
`elkjs-exclude` blocks (M2). The engine needs `applyVisitors`; the resolver and validator are applied through it.

## Task
Port in Java order: the four `translate` overloads, `absolutePosition`, `toAbsolute`, `toRelative`, `getPoints`,
`createVectorChain`, `applyVectorChain`, `configureDefaultsRecursively`, the three `configureWithDefaultValues`,
`ensureLabel`, `applyVisitors`, `applyVisitorsWithValidation` (throws `GraphValidationException` from T1 when an
error-severity issue exists — exact Java message), `debugFolderPath` (body inside `elkjs-exclude` → returns `null`),
`createIdentifier`. `printElementPath` (`:1152`) already exists — leave it. `toSafePathName` is excluded (M2): do not
port it, leave a comment. Port `ElkUtilTest.translateWithContentAlignmentTest` verbatim (frozen assertions), plus
Java-derived tests for every other method. Mark the header "complete except elkjs-exclude".

## Write-set
`src/core/util/ElkUtil.ts`, `src/core/util/ElkUtil.test.ts`.

## Read-set
`J/util/ElkUtil.java:707-1293`; `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/util/ElkUtilTest.java`;
`src/core/util/{IGraphElementVisitor,LoggedGraph}.ts`, `src/core/validation/{IValidatingGraphElementVisitor,GraphIssue}.ts`;
`src/core/data/{LayoutMetaDataService,LayoutOptionData}.ts` (symbols for `configureWithDefaultValues`);
`plans/core-engine/decisions.md#m2--elkjs-exclude`.

## Interface contracts (outputs)
`applyVisitors(graph: ElkNode, ...visitors: IGraphElementVisitor[]): void`,
`applyVisitorsWithValidation(graph, ...visitors): GraphIssue[]`, `translate(...)`, `toAbsolute(point, parent)`,
`toRelative(point, parent)`, `createVectorChain(section)`, `applyVectorChain(chain, section)`,
`createIdentifier(element)`. Consumed by T9, T11, T14, T16.

## Acceptance criteria
- `translateWithContentAlignmentTest` passes verbatim.
- Given a graph and two visitors, when `applyVisitors` runs, then every `ElkGraphElement` yielded by
  `ElkGraphUtil.propertiesSkippingIteratorFor(graph, true)` is visited in that order, by each visitor in argument
  order (`ElkUtil.java:1085-1097`); the root itself is visited only if the iterator yields it.
- Given a validating visitor reporting one ERROR issue, when `applyVisitorsWithValidation` runs, then
  `GraphValidationException` is thrown with the Java message and the issue list; with only WARNINGs, the issues are
  returned.
- Given a section with bend points, when `createVectorChain` then `applyVectorChain` run, then the section round-trips.
- `debugFolderPath(...)` returns `null`.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.

## Amendment (M10 — user, 2026-10-23)
Write-set becomes `src/core/util/ElkUtil.ts` (compose the new sections into the `ElkUtil` object),
`src/core/util/ElkUtil{Coordinates,Defaults,Visitors}.ts` (+ colocated tests, including `ElkUtil.test.ts`).
`getPoints` already lives in `ElkUtilJunctions.ts` (T3); do not port it again. See decisions.md M10.
