<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12f — `.elkj` lazy-linker wiring and reference table

**Agent:** typescript-pro · **Commit:** `feat(T12f): wire lazy linking for elkj`

## Context
D13: `.elkj` uses `LazyLinker` + `LazyLinkingResource` (T12c/T12d) with T10's naming/scoping and the default linking
service. `src/xtext` cannot name ElkGraph classes, so a `graph.json.text` subclass supplies the proxy type (`ElkNode`,
first instantiable `ElkConnectableShape` subtype in `elkgraph.ecore`) and proxy creation (`ElkNodeImpl` with the proxy
URI). `graph.json.text` may not import `src/graph/text/linking/ElkGraphReferences.ts` (AD-8): a local reference table.
T10's `ElkGraphJsonScopeProvider` matches `outgoingSections` by name (journal 2026-10-16); switching it to identity with
the new table is allowed here only if it stays a one-line change in `scoping/` — otherwise leave it.

## Task
1. `src/graph/json/text/linking/ElkGraphJsonLazyLinker.ts` (`getProxyType`, `createProxy` overrides) and
   `ElkGraphJsonReferences.ts` (sources, targets, outgoingEdges, incomingEdges, the edge-section references the scope
   uses), plus a test-visible assembly helper only if T13's services file cannot host it.
2. Tests: parse (T11) → resource (T12d) → `linkModel` for every `graph-json-text-parse.json` row and compare
   `proxiesAtLoad`, `diagnosticsAtLoad` (no linking diagnostics), `links` + `diagnosticsAfterLinks` (access in model
   order), `diagnosticsAfterResolveOnly` (fresh load, `resolveLazyCrossReferences` only), and every
   `graph-json-text-inverse.json` row (T12h). Export rows are T13's.

## Write-set
`src/graph/json/text/linking/**` (+ colocated tests); `src/graph/json/text/scoping/ElkGraphJsonScopeProvider.ts` only
for the optional one-line identity switch.

## Acceptance criteria
- Given every T3 row, when parsed and lazily linked, then `proxiesAtLoad`, `links` and the three linking diagnostic
  lists match in order and text.
- Given every T12h row, when replayed, then the inverse state matches in all four states.
- Given the fitness tests, when run, then `src/graph/json/text` imports no `src/graph/text`.
