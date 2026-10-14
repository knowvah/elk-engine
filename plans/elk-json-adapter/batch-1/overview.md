<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Vectors and goldens first

Five independent tasks with disjoint write-sets. T1, T3, T4, T5 record the JVM's behaviour **before**
any TS port exists (AD-13, J1, J6, J7); T2 is a small `core.util` port.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Gson 2.11.0 JVM vectors | java-architect | tools/vectors/{GsonVectors.java,gson-vectors.sh}, test/golden/refs/java/gson.json | — | [x] |
| T2 | `core.util.Maybe` | typescript-pro | src/core/util/Maybe.ts (+ .test.ts) | — | [x] |
| T3 | `graph.json` import/export/converter JVM vectors | java-architect | tools/vectors/{GraphJsonVectors.java,graph-json-vectors.sh}, tools/vectors/graph-json-scenarios/*, test/golden/refs/java/graph-json.json | — | [x] |
| T4 | `transferLayout` replay JVM vectors | java-architect | tools/vectors/{TransferVectors.java,transfer-vectors.sh}, tools/vectors/transfer-scenarios/*, test/golden/refs/java/graph-json-transfer.json | — | [x] |
| T5 | Oracle `parse` refs of the 4 goldens | tooling-engineer | tools/oracle/regen-parse-refs.sh, test/golden/refs/elk-parse/*.json, test/golden/refs/elk-parse/_meta.json | — | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
