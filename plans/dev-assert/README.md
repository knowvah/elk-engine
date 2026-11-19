<!-- SPDX-License-Identifier: EPL-2.0 -->

# dev-assert: mission brief (issue #45)

## Objective

Write the `devAssert` helper that `docs/translation-rules.md` § 6.8 and CLAUDE.md promise ("dev-only check helper, no
production cost"), then restore every Java `assert` the port omitted, at its Java position. At the pin `8bca22f4` the
in-scope bundles hold **143** `assert` statements in 70 Java files (`core` 9, `core.debug.grandom` 2, `alg.common` 4,
`alg.layered` 126, `alg.mrtree` 1, `alg.force` 1; no other in-scope bundle has one). Every one of those files is ported.
Assertions stay **disabled by default**, as on a JVM without `-ea`, so production behaviour does not change and no
golden or vector moves. The test suite runs with them **enabled**, as ELK's own Tycho build does
(`build/pom.xml:361`, `<enableAssertions>true`).

Exit (#45 "Done when"):

- `src/java/lang/DevAssert.ts` and `src/java/lang/AssertionError.ts` exist with tests. The enable switch is injectable
  (D2), browser-safe, and reads no `process.env`.
- Each of the 143 sites in [inventory.md](inventory.md) (written by T2) is `restored` or journaled `not-portable` with
  a reason. A site whose assertion fires is triaged by D7.
- Queue gates 1-7 green and journaled; `test/golden/refs/` unchanged against the base. One squashed commit on the base.
  `plans/roadmap.md` gains `## Revision <date> (dev-assert)`; `.agent-notes/dev-assert.md` is written.

**Not in this mission:** migrating the three existing AssertionError stand-ins (`DefaultLinkingService.ts:53-60`,
`LazyLinkingResourceTypes.ts` `CyclicLinkingException`, and `SplinesMath`'s constructor) onto the new class; replacing
the existing `throw new Error(...)` substitutes for `assert false; return x;` arms (D5.4); a corpus sweep with
assertions enabled. File each as a `follow-up` issue in T8. No oracle patch, no recorder change, no ref change.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `docs/translation-rules.md` § 6.8 and § 6 intro (exceptions, AD-16).
3. Read `.agent-notes/dev-assert-planning.md` (planning facts) and the `devAssert` entry of `.agent-notes/alg-common.md`.
   Journal anything that changes the approach.
4. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/dev-assert .agent-notes/dev-assert-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add dev-assert mission brief"`. Record the squash base in the
   journal: the driver's base if the prompt names one, else that commit's parent (`98085a3b` at planning).
5. Check `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (it did at planning). Run
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` and journal the result (empty at planning).
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own tests, `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity`.
T8 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite, assertions ON
npm run docs:build                                                # typedoc warnings: journal the count (200 at base)
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

No JVM recorder or sweep runs in this mission. The only JVM use is D7's single-case oracle check with
`JAVA_TOOL_OPTIONS=-ea`; check `uptime` first (above 12, wait) and run it under `nice -n 10`.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The ones most likely to fire: 4 (an assertion fires in the suite and the
oracle with `-ea` fires too) and 5 (a fix would change an expected value).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Helper, switch, suite setup; site inventory | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | Restore the 143 sites, four disjoint directory lanes | T3, T4, T5, T6 | 1 | [x] |
| [3](batch-3/overview.md) | Full suite with assertions on, triage; close-out, gates, squash | T7, T8 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T1, T2, T7 and T8, every commit, every `gh` call, `plans/` and
`.agent-notes/`. T3-T6 have disjoint write-sets (by directory, D5.6) and run as four parallel subagents
(`typescript-pro`, sonnet); each task file is self-contained and can be passed as the prompt with its inventory rows.
Subagents never commit, never run `npm run coverage` (shared `coverage/`), never start a JVM, and return their
inventory row updates and findings to the orchestrator, which writes them into `inventory.md`.

## Landing

Subject `refactor(java): add dev-assert helper and restore omitted java asserts` (≤ 72, lowercase). The body gives the
why: § 6.8's helper, disabled by default like a JVM without `-ea`, enabled in the suite like Tycho; counts restored and
not portable; any port defect an assertion exposed; any `needs-ruling` or `follow-up` issue. Footer `Refs: #45`, no
attribution lines (queue rule). Tag `dev-assert/pre-squash`, `git reset --soft <base>`, one commit with
`git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[inventory.md](inventory.md) (T2) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-19)

**Done.** Tasks 8 of 8 (T1-T8). Per-task history under the tag `dev-assert/pre-squash`; one squashed commit on
`98085a3ba4988c620699ce2fb613567ede41e64c`.

- **Helper:** `src/java/lang/DevAssert.ts` (`devAssert`, `setAssertionsEnabled`, `assertionsEnabled`) and
  `src/java/lang/AssertionError.ts`, with tests; the suite enables assertions in `test/setup/dev-assertions.ts`.
- **Sites (143, [inventory.md](inventory.md)):** 124 restored, 6 restored in front of a kept `throw`, 13 left as
  comments naming an issue (`not-portable: pending #112` 4, `#113` 9). No row is `todo`.
- **No port defect:** all thirteen firing sites are Java-faithful (JVM stacks under `-ea`, or the Java source for a
  direct unit-test input); journal T7.
- **Decisions:** D1-D8 applied as planned. Journaled deviations: the module flag is `enabled` (D2's two names collide);
  three recorder runs with `-ea` into `$TMPDIR` as evidence; docs outside T8's write-set updated; the `SplineEdgeRouter`
  side chain (#141) follows the Java for a value that is neither constant.
- **Gates 1-7 green:** suite 49,492 passed, 93 skipped, 0 failed with assertions on, and the same with them off;
  coverage 98.81 / 96.99 / 98.56 / 98.86; typedoc 200 warnings; CodeQL accepted set unchanged; refs unchanged.
- **For the maintainer:** rule #112 and #113 (`needs-ruling`); follow-ups #114, #115, #116, #117. Upstream drafts are
  in the journal (T7), not filed.
