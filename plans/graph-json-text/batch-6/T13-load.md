<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Entry point `ElkGraphJsonText` with `load`; full T3 replay; curated refs

**Agent:** typescript-pro · **Commit:** `feat(T13): add elkgraphjsontext.load wiring lexer, parser and linker`

## Context
4b precedent: `src/graph/text/ElkGraphText.ts` (`load` → `{root, errors}`, never throws on bad input) and
`ElkGraphTextServices.ts` (one place that constructs the converters, naming, scoping, linker). D5: internal entry
point, nothing exported from `src/index.ts`. T14 adds `validate`, T16 `serialize` to the same file.

## Task
1. `ElkGraphJsonTextServices.ts`: construct the T9 converter service, T10 naming/scoping, T12 linker.
2. `ElkGraphJsonText.ts`: `load(text): { root, errors }` — tokenize, parse, link; `errors` = syntax, conversion and
   load-time linking diagnostics in the oracle's order (T3 `diagnosticsAtLoad`); the deferred ones are kept with the
   result for `validate` (T14). Never throws on bad input.
3. Tests: the full T3 replay through `load` (graph, properties, links, diagnostics, `json` via
   `test/helpers/graph-json-oracle.js` `exportLikeOracle`), T2's `Document` converter rows, and
   `ElkGraphJsonText.curated.test.ts` over T6's vendored inputs (hash check against `_meta.json`, then the parse ref;
   runs in CI without elk-models), plus the largest curated model loading under 1 s.

## Write-set
`src/graph/json/text/{ElkGraphJsonText,ElkGraphJsonTextServices}.ts` (+ colocated tests incl.
`ElkGraphJsonText.curated.test.ts`).

## Read-set
`src/graph/text/{ElkGraphText,ElkGraphTextServices}.ts`, `src/graph/text/ElkGraphText.curated.test.ts`,
`test/helpers/graph-json-oracle.ts`, T3/T6/T12 contracts.

## Interface contracts (outputs)
`ElkGraphJsonText.load(text): { root: ElkNode | null; errors: ElkTextDiagnostic-like[] }` (reuse the 4b diagnostic
shape, re-declared locally if importing it would cross bundles). Consumed by T14, T16, T17.

## Acceptance criteria
- Given every T3 row, when loaded, then graph, properties, links, load diagnostics and export match.
- Given every curated input, when loaded, then its bytes hash to `_meta.json` and the export equals the parse ref.
- Given any malformed text, when loaded, then `load` returns errors and does not throw.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.

## Amendment (D13, 2026-10-16)
T12 is replaced by T12a–T12f (lazy linking). `ElkGraphJsonTextServices` assembles `ElkGraphJsonLazyLinker` (T12f) and a
`LazyLinkingResource` (T12d) in a `ResourceSetImpl` (T12a) with the T10 scope/naming and the default linking service;
`load` parses into that resource and runs `linkModel` (proxies, no linking diagnostics). `errors` = the resource's
errors right after load (T3 `diagnosticsAtLoad`); the result keeps the live resource so later access/validation append
to its errors. Replay adds `proxiesAtLoad`, `diagnosticsAfterLinks`, `diagnosticsAfterResolveOnly`,
`diagnosticsAfterExport` and `json` from an export-only load; the export of an unresolved reference expects the
message-less `IllegalArgumentException` (2026-10-14 unknown-endpoint mapping, extended to `.elkj` by D13; extend the
`docs/conformance.md` entry in T18) and exactly the one `diagnosticsAfterExport` diagnostic. Also replay
`graph-json-text-inverse.json` (T12h) through `load`. Write-set unchanged.
