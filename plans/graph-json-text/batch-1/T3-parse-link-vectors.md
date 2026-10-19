<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Parse + link vectors, including lazy-link timing

**Agent:** java-architect · **Commit:** `test(T3): record elkj parse and link behaviour from the jvm`

## Context
Mirror 4b's `ElktParseVectors.java` and `graph-text-parse.json` (row keys `id, input, diagnostics, graph,
properties, connections, json`). `.elkj` links lazily (D11): `sources`/`targets` stay proxies until read, so the
recorder must capture *when* diagnostics appear and what an unresolved reference looks like. These rows decide
whether D11 B (eager with lazy-equivalent results) suffices (stop 9).

## Task
1. `ElkjParseVectors.java` over `tools/vectors/elkj-parse-scenarios/*.elkj` (one case per file). Append to
   `.gitattributes` the rule `tools/vectors/elkj-*-scenarios/** -text` (byte-meaningful inputs, as 4b's `elkt` rule) so
   CR/CRLF scenarios in every batch-1 scenario directory survive checkout; T3 is that line's only writer.
2. Per case record, in this order: `diagnosticsAtLoad` (`resource.getErrors()/getWarnings()` right after load, before
   any reference access), `graph` (shape as 4b, but read **without** touching `sources`/`targets`), `properties`
   (as 4b, incl. `LayoutOptionProxy` values), then `links` (per edge in document order: each `sources`/`targets`
   element's resolved identifier path or `{"proxy": true, "uriFragment": …}` after access), `diagnosticsAfterResolve`
   (after `EcoreUtil2.resolveLazyCrossReferences`), and `json` (parse-only export as the oracle writes it; record a
   thrown exporter error as `{throws:{cls,msg}}`).
3. Scenarios (D2 tier 3 and linking): bare keys, single-quoted strings, trailing commas everywhere the grammar allows
   them, all three spellings of every key, `properties` vs `layoutOptions`, unknown members (nested objects/arrays,
   `null`), labels with `text`, shapes with x/y/width/height (ints, floats, signs, exponents), duplicate identifiers,
   edges to ports and nodes, unresolved and empty references, references to labels/edges, forward references,
   nesting, an empty graph, syntax errors (presence only, D6), conversion errors (bad numbers, `null` option values).

## Write-set
`tools/vectors/ElkjParseVectors.java`, `tools/vectors/elkj-parse-scenarios/**`,
`test/golden/refs/java/graph-json-text-parse.json`, `.gitattributes` (one appended line).

## Read-set
`tools/vectors/ElktParseVectors.java`, `ElkGraphJson.xtext`, Xtext `linking/lazy/LazyLinker.java`,
`LazyLinkingResource.java` (EPL), `decisions.md#d11`.

## Interface contracts (outputs)
`graph-json-text-parse.json` = `{elkCommit, xtextVersion, registry:"core", cases:[{id, input, diagnosticsAtLoad,
graph, properties, links, diagnosticsAfterResolve, json}]}`. Consumed by T11 (graph, properties, syntax), T12 (links,
both diagnostic lists), T13 (all).

## Acceptance criteria
- Given an edge to an unknown id, when recorded, then the row shows whether the diagnostic is in `diagnosticsAtLoad`,
  in `diagnosticsAfterResolve`, or both, and how the export renders the unresolved source.
- Given every lenient-syntax scenario, when recorded, then each parses without a syntax diagnostic.
- Given the recorder run twice, when compared, then the outputs are byte-identical.

## Observability / Rollback
N/A — tooling only. Reversible: revert the commit.
