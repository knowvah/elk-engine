<!-- SPDX-License-Identifier: EPL-2.0 -->

# component-dfs-depth: mission brief (issue #70)

## Objective

Mission 8b kept the two component searches of force, stress and disco recursive (FD7). On Node's default stack the port
overflows on a 16,000-node path that the oracle lays out (issue #70's table, `gh issue view 70`). The maintainer ruled
"yes, so long as results stay the same" ([D0](decisions.md#d0-the-ruling-this-mission-executes)). This mission converts
`ComponentsProcessor.dfs` (force, also run by stress) and `ElkGraphComponentsProcessor.dfs` (disco) into explicit-stack
loops by the recipe #67 landed. Each conversion is proven against a verbatim recursive twin. The final layouts at the
oracle's measured depth are proven equal to the oracle (1e-6) and byte-identical to the unconverted port run on a raised
stack.

Exit (#70):

- Force, stress and disco each complete a path at `D_oracle(alg)` on Node's default stack
  ([D1](decisions.md#d1-the-bar-is-the-oracles-measured-depth-per-algorithm)). The output equals the oracle at 1e-6 and is
  byte-identical to the T1 reference ([D5](decisions.md#d5-whole-pipeline-equality-against-the-unconverted-port)), for the
  path and the caterpillar. An algorithm that misses this is a partial named in a `follow-up` (stops 2, 7, 8).
- Both sites have a `*.explicit-stack.test.ts` with a verbatim twin, at least 60 seeded graphs and a deep case
  ([D4](decisions.md#d4-the-proof-per-site)). Every landed test, replay and ref is unchanged.
- The recursion text in `docs/architecture/alg-force-disco.md` § 5 and § 7 and in `docs/conformance.md` is current. One
  closing row is appended to `plans/alg-force-disco/decision-journal.md`.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (component-dfs-depth)`, and `.agent-notes/component-dfs-depth.md` is written.

**Not in this mission:**

- #76 (spore) and #166 (tree recursions left verbatim): the same ruling, separate issues.
- #167 (`needs-ruling`): the depth check's model and limit. This mission calls the landed `checkStackDepth` as the #67
  sites do ([D7](decisions.md#d7-the-depth-check)) and leaves its value alone.
- Any change to algorithm behaviour, ordering or signatures. That includes disco's linear `visited.includes` scan, which
  stays as the Java's `List.contains`.
- Any landed ref, golden or expected value, any oracle patch, any `ELK_COMMIT` change, and any write to `~/git/knowvah/elk`.
- `--jitless` depth beyond the unit tests, and the translated `docs-site/` pages.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md)
   and `.agent-notes/component-dfs-depth-planning.md`. Then read `.agent-notes/tree-recursion-depth.md`, which applies
   whole. Read the `## Scratch harness (D6)` section of `plans/tree-recursion-depth/decision-journal.md` (line 41 on) and
   FD7 with the T12 rows of `plans/alg-force-disco/` (`decisions.md:146-150`, `decision-journal.md:71`). Then run
   `gh issue view 70 --comments` and `gh issue view 167`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/component-dfs-depth .agent-notes/component-dfs-depth-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add component-dfs-depth mission brief"`. Record the squash base in
   the journal: the driver's base if the prompt names one, otherwise that commit's parent (`687ae7ba` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004. That held at planning
   (`builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it (stop 9).
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `687ae7ba`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. The public ElkGraph contract and every layout result stay the
same; only stack use falls. Each file is owned by one task:

| File | Action | Task |
| ---- | ------ | ---- |
| The journal, the README batch table | Modify | T1, T4, T5 (orchestrator) |
| `src/alg/force/ComponentsProcessor.ts`, `src/alg/force/ComponentsProcessor.explicit-stack.test.ts` | Modify / Create | T2 |
| `src/alg/disco/transform/ElkGraphComponentsProcessor.ts`, `src/alg/disco/transform/ElkGraphComponentsProcessor.explicit-stack.test.ts` | Modify / Create | T3 |
| A further in-bundle site a T4 probe names (stop 8), with its test | Modify / Create | T4 |
| `docs/architecture/alg-force-disco.md` § 5 and § 7, `docs/conformance.md` (AC6 list, FD7 and stack-depth bullets), `plans/alg-force-disco/decision-journal.md` (one appended row) | Modify | T4 |
| `plans/roadmap.md` (appended section), `.agent-notes/component-dfs-depth.md` | Modify / Create | T5 |

No package, env var or database change. The probe harness and references live under `$TMPDIR/component-dfs-depth/` and are
never committed ([D6](decisions.md#d6-the-probe-harness-is-scratch-journaled-verbatim)).

## Quality gates

After each site, run its tests, `npx vitest run src/alg/<bundle>` (the landed replays included), `npm run typecheck`,
`npx prettier --check <changed files>` and `npm run complexity`. Read the complexity report, not the exit code. T5 runs
queue gates 1-7 ([T5](batch-3/T5-close-out.md)). Before a JVM run, check `uptime`, wait while it is above 12, and run under
`nice -n 10`. Start the full suite and long oracle grids detached with `nohup ... ; echo "exit $?"`, as the queue rules
show, and poll for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 2 (stress or disco at large depth runs into a
heap or time limit in the oracle, which is not a stack result) and stop 8 (an overflow frame in shared code once `dfs` no
longer binds).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Mission start, probe harness, baseline measurements | T1 | — | [x] |
| [2](batch-2/overview.md) | The two conversions (parallel) | T2, T3 | 1 | [x] |
| [3](batch-3/overview.md) | Evidence and docs; close-out and squash | T4, T5 | 2 | [x] |

## Execution model

Recommended executor: `fable`.

- The orchestrator owns T1, T4 and T5, every commit, every `gh` call, `plans/` and `.agent-notes/`.
- T2 and T3 have disjoint write-sets and do not depend on T1's numbers beyond the deep-case depth. Run them as two parallel
  subagents (`claude`, opus, with the Opus scope compensation of `~/.claude/rules/model-routing.md`). Prompt each with its
  task file and the common rules of [batch 2](batch-2/overview.md#common-rules-include-in-every-subagent-prompt). They may
  start while T1's oracle grid runs. A headless session may force them into the foreground (the #67 precedent); then run
  them one after another, force first.
- Track each budget from the subagent's spawn time, and check in at least every 9 minutes.
- Commit after each site. T5 squashes the commits.

**Time:** about 3 h 30 min. T1 takes 75 min (the stress grid dominates). T2 and T3 take up to 45 min in parallel, overlapping
T1. T4 takes 45 min and T5 takes 60 min.

## Landing

1. Tag the tip `component-dfs-depth/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with the message of T5 step 7.
   The footer is `Refs: #70`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D8 and the auto-confirmed record.
- [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md) and
  [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedents: the mrtree `ComponentsProcessor.dfs` conversion of #67 (`src/alg/mrtree/ComponentsProcessor.ts:118-207` and
  its `*.explicit-stack.test.ts`), the closest shape to force's `dfs`; AC6 (`NetworkSimplex`), B8
  (`DFSNodeOrderCycleBreaker`), F11 (layered `ComponentsProcessor`) and PK6 (spore).

## Mission summary (2026-11-24)

Completed 2026-11-24: 5 of 5 tasks. No halt. One decision of the brief proved incomplete (D1's grid assumed a cold JVM
completes 16,000) and was pushed forward under stop 6 with warm-up ladders; it is journaled.

- **Result.** Force, stress and disco are done: at the oracle's measured depth (16,000, 16,000 and 40,000), on Node's
  default stack, the port completes a path and a caterpillar, each equal to the oracle at 1e-6 and byte-identical to the unconverted port on
  a raised stack ([decision-journal.md](decision-journal.md), T4 `evidence`). The stress caterpillar at 16,000 (32,000 nodes)
  needed a second oracle run: the first, on a loaded machine, was ended by the probe's 90-minute limit after the search had
  passed; the second, on a quiet one, completed in 69 minutes.
- **Landed.** The two conversions (`src/alg/force/ComponentsProcessor.ts`,
  `src/alg/disco/transform/ElkGraphComponentsProcessor.ts`) with their `*.explicit-stack.test.ts` (148 tests); the docs
  (`alg-force-disco.md` § 5 and § 7, `conformance.md`); the 8b closing row; the roadmap revision;
  `.agent-notes/component-dfs-depth.md`. No landed ref, vector, golden or assertion changed, and nothing outside the brief's
  table was written.
- **Not as planned.**
  - A cold oracle JVM throws at every depth of D1's grid for force and stress. The bar comes from warm-up ladders (T1
    `decision`); it equals #70's 16,000 for force and stress and is 40,000 for disco.
  - The heap gives out before the stack at depth: the force caterpillar and the stress runs need `--max-old-space-size`
    (T1 `divergence`, #170).
  - The coverage gate failed four times on test timeouts under other sessions' load and passed unchanged on the fifth run,
    started without `nice` (T5 `gate` rows). No timeout was raised and no test was touched.
  - Extra evidence the brief did not ask for: the corpus sweep of the three algorithms, 2,710 cases with the same category
    and detail before and after.
- **Decisions.** D0, D2-D8 as planned; D1 kept with warm-up ladders added. Push-forwards: the ladders, the mixed warm-up for
  the stress caterpillar, the heap flags, the sweep, the corrected Java line ranges (`130-157`, `207-219`).
- **Gates.** Queue gates 1-7 green on the final tree (T5 `gate`): coverage 1,214 files, 50,718 tests, 98.81 / 97.01 / 98.57
  / 98.86; refs against the base untouched.
- **Issues.** #167 (`needs-ruling`) has a comment naming the two new `checkStackDepth` call sites. #170 (`follow-up`): heap
  and time at depth. No `needs-ruling` issue was filed and no row is a partial.
- **Planning lesson.** A depth grid for the oracle starts low and ascends in one JVM: a cold JVM at the expected limit
  reports nothing. Stress is cubic and holds two n x n matrices, so its shapes set the mission's wall time
  (`.agent-notes/component-dfs-depth.md`).
