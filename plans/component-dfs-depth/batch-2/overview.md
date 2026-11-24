<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: the two conversions

Two parallel subagents. `alg.force` and `alg.disco` do not import each other (`test/architecture/bundle-deps.json`), so the
write-sets are disjoint, and one conversion cannot change the other's tests.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-force.md) | force `ComponentsProcessor.dfs` (force and stress) | `claude` (opus) | `src/alg/force/ComponentsProcessor.ts`, `src/alg/force/ComponentsProcessor.explicit-stack.test.ts` | T1 harness smoke | [x] |
| [T3](T3-disco.md) | disco `ElkGraphComponentsProcessor.dfs` | `claude` (opus) | `src/alg/disco/transform/ElkGraphComponentsProcessor.ts`, `src/alg/disco/transform/ElkGraphComponentsProcessor.explicit-stack.test.ts` | T1 harness smoke | [x] |

## The steps (both tasks)

1. Read the Java of the site at `~/git/knowvah/elk` (read only) and the precedent
   `src/alg/mrtree/ComponentsProcessor.ts:118-207` with its `*.explicit-stack.test.ts`.
2. Write `<Class>.explicit-stack.test.ts` first (D4: the twin, at least 60 seeded graphs, the deep case, and the depth-limit
   case). Run it. The deep case must fail with an overflow before the change (red), and the equality cases pass against the
   recursive port.
3. Convert the site (D3, D7) and rerun the test until everything passes.
4. Run `npx vitest run src/alg/<bundle>`, which includes the landed replays. All tests must pass unchanged.
5. Run the new test file once under `--jitless`
   (`npx vitest run <file> --pool=forks --execArgv=--jitless`) and quote the result.

## Common rules (include in every subagent prompt)

- The subagent prompt is the task file, plus [decisions.md](../decisions.md) D0-D8,
  [stop-conditions.md](../stop-conditions.md), `.agent-notes/tree-recursion-depth.md`, and the Opus scope compensation of
  `~/.claude/rules/model-routing.md`. Add the CLAUDE.md sections "The Java Is Sacred", "Tests Are Immutable", "Translation
  Rules" and "Layout & Naming".
- Keep the `@see` tags. The new test file carries the SPDX header and a header comment naming the mission, #70 and the Java
  lines it transcribes.
- Write only the two files of your task. Never run the full suite or `npm run coverage`. Never run `git commit`,
  `git stash` or `gh`. Never edit an existing test's assertions, `test/golden/refs/**`, or files outside your write-set. If
  a shared helper seems needed, keep the builders test-local and report it.
- After the conversion, run `npm run typecheck`, `npx prettier --check <changed files>` and `npm run complexity`. Read the
  complexity report, not the exit code.
- Report as structured output, no prose: the site; the test file; the twin-equality count and shape mix; the deep depth with
  its red/green result; the depth-limit case; the bundle test totals; the jitless result; and any stop with its diagnosis
  artifact.

The orchestrator commits each site (`refactor(force): …` / `refactor(disco): …`; T5 squashes them).

**Observability (both):** N/A. No new observable operations. **Rollback (both):** Reversible. Reverting a conversion restores
the verbatim recursion, with no data or contract change.
