<!-- SPDX-License-Identifier: EPL-2.0 -->

# self-loop-assert-arms: mission brief (issue #115)

## Objective

Mission `dev-assert` (#45) restored six Java `assert false` arms in the self-loop routing code. The port had a
`throw new Error(...)` in place at each one, and dev-assert D5.4 kept those throws. In each arm the Java **returns a value
or goes on** after `assert false`, so a JVM without `-ea` does not throw there. This mission makes all six arms do what
the Java does with assertions off ([D1](decisions.md#d1-every-arm-does-what-the-java-does-without--ea)):

| # | Java | TS today | After |
| - | ---- | -------- | ----- |
| 96 | `OrthogonalSelfLoopRouter.java:180` (`placeLabels`) | `OrthogonalSelfLoopRouter.ts:203-204` throws | `break` |
| 98 | `OrthogonalSelfLoopRouter.java:304-305` (`computeBaselinePosition`) | `OrthogonalSelfLoopRouterSlotPositions.ts:122-123` throws | `return -1` |
| 99 | `OrthogonalSelfLoopRouter.java:367` (`addOuterBendPoint`) | `OrthogonalSelfLoopRouter.ts:287-288` throws | `break`, then add the result |
| 100 | `OrthogonalSelfLoopRouter.java:441-442` (`getBaseVector`) | `OrthogonalSelfLoopRouter.ts:401-402` throws | `return null` |
| 105 | `RoutingDirector.java:207` (`determineThreeSideLoopRoutes`) | `RoutingDirector.ts:204-205` throws | `break`; a null selector is a `TypeError` before any arm |
| 108 | `RoutingDirector.java:227-228` (`computeMissingPortSide`) | `RoutingDirector.ts:225-226` throws | `return null` |

Each row gets a pair of tests whose expected values come from the Java source: one with assertions off, one that pins
the `AssertionError` (D4). Each arm also gets a reachability proof or a counter-example in the journal (D5).

Exit (#115, "Done when"):

- All six rows match the Java with assertions off, and each has its pair of tests. No row is listed as a deviation.
- `plans/dev-assert/inventory.md` has an appended `## Superseded by #115` section, and `docs/translation-rules.md`
  has the corrected outcome counts (D6).
- No expected value of an existing test changes. New tests are additive.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base, with `Refs: #115`.
  `plans/roadmap.md` gains `## Revision <date> (self-loop-assert-arms)`.

**Not in this mission:**

- The other `assert false` arms of the directory (`RoutingDirector.ts:93`, `LabelPlacer.ts`), which are already `restored`.
- Bounds checks in front of the arms (D2), a JVM vector (D4), or a golden for a counter-example (D5: a `follow-up`).
- Any change to a ref, vector, golden, oracle patch or `ELK_COMMIT`, and any edit to an earlier line of `plans/`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md)
   and `.agent-notes/self-loop-assert-arms-planning.md`. Then run `gh issue view 115 --comments`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/self-loop-assert-arms .agent-notes/self-loop-assert-arms-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add self-loop-assert-arms mission brief"`. Record the squash base
   in the journal. Use the driver's base if the prompt names one; otherwise use that commit's parent (`6b5541a0` at planning).
4. Oracle: no layout is run unless D5 finds a counter-example. Journal the state of `oracle-build.json` anyway, and the
   output of `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered` (stop 3).
5. Baseline: see the journal's `plan` row. Rerun it only if the base sha differs from `6b5541a0`.
6. Find the first task in [batch-1/overview.md](batch-1/overview.md) marked `[ ]` and resume there.

## Blast radius

- **Data model and API contracts.** None of the three classes is exported from `src/index.ts`
  (`docs/architecture/public-api.md`), so the public surface is unchanged. Internal signatures widen:
  - `getBaseVector` now returns `KVector | null`.
  - `computeMissingPortSide` now returns `PortSide | null`.
  - `assignLeftmostRightmostPorts` now takes `PortSide | null` sides.
  - `computeBaselinePosition` is exported from its module for the test (D4).
- **Behaviour.** The change is visible only on the six arms. D5 is expected to show that no valid graph reaches them.
  With assertions on, every arm still throws the same `AssertionError` first. Without assertions, the port no longer
  throws a port-made `Error`. It goes on as the JVM does, or raises a `TypeError` where the JVM raises an NPE (D3).
- **Service dependencies.** None.

| File | Action | Task |
| ---- | ---- | ---- |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts` | Modify (rows 96, 99, 100; class comment `:43-44`; comment at the `placeLabels` read) | T1 |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts` | Modify (row 98; header `:19-20`; export) | T1 |
| `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts` | Modify (rows 105, 108; `assignLeftmostRightmostPorts` parameters) | T1 |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.test.ts` | Create (rows 96-100) | T1 |
| `src/alg/layered/intermediate/loops/routing/RoutingDirector.test.ts` | Modify (append rows 105, 108) | T1 |
| `docs/translation-rules.md` | Modify (`:511-516`, the outcome counts) | T1 |
| `plans/dev-assert/inventory.md` | Modify (appended section only) | T1 |
| This mission's journal, the README's batch table and summary | Modify | T1, T2 |
| `plans/roadmap.md` (appended section), `.agent-notes/self-loop-assert-arms.md` | Modify / Create | T2 |

No package, env var or database change.

## Quality gates

- After T1, run `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity` (read the
  output for the three files; never trust the exit code) and the scoped suite:
  `npx vitest run src/alg/layered/intermediate/loops src/alg/layered/intermediate/SelfLoopRouter.test.ts`.
  At planning it ran 473 tests, all passing. After T1 the count is higher, and only new tests account for the difference.
  Then run the same suite with `ELK_DEV_ASSERTIONS=off`: it must also be green.
- T2 runs queue gates 1-7 ([T2](batch-1/T2-close-out.md)). Start `npm run coverage` detached with
  `nohup ... ; echo "exit $?"` and poll it for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The stops likeliest to fire are stop 1 (an existing test, golden or sweep
row that depends on one of the six throws; planning found none) and stop 2 (a D5 counter-example whose oracle output
differs from the port).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Match the six arms to the Java; gates, records and squash | T1, T2 | — | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns both tasks, every commit and every `gh` call. There are no
subagents: the work is about six small edits in three files of one directory, and the edits depend on one another
(D3's widened types cross `getBaseVector` and its two callers).

**Time:** about 1 h 30 min: 45 min for T1 (proofs, red tests, edits) and 45 min for T2, most of it the coverage run.

## Landing

1. Tag the tip `self-loop-assert-arms/pre-squash`.
2. Run `git reset --soft <base>`, then make one commit with `git -c commit.gpgsign=false commit -F <file>`, using T2's
   message. The footer is `Refs: #115`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D6 and the auto-confirmed record.
- [diagrams/component-map.md](diagrams/component-map.md) and [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedents:
  - `plans/dev-assert/decisions.md` D5.4: the throws this mission replaces.
  - `plans/dev-assert/inventory.md` `## Superseded by #127`: the shape of D6's appended section.
  - `test/helpers/with-assertions.ts`, `test/helpers/assertion-error-of.ts`: the test pair of D4.
  - `src/alg/layered/intermediate/loops/routing/RoutingDirectorTest.test.ts:25`: setting `slPortsBySide` on a loop.

## Mission summary (2026-11-25)

Completed 2026-11-25: 2 of 2 tasks. No halt, no gate rerun, no stop condition fired.

- **Result.** All six rows match the Java with assertions off, and none is a listed deviation. After
  `devAssert(() => false)`: row 96 `break`, row 98 `return -1`, row 99 `break` and then the result is added, row 100
  `return null`, row 105 `break` with both sides null, row 108 `return null`. With assertions on, each arm still throws
  the `AssertionError` first.
- **Landed.**
  - The six arms and D3's types in the three source files; a null missing side is a `TypeError` in front of the
    `switch` of `determineThreeSideLoopRoutes`. `computeBaselinePosition` is exported for its test.
  - 17 additive tests (11 in the new `OrthogonalSelfLoopRouter.test.ts`, 6 appended to `RoutingDirector.test.ts`): per
    row one with assertions off and one that pins the `AssertionError`. No existing expected value changed.
  - `plans/dev-assert/inventory.md` `## Superseded by #115` (138 / 0 / 5) and the outcome bullet of
    `docs/translation-rules.md` (D6).
  - The roadmap revision, `.agent-notes/self-loop-assert-arms.md`, and a comment on #115 (labels unchanged).
- **Proofs (D5).** No arm has a counter-example; one `evidence` row per arm is in
  [decision-journal.md](decision-journal.md). Row 98: constant callers. Rows 99 and 100: `computePortsPerSide` rejects an
  `UNDEFINED` port side and nothing changes a port's side before routing. Row 96: `LabelPlacer` assigns only the four sides. Rows
  105 and 108: a `THREE_SIDES` key set lacks exactly one of the four.
- **Not as planned.**
  - A throwaway JVM probe (reflection on the oracle jars, under `$TMPDIR`, not committed) ran every arm with and
    without `-ea`. It agrees with D1 row by row, so the expected values rest on the JVM as well as on the source.
  - **Row 105, correction to the issue text.** With both sides null the Java throws `NoSuchElementException`
    (`RoutingDirector.java:288`), not an NPE: Guava's `get(null)` is an empty list. The port already did the same.
  - Row 96's tests drive `placeLabels` (the Java method), and row 99 has two more tests with `getBaseVector` stubbed,
    since under `-ea` that arm is never the first assert to fire.
- **Decisions.** D0-D6 as planned; four push-forward rows (test forms, D3's local forms) in the journal. No deviation.
- **Gates.** Queue gates 1-7 green:
  - format, typecheck and complexity (no violation);
  - coverage: 1,258 files, 51,964 tests, 98.88 / 97.05 / 98.67 / 98.92;
  - docs build, and CodeQL with no new accepted entry;
  - `test/golden/refs/` untouched against the base.
- **Open.** Nothing: no `needs-ruling` and no `follow-up` issue was filed.
