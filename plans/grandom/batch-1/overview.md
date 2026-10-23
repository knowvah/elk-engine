<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Vector script and lexer vectors

T1 creates `tools/vectors/elkr-vectors.sh` (the `elkt-vectors.sh` pattern) and the first recorder, so batch 2's
three recorders only add `Elkr*Vectors.java` files and scenario dirs. It also claims the `.prettierignore` and
`.gitattributes` entries for every `.elkr` vector input up front, so no batch-2 task writes those files.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | `elkr-vectors.sh` + `ElkrLexerVectors` + lexer cases → `grandom-lexer.json` | java-architect | tools/vectors/{elkr-vectors.sh,ElkrLexerVectors.java,elkr-lexer-cases.txt}, test/golden/refs/java/grandom-lexer.json, .prettierignore, .gitattributes | — | [x] |

Batch done when T1's acceptance criteria pass and the README gates are green (including the new `elkr-vectors.sh`
cmp line for the lexer file).
