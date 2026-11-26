<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: mission start; JVM recorders and refs (before any code)

T1 runs first (orchestrator, about 20 min). T2 and T3 then run in parallel: their write-sets are disjoint, and both read only
T1's oracle record. No TypeScript under `src/` is written in this batch (AD-13: expected values exist before the code).

| Task | Owner | Writes | Needs |
| ---- | ----- | ------ | ----- |
| [T1](T1-mission-start.md) | orchestrator | `tools/oracle/build.sh`, `test/architecture/module-boundaries.fitness.test.ts`, journal | — |
| [T2](T2-language-recorders.md) | subagent | `tools/vectors/dot-vectors.sh`, `Dot{Jdk,Lexer,Parse,Write}Vectors.java`, `dot-lexer-cases.txt`, `dot-parse-scenarios/`, `dot-graphviz-output/`, four refs | T1 |
| [T3](T3-transform-recorders.md) | subagent | `Dot{Export,Import}Vectors.java`, `dot-export-scenarios/`, `dot-import-scenarios/`, `tools/oracle/dot-export-sweep.sh`, `tools/oracle/DotExportSweep.java`, two refs | T1; T2's `dot-vectors.sh` (see below) |

**Shared file:** `dot-vectors.sh` is T2's. T3 only adds programs that the script's `Dot*Vectors.java` glob picks up. T3 starts
once T2 has committed a working `dot-vectors.sh` with `DotJdkVectors` (T2 does that first, about 20 min in). T3's
`dot-graphviz-output/` needs, for `transferLayout`, are met by T2's fixtures: T3 reads them and writes none.

## Common rules (include in every subagent prompt)

- Read the task file, `plans/graphviz-dot/decisions.md` (D4, D6, D7, D10) and `tools/vectors/elkt-vectors.sh` with one of its
  programs (`ElktParseVectors.java`, `ElktWriteVectors.java`) as the pattern. Java recorders run as single-file source
  programs on the oracle classpath.
- Never call `elkCommit()` in a new program (D7, #173). Name #173 in the header comment.
- Refs are written only by `tools/vectors/dot-vectors.sh test/golden/refs/java`, never by hand. Each ref is deterministic: run
  the script twice and `cmp` the outputs before committing.
- Never write to `~/git/knowvah/elk`, `~/git/eclipse-elk/elk-models` or the oracle tree, except through `tools/oracle/` and
  `tools/vectors/` scripts. Never read OpenJDK source (AD-9). Xtext and EMF EPL source are allowed.
- Check `uptime` before each JVM run; wait while it is above 12; run under `nice -n 10`.
- Hand back: the files written, the row counts per ref, and any surprise in ELK's behaviour (one line each). Return only the
  structured result, with no preamble and no trailing summary.

## Batch gate

`tools/vectors/dot-vectors.sh test/golden/refs/java` twice → byte-identical. `git diff --exit-code` on every landed ref.
`npx vitest run test/architecture` green. `npm run format:check` green.
