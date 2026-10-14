<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — ElkGraph naming, scoping and linking

**Agent:** typescript-pro · **Commit:** `feat(T17): port elkgraph qualified names, scoping and linker`

## Context
Delivers the three ELK-specific language services that turn T15's parser references into object
links with Xtext's diagnostics. T18 `load` wires them; T19 reuses the scope for cross-reference text;
T20's `checkUniqueNames`/`checkEdgeSection` read what they link. Tests replay the T3 `linking` rows
(targets, messages, lines) recorded before this code exists (AD-13).

## Task
1. `naming/ElkGraphQualifiedNameProvider.ts` from `naming/ElkGraphQualifiedNameProvider.xtend:21-44`
   (`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/`), extending the
   T8 `DefaultDeclarativeQualifiedNameProvider` port. Xtend dispatch on the receiver type becomes an
   explicit `instanceof` ladder (translation-rules §8). Keep every branch:
   - `qualifiedName(ElkGraphElement)` (`:23-25`): `prependParentNames(element, QualifiedName.create(element.identifier))`;
     an element **without identifier** (null) is `QualifiedName.create(null)` -> Xtext throws
     (`QualifiedName.create` with a null segment); read Xtext `QualifiedName.java` for the exact
     behaviour and the T3 row for a root/node without identifier and mirror it, do not guard.
   - `qualifiedName(ElkEdgeSection)` (`:27-29`): identifier only, **no parent prefix**.
   - `prependParentNames` (`:31-41`): walk `eContainer` upward; at each ancestor take
     `getFullyQualifiedName(curr)`; the first non-null one is prepended and returned; an ancestor with a
     null name (e.g. a root without identifier) is skipped and the loop continues; no named ancestor ->
     the bare name.
2. `scoping/ElkGraphScopeProvider.ts` from `scoping/ElkGraphScopeProvider.xtend:27-45`:
   `getScope(context, reference)` — `ELK_EDGE_SECTION__OUTGOING_SECTIONS` ->
   `scopeFor(section.parent.sections, s => QualifiedName.create(s.identifier), IScope.NULLSCOPE)`
   (`:36-39`: **identifier-only names, outer scope NULLSCOPE** so section names never fall through to the
   global/local namespace); every other reference -> `super.getScope`. The base is the generated
   `AbstractElkGraphScopeProvider extends DelegatingScopeProvider`
   (`src-gen/org/eclipse/elk/graph/text/scoping/AbstractElkGraphScopeProvider.java`, 1 class, no members);
   use T14's `DelegatingScopeProvider` port (delegate = the default local scope provider T14 ships) and
   port the empty abstract class only if T14's API needs the named type for wiring.
3. `linking/ElkGraphLinker.ts` from `linking/ElkGraphLinker.xtend:25-40`: extends T16's `Linker`;
   `OPPOSITE_REFS` = {`ELK_CONNECTABLE_SHAPE__INCOMING_EDGES`, `ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES`,
   `ELK_EDGE_SECTION__INCOMING_SECTIONS`} (`:27-30`, use the `ElkGraphPackage` literals); `clearReference`
   (`:32-37`) skips those three and otherwise calls `super.clearReference` — fix for ELK #170, keep the
   comment. Compare with Xtext `linking/impl/AbstractCleaningLinker.java:115-125` and `Linker.java:252`
   to see where it is called (clear before relinking).
4. Tests (test first): replay every T3 row with `errors[].kind === 'linking'` plus every parse row's
   linked targets (`values`/`graph`) by feeding T15 output through T16 with these services — exact target
   identity, message, severity, line. Add unit tests: (a) a graph with `edge a -> b` leaves `a.outgoingEdges`
   and `b.incomingEdges` populated after linking (#170) and an edge section with
   `-> s2` fills `s2.incomingSections` (opposite maintained by the model setter, not cleared); (b) the
   qualified-name loop: nested nodes `a.b.c`, an unnamed root, a port/label under a named node;
   (c) `outgoingSections` resolves only among the same edge's sections, by identifier, and an unknown
   section id yields Xtext's `Couldn't resolve reference to ElkEdgeSection 'x'.` text from the vector.

## Write-set
`src/graph/text/naming/ElkGraphQualifiedNameProvider.ts`, `src/graph/text/scoping/ElkGraphScopeProvider.ts`
(and `src/graph/text/scoping/AbstractElkGraphScopeProvider.ts` only if step 2 requires it),
`src/graph/text/linking/ElkGraphLinker.ts`, `src/graph/text/linking/ElkGraphReferences.ts` (the T14/T16
reflection facades for ElkGraph); colocated `*.test.ts` implicit.

## Read-set
- `naming/ElkGraphQualifiedNameProvider.xtend:21-44`, `scoping/ElkGraphScopeProvider.xtend:27-45`,
  `linking/ElkGraphLinker.xtend:25-40` (under the graph.text `src/org/eclipse/elk/graph/text/`)
- `src-gen/org/eclipse/elk/graph/text/scoping/AbstractElkGraphScopeProvider.java`, `ElkGraph.xtext:1-120` (cross-reference rules)
- Xtext (scratchpad `xtext-src/org/eclipse/xtext/`): `naming/DefaultDeclarativeQualifiedNameProvider.java`,
  `naming/QualifiedName.java`, `scoping/Scopes.java` (`scopeFor`), `scoping/impl/DelegatingScopeProvider.java`,
  `linking/impl/{Linker,AbstractCleaningLinker,DefaultLinkingService}.java`
- `src/xtext/{naming,scoping,linking}/**` (T8, T14, T16 as landed), `src/graph/text/conversion/**`, `src/graph/text/parser/ParseRecords.ts` (T13, T15)
- `src/graph/ElkGraphPackage.ts`, `src/graph/{ElkConnectableShape,ElkEdgeSection}.ts`
- `test/golden/refs/java/graph-text-parse.json` (T3 linking rows)

## Decisions
- [G5](../decisions.md#g5--diagnostic-fidelity) linking diagnostics exact; syntax not involved here.
- [G3](../decisions.md#g3--option-registry-for-refs) not relevant to scoping (no option lookup).
- AD-8/AD-9 (`CLAUDE.md`): Xtext/EMF EPL source only; AD-11 plain classes, Java accessor names.

## Interface contract

- **Implements the reflection facades** defined by T14 (`src/xtext/scoping/EReferenceInfo.ts`: `EReferenceInfo`,
  `EClassRef`) and T16 (`src/xtext/linking/impl/ReferenceAccess.ts`) for ElkGraph's cross-references (`sources`,
  `targets`, `incomingShape`, `outgoingShape`, `outgoingSections`), in `src/graph/text/linking/ElkGraphReferences.ts`. Shapes as landed in T14/T16.
Consumes T15 `{root, syntaxErrors, references[{owner,feature,text,line,index}], positions}`, T14/T16/T8
Xtext-named classes. Produces `new ElkGraphQualifiedNameProvider()`, `new ElkGraphScopeProvider(...)`,
`new ElkGraphLinker(...)` with the constructor shapes T18 needs (T18 builds them; if T16's `Linker`
constructor takes the scope/naming/linking-service collaborators, accept exactly those). Linking
diagnostics follow T16's `{severity, message, line}` shape.

## Acceptance criteria
- Given every T3 linking row, when parsed and linked, then each target, message, severity and line equals the vector.
- Given an edge between nodes, when linking runs, then `incomingEdges`/`outgoingEdges` stay populated and unduplicated (#170) and `incomingSections` is filled for section chains.
- Given a section reference to a section of another edge, when linked, then it is unresolved with the vector's message.
- Given a node named `a` inside a root without identifier, then its qualified name is `a`; inside named `r` it is `r.a`; an edge section's is its identifier alone.

## Quality bar
README gates; TDD from the T3 vectors; `npm run complexity` clean on the new files; every ported symbol
has `@see` to the Xtend file; SPDX header.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not edit `src/xtext/**`, T13–T16 files, vectors or refs; if the Xtext subset lacks something,
journal it and add it as a helper only inside the write-set (otherwise stop 1). No OpenJDK/Guava/ANTLR
source. Do not commit; the orchestrator commits per task.
