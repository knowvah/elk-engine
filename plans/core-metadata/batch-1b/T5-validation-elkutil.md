<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Visitors, `GraphIssue`, `ElkUtil.printElementPath`

**Agent:** typescript-pro · **Commit:** `feat(T5): add graph issues, element visitors and elkutil.printelementpath`

## Context
`LayoutAlgorithmData` (T10) holds a validator factory typed `IValidatingGraphElementVisitor`, whose
`getIssues()` returns `GraphIssue`s; `GraphIssue.toString` calls `ElkUtil.printElementPath`.
`DeprecatedLayoutOptionReplacer` (T15) implements `IGraphElementVisitor`. `ElkUtil.ts` starts with
this one method (C2).

## Task
TDD.
- `IGraphElementVisitor` (`visit(element)`), `IValidatingGraphElementVisitor` (`getIssues()`).
- `GraphIssue` with nested `Severity` (`ERROR("Error")`, `WARNING("Warning")`, `getUserString`) in
  the same file (C3); `equals` (element identity, message, severity), `hashCode`, `toString`.
- `ElkUtil.printElementPath(element, builder)` — every branch of `ElkUtil.java:1152-1210`
  (container recursion, `Elk` prefix strip of `eClass().getName()`, identifier, label text, first
  non-empty label, connected-edge source/target lists).
- `src/java/lang/StringBuilder.ts`: the members the two methods use (`append(string)`,
  `append(char)` as a UTF-16 code unit, `append(Object)` via `String(…)`/`toString()`, `toString()`),
  from the JDK Javadoc only (AD-9).
- `GraphIssue.hashCode` XORs identity hashes (`element.hashCode()`, `severity.hashCode()`) that the
  JVM does not reproduce. Add `src/java/lang/IdentityHashCode.ts` (`identityHashCode(o)`: a stable
  per-object int from a `WeakMap` and a counter held in a class static, no module `let`); test only
  the Javadoc contract (stable per object, equal objects ⇒ equal hash). Journal the divergence.

## Write-set
`src/core/util/IGraphElementVisitor.ts`, `src/core/util/ElkUtil.ts`,
`src/core/validation/{GraphIssue,IValidatingGraphElementVisitor}.ts`,
`src/java/lang/{StringBuilder,IdentityHashCode}.ts`, and `.test.ts` for `ElkUtil`, `GraphIssue`,
`StringBuilder`, `IdentityHashCode`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java:1130-1215`
- `…/core/validation/{GraphIssue,IValidatingGraphElementVisitor}.java`, `…/core/util/IGraphElementVisitor.java`
- `src/graph/util/ElkGraphUtil.ts` (building test graphs), `src/guava/Strings.ts` (`isNullOrEmpty`)
- `docs/translation-rules.md` §6.1, §7 (strings)

## Interface contract (consumed by T10, T15)
```ts
interface IGraphElementVisitor { visit(element: ElkGraphElement): void }
interface IValidatingGraphElementVisitor extends IGraphElementVisitor { getIssues(): Collection<GraphIssue> }
class GraphIssue { static readonly Severity; constructor(element, message, severity); getElement(); getMessage(); getSeverity(); equals; hashCode; toString }
class ElkUtil { static printElementPath(element: ElkGraphElement, builder: StringBuilder): void }
```
`Collection<GraphIssue>` maps to the type the existing ports use for Java collections (journal).

## Acceptance criteria
- Given a root graph with node `n1` holding port `p1`, when `printElementPath(p1)`, then
  `Root Node > Node n1 > Port p1` (root has no identifier and no labels).
- Given a node without identifier whose second label has text `B` and first label empty, then the
  path ends `Node B`; given a label element with text `T`, then `Label T`.
- Given a connected edge with two sources and one target and no identifier/labels, then the
  `" (" … ", " … " -> " … ")"` form matches the Java.
- Given `new GraphIssue(n, "m", ERROR).toString()`, then `ERROR: m (Root Node …)`.
- Given two issues with the same element, message and severity, then `equals` is true and the
  hashes are equal; a different element gives `equals` false.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10 (split `printElementPath` only per
translation-rules §6 if lizard requires, journal it); `@see` on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other `ElkUtil` methods (C2); no `GraphValidator`, `LayoutOptionValidator` (mission 5).
