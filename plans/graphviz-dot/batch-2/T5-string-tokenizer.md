<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: `java.util.StringTokenizer` shim

**Owner:** subagent (`claude`, sonnet). **Budget:** 30 min. **Commit:** `feat(java): add the stringtokenizer shim`.

## Context

`DotExporter` and `DotImporter` tokenize attribute values with `java.util.StringTokenizer` (D10). AD-9: implement from the
Javadoc only, at https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/StringTokenizer.html. Never read
OpenJDK source. Prove the shim against `test/golden/refs/java/graphviz-dot-jdk.json` (T2).

## Write-set

`src/java/util/StringTokenizer.ts`, `src/java/util/StringTokenizer.test.ts`.

## Read-set

The Javadoc page; `graphviz-dot-jdk.json`; `src/java/util/NoSuchElementException.ts`; another shim with a vector test as the
pattern (`src/java/util/Random.ts` and its test); the call sites in `transform/DotExporter.java` and `DotImporter.java`
(`grep -n StringTokenizer`).

## Steps

1. Test first: replay every `StringTokenizer` row of the ref (token sequence, `countTokens` where recorded, and
   `NoSuchElementException` where recorded).
2. Implement the constructors and methods the transforms call, with Javadoc semantics: delimiters are single UTF-16 chars,
   `returnDelims` only if called, `nextToken(delim)` only if called. The header cites the Javadoc URL.

## Acceptance criteria

- Given every row of `graphviz-dot-jdk.json`'s tokenizer section, when replayed, then each token sequence matches exactly.
- Given an exhausted tokenizer, when `nextToken()` is called, then it throws the `NoSuchElementException` shim.
- Given `src/java`, when the module-boundary fitness runs, then the shim imports nothing from ELK directories.

**Observability:** N/A. **Rollback:** reversible (new files).
