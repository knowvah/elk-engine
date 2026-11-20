<!-- SPDX-License-Identifier: EPL-2.0 -->

# test-helper-consolidation: mission brief (issue #46)

## Objective

Consolidate the duplicated test helpers that five roadmap revisions (2026-10-26 alg-common, 2026-11-02, 2026-11-03,
2026-11-05 layered-pipeline) left as cleanup, without losing a single assertion or case (AD-13). The five items:

1. The per-file `Factories` objects and `CALLERS` tables of the anchored layered tests (176 `Factories` objects, 25
   groups of identical bodies covering 120 of them; 9 `CALLERS` tables), and the order site-row replay block copied
   into 23 files. Identical code moves to `test/helpers/` (D1, D2); the rest stays, each with a reason.
2. `fromPattern`, duplicated in two polyomino tests (D6).
3. `test/helpers/junit-delta.ts` and the private delta helper of `test/helpers/edge-route-orthogonal.ts` (D3).
4. `test/helpers/elkt-layout-harness.ts` beside `test/helpers/layout-test-runner.ts`: its three suites move to the
   runner with their Java `@DefaultConfiguration`, and the harness goes (D4).
5. `ElkLayered.test.ts`'s 199-row loop, which `LayeredPipelineVectors.test.ts`'s `full` group already runs (D5).

Exit (#46 "Done when"): each item consolidated or recorded as kept with its reason ([inventory.md](inventory.md),
written by T1, and the journal); the case count unchanged except the proven differences of D7 (−199 `ElkLayered`, −3
harness test, plus any harness case ported into the runner test); coverage ≥ 90 on all four; queue gates 1-7 green;
`test/golden/refs/` unchanged. One squashed commit on the base; `plans/roadmap.md` gains
`## Revision <date> (test-helper-consolidation)`; `.agent-notes/test-helper-consolidation.md` is written.

**Not in this mission:** any change under `src/` other than `*.test.ts` files; any ref, vector or recorder; the
singleton factories, which stay where they are; replacing narrower factories with a broader one (D1 rejects it); a JVM
run. A defect found on the way becomes a `follow-up` issue.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   [inventory-planning.md](inventory-planning.md), and `.agent-notes/test-helper-consolidation-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/test-helper-consolidation .agent-notes/test-helper-consolidation-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add test-helper-consolidation mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`f5c2c889` at planning).
4. Oracle: no oracle output is used. Still record `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`
   (empty at planning) as earlier missions did.
5. Run the D7 baseline before any edit (the gate block's suite line with
   `--reporter=dot --reporter=json --outputFile.json=$TMPDIR/before-46.json`, detached per the queue's long-run
   rule) and journal its totals. At planning: 49,585 tests, 49,491 passed, 93 skipped, 1 "timed out in 5000ms" at load
   101 (`NodeReferenceMatcher.test.ts`, 10/10 when rerun alone).
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own files' tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <changed
files>`. T8 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite (base 98.81/96.99/98.56/98.86)
npm run docs:build                                                # typedoc warnings: journal the count (200 at base)
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

No recorder or sweep input changes, so gate 7 reruns nothing. The suite takes about 20 minutes at high load; start it
detached and poll (queue rules).

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). Most likely to fire: 5 (a harness suite fails once
`@DefaultConfiguration` applies) and 6 (an equivalence check fails for a site, which then stays).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Shared helpers + inventory; junit-delta, polyomino, harness, ElkLayered loop | T1, T2, T3, T4 | — | [x] |
| [2](batch-2/overview.md) | Migrate call sites, three directory lanes | T5, T6, T7 | 1 | [x] |
| [3](batch-3/overview.md) | Case-count proof, gates, close-out, squash | T8 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T1 and T8, every commit, every `gh` call, `plans/` and
`.agent-notes/`. T2-T4 (batch 1) and T5-T7 (batch 2) have disjoint write-sets and may run as parallel subagents
(`typescript-pro`, sonnet); each task file is self-contained and can be passed as the prompt (with its `inventory.md`
rows for T5-T7). Subagents never commit, never run `npm run coverage` or the full suite, never start a JVM, use a
private `$TMPDIR/<task>/` scratch directory, and return their report to the orchestrator, which journals it.

## Landing

Subject `test: consolidate duplicated test helpers` (≤ 72, lowercase). The body gives the why: the roadmap cleanup
items, D1's identical-code-only rule, the harness suites now applying `@DefaultConfiguration` as the Java does, the
proven −199 duplicate, counts moved and kept, any issue filed. Footer `Refs: #46`, no attribution lines (queue rule).
Tag `test-helper-consolidation/pre-squash`, `git reset --soft <base>`, one commit with
`git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[inventory-planning.md](inventory-planning.md) · [inventory.md](inventory.md) (T1) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-19)

**Done, with two rows left for the maintainer.** Tasks 8 of 8 (T1-T8). Per-task history under the tag
`test-helper-consolidation/pre-squash`; one squashed commit on `f5c2c889b7620e152f52a76bbfc993e80dae0f25`.

- **Item 1:** 109 of 181 `Factories` objects moved to 20 exports (`test/helpers/layered-replay-factories.ts`,
  `layered-spline-callers.ts`), the 23 order site-replay blocks to `replayOrderSite`
  (`layered-order-site-replay.ts`), the 8 `CALLERS` tables to four class tables. 72 objects kept, each with its reason
  in [inventory.md](inventory.md).
- **Item 2:** `fromPattern` in `test/helpers/polyomino-fixtures.ts`.
- **Item 3:** `AssertionFailure` in `junit-delta.ts`; `edge-route-orthogonal.ts` and
  `LabelAndNodeSizeProcessorOffsetTest.test.ts` (a third copy, found by T8) use it. `Issue447Test.test.ts`'s
  `expect`-based copy is kept (**#119, `needs-ruling`**).
- **Item 4:** `Issue489Test` and `Issue475Test` on `defineLayoutTest` with `@DefaultConfiguration`. `Issue457Test`
  hit stop 5 (the label-metrics table lacks `n` and `ni`), so it, the harness and the harness test stay
  (**#118, `follow-up`**, with the diagnosis).
- **Item 5:** the 199-row loop of `ElkLayered.test.ts` removed after re-proving D5's four facts.
- **Case counts:** 49,585 → 49,386 (−199, D5); four cases retitled (D4); every other file identical.
- **Decisions:** D1-D8 applied. Journaled calls for review: a second, syntax-only merge under D1 (method form against
  arrow form, three `.sites` files); D1's "inject a class directly" read as a reason for once-only objects; planning
  group `dee0be9a` split in two with its `INJECTED` tables; `strategyFactories` of `layered-loops-replay-ops.ts` now the
  shared export; `docs/architecture/core-engine.md` says the harness serves `Issue457Test` only.
- **Gates 1-7 green:** suite 49,293 passed, 93 skipped, 0 failed; coverage 98.81 / 96.99 / 98.56 / 98.86 (equal to the
  base); typedoc 200 warnings; CodeQL accepted set unchanged; refs unchanged.
