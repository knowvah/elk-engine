<!-- SPDX-License-Identifier: EPL-2.0 -->

# tree-recursion-depth: mission brief (issue #67)

## Objective

Mission 8a kept the tree algorithms' recursion verbatim (TR7). On Node's default stack the port overflows below the
oracle's depth in four of six probe shapes: mrtree path and caterpillar, radial path, vertiflex path. The issue's table is
at `gh issue view 67`. The maintainer has ruled that such recursions become explicit-stack loops proven against a verbatim
recursive reference, "so long as results are the same" ([D0](decisions.md#d0-the-ruling-this-mission-executes)). This
mission re-measures the oracle's depth per shape. It then converts, in the order the probe finds them, the recursion sites
that keep the port below that depth. Each conversion is proven by a twin test. The final layouts are proven equal to the
oracle (1e-6) and byte-identical to the unconverted port run on a raised stack.

The lead list of sites, with the outcome column the mission fills, is [sites.md](sites.md).

Exit (#67):

- All six shapes (path and caterpillar × mrtree, radial, vertiflex; default options) complete in TS on the default stack at
  `D_oracle` ([D1](decisions.md#d1-the-bar-is-the-oracles-measured-depth-per-shape)). They match the oracle at 1e-6 and are
  byte-identical to the T1 references ([D5](decisions.md#d5-whole-pipeline-equality-at-depth-against-the-unconverted-port)).
  A shape that misses this is a partial named in the close-out follow-up (stops 2, 7, 8).
- Every converted site has a `*.explicit-stack.test.ts` with a verbatim twin, at least 40 seeded trees and a deep case
  ([D4](decisions.md#d4-the-proof-per-site)). Every landed test, replay and ref is unchanged.
- [sites.md](sites.md) has an outcome on every row. The trees' recursion text in `docs/architecture/alg-trees.md` § 7 and
  `docs/conformance.md` is current, and one closing row is appended to `plans/alg-trees/decision-journal.md`.
- A `follow-up` issue lists the recursions left verbatim that only non-default options reach, plus any partial shape.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (tree-recursion-depth)`, and `.agent-notes/tree-recursion-depth.md` is written.

**Not in this mission:**

- #70 (force, disco) and #76 (spore): the same ruling, separate issues.
- Option-gated recursions the six shapes do not reach (vertiflex `BEND`, radial compactors, `extend`, rotation) ([D2](decisions.md#d2-convert-in-probe-order-only-what-the-bar-needs)).
- Any recursion no probe overflowed in, and any change to algorithm behaviour, ordering or signatures.
- Any landed ref, golden or expected value, any oracle patch, `ELK_COMMIT` change or write to `~/git/knowvah/elk`.
- `--jitless` depth beyond the unit tests, and the translated `docs-site/` pages.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [sites.md](sites.md),
   [decision-journal.md](decision-journal.md) and `.agent-notes/tree-recursion-depth-planning.md`. Also read
   `.agent-notes/alg-trees.md` and the T19 row of `plans/alg-trees/decision-journal.md` (line 85), TR7 in
   `plans/alg-trees/decisions.md` (lines 142-147) and AC6 in `plans/alg-common/decisions.md` (line 90). Then run
   `gh issue view 67 --comments`.
3. `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, commit it with
   `git add plans/tree-recursion-depth .agent-notes/tree-recursion-depth-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add tree-recursion-depth mission brief"`. Record the squash base
   in the journal: the driver's base if the prompt names one, else that commit's parent (`5782a87a` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (true at planning,
   `builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it (stop 9).
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `5782a87a`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. The public ElkGraph contract and every layout result stay the
same; only stack use falls. Every file is owned by one task:

| File | Action | Task |
| ---- | ------ | ---- |
| The journal, the README batch table | Modify | T1, T5, T6 (orchestrator) |
| `src/alg/mrtree/**`: converted sites, sibling helpers, `*.explicit-stack.test.ts` | Modify / Create | T2 |
| `src/alg/radial/**`: same kinds | Modify / Create | T3 |
| `src/alg/vertiflex/**`: same kinds | Modify / Create | T4 |
| [sites.md](sites.md) (outcomes), `docs/architecture/alg-trees.md` § 7, `docs/conformance.md` (TR7 and stack-depth bullets, AC6 list), `plans/alg-trees/decision-journal.md` (one appended row) | Modify | T5 |
| A stop-8 site outside the bundles, only if T6 decides to convert it | Modify / Create | T6 |
| `plans/roadmap.md` (appended section), `.agent-notes/tree-recursion-depth.md` | Modify / Create | T6 |

There is no new package, env var or database change. The probe harness and references live under `$TMPDIR/tree-recursion-depth/`
and are never committed ([D6](decisions.md#d6-the-probe-harness-is-scratch-journaled-verbatim)).

## Quality gates

After each site: its tests, `npx vitest run src/alg/<bundle>`, `npm run typecheck`, `npx prettier --check <changed files>`
and `npm run complexity` (read the report, not the exit code). T6 runs queue gates 1-7 ([T6](batch-3/T6-close-out.md)). JVM
and probe runs: check `uptime`, wait above 12, run under `nice -n 10`. The full suite and long oracle grids are started
detached with `nohup ... ; echo "exit $?"`, as the queue rules show, and polled for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 7 (mrtree's budget: many sites and slow probes)
and stop 8 (an overflow frame in shared code).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Mission start, probe harness, baseline measurements | T1 | — | [x] |
| [2](batch-2/overview.md) | Conversions, one track per bundle (parallel) | T2, T3, T4 | 1 | [x] |
| [3](batch-3/overview.md) | Records and docs; close-out and squash | T5, T6 | 2 | [x] |

## Execution model

Recommended executor: `fable`.

- The orchestrator owns T1, T5 and T6, every commit, every `gh` call, `plans/` and `.agent-notes/`.
- T2, T3 and T4 have disjoint write-sets. Run them as three parallel subagents (`claude`, opus, with the Opus scope
  compensation of `~/.claude/rules/model-routing.md`), each prompted with its task file and the common rules of
  [batch 2](batch-2/overview.md#common-rules-include-in-every-subagent-prompt). In a headless session they may have to run in
  the foreground (the #66 precedent); then run them one after another, mrtree first.
- Track each budget from the subagent's spawn time, and check in at least every 9 minutes.
- Commit after each converted site or each track report. The commits are squashed in T6.

**Time:** about 4 h. T1 takes 60 min, the tracks take up to 2 h 15 min in parallel, T5 takes 30 min and T6 takes 60 min.

## Landing

1. Tag the tip `tree-recursion-depth/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with the message of T6 step 7.
   The footer is `Refs: #67`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md): D0-D7 and the auto-confirmed record.
- [sites.md](sites.md), [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md),
  [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedents: AC6 (`NetworkSimplex`), B8 (`DFSNodeOrderCycleBreaker`), F11 (layered `ComponentsProcessor`), PK6 (spore
  `*.explicit-stack.test.ts`). Issue #67, the ruling comment, and the sibling issues #70 and #76.

## Mission summary (2026-11-23)

Completed 2026-11-23: 6 of 6 tasks. No halt and no partial shape. One decision of the brief proved incomplete (D3) and one
remark wrong (D1's monotonicity); both were pushed forward under stop 6 and are journaled.

- **Result.** All six shapes are done: at the oracle's measured depth of 10,000, on Node's default stack, the port
  completes, equals the oracle at 1e-6 and is byte-identical to the unconverted port on a raised stack
  ([decision-journal.md](decision-journal.md), T6 `evidence`). 18 sites are explicit-stack loops ([sites.md](sites.md)), each
  with a verbatim-twin `*.explicit-stack.test.ts`.
- **Landed.** The 18 conversions in `src/alg/{mrtree,radial,vertiflex}`; 16 test files; `src/java/lang/StackDepth.ts`;
  three fixture modules under `test/helpers/`; the docs (`alg-trees.md` § 7, `conformance.md`); the 8a closing row; the
  roadmap revision; `.agent-notes/tree-recursion-depth.md`. No landed ref, vector, golden or assertion changed.
- **Not as planned.**
  - The bar is 10,000 for every shape, not the issue's 3,500 to 7,000: the oracle's limit moves with JIT warm-up (T1
    `decision`). So the radial and vertiflex caterpillars needed work too, and more sites than the issue's candidates.
  - A recursion without end hung in the first conversions, where the Java throws `StackOverflowError` (173 sweep cases, four
    mrtree replay rows). The orchestrator's review caught it before anything landed; every site now calls `checkStackDepth`
    (limit 100,000), with a test on an endless input (T3, T4 `divergence` and `decision`).
  - The unconverted mrtree port needed a 48 GB heap for its reference run (T1 `divergence`).
  - The subagents ran in the foreground (headless session): radial and vertiflex in parallel, then mrtree with the two
    depth-check retrofits, then a fixture consolidation.
- **Decisions.** D0, D2, D4-D7 as planned; D1 kept with its monotonicity remark struck; D3 extended by the depth check.
  Push-forwards: scaled probes for site discovery; the limit lowered from 1,000,000 to 100,000; shared fixtures; one
  Java-faithful CodeQL entry for the `EadesRadial` twin.
- **Gates.** Queue gates 1-7 green on the final tree (T6 `gate`): coverage 1,212 files, 50,569 tests, 98.81 / 97.01 / 98.57 /
  98.86; refs against the base untouched. Extra evidence: all 2,718 tree sweep cases classify as before.
- **Issues.** #167 (`needs-ruling`): the depth check, a fixed limit against cycle detection, and the value. Follow-ups: #166
  (the recursions left verbatim and the option that reaches each), #168 (the port is 6 to 26 times slower than the oracle at
  10,000 deep).
- **Planning lesson.** A depth bracket measured once is the limit of that JVM run, and a twin test on trees says nothing
  about inputs where the recursion never returns (`.agent-notes/tree-recursion-depth.md`).

