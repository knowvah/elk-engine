<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `ElkGraphJsonQualifiedNameProvider`, `ElkGraphJsonScopeProvider`

**Agent:** typescript-pro · **Commit:** `feat(T10): port elkj naming and scoping`

## Context
Upstream `naming/ElkGraphJsonQualifiedNameProvider.xtend` (flat: `QualifiedName.create(element.identifier)` for any
`ElkGraphElement`, unlike `.elkt`'s hierarchical names) and `scoping/ElkGraphJsonScopeProvider.xtend` (the
`ELK_EDGE_SECTION__OUTGOING_SECTIONS` case scopes an edge's sections by identifier; everything else goes to the
delegate). Generated bindings (`AbstractElkGraphJsonRuntimeModule.java:166-202`) match `.elkt`'s:
`ImportedNamespaceAwareLocalScopeProvider` delegate, `DefaultGlobalScopeProvider` (4b substitutes
`SingleResourceGlobalScopeProvider`), case-sensitive linking. The edge-section case is unreachable from the grammar
(no section syntax) but is ported and unit-tested (the Java is the spec).

## Task
1. `naming/ElkGraphJsonQualifiedNameProvider.ts` extending `src/xtext/naming/DefaultDeclarativeQualifiedNameProvider`
   with the `qualifiedName(ElkGraphElement)` dispatch; a null identifier follows `QualifiedName.create`'s contract
   and the dispatcher's swallow rule (AD-16a; `PolymorphicDispatcher` returns null for a RuntimeException).
2. `scoping/ElkGraphJsonScopeProvider.ts` extending `src/xtext/scoping/impl/DelegatingScopeProvider` (as
   `src/graph/text/scoping/ElkGraphScopeProvider.ts`) with `getScope` and `getScopeForEdgeSection`.
3. Unit tests from the Xtend (expected values from the source, AD-13): flat names across nesting, duplicate names
   (first wins as the scope's `getSingleElement` does), null identifiers, the section scope.

## Write-set
`src/graph/json/text/naming/**`, `src/graph/json/text/scoping/**` (+ colocated tests).

## Read-set
Upstream `naming/*.xtend`, `scoping/*.xtend`, `src/graph/text/{naming,scoping}/*.ts`, `src/xtext/{naming,scoping}/**`.

## Interface contracts (outputs)
`ElkGraphJsonQualifiedNameProvider`, `ElkGraphJsonScopeProvider` (constructors mirror the 4b counterparts). Consumed
by T12.

## Acceptance criteria
- Given nodes `a` and `b` nested anywhere, when names are computed, then each is the single segment of its id.
- Given two elements with the same id, when a reference resolves, then the result matches the Xtext scope's single-
  element rule (asserted against the T3 rows in T12; here from the source).
- Given an edge section context, when `getScope` runs, then the scope holds the edge's sections by identifier.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
