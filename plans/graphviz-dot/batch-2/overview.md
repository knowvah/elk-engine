<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: foundations (DOT model, `StringTokenizer`, Xtext autowrap)

Three parallel subagents. The write-sets are disjoint, and none needs another's output.

| Task | Writes | Proven by |
| ---- | ------ | --------- |
| [T4](T4-dot-model.md) | `src/alg/graphviz/dot/dot/**` | unit tests from the generated Java (defaults, enum `get`/`getLiteral`/`getValue`), plus T7's parse vectors later |
| [T5](T5-string-tokenizer.md) | `src/java/util/StringTokenizer.ts`, its test | `graphviz-dot-jdk.json` |
| [T6](T6-xtext-autowrap.md) | `src/xtext/formatting2/**` (autowrap) | Xtext-derived unit tests; `.elkt` refs unchanged; `graphviz-dot-write.json` in T8 |

## Common rules (include in every subagent prompt)

- Read the task file, `CLAUDE.md` (the Java is sacred; translation rules; AD-7 naming and `@see` on every symbol), and
  `plans/graphviz-dot/decisions.md` (D1, D3, D10).
- TDD: the test first, watched failing, then the code. Expected values come from the refs or the Java source, never from
  running the port (AD-13). Never change a landed test, ref or expected value.
- Each file carries `// SPDX-License-Identifier: EPL-2.0`. Stay within the complexity limits (500-line files, 30 NLOC, CCN 10,
  5 params; tests are exempt from function checks but not from the 500-line hook). Split along Java method boundaries.
- Gates per task: own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` (read the report).
- Write only inside the task's write-set. Report anything else needed instead of writing it.
- Hand back: files, test counts, deviations from the Java with their reason (one line each). Return only the structured
  result, with no preamble and no trailing summary.

## Batch gate

All three tasks' tests green; `npx vitest run src/xtext src/graph/text src/java/util src/alg/graphviz test/architecture`
green; `tools/vectors/elkt-vectors.sh test/golden/refs/java && tools/oracle/regen-elkt-refs.sh && git diff --exit-code
test/golden/refs/` (D3 regression proof).
