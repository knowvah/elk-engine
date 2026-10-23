<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `.elkr` parser

**Agent:** typescript-pro · **Commit:** `feat(T8): add the grandom recursive-descent parser`

## Context
D2. One method per grammar rule on `src/xtext/parser` (`ParseSession`, `TokenCursor`, `SessionVocabulary`,
`GroupMember` for unordered groups, `ConversionNode`), as `src/graph/json/text/parser/ElkGraphJsonParser*.ts` does.
Data-type rules `Double`, `Float`, `Integer` (`INT ('.' INT)?`) convert through `EFactoryValueConverter`
(`EDoubleObject`, `EFloatObject`, `EIntegerObject`); `Integer` given `2.5` is a conversion diagnostic. Enum rules map
keywords to literals (`'graphs'` → `Form.CUSTOM`). Boolean assignments (`mW?='maxWidth'`, `density?='density'`,
`labels?=Labels`, `minMax?='to'`, `gaussian?=Pm`) set `true`. Unordered groups (`&`) accept each member at most once
in any order.

## Task
1. `GRandomParser.ts`: `RandGraph`, `Configuration`, `Hierarchy`, `Edges`, `Nodes`, `Size`, `Ports`, `Flow`,
   `DoubleQuantity` methods, plus the data-type and enum rules; result shape mirrors 4c (model, syntax diagnostics,
   conversion diagnostics). Split rule methods into `GRandomParserElements.ts` at rule boundaries if the 500-line or
   complexity limits require it.
2. Tests: replay every `grandom-parse.json` row — model dump exact (every feature, `isSet` where recorded) and
   conversion errors exact for rows without syntax errors; syntax errors by presence (D2, corpus D8 #1); a row-count
   assertion; the nine corpus `.elkr` inputs parse without diagnostics.

## Write-set
`src/core/debug/grandom/parser/{GRandomParser,GRandomParserElements}.ts` (+ tests).

## Read-set
`GRandom.xtext`, `src/xtext/parser/*.ts`, `src/xtext/conversion/impl/EFactoryValueConverter.ts`,
`src/graph/json/text/parser/` (rule-method pattern), `src-gen/.../InternalGRandomParser.java` (edge cases only),
T5's model, T6's lexer.

## Interface contracts (outputs)
`parse(text): { model: RandGraph | null; syntaxErrors; conversionErrors }` (exact names follow the 4c result type);
consumed by T9.

## Acceptance criteria
- Given each error-free parse row, when parsed, then the model dump equals the recorded dump exactly.
- Given each syntax-error row, when parsed, then at least one syntax diagnostic is reported (presence).
- Given T2's row with `maxWidth = 2.5` (an `Integer`), when parsed, then the conversion error equals the recorded
  one exactly, and a `Double` written `2` converts to 2.
- Given the nine corpus `.elkr` files, when parsed, then no diagnostics.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
