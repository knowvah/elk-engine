<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — `elkr-vectors.sh` and the lexer recorder

**Agent:** java-architect · **Commit:** `test(T1): record grandom lexer vectors with elkr-vectors.sh`

## Context
4b/4c record JVM vectors with `tools/vectors/elkt-vectors.sh` / `elkj-vectors.sh`: they discover
`Elkt*Vectors.java` (sorted, C locale), build the classpath from the oracle jars plus the `THIRD_PARTY` p2 bundles
(`oracle_field`, `build_classpath`), check Xtext 2.36.0 (`check_xtext_version`), support `ELKT_VECTORS_LIST=1`, then
source `vector-cache.sh` and call `vc_init <lang>` / `vc_run` per program. Each program runs as a single-file source
program: `java -cp <classpath> <program> <outDir> <tools/vectors dir>`. The grandom bundle jar is already in
`$ELK_ORACLE_DIR/oracle-build.json`; `GRandomStandaloneSetup.doSetup()` registers the language.

## Task
1. `tools/vectors/elkr-vectors.sh`: copy the `elkt-vectors.sh` structure; glob `Elkr*Vectors.java`;
   `ELKR_VECTORS_LIST=1`; `vc_init elkr`. Add the grandom bundle to the classpath if the elkt list lacks it. Header
   comment states usage and outputs. **Do not edit `vector-cache.sh`** (README "Inputs": its bytes salt every cache).
2. `tools/vectors/ElkrLexerVectors.java`: read `elkr-lexer-cases.txt` (one case per block, same format as
   `elkt-lexer-cases.txt`), run `InternalGRandomLexer` through Xtext's token source, write
   `<outDir>/grandom-lexer.json`: rows `{id, input, tokens: [{type, text, line, offset, length, hidden}], lexError}`
   with `type` as `InternalGRandomParser.tokenNames` prints it.
3. `elkr-lexer-cases.txt`: every keyword (incl. each multi-word keyword and prefixes of them such as `cross-hierarchy`,
   `self`, `bipartite`), `+/-`, `INT`, `INT.INT`, `1.`, `.5`, `1.2.3`, negative-looking input, `STRING` both quotes and
   escapes, `ML_COMMENT`, `SL_COMMENT`, unterminated string/comment, `ID` vs keyword (`trees` vs `treesx`), CR/CRLF,
   tabs, junk (`#`, `@`, non-ASCII), and the nine corpus `.elkr` texts.
4. `.prettierignore` and `.gitattributes`: entries for `tools/vectors/elkr-lexer-cases.txt` and
   `tools/vectors/elkr-{parse,validate,generate}-scenarios/` (the latter used by T2/T3), mirroring the elkj block.
5. Run `tools/vectors/elkr-vectors.sh test/golden/refs/java`.

## Write-set
`tools/vectors/{elkr-vectors.sh,ElkrLexerVectors.java,elkr-lexer-cases.txt}`,
`test/golden/refs/java/grandom-lexer.json`, `.prettierignore`, `.gitattributes`.

## Read-set
`tools/vectors/elkt-vectors.sh`, `tools/vectors/ElktLexerVectors.java`, `tools/vectors/vector-cache.sh:1-30`,
`tools/vectors/elkt-lexer-cases.txt` (format), `GRandom.xtext`, `src-gen/.../InternalGRandomLexer.java` (token
numbers, names).

## Interface contracts (outputs)
`grandom-lexer.json` rows as above; consumed by T6. `elkr-vectors.sh <outDir>` runs every `Elkr*Vectors.java`;
T2/T3 only add programs and scenario dirs.

## Acceptance criteria
- Given two runs of `tools/vectors/elkr-vectors.sh /tmp/a` and `/tmp/b`, when compared, then `grandom-lexer.json` is
  byte-identical (`cmp`), and `ELK_VECTORS_CACHE=off` produces the same bytes.
- Given `ELKR_VECTORS_LIST=1`, when run, then it prints `ElkrLexerVectors.java` and exits 0 without a JVM.
- Given the cases file, when recorded, then each multi-word keyword appears as one token row and `1.5` as
  `RULE_INT`, `'.'`, `RULE_INT`.
- Given `shellcheck tools/vectors/elkr-vectors.sh`, when run, then it is clean.

## Observability / Rollback
N/A — no new observable operations (script prints the cache line per program). Reversible: revert the commit.
