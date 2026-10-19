<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `ElkGraphJsonValueConverterService` and the `Number`, `PropertyKey`, `PropertyValue` converters

**Agent:** typescript-pro · **Commit:** `feat(T9): port the elkj value converters`

## Context
Upstream `conversion/` (4 Xtend files, 273 lines; compiled forms in `xtend-gen/`). They differ from the `.elkt`
converters in `src/graph/text/conversion/` (4b) and must be their own classes (separate Java classes in a bundle that
cannot import `graph.text`, AD-8): `PropertyValueValueConverter.toString` quotes non-numeric strings and prints
`true`/`false`/`null` bare, `unquoteIfNecessary` strips `"…"`/`'…'` only (no qualified-name converter);
`PropertyKeyValueConverter.toValue` unquotes before splitting, `toString` quotes unknown keys;
`NumberValueConverter` prints whole doubles through `intValue()`. AD-16a/b and the erased-cast rule
(`docs/translation-rules.md` §6.7, `src/java/lang/JavaCast.ts`) apply at the converters' typed `toString` methods.

## Task
1. `ElkGraphJsonValueConverterService.ts` extending `src/xtext/common/services/DefaultTerminalConverters` (as
   `src/graph/text/conversion/ElkGraphValueConverterService.ts` does): rule-name constants and the grammar's
   `RuleLookup`, registrations `Number`, `PropertyKey`, `StringValue`, `NumberValue`, `BooleanValue` (one shared
   `PropertyValueValueConverter`), the `.elkj` keyword set for the ID converter, T8's `tokenize` as token source.
2. `NumberValueConverter.ts`, `PropertyKeyValueConverter.ts`, `PropertyValueValueConverter.ts`, each line by line from
   the Xtend with `@see` and `checkCast` at the bridge sites (as 4b's converters after the 2026-10-15 cast fix).
3. Tests: replay every converter row of `graph-json-text-lexer.json` (class + message for converter errors; class only
   for JDK-raised errors per the recorder header; the two `number`-unrepresentable box rows of 4b's kind skipped with
   the same documented reason if they recur). The `Document` rows need the parser: T13 replays them, not T9.

## Write-set
`src/graph/json/text/conversion/**` (+ colocated tests).

## Read-set
Upstream `conversion/*.xtend` and `xtend-gen/.../conversion/*.java`, `src/graph/text/conversion/*.ts`,
`src/xtext/common/services/DefaultTerminalConverters.ts`, `src/xtext/conversion/**`, T2/T8 contracts.

## Interface contracts (outputs)
`ElkGraphJsonValueConverterService` (rule names exported as constants, e.g. `ElkGraphJsonRuleName`), consumed by T11
(`toValue` with a node), T12 (link text), T15 (`toString`).

## Acceptance criteria
- Given every converter row, when replayed, then output or error class/message match (skips listed and justified).
- Given `"elk.direction"` and `'elk.direction'` as `PropertyKey` input, when converted, then both give the registered
  `direction` option; given an unknown key, then a fresh unregistered `Property` with the original text as id.
- Given a non-numeric string value, when `PropertyValue.toString` runs, then it is double-quoted; `true` stays bare.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
