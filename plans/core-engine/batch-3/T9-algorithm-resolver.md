<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `LayoutAlgorithmResolver`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port the layout algorithm resolver`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
The engine applies the resolver through `ElkUtil.applyVisitors` when the root has no `RESOLVED_ALGORITHM`
(`RecursiveGraphLayoutEngine.java:104-107`). `TopdownSizeApproximator` (T14) and `GraphValidatorTest` (T11) use it
too. Its default algorithm is `org.eclipse.elk.layered` (`LayoutAlgorithmResolver.java:114-120`), which is not
registered until mission 7a: a node with children and no algorithm therefore throws here — that is correct ported
behaviour, not a bug.

## Task
Port `J/data/LayoutAlgorithmResolver.java` (122 lines): `visit` (resolve per node with children; set
`RESOLVED_ALGORITHM`; the two `UnsupportedConfigurationException` messages built exactly as Java, `:31-80`),
`resolveAlgorithm` via `LayoutMetaDataService.getAlgorithmDataBySuffix`, protected `getDefaultLayoutAlgorithmID()`.
Tests from the Java source with test-registered algorithms (pattern: `src/core/data/LayoutMetaDataService.test.ts`).

## Write-set
`src/core/data/LayoutAlgorithmResolver.ts` (+ test).

## Read-set
`J/data/LayoutAlgorithmResolver.java`, `src/core/data/{LayoutMetaDataService,LayoutAlgorithmData}.ts` (symbols),
`src/core/util/{IGraphElementVisitor,ElkUtil}.ts`, `src/core/UnsupportedConfigurationException.ts`.

## Interface contracts (outputs)
`class LayoutAlgorithmResolver implements IGraphElementVisitor`, `visit(element)`, protected
`getDefaultLayoutAlgorithmID(): string`. Consumed by T11, T14, T16.

## Acceptance criteria
- Given a node with children and `algorithm = "box"` (suffix) registered, when visited, then `RESOLVED_ALGORITHM` is
  the box data.
- Given an unknown id `"foo.Bar"`, when visited, then `UnsupportedConfigurationException` with the Java message.
- Given no algorithm and no layered registration, when visited, then the Java "no default" message is thrown.
- Given a leaf node, when visited, then nothing is resolved (Java branch).

## Observability / Rollback
N/A. Reversible: revert the commit.
