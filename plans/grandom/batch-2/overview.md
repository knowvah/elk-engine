<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Remaining vectors; shims; model; lexer

T2 and T3 add the remaining recorders (they share only `elkr-vectors.sh`, which they run but do not edit). T4–T6
start the TS side. Write-sets are disjoint; all five run in parallel. Recorders run the JVM; give T3 the most time
(~35–45 scenarios, each recorded twice for the determinism check).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T2 | Parse + validate recorders and scenarios | java-architect | tools/vectors/{ElkrParseVectors,ElkrValidateVectors}.java, tools/vectors/elkr-{parse,validate}-scenarios/**, test/golden/refs/java/grandom-{parse,validate}.json | T1 | [x] |
| T3 | Generate recorder and scenarios | java-architect | tools/vectors/ElkrGenerateVectors.java, tools/vectors/elkr-generate-scenarios/**, test/golden/refs/java/grandom-generate.json | T1 | [x] |
| T4 | `ElkMath.boundi`; `Collections.shuffle(list)`; CLAUDE.md sentence | typescript-pro | src/core/math/ElkMath.ts (+ test), src/java/util/Collections.ts (+ test), CLAUDE.md | — | [x] |
| T5 | `gRandom` model classes and enums | typescript-pro | src/core/debug/grandom/gRandom/** (+ tests) | — | [x] |
| T6 | Lexer, token types, replay; fitness admission | typescript-pro | src/core/debug/grandom/parser/{GRandomTokenType,GRandomLexer}.ts (+ tests), test/architecture/module-boundaries.fitness.test.ts | T1 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green, including all four
`grandom-*.json` files `cmp`-identical after a fresh `elkr-vectors.sh /tmp/elkr-check`.
