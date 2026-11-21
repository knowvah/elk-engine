<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-scanline-0004: mission brief (issue #111)

## Objective

Carry upstream PR eclipse-elk/elk#1247 (fixes eclipse-elk/elk#1246; fork knowvah/elk#19, PR knowvah/elk#26) as oracle
patch `0004` under the maintainer's carried-patch ruling of 2026-11-13, and port the patched Java. The PR changes one walk:
`OverlapsScanlineHandler.insert` in `ScanlineOverlapCheck.java` no longer `break`s at the first non-overlapping node after
an overlap; it stops at the first node whose left side is at or right of the inserted node's right side
(`DoubleMath.fuzzyCompare(other.rect.x, p.node.rect.x + p.node.rect.width, InternalProperties.FUZZINESS) >= 0`), so the
scanline reports every overlapping pair. Only `sporeOverlap` (`OverlapRemovalLayoutProvider`) runs that check.

| Item | Value |
| ---- | ----- |
| PR head (pinned) | `1bf1da95561140eb78d70d5dd747dd46803ead2a`, parent `8bca22f4` (= `tools/oracle/ELK_COMMIT`), state OPEN at planning |
| Java files | `plugins/org.eclipse.elk.alg.common/.../spore/ScanlineOverlapCheck.java` (+5 −6); `test/org.eclipse.elk.alg.spore.test/.../ScanlineOverlapRemovalTest.java` (+62, two tests) |
| TS site | `src/alg/common/spore/ScanlineOverlapCheckHandler.ts:107-125` (`insert`, the `else if (overlapsFound) break`) |
| TS tests | `src/alg/spore/ScanlineOverlapRemovalTest.test.ts` gains `scanlineOverlapBehindNarrowNodeTest`, `scanlineOverlapRightOfInsertedNodeTest` |
| Refs that may move | listed exactly in [decisions.md#d4](decisions.md#d4); anything else is stop 3 |

Exit (#111): patch `0004` in `tools/oracle/patches/`, oracle rebuilt and `oracle-build.json` naming 0001-0004; patched
`ScanlineOverlapRemovalTest` on the oracle 4 runs, 0 failures; the two tests ported (red before the fix, green after);
the walk ported with `@see` unchanged and a comment naming the PR and `0004`; every affected recorder and golden script
rerun, each changed ref journaled with the patch id; `docs/conformance.md` lists four patches and a "Carried upstream
patches" entry; queue gates 1-7 green; one squashed commit on the base; `plans/roadmap.md` gains
`## Revision <date> (spore-scanline-0004)`; `.agent-notes/spore-scanline-0004.md` written.

**Not in this mission:** knowvah/elk#25 (overlaps left on ~5% of random graphs; the port keeps the Java behaviour); the
27 #108 `NaN` throws; regenerating `docs/parity-report.md` ([D6](decisions.md#d6)); any other oracle patch; any write to
`~/git/knowvah/elk`, `~/git/knowvah/elk-fixes/` or anything upstream; any `src/` change outside the handler.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   `.agent-notes/spore-scanline-0004-planning.md`, and `gh issue view 111`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/spore-scanline-0004 .agent-notes/spore-scanline-0004-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add spore-scanline-0004 mission brief"`. Record the squash base
   in the journal: the driver's base if the prompt names one, else that commit's parent (`832a847d` at planning).
4. PR check (stop 1): `gh pr view 1247 -R eclipse-elk/elk --json state,headRefOid,mergedAt` must show head `1bf1da95…`
   and a state other than CLOSED-unmerged. Journal it. Repeat before the squash (T6).
5. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (true at planning,
   built 2026-11-18). Record `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.common
   plugins/org.eclipse.elk.alg.spore test/org.eclipse.elk.alg.spore.test` (empty at planning).
6. Baseline at planning (`832a847d`, gate env): see [decision-journal.md](decision-journal.md) row `plan`. Rerun only if
   the base sha differs.
7. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own files' tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <changed
files>`. T6 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # journal the typedoc warning count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --stat <base> -- test/golden/refs/                       # gate 7: only the D4 set
```

Gate 7: T2 reruns the recorders of [D3](decisions.md#d3); T6 reruns them once more on the final tree and checks
`git diff --exit-code test/golden/refs/` (no drift since T2). JVM runs: check `uptime` (wait above 12), run under
`nice -n 10`, detached with `echo "exit $?"` as the log's last line, polled in ≤ 9-minute foreground waits.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). Most likely to fire: 3 (a ref outside D4 moves) and 5 (the TS port does not
reproduce a regenerated row).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Patch 0004, oracle rebuild, patched JUnit run | T1 | — | [x] |
| [2](batch-2/overview.md) | Regenerate refs; port tests (red) and the walk (green) | T2, T3 | 1 | [x] |
| [3](batch-3/overview.md) | Sweep evidence; docs; close-out and squash | T4, T5, T6 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T1, T2, T4, T6, every commit, every `gh` call, every JVM run,
`plans/` and `.agent-notes/`. T3 and T5 have disjoint write-sets and may run as subagents (`typescript-pro` and
`documentation-engineer`, sonnet); the task file is the prompt. Subagents never commit, never run the full suite or a
JVM, use a private `$TMPDIR/<task>/` scratch directory, and return their report to the orchestrator, which journals it.
Between T2 and T3 the spore vector suites are red by design (refs moved, port not yet); per-task commits are squashed.

## Landing

Subject `fix(spore): report every overlap of a node inserted into the scanline` (≤ 72, lowercase). Body: the ruling and
the carried-patch convention, PR #1247 at `1bf1da95`, the mechanism (the early `break` after a non-overlapping node),
the refs that moved by script with counts, the sweep evidence, any `needs-ruling` issue. Footer `Refs: #111, #104, #108`,
no attribution lines (queue rule). Tag `spore-scanline-0004/pre-squash`, `git reset --soft <base>`, one commit with
`git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-21)

- **Tasks:** T1-T6 of 6 done, in the planned order, all by the orchestrator (no subagent; plan row in the journal).
- **Result:** oracle patch `0004` (eclipse-elk/elk#1247 at `1bf1da95`) is in `tools/oracle/patches/`, the oracle is
  rebuilt (`oracle-build.json`: `8bca22f4…`, patches 0001-0004), the patched `ScanlineOverlapRemovalTest` runs 4 tests
  with 0 failures on it, the two tests and the walk are ported, 13 refs moved by script (all inside D4), the docs list
  four patches with a "Carried upstream patches" subsection, and `plans/roadmap.md` has the revision.
- **Decisions journaled:** 27 rows after the planning row. For review: the three existing `@see` line numbers of
  `ScanlineOverlapRemovalTest.test.ts` now cite the patched Java; `docs/architecture/elk-upgrade.md` gained one
  sentence (outside T5's named file); the first `build.sh` run failed on a 504 from the Eclipse Foundation licence
  service and the second passed (stop 2 counts two failures).
- **Finding:** one `sporeOverlap` sweep case, `…/hierarchical/pn_brockackerman_BrockAckerman`, no longer throws with
  the patch (26 `NaN` throws, not the 27 the issue expected to stay). Mechanism in the journal (T4 `finding`): the two
  `NaN` compound nodes no longer tie on centre x. The port agrees with the oracle on all 906 cases.
- **Gates:** queue gates 1-7 green (journal, T6 rows): format, typecheck, complexity exit 0; coverage 98.81 / 96.99 /
  98.56 / 98.86 with 49,363 tests passed and 0 failed; docs build exit 0 with 200 typedoc warnings; CodeQL clean with
  no new accepted entry; refs reproduce on a rerun.
- **Stop conditions:** none fired. PR #1247 was `OPEN` at head `1bf1da95` at the start and before the squash.
- **Issues:** #139 (`follow-up`): the corpus sweep cache and `docs/parity-report.md` predate patch `0004`. No
  `needs-ruling`.
- **Known gaps:** `docs/parity-report.md` still shows `sporeOverlap` as 879 `ok` / 27 throws (D6: not regenerated);
  the translated conformance pages still list one patch (issue #133); knowvah/elk#25 and the remaining 26 `NaN`
  throws (#108) are out of scope.
