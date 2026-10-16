<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12h — JVM vectors: inverse state and resolution paths

**Agent:** java-architect · **Commit:** `test(T12h): record elkj proxy inverse state from the jvm`

## Context
D13 risk 2 (`batch-5/d13-plan.md` §1(b)(c)): per the EMF source, `EcoreEList.resolve` (access through `get`) replaces
the proxy without adding the edge to the target's inverse list, while `LazyLinkingResource.resolveLazyCrossReferences`
uses `setUnique` (inverse add). Also `LazyLinker.createAndSetProxy` uses `addUnique` on `ElkEdge.sources` — a
`ManyInverse` list — so the proxy `ElkNode` itself may receive the edge in its `outgoingEdges`. T3 never recorded
inverse lists. AD-13: record before porting.

## Task
1. `tools/vectors/ElkjInverseVectors.java` (picked up by `elkj-vectors.sh`'s `Elkj*Vectors.java` glob; same setup as
   `ElkjParseVectors.java`, incl. the `ElkGraphPackage` touch and the core registry), writing
   `graph-json-text-inverse.json` = `{elkCommit, xtextVersion, registry:"core", cases:[…]}` over every
   `tools/vectors/elkj-parse-scenarios/link-*.elkj` plus `lenient-elk-json-source-target`, `lenient-plain-elk-json`.
2. Per case, for each of four fresh loads — `afterLoad` (no access), `afterAccess` (every edge's `sources`/`targets`
   read through `get(i)` in model order), `afterResolve` (`EcoreUtil2.resolveLazyCrossReferences` only), `afterExport`
   (parse-only export only; record a throw as `{throws:{cls,msg}}`) — record per connectable shape in model pre-order
   (including proxies reachable from edges, marked `{proxy:true, uriFragment}`): `outgoingEdges`/`incomingEdges` read
   with `basicGet` semantics (no resolution: use `((InternalEList<?>) list).basicList()` or equivalent) as edge
   identifiers, and per edge the raw (`basicGet`) `sources`/`targets` entries (id or proxy fragment), plus
   `resource.getErrors()` messages in order.
3. Run three times, `cmp` identical. The existing `graph-json-text-parse.json` must stay byte-identical (do not touch
   `ElkjParseVectors.java`).

## Write-set
`tools/vectors/ElkjInverseVectors.java`, `test/golden/refs/java/graph-json-text-inverse.json`.

## Interface contracts (outputs)
`graph-json-text-inverse.json` rows `{id, input, afterLoad, afterAccess, afterResolve, afterExport}`, each
`{shapes:[{path, kind, proxy?, uriFragment?, outgoingEdges, incomingEdges}], edges:[{id, sources, targets}], errors}`.
Consumed by T12e, T12f, T13.

## Acceptance criteria
- Given `link-unresolved-source`, when recorded, then the proxy's own `outgoingEdges` and each real target's
  `incomingEdges` are visible in all four states.
- Given a resolvable reference, when recorded, then the rows show whether the target's inverse list holds the edge
  after access-only vs. after `resolveLazyCrossReferences`.
- Given the recorder run three times, when compared, then byte-identical.
