<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-recursion-depth: mission brief (issue #76)

## Objective

Mission 8c (PK6) converted two spore recursions, `DepthFirstCompaction.compactTree` and `GrowTreePhase.growAt`, and kept six
verbatim. Beyond about 2,000 levels those six overflow V8's default stack where the oracle completes (issue #76's table,
`gh issue view 76`). The maintainer ruled on #76: "We should make these explicit stack loops if we get the same output/results"
([D0](decisions.md#d0-the-ruling-this-mission-executes)). This mission converts the six by the recipe #67 and #70 landed, proves
each against a verbatim recursive twin, and proves the final layouts at the oracle's measured depth equal to the oracle (1e-6)
and byte-identical to the unconverted port run on a raised stack.

Exit (#76):

- `sporeOverlap` and `sporeCompaction` each complete the chain at `D_oracle(alg)` on Node's default stack
  ([D1](decisions.md#d1-the-bar-is-the-oracles-measured-depth-per-algorithm-capped-by-time)). The output equals the oracle at
  1e-6 and is byte-identical to the T1 reference
  ([D5](decisions.md#d5-whole-pipeline-equality-against-the-unconverted-port)). An algorithm that misses this is a partial
  named in a `follow-up` (stops 2, 7, 8).
- All six sites ([D2](decisions.md#d2-the-sites)) have twin tests with at least 60 seeded trees and a deep case
  ([D4](decisions.md#d4-the-proof-per-site)). Every landed test, replay and ref is unchanged.
- The PK6 text in `docs/architecture/alg-packing.md` § 3.4 and § 5 and in `docs/conformance.md` is current. One closing row is
  appended to `plans/alg-packing/decision-journal.md`.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (spore-recursion-depth)`, and `.agent-notes/spore-recursion-depth.md` is written.

**Not in this mission:**

- #167 (the depth check's model and limit, and whether earlier loops call it). The six new loops call the landed
  `checkStackDepth` ([D7](decisions.md#d7-the-depth-check)); `compactTree` and `growAt` stay as they are.
- `ShrinkTreeCompactionPhase.draw` (debug mode only, D2), and the cubic cost of `DepthFirstCompaction` itself.
- Any change to algorithm behaviour, ordering or signatures; un-gating `full/compaction/chain2000/default`.
- Any landed ref, golden or expected value, any oracle patch, any `ELK_COMMIT` change, and any write to `~/git/knowvah/elk`.
- `--jitless` depth beyond the unit tests, and the translated `docs-site/` pages (#133).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md) and
   `.agent-notes/spore-recursion-depth-planning.md`. Then read `.agent-notes/tree-recursion-depth.md` and
   `.agent-notes/component-dfs-depth.md`, which apply whole. Read the `## Scratch harness (D6)` section of
   `plans/component-dfs-depth/decision-journal.md` (line 42 on) and PK6 with its T14 rows
   (`plans/alg-packing/decisions.md:132` on, `decision-journal.md:51, 58-60`). Then run `gh issue view 76 --comments` and
   `gh issue view 167 --comments`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/spore-recursion-depth .agent-notes/spore-recursion-depth-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add spore-recursion-depth mission brief"`. Record the squash base in the
   journal: the driver's base if the prompt names one, otherwise that commit's parent (`dd65877d` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004. That held at planning
   (`builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it (stop 9).
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `dd65877d`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. The public ElkGraph contract and every layout result stay the same;
only stack use falls. Each file is owned by one task:

| File | Action | Task |
| ---- | ------ | ---- |
| The journal, the README batch table | Modify | T1, T4, T5 (orchestrator) |
| `src/alg/common/spore/DepthFirstCompaction.ts`, `DepthFirstCompaction.explicit-stack.test.ts` (new `describe` blocks), `test/helpers/spore-tree-fixtures.ts` (additive, if needed) | Modify | T2 |
| `src/alg/spore/p3execution/GrowTreePhase.ts`, `GrowTreePhase.explicit-stack.test.ts` (new `describe` blocks), `src/alg/spore/p2processingorder/MinSTPhase.ts`, `MinSTPhase.explicit-stack.test.ts` | Modify / Create | T3 |
| A further in-bundle site a T4 run names (D2, stop 8), with its test | Modify / Create | T4 |
| `docs/architecture/alg-packing.md` § 3.4 and § 5, `docs/conformance.md` (the PK6 bullets near `:2387`), `plans/alg-packing/decision-journal.md` (one appended row) | Modify | T4 |
| `plans/roadmap.md` (appended section), `.agent-notes/spore-recursion-depth.md` | Modify / Create | T5 |

No package, env var or database change. The probe harness and references live under `$TMPDIR/spore-recursion-depth/` and are
never committed ([D6](decisions.md#d6-the-probe-harness-is-scratch-journaled-verbatim)).

## Quality gates

After each site, run its tests, `npx vitest run src/alg/spore src/alg/common/spore test/helpers/spore-tree-fixtures.test.ts
test/helpers/spore-replay-dump.test.ts` (the landed replays included; 23 files, 890 tests passed and 1 skipped at planning),
`npm run typecheck`, `npx prettier --check <changed files>` and `npm run complexity`. Read the complexity report, not the exit
code. T5 runs queue gates 1-7 ([T5](batch-3/T5-close-out.md)). Before a JVM run, check `uptime`, wait while it is above 12, and
run under `nice -n 10`. Start the full suite and long oracle or port runs detached with `nohup ... ; echo "exit $?"`, as the
queue rules show, and poll for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 7 (the compaction chain is cubic, so long runs
set the wall time) and stop 2 (an oracle timeout at a capped depth, which is not a stack result).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Mission start, probe harness, baseline measurements | T1 | — | [x] |
| [2](batch-2/overview.md) | The six conversions (two parallel tracks) | T2, T3 | 1 (harness smoke only) | [x] |
| [3](batch-3/overview.md) | Evidence and docs; close-out and squash | T4, T5 | 2 | [x] |

## Execution model

Recommended executor: `fable`.

- The orchestrator owns T1, T4 and T5, every commit, every `gh` call, `plans/` and `.agent-notes/`.
- T2 and T3 have disjoint write-sets. Run them as two parallel subagents (`claude`, opus, with the Opus scope compensation of
  `~/.claude/rules/model-routing.md`). Prompt each with its task file and the common rules of
  [batch 2](batch-2/overview.md#common-rules-include-in-every-subagent-prompt). They may start once T1's harness smoke run
  passes, while T1's oracle ladders run detached. A headless session may force them into the foreground (the #67 and #70
  precedent); then run them one after another, T2 first.
- Track each budget from the subagent's spawn time, and check in at least every 9 minutes.
- Commit after each track. T5 squashes the commits.

**Time:** about 5 h of wall time, most of it detached JVM and port runs. T1 takes up to 110 min (the compaction ladders). T2
and T3 take up to 50 min in parallel, overlapping T1. T4 takes up to 120 min (the D5 and converted compaction runs at depth,
run side by side). T5 takes 60 min.

## Landing

1. Tag the tip `spore-recursion-depth/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with the message of T5 step 7. The
   footer is `Refs: #76`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D8 and the auto-confirmed record.
- [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md) and
  [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedents: the PK6 loops in the same files (`DepthFirstCompaction.ts:57-70`, `GrowTreePhase.ts:68-80`) with their tests;
  #70's brief and journal (`plans/component-dfs-depth/`), the closest mission shape; the mrtree `firstWalk`/`secondWalk`
  conversions of #67 for value-carrying frames.

## Mission summary (2026-11-24)

Completed 2026-11-24: 5 of 5 tasks. No halt. Two push-forwards: D1's ladders started at 2,000, where a cold JVM overflows
on the compaction chain (stop 6), and T1 used its whole budget on the 4,000 timing point (stop 7).

- **Result.** sporeOverlap and sporeCompaction are done: at the oracle's measured depth (9,750 and 4,000), on Node's
  default stack, the port completes the chain, byte-identical to the unconverted port on a raised stack and to the oracle
  ([decision-journal.md](decision-journal.md), T4 `evidence`). Compaction has the same evidence at 3,000, the depth D1's
  90-minute cap allows: the 4,000 runs took 105 and 107 minutes on a loaded machine.
- **Landed.** The six conversions (`src/alg/common/spore/DepthFirstCompaction.ts`,
  `src/alg/spore/p3execution/GrowTreePhase.ts`, `src/alg/spore/p2processingorder/MinSTPhase.ts`) with their twin tests
  (42 new tests: new `describe` blocks in the two PK6 test files, and the new
  `DepthFirstCompaction.walks.explicit-stack.test.ts` and `MinSTPhase.explicit-stack.test.ts`); the docs (`alg-packing.md`
  § 3.4 and § 5, `conformance.md`); the 8c closing row; the roadmap revision; `.agent-notes/spore-recursion-depth.md`. No
  landed ref, vector, golden or assertion changed, and nothing outside the brief's table was written.
- **Not as planned.**
  - A cold oracle JVM throws on the 2,000-node compaction chain; the ladders start at 250 or 500 (T1 `decision`).
  - The compaction chain's cost jumps by a factor 9 to 11 between 3,000 and 4,000, so time ended the grid above 4,000:
    the oracle's limit between 4,000 and 5,000 is not narrowed (T1 `fit`, `decision`).
  - The loop form of `minUnderlapWithSubtree` is 20 to 30 % slower than the recursion on the compaction chain, with
    identical output; three other frame layouts cost the same (T4 `divergence`).
  - A second test file for `DepthFirstCompaction`: the write hook holds colocated test files to 500 lines (T2 `deviation`).
  - T2 and T3 ran side by side as foreground subagents (10.6 and 5.6 minutes), not one after another.
  - Extra evidence the brief did not ask for: negative controls at all six sites, and the compaction run at 3,000.
- **Decisions.** D0, D2-D8 as planned; D1 kept with a lower ladder start. Push-forwards: the ladder steps, the fine overlap
  ladder (9,250 to 9,750), the one-hour oracle case limit, the second test file, the un-niced coverage rerun.
- **Gates.** Queue gates 1-7 green on the final tree (T5 `gate`): coverage 1,222 files, 50,706 tests, 98.82 / 97.01 /
  98.57 / 98.86; refs against the base untouched.
- **Issues.** #175 (`follow-up`): time at depth. #167 (`needs-ruling`) has a comment naming the six walks' `checkStackDepth`
  lines. No `needs-ruling` issue was filed and no row is a partial.
- **Planning lesson.** A spore depth ladder starts at a few hundred nodes, and the recorder's compaction chain stops being
  cubic at 3,200 nodes: size a compaction grid from a timing above that, not from 2,000
  (`.agent-notes/spore-recursion-depth.md`).
