<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Eager linking with lazy-equivalent observable results (D11 B)

**Agent:** typescript-pro · **Commit:** `feat(T12): link elkj references with lazy-equivalent results`

## Context
`.elkj` uses Xtext's `LazyLinker` (`DefaultRuntimeModule.java:174-175`; the runtime module never overrides it). D11
B: resolve at load with the `src/xtext/linking` machinery (`Linker`, `DefaultLinkingService`, `LinkingHelper`,
diagnostics) and the T10 scope/naming, then make every observable result equal the recorded lazy behaviour: which
diagnostics `load` reports (T3 `diagnosticsAtLoad`), which only appear once references are resolved
(`diagnosticsAfterResolve`, reported by `validate`), their order and text, and how an unresolved reference is
represented in the graph and the export (T3 `links`, `json`).

## Task
1. `linking/` classes for the `.elkj` wiring: a `ReferenceAccess` implementation for ElkGraph (as 4b's
   `ElkGraphReferences`, without `.elkt`-specific parts), a linker that links eagerly and **defers** the diagnostics the
   lazy linker would report only on resolution (keep them for T14's `validate`), and whatever the recorded unresolved
   representation needs (e.g. the reference left unset) — never an EMF proxy (stop 9 if a row needs one).
2. Document the equivalence argument in the class doc: each lazy behaviour, the eager mechanism reproducing it, and the
   T3 rows that prove it.
3. Tests: replay T3's `links`, `diagnosticsAtLoad` and `diagnosticsAfterResolve` for every row (parse with T11, link,
   compare), plus unit tests for duplicate, forward and unresolved references and references to non-shapes.

## Write-set
`src/graph/json/text/linking/**` (+ tests).

## Read-set
`decisions.md#d11`, Xtext `linking/lazy/{LazyLinker,LazyLinkingResource}.java` (EPL; observable behaviour only),
`src/xtext/linking/**`, `src/graph/text/linking/{ElkGraphLinker,ElkGraphReferences}.ts`, T3/T10/T11 contracts.

## Interface contracts (outputs)
`linkModel(result: ParseResult) → { loadDiagnostics, deferredDiagnostics }` (names are push-forward), consumed by T13
(load errors) and T14 (`validate` adds the deferred ones).

## Acceptance criteria
- Given every T3 row, when parsed and linked, then `links` match and the two diagnostic lists match in order and text.
- Given an unresolved source, when exported, then the export equals the row's `json` (or its recorded exporter error).
- Given a row whose behaviour needs a real proxy, when analysed, then the task stops (stop 9) with the mechanism named.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
