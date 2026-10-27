<!-- SPDX-License-Identifier: EPL-2.0 -->

# AD-13 re-derivation (nodespacing) — Mission Brief (mission 6c)

## Objective

Mission 6b's decision journal has five `flag` rows (`plans/alg-common-nodespacing/decision-journal.md`, type `flag`):
places where an agent corrected its own hand-derived test expectation after a first failure (T2 `NodeLabelLocation`
input; T3 `applyStuff` port order; T4 two-port `FIXED_RATIO` margins; T5 sideless-port margin; T6 five
`LabelPlacer`/`NodeSizeCalculator` values), plus T4 writing its implementation before its tests. The user decided on
2026-10-26 that the code must match the Java, so each site is treated as a divergence to diagnose
(`~/.claude/rules/diagnosis.md`): the expectation is re-derived from the Java source **and** recorded from the oracle
by a new targeted recorder; the TS is verified against it; every scenario anyone wrote stays a test.

Exit:

- every row of the new `test/golden/refs/java/nodespacing-sites.json` replays at the AD-4 bar;
- each flagged test asserts the oracle value with a comment naming the Java mechanism, and the original inputs of
  the T2 and T4 cases are restored as their own cases (D4);
- each 6b `flag` row has a dated resolution row;
- landed vectors and goldens are unchanged (`node-micro-layout.json` included).

Internal only: no `src/index.ts` export, no provider. Implementation files change only on a proven divergence (D5).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). These also apply: AD-1…AD-16
   (`plans/elk-engine-skeleton/decisions.md`); the standing rules and amendments (`plans/core-metadata/decisions.md`);
   AC1–AC6, P1–P7 (`plans/alg-common/decisions.md`); NS1–NS6, Q1–Q6, U1 (`plans/alg-common-nodespacing/decisions.md`).
3. Read `.agent-notes/alg-common-nodespacing.md` (the four rules hand derivations miss) and
   `.agent-notes/alg-common-nodespacing-planning.md`; state what affects the approach.
4. Branch: if `feature/ad13-rederivation` does not exist, `git switch -c feature/ad13-rederivation` from `main`, then
   `git add plans/ad13-rederivation && git commit -m "docs(plans): add ad13-rederivation mission brief"`; otherwise
   `git switch feature/ad13-rederivation`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/ad13-rederivation`, branched from `main` at or after `51e7235` (the PR 21 merge).

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 10):** keep the per-task history on `feature/ad13-rederivation-backup`; regroup into **at most 3
  commits** (recorder and vectors: T2; tests and replay: T3a, T3b; docs and plan files: T1 note, T4, markers), each
  body listing its task ids; the regrouped tree byte-identical to the backup; each commit typechecks and passes the
  suite alone in a scratch worktree with absolute `ELK_*` dirs (7 corpus tests skip there by design). Journal the
  regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/ad13-rederivation
gh pr create --base main --head feature/ad13-rederivation   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What                                   | Where                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Java spec, `N` = nodespacing           | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/`                        |
| The five flags                         | `plans/alg-common-nodespacing/decision-journal.md`, rows of type `flag` (T2, T3, T4, T5, T6)                             |
| The flagged tests and their fixtures   | see [batch-2/T2-site-recorder.md](batch-2/T2-site-recorder.md) §Scenarios; `test/helpers/*-fixtures.ts`                 |
| Recorder patterns                      | `tools/vectors/{node-micro-layout-vectors.sh,NodeMicroLayoutVectors.java}` (header, classpath, hex, cache, round trip) |
| Replay pattern                         | `src/alg/common/NodeMicroLayoutVectors.test.ts`, `test/helpers/node-micro-layout-replay.ts`                            |
| Oracle                                 | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH                                                                               |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/vector-cache.sh`, `tools/vectors/JavaVectors.java`, any landed file under
  `test/golden/refs/`, or `test/helpers/*-fixtures.ts` (the recorder mirrors them; it does not change them).

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs (check `uptime`; rerun timeout-only failures at normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + 5 s (stop 9)
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/   # only `A refs/java/nodespacing-sites.json`
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T4 is marked done.
- Parallel agents never run `npm run coverage` and never commit.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's).
   Out of bounds: `tools/vectors/{vector-cache.sh,JavaVectors.java}`, landed `test/golden/refs/**`,
   `test/helpers/*-fixtures.ts`, and `src/alg/common/nodespacing/**` implementation (see 4).
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted).
3. **Locked decisions:** a change would contradict D1–D7, NS1–NS6, Q1–Q6, U1, AC1–AC6, P1–P7, AD-1…AD-16 or the
   standing rules.
4. **Divergence found:** a re-derived or oracle value differs from the TS result. The task stops with the diagnosis
   artifact (mechanism, origin `file:line`, causal chain, ruled out) and a proposed fix; the orchestrator decides on a
   `src/` fix. A fix that changes `node-micro-layout.json` or any landed vector or golden is an AD-13 stop for the user.
5. **Divergence without a mechanism:** the `file:line` cannot be named after instrumenting both sides.
6. **Recorder:** not byte-stable across two runs; a row's re-imported input plus steps differs from the hand-built
   scenario; a scenario needs a wider `steps` vocabulary than D7 allows; the work seems to need OpenJDK or Guava source.
7. **Premise disagreement:** the Java agrees with neither the original nor the 6b-corrected literal.
8. **T1 scope:** more than about 10 T4 scenarios are unreached by the 326-row replay.
9. **Suite time:** more than about 5 s added to `npm test` over the [baseline](decisions.md#baseline).
10. **Mission end:** regroup into at most 3 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- Row ids, field names within D7, the `steps` vocabulary while it stays at "set min content area size", "set
  contribution flag", "set cell rectangle".
- Which Java line a test comment cites; comment wording.
- A restored case as a separate `it` or a second assertion.
- Test-local helpers for the replay harness under `test/helpers/` (new files only).
- Unit-test literals equal to the oracle row stay literals, annotated with the row id (D1).
- Reruns of timeout-only gate failures at lower load.
- Wording of journal rows, `.agent-notes/ad13-rederivation.md` observations and commit messages.

## Batch progress

| Batch                      | Name                                    | Tasks   | Depends on | Status |
| -------------------------- | --------------------------------------- | ------- | ---------- | ------ |
| [1](batch-1/overview.md)   | Map T4 branches unreached by the replay | T1      | —          | [x]    |
| [2](batch-2/overview.md)   | Targeted oracle recorder                | T2      | 1          | [x]    |
| [3](batch-3/overview.md)   | Replay test and re-anchored sites       | T3a, T3b | 2         | [x]    |
| [4](batch-4/overview.md)   | Docs, journal closure, roadmap          | T4      | 3          | [x]    |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-10-27)

**Tasks:** 5 planned tasks (T1, T2, T3a, T3b, T4), one commit each, plus `docs(plans)` batch markers. T1 and T4 ran in
the main session; T2 ran on java-architect (Sonnet), T3a and T3b on typescript-pro (Sonnet, in parallel). Two stops
needed the user: stop 8 at T1 (13 unreached T4 scenarios, more than about 10) and stop 6 at T2 (port ratios cannot
travel in ELK JSON). Both were resolved by execution decisions E1–E3.

**Exit evidence:**

- `test/golden/refs/java/nodespacing-sites.json` has 23 rows: `labelLocation` 2, `applyStuff` 1, `fixedRatioMargins`
  2, `sidelessPortMargins` 1, `insideLabels` 1, `allConstraints` 1, `collapsedContainers` 1, `t4` 14. JDK 21.0.1,
  oracle `8aaa3c14`.
  - The recorder is byte-stable (cold = recorded = cached).
  - Every row's re-imported input plus steps reproduces the hand-built Java scenario.
  - All 23 rows replay at the AD-4 bar on the first run (`NodespacingSiteVectors.test.ts`).
- Each flagged test asserts its oracle value, with a comment naming the row id and the Java mechanism.
- The D4 restored cases have their own tests: `{OUTSIDE, V_TOP, H_LEFT, H_PRIORITY}` → `OUT_L_T`, and 2-port
  `FIXED_RATIO` → margins `[[0,0],[0,0]]`, size 24.
- Each 6b `flag` row has a dated `resolved` row.
- Landed vectors and goldens are unchanged: `regen-goldens.sh` (both sets) leaves `test/golden/refs/` byte-identical,
  and the refs diff against `main` is `A refs/java/nodespacing-sites.json` only.
- No divergence was found, and no `src/` implementation file changed.

**Decisions:** D1–D7 as planned, plus E1 (all 14 `t4` rows), E2 (`setPortMargin` step) and E3 (`setPortRatio` step).
Push-forward choices are journaled:
- harness `site` names for the `t4/*` rows;
- expected shapes that are supersets of the TS assertions;
- the 980-line single-file recorder, with the same precedent as 6a/6b;
- one added assertion (`t4/p-begin-end` NORTH ys).

The orchestrator corrected one agent-reported Java citation (`NodeContext.java:250-252`).

**Quality gates:** every batch gate is in the journal: `format:check`, `typecheck` and `complexity` clean;
`test/architecture` 141 passed; `coverage` green (485 files, 20,872 passed + 69 skipped; 99.22/97.22/98.93/99.23).
`npm test` took 54.6 s against the 54.4 s baseline, so stop 9 did not trip. `npm run docs:build` is green.

**Follow-ups:**
- **7a:** the `node-micro-layout.json` sweep never sets a port alignment or a north/south border offset, so an
  end-to-end replay should cover them.
- **Unpinned by oracle rows:** the OUTSIDE arm (36) of the FIXED_RATIO end-margin `it.each`, and the vertical-axis
  `PortPlacementCalculator` cases. They still hold hand-derived literals.
- **Tooling:** `PORT_RATIO_OR_POSITION` needs a side channel in any ELK JSON based vector.

The roadmap revision dated 2026-10-27 (ad13-rederivation) records the same.
