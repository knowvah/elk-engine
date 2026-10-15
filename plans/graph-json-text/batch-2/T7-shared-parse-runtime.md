<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Move the generic parse runtime to `src/xtext/parser/` (D1)

**Agent:** typescript-pro · **Commit:** `refactor(T7): move the generic parse runtime to src/xtext/parser`

## Context
`src/graph/json/text` may not import `src/graph/text` (AD-8, `bundle-deps.json`). `src/graph/text/parser/
ParseRecords.ts` (493 lines) holds generic parse machinery next to `.elkt` tables. `src/xtext` may import only
`src/emf`, `src/java`, `src/guava` (module-boundaries fitness test), so the moved code must not mention `ElkNode` or
any ElkGraph type.

## Task
1. Move to `src/xtext/parser/` (one class per file, AD-7; names unchanged): `TokenCursor`, `ParseSession`,
   `ParseRecords` (the `INodeModel` + `IssueLocator` implementation), `ReferenceNode`, `SyntaxFailure`, and the
   interfaces `ParseDiagnostic`, `ReferenceRecord`, `Assignment`, `Span`, `GroupMember`. Make them generic over the
   token type (and the root type where needed), e.g. `TokenCursor<T extends Token>`; a minimal `Token` interface
   (`type`, `text`, `line`, `offset`, `hidden`) lives with them.
2. `src/graph/text/parser/ParseRecords.ts` keeps the `.elkt`-specific parts (`Tok`, `RuleName`, `ParseResult` with its
   `ElkNode` root, any `.elkt` token-type references) and re-exports nothing it no longer owns; the `.elkt` parser files
   import the runtime from `src/xtext/parser/`.
3. Tests: tests of the moved classes move with them **verbatim** (only import paths and generic arguments change); no
   assertion changes (AD-13). Update the import path of `SyntaxFailure` in
   `test/architecture/exception-hierarchy.fitness.test.ts` (its parent stays `Error`, port-local).
4. Mark the moved files as port-local substitutes for Xtext's parser/node-model runtime in their doc comments (no
   `@see` to Xtext classes they do not port). Docs pages are T18's; do not edit them here.

## Write-set
`src/xtext/parser/**` (+ colocated tests), `src/graph/text/parser/{ParseRecords,ElkGraphParser,ElkGraphParserEdges}.ts`
and their colocated tests (`ParseRecords.test.ts`, `ElkGraphParser.test.ts`, `ElkGraphParser.replay.test.ts`,
`ElkGraphParserEdges.test.ts`), `test/architecture/exception-hierarchy.fitness.test.ts`.

## Read-set
`src/graph/text/parser/ParseRecords.ts`, `ElkGraphParser.ts:1-60`, `ElkGraphParserEdges.ts:1-40`,
`test/architecture/module-boundaries.fitness.test.ts`, `decisions.md#d1`.

## Interface contracts (outputs)
`src/xtext/parser/` exports the classes and interfaces above with unchanged method names and semantics, generic over
`T extends Token`. Consumed by T11 (and by `src/graph/text`).

## Acceptance criteria
- Given the move, when every 4b test runs, then all pass with no assertion changed.
- Given `tools/vectors/elkt-vectors.sh` and `tools/oracle/regen-elkt-refs.sh`, when rerun, then every 4b ref and vendored
  input is byte-identical.
- Given the fitness tests, when run, then `src/xtext/parser` imports only `src/emf`, `src/java`, `src/guava` and itself.

## Quality bar / stop
Stop 5 if any 4b test or ref changes, or if anything beyond imports and generic parameters changes in `src/graph/text`.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit (imports only).
