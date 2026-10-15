<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — `ElkGraphJsonFormatter` line by line; `ElkGraphJsonText.serialize`; write→reparse

**Agent:** typescript-pro · **Commit:** `feat(T16): port elkgraphjsonformatter and add serialize with round trip`

## Context
`formatting2/ElkGraphJsonFormatter.xtend` (240 lines) on the existing `src/xtext/formatting2` subset (4b's
`AbstractFormatter2`, `FormattableDocument`, region access). D3: the writer is `serialize(format())` of an
`EcoreUtil.copy`-like input without a node model; byte-exact against T5's `formatted`. 4b precedent:
`src/graph/text/formatting2/ElkGraphFormatter.ts`, `ElkGraphText.serialize`, `test/golden/elkt-roundtrip.test.ts`.
Stop 10 if the formatter needs `formatting2` beyond the subset (extend the subset only where the Xtend needs it, and
journal each addition).

## Task
1. `formatting2/ElkGraphJsonFormatter.ts`: every `format` dispatch method line by line with `@see` line ranges.
2. `ElkGraphJsonText.serialize(graph): string` (input not mutated, as 4b's), throwing the T15 serialization error where
   the oracle fails.
3. Tests: replay every T5 row's `formatted` byte-exact (error rows by presence) and its `reparse` (load the TS output,
   compare error count and export); `test/golden/elkj-roundtrip.test.ts`: every curated input and T3 scenario loads,
   serializes and reloads to an equal graph (lossy cases equal to the oracle's own reparse).

## Write-set
`src/graph/json/text/formatting2/**` (+ tests), `src/graph/json/text/ElkGraphJsonText.ts` (+ its test),
`test/golden/elkj-roundtrip.test.ts`.

## Read-set
Upstream `formatting2/ElkGraphJsonFormatter.xtend`, `src/graph/text/formatting2/ElkGraphFormatter.ts`,
`src/xtext/formatting2/**`, `test/golden/elkt-roundtrip.test.ts`, `test/helpers/elkt-canon.ts`, T5/T13/T15 contracts.

## Interface contracts (outputs)
`ElkGraphJsonText.serialize(graph): string`. Consumed by T17.

## Acceptance criteria
- Given every T5 row, when serialized, then the output equals `formatted` byte for byte (errors by presence).
- Given every row's TS output, when reloaded, then the error count and export equal the recorded `reparse`.
- Given every curated input, when loaded, written and reloaded, then the graphs are equal (or lossy exactly as the
  oracle).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
