<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Write vectors

**Agent:** java-architect · **Commit:** `test(T5): record elkj serializer output from the jvm`

## Context
Mirror 4b's `ElktWriteVectors.java` (rows `{id, source, formatted, unformatted, reparse}`), for the `.elkj` serializer
(generated `AbstractElkGraphJsonSemanticSequencer`, `ElkGraphJsonTransientValueService`, the generated syntactic
sequencer, `ElkGraphJsonFormatter`, the converters). `formatted` is D3's contract; `unformatted` is what ELK's
converter saves (D2 tier 1) and what T15's sequencer must produce.

## Task
1. `ElkjWriteVectors.java`: inputs under `tools/vectors/elkj-write-scenarios/` — `.elkt` (read through
   `ElkGraphStandaloneSetup`), `.json` (lenient JSON import as the oracle reads it), `.elkj` — plus `java-*` scenarios
   built from the public ElkGraph API. Per input: `EcoreUtil.copy` into a fresh `.elkj` `XtextResource`, then
   `serialize(copy, SaveOptions.format())` = `formatted` and, on another fresh copy, `serialize(copy)` =
   `unformatted`; `reparse` = the formatted text loaded again (errors count + parse-only export).
2. Scenarios: every grammar feature the writer emits (ids, shapes, labels with text and nested labels, ports,
   children, edges with sources/targets, properties of every value class incl. proxies, doubles that print as ints),
   graphs the grammar cannot express (edge sections, bend points, junction points — record what the serializer does),
   missing identifiers, special characters in strings and keys, empty lists, deep nesting.
3. Error rows `{error:{cls,msg}}` recorded exactly; they match by presence (D3).

## Write-set
`tools/vectors/ElkjWriteVectors.java`, `tools/vectors/elkj-write-scenarios/**`,
`test/golden/refs/java/graph-json-text-write.json`.

## Read-set
`tools/vectors/ElktWriteVectors.java`, upstream `serializer/*.xtend`, `formatting2/ElkGraphJsonFormatter.xtend`,
`src-gen/.../serializer/*`.

## Interface contracts (outputs)
`graph-json-text-write.json` = `{elkCommit, xtextVersion, registry:"core", cases:[{id, source, formatted,
unformatted, reparse}]}`; Java scenarios documented so T15/T16 can rebuild them in TS. Consumed by T15, T16.

## Acceptance criteria
- Given a graph with an edge section, when serialized, then the row records the oracle's output or error exactly.
- Given each row's `formatted` text, when reparsed by the JVM, then `reparse.errors` is recorded (0 expected unless
  the grammar is lossy for that input; journal any).
- Given the recorder run twice, when compared, then the outputs are byte-identical.

## Observability / Rollback
N/A — tooling only. Reversible: revert the commit.
