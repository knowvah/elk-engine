<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Evidence first: JVM recorders and oracle refs

Five tasks that record what the JVM does with the `.elkt` language (lexer, converters, parse + link,
validation, writer) and what the oracle parses from ~30 curated elk-models, **before any TS exists**
(AD-13, G6, G7). No dependencies; T2 lands the shared runner script `elkt-vectors.sh` that T3–T5 plug
their programs into, so the write-sets stay disjoint. Every JVM-side artifact uses the CoreOptions-only
registry (G3).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | `ORACLE_REGISTRY=core` oracle mode + ~30 curated `.elkt` parse refs | tooling-engineer | tools/oracle/run.sh, tools/oracle/harness/ElkOracle.java, tools/oracle/regen-elkt-refs.sh, test/corpus/elkt-curated.json, test/golden/refs/elkt-parse/*.json, test/golden/refs/elkt-parse/_meta.json | — | [ ] |
| T2 | Lexer + value-converter JVM vectors and the generic `elkt-vectors.sh` runner | java-architect | tools/vectors/{ElktLexerVectors.java,elkt-lexer-cases.txt,elkt-vectors.sh}, test/golden/refs/java/graph-text-lexer.json | — | [ ] |
| T3 | Parse + link JVM vectors (`graph-text-parse.json`) | java-architect | tools/vectors/ElktParseVectors.java, tools/vectors/elkt-parse-scenarios/*, test/golden/refs/java/graph-text-parse.json | — | [ ] |
| T4 | Validator JVM vectors (`graph-text-validate.json`) | java-architect | tools/vectors/ElktValidateVectors.java, tools/vectors/elkt-validate-scenarios/*, test/golden/refs/java/graph-text-validate.json | — | [ ] |
| T5 | Writer JVM vectors (`graph-text-write.json`) | java-architect | tools/vectors/ElktWriteVectors.java, tools/vectors/elkt-write-scenarios/*, test/golden/refs/java/graph-text-write.json | — | [ ] |

Run order inside the batch: T3–T5 are written against T2's `elkt-vectors.sh` contract (below), so they
can be developed in parallel; the orchestrator runs `elkt-vectors.sh` once after all five land and
checks that the four `graph-text-*.json` files are produced and byte-stable.

Shared contract (T2 produces, T3–T5 consume): `tools/vectors/elkt-vectors.sh <outDir>` runs every
`tools/vectors/Elkt*Vectors.java` (sorted) as a single-file source program with the oracle classpath,
passing `<outDir> <tools/vectors dir>`; each program writes `<outDir>/graph-text-<x>.json` and begins by
establishing the CoreOptions-only registry (`LayoutMetaDataService.getInstance(new ClassLoader(null) { })`).

Batch done when every task's acceptance criteria pass and the README gates are green.
