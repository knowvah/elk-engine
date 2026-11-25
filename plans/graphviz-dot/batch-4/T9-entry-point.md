<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9: the `GraphvizDot` entry point

**Owner:** subagent (`claude`, sonnet). **Budget:** 30 min. **Commit:** `feat(graphviz-dot): add the internal dot entry
point`.

## Context

D5. `DotResourceSetProvider` and `XtextResource` give the layouter and the recorders two operations: load text (with
`getErrors()` and `getParseResult().getRootASTElement()`) and save a model (`ISerializer`). `src/graph/text/ElkGraphText.ts`
is the pattern.

## Write-set

`src/alg/graphviz/dot/GraphvizDot.ts`, `src/alg/graphviz/dot/GraphvizDot.test.ts`.

## Read-set

`transform/DotResourceSetProvider.java`; `GraphvizLayoutProvider.java:204-222, 257-290` (how step 3 will call it);
`src/graph/text/ElkGraphText.ts`; T7's parser and T8's serializer; the parse and write refs.

## Steps

1. Tests first: `load` on every parse scenario gives the recorded dump and errors; `load` never throws on bad input;
   `serialize(load(text).model, { format })` on every write row gives the recorded text; `serialize` throws on a recorded
   exception row.
2. Implement `load` and `serialize` as D5 types them. The `GraphvizDotRuntimeModule` binding becomes plain construction, with
   an `@see` to the module.

## Acceptance criteria

- Given each parse scenario, when loaded, then `model` and `errors` equal the recorded values (syntax by presence and line).
- Given text with a syntax error, when loaded, then no exception escapes and `errors` is non-empty.
- Given each write row's source text, when loaded and serialized with the row's `format` flag, then the text equals the
  recorded output.

**Observability:** N/A. **Rollback:** reversible (new files).
