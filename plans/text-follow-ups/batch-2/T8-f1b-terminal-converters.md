<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: F1b `DefaultTerminalConverter` and terminal registration (typescript-pro)

**Goal:** every non-fragment terminal rule without its own converter gets Xtext's `DefaultTerminalConverter`, as
`AbstractDeclarativeValueConverterService.registerEFactoryConverters` does, so the recorded SIGNED_INT, FLOAT,
comment, `WS` and `ANY_OTHER` converter rows replay.

## Context

`src/xtext/conversion/impl/AbstractDeclarativeValueConverterService.ts:183-201` registers only `EString` datatype
rules and documents the terminal arm as unported. Xtext 2.36.0 (`registerEFactoryConverters`): datatype rules get
`EFactoryValueConverter(datatype)`; each non-fragment terminal rule gets
`defaultTerminalConverterFactory.create(terminalRule)` under its simple and qualified names when missing.
`DefaultTerminalConverter extends AbstractLexerBasedConverter<Object>`: `toValue` =
`dataType.getEPackage().getEFactoryInstance().createFromString(dataType, string)`, any `Exception` rethrown as
`new ValueConverterException("Error converting string to value", node, exc)`; `toEscapedString` =
`…convertToString(dataType, value)` without a catch; `Factory.create` sets the rule's `EDataType`
(`terminalRule.getType().getClassifier()`) and the rule. Grammar types: `SIGNED_INT` → `EInt`, `FLOAT` → `EDouble`,
`ML_COMMENT`, `SL_COMMENT`, `WS`, `ANY_OTHER` → `EString`.

Rows to replay (`test/golden/refs/java/graph-text-lexer.json`, `graph-json-text-lexer.json`, `converters`):

| Ref | SIGNED_INT | FLOAT | ML_COMMENT | SL_COMMENT | ANY_OTHER | WS | New |
|-----|-----------:|------:|-----------:|-----------:|----------:|---:|----:|
| `.elkt` | 9 | 12 | 4 | 4 | 2 | 2 | 33 |
| `.elkj` | 18 | 27 | — | — | — | (1, already replayed) | 45 |

(Phase 5 said 76: recounted from the refs on 2026-10-20, 78.)

## Write-set

- `src/xtext/conversion/impl/DefaultTerminalConverter.ts` (new; `Factory` as in Java) + test
- `src/xtext/conversion/impl/AbstractDeclarativeValueConverterService.ts` + test (`RuleLookup` gains what the
  terminal arm needs, e.g. the grammar's terminal rules with their `EDataType`)
- `src/xtext/AbstractRule.ts` only if a rule must carry its `EDataType` (check its other implementers first)
- `src/graph/text/conversion/ElkGraphValueConverterService.ts` + test
- `src/graph/json/text/conversion/ElkGraphJsonValueConverterService.ts` + test

## Read-set

- T4's contract ([../batch-1b/T4-f1a-emf-factory.md](../batch-1b/T4-f1a-emf-factory.md#interface-contract-output-consumed-by-t8))
- Xtext 2.36.0 `DefaultTerminalConverter.java`, `AbstractLexerBasedConverter.java`,
  `AbstractDeclarativeValueConverterService.java` (`registerEFactoryConverters`) from raw.githubusercontent.com
- `src/xtext/conversion/impl/{AbstractLexerBasedConverter,EFactoryValueConverter}.ts`
- `src/graph/text/conversion/ElkGraphValueConverterService.ts:30-70`,
  `src/graph/json/text/conversion/ElkGraphJsonValueConverterService.ts:50-80` (`GRAMMAR_TERMINALS`, rule tables)
- Both service tests (`REPLAYED`, `UNREPRESENTABLE_ROWS`, the row loop)

## Rules

- Port every branch (incl. the `isFragment` skip and the "missing" checks); keep Java method boundaries.
- PF2: add the new rules to `REPLAYED` and drop the "not registered" comments; the `UNREPRESENTABLE_ROWS` sets and
  their `toEqual` stay as they are. A new row that a TS `number` cannot represent is stop 4 (list it, do not add it).
- `toBeGreaterThan(400)` and other lower bounds stay untouched.

## Acceptance criteria

- Given a non-fragment terminal rule with no converter, when the service is built, then it gets a
  `DefaultTerminalConverter` under its simple and qualified names; a rule with an explicit converter keeps it.
- Given the `.elkj` lexer ref, when the replay runs, then its 45 SIGNED_INT/FLOAT rows pass and only the 3 existing
  type-erasure rows are skipped.
- Given the `.elkt` lexer ref, then its 33 new rows pass under the same rule.
- Given `toValue` on a malformed number, then it throws `ValueConverterException` with message
  `Error converting string to value` and the EFactory exception as cause, matching the recorded `cls`/`msg`.
- Given the parse, validate and write replays, then they are unchanged.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.

## Commit

`feat(T8): register xtext default terminal converters`; body cites F1, the 78 rows and the three skips.
