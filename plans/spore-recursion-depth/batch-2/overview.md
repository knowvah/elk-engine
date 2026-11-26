<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: the six conversions

Two parallel subagents. `DepthFirstCompaction` lives in alg.common; `GrowTreePhase` and `MinSTPhase` live in alg.spore and call
into alg.common only through `DepthFirstCompaction.compact` (from `ShrinkTreeCompactionPhase`, not touched here). The write-sets
are disjoint, and `test/helpers/spore-tree-fixtures.ts` belongs to T2 alone.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-depth-first-compaction.md) | `DepthFirstCompaction`: `getMinUnderlap`, `minUnderlapWithSubtree`, `translateSubtree`, `drawTree` | `claude` (opus) | `src/alg/common/spore/DepthFirstCompaction.ts`, `src/alg/common/spore/DepthFirstCompaction.explicit-stack.test.ts`, `test/helpers/spore-tree-fixtures.ts` (additive) | T1 harness smoke | [x] |
| [T3](T3-grow-tree-and-minst.md) | `GrowTreePhase.drawTree`, `MinSTPhase.addNode` | `claude` (opus) | `src/alg/spore/p3execution/GrowTreePhase.ts`, `src/alg/spore/p3execution/GrowTreePhase.explicit-stack.test.ts`, `src/alg/spore/p2processingorder/MinSTPhase.ts`, `src/alg/spore/p2processingorder/MinSTPhase.explicit-stack.test.ts` | T1 harness smoke | [x] |

## The steps (both tasks)

1. Read the Java of each site at `~/git/knowvah/elk` (read only) and the PK6 loops in the same files with their
   `*.explicit-stack.test.ts`.
2. Write the new test cases first (D4: the twin, at least 60 seeded trees, the edge cases, the deep case, the depth-limit case).
   Run them. Each deep case must fail with a `RangeError` before the change (red); the equality cases pass against the recursive
   port.
3. Convert the site (D3, D7) and rerun until everything passes. One site at a time.
4. Run `npx vitest run src/alg/spore src/alg/common/spore test/helpers/spore-tree-fixtures.test.ts
   test/helpers/spore-replay-dump.test.ts`, which includes the landed replays (23 files, 890 passed and 1 skipped at planning).
   All must pass unchanged.
5. Run the changed test files once under `--jitless` (`npx vitest run <files> --pool=forks --execArgv=--jitless`) and quote the
   result.

## Common rules (include in every subagent prompt)

- The subagent prompt is the task file, plus [decisions.md](../decisions.md) D0-D8, [stop-conditions.md](../stop-conditions.md),
  `.agent-notes/tree-recursion-depth.md`, and the Opus scope compensation of `~/.claude/rules/model-routing.md`. Add the
  CLAUDE.md sections "The Java Is Sacred", "Tests Are Immutable", "Translation Rules" and "Layout & Naming".
- Keep the `@see` tags. New test files carry the SPDX header and a header comment naming the mission, #76 and the Java lines
  they transcribe; new `describe` blocks in existing files carry a one-line comment with the same facts.
- Do not change an existing case or assertion of the two PK6 test files (AD-13). Add only.
- Write only the files of your task. Never run the full suite or `npm run coverage`. Never run `git commit`, `git stash` or
  `gh`. Never edit `test/golden/refs/**` or files outside your write-set. T3: if a shared helper seems needed, keep the builder
  test-local and report it.
- After the conversion, run `npm run typecheck`, `npx prettier --check <changed files>` and `npm run complexity`. Read the
  complexity report, not the exit code.
- Report as structured output, no prose: per site, the test cases and their counts, the shape mix, the deep depth with its
  red/green result, the depth-limit case; the bundle test totals; the jitless result; and any stop with its diagnosis artifact.

The orchestrator commits each track (`refactor(spore): …`; T5 squashes them).

**Observability (both):** N/A. No new observable operations. **Rollback (both):** Reversible. Reverting a conversion restores
the verbatim recursion, with no data or contract change.
