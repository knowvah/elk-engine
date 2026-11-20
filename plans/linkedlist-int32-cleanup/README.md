<!-- SPDX-License-Identifier: EPL-2.0 -->

# linkedlist-int32-cleanup: mission brief (issue #47)

## Objective

Two small source-consistency fixes left by earlier missions (issue #47):

1. **`LinkedList` equality.** `src/java/util/LinkedList.ts:6-8` says `remove(e)`, `contains` and `indexOf` compare
   with `===` because "Java `equals` is identity for ELK's elements". That is false for `KVector`
   (`KVector.java:117-124`, value equality on `x`/`y`), and `KVectorChain extends LinkedList<KVector>`. Correct the
   doc, and **audit every caller** of an equality-based method on a `LinkedList` whose Java element type overrides
   `equals` (D1, D2). A caller whose result differs from Java's is a port defect: diagnose it, fix it at the call site
   (D3), and prove the fix against the oracle.
2. **`int` crossing sums.** `SwitchDecider`, `LayerSweepTypeDecider` (+ `LayerSweepTypeDeciderNodeInfo`) and the
   crossing-count loops add Java `int` counts with bare `+`, while `Counting`/`GraphInfoHolder` use `Int32.add`.
   Per `docs/translation-rules.md` § 1.1 every Java `int` `+ - *` wraps, so route those sums through `Int32` (D4).

Exit (#47 "Done when"):

- `LinkedList.ts`'s header states the actual contract; [audit.md](audit.md) (T1) lists every audited caller with a
  Java cite, a TS cite and a verdict. Each `differs` row is fixed with an oracle-backed test, or filed `needs-ruling`.
- Every site in [int32-sites.md](int32-sites.md) (T2) is converted or journaled `kept` with the reason (D4's rule).
- Nothing in `test/golden/refs/` changes against the base; no vector, golden or expected value changes.
- Queue gates 1-7 green and journaled. One squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (linkedlist-int32-cleanup)`; `.agent-notes/linkedlist-int32-cleanup.md` is written if anything
  is novel.

**Not in this mission:** changing `LinkedList`'s comparison to a pluggable equality (D3 rejects it); the same
equality hazard on Java lists ported as plain arrays (`Lists.newLinkedList`/`newArrayList` → `[]`,
`includes`/`indexOf`); `int` arithmetic outside `intermediate/greedyswitch/`, `p3order/` and `p3order/counting/`.
File each as a `follow-up` in T3. No oracle patch, no recorder change, no ref change, no JVM sweep.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   `docs/translation-rules.md` § 1.1 and the AD-10 rows, and `.agent-notes/linkedlist-int32-cleanup-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/linkedlist-int32-cleanup .agent-notes/linkedlist-int32-cleanup-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add linkedlist-int32-cleanup mission brief"`. Record the
   squash base in the journal: the driver's base if the prompt names one, else that commit's parent (`8af2af35` at
   planning).
4. Check `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (it did at planning). Run
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` and journal the result (empty at planning).
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own tests, `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity`.
T3 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count (200 at base)
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

JVM use is limited to D3's single-case oracle check for a `differs` row (an `.elkt` or JSON case through the oracle
jars). Check `uptime` first (above 12, wait) and run it under `nice -n 10`. If T1 finds no `differs` row, no JVM runs.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). Most likely to fire: 4 (a `differs` caller whose fix changes an expected
value) and 5 (a converted `int` site changes any test result).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | LinkedList audit and doc; Int32 crossing sums | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | Close-out: follow-ups, gates, roadmap, squash | T3 | 1 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T3, every commit, every `gh` call, `plans/` and `.agent-notes/`.
T1 and T2 have disjoint write-sets and may run as two parallel subagents (`typescript-pro`, sonnet); each task file is
self-contained. Subagents never commit, never run `npm run coverage` (shared `coverage/`), never start a JVM, and
return their table rows and findings to the orchestrator, which writes `audit.md` / `int32-sites.md`. A T1 fix that
falls in a T2-owned file (the three `p3order`/`greedyswitch` directories) waits until T2 lands (batch-1 overview).

## Landing

Subject `fix(java): correct linkedlist equality doc and wrap int crossing sums` (≤ 72, lowercase) if T1 fixed a
defect; otherwise `refactor(layered): wrap int crossing sums and fix linkedlist doc`. The body gives the why: the
doc's identity claim and what the audit found; § 1.1's wrap rule for the sums, unreachable on recorded graphs, so no
output moves; counts converted/kept; any issue filed. Footer `Refs: #47`, no attribution lines (queue rule). Tag
`linkedlist-int32-cleanup/pre-squash`, `git reset --soft <base>`, one commit with
`git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[audit.md](audit.md) (T1) · [int32-sites.md](int32-sites.md) (T2) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-19)

**Done: 3 of 3 tasks (T1, T2, T3).** Base `8af2af35cda0683c8b6beb04195eee13885752f1`.

- **T1, `LinkedList` equality.** Header corrected (`===` contract, the value-equal types, the call-site precedent).
  [audit.md](audit.md): 15 rows, 14 `same`, 1 `handled`, no `differs`; both sides enumerated by type (a `tsc` rename
  query and a javac Tree API pass, 845 Java calls). D3 needed no fix. The same sentence in
  `NNodeChangeAwareArrayList.ts` now names `NEdge` (outside the planned write-set, doc only).
- **T2, `int` sums.** [int32-sites.md](int32-sites.md): 30 statements converted in 9 files (3 behind the
  `NodeInfo.transfer` wrap test, 27 `converted (no seam)`), 9 rows kept with their D4 reason. Four of the 30 are `++`
  on unbounded accumulators, a push-forward reading of D4 (journal, 18:57).
- **T3.** Gates 1-7 green (journal, 19:17): 49,295 passed, 93 skipped, 0 failed; coverage 98.81 / 96.99 / 98.56 /
  98.86; 200 typedoc warnings; CodeQL clean; `test/golden/refs/` identical to the base.

**Decisions:** 10 journal rows of kind `note`/`finding`, none flagged for a ruling. For review: the `++` conversions
and the D4(c) calls (journal, 18:57), and the unplanned javac run (journal, 19:02).

**Issues filed (all `follow-up`):** #120 `LayoutMetaDataService` duplicates an algorithm in its category when a
provider is registered twice (found by the audit on an array-ported list; oracle-checked, not fixed here: outside
D1); #121 value equality through sets, maps and indirect list calls; #122 Java `int` arithmetic outside the three
crossing-min directories. No `needs-ruling` issue. No stop condition fired.
