<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Evidence: oracle modes and JVM vectors

Everything the port is checked against is recorded on the JVM first (AD-13), on the core registry (D4). The five
tasks have disjoint write-sets and run in parallel. T2 owns `elkj-vectors.sh`, which runs every
`tools/vectors/Elkj*Vectors.java` in sorted order, so T3–T5 add their programs without touching it; the orchestrator
runs it once all five land.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Oracle: `.elkj` reader, `parse-elkj` and `convert` modes, D12 seam patch | java-architect | tools/oracle/harness/{CaseSpec,CaseRunner,ElkModelReader,ElkOracle}.java, tools/oracle/harness/ElkjConverter.java, tools/oracle/patches/0002-*.patch, tools/oracle/run.sh | — | [x] |
| T2 | Lexer + converter vectors and the `elkj-vectors.sh` runner | java-architect | tools/vectors/ElkjLexerVectors.java, tools/vectors/elkj-lexer-cases.txt, tools/vectors/elkj-vectors.sh, test/golden/refs/java/graph-json-text-lexer.json | — | [x] |
| T3 | Parse + link vectors incl. lazy-link timing | java-architect | tools/vectors/ElkjParseVectors.java, tools/vectors/elkj-parse-scenarios/**, test/golden/refs/java/graph-json-text-parse.json, .gitattributes | — | [x] |
| T4 | Validate vectors | java-architect | tools/vectors/ElkjValidateVectors.java, tools/vectors/elkj-validate-scenarios/**, test/golden/refs/java/graph-json-text-validate.json | — | [x] |
| T5 | Write vectors (`serialize(format())`) | java-architect | tools/vectors/ElkjWriteVectors.java, tools/vectors/elkj-write-scenarios/**, test/golden/refs/java/graph-json-text-write.json | — | [x] |

Batch done when every task's acceptance criteria pass, each recorder run twice is byte-identical, and the README
gates are green (the 4b vectors and refs unchanged).
