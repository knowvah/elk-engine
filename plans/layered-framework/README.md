<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered framework — Mission Brief (mission 7a)

## Objective

Port the framework of `org.eclipse.elk.alg.layered` that every later layered sub-mission (7b–7h) builds on: the
options package (35 classes plus the generated `LayeredOptions`/`LayeredMetaDataProvider`), the LGraph model
(`graph`, 13 classes), the ElkGraph ↔ LGraph transform (`graph.transform`, 4 classes), `LayeredLayoutProvider`,
`LayeredPhases`, `IHierarchyAwareLayoutProcessor` and `components/ComponentOrderingStrategy`. Classes that 7a code
references but later missions own are **staged** (L1). The orchestrators move to 7f (L2).

Exit:

- every row of the new `test/golden/refs/java/layered-framework.json` replays at the AD-4 bar: `transform`
  (import + transfer round trip), `adapters` (node sizing over `LGraphAdapters`), `metadata` (service state with
  layered registered, L5);
- the registered layered option set equals the `LayeredMetaDataProvider`/`LayeredOptions` calls in `metadata.json`;
- every unreached branch found by T9 is pinned by a `layered-sites.json` row and an anchored test (L4);
- the portable `LayeredSpacingTest` cases pass unchanged;
- `staged-classes.json` lists every staged file; landed vectors and goldens are unchanged.

Internal only: no `src/index.ts` export; `getInstance()` unchanged (C8, L5).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); the earlier decision sets they
   name also apply.
3. Read `.agent-notes/` entries for `alg-common`, `alg-common-nodespacing`, `ad13-rederivation` and `core-*`; state
   what affects the approach (graph adapters caching ports, no `setProperty` during `eAllContents()`, the four
   hand-derivation rules).
4. Branch: if `feature/layered-framework` does not exist, `git switch -c feature/layered-framework` from `main`, then
   `git add plans/layered-framework && git commit -m "docs(plans): add layered-framework mission brief"`; otherwise
   `git switch feature/layered-framework`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-framework`, branched from `main` at or after `1458f8b` (the PR 22 merge).

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 13):** keep the per-task history on `feature/layered-framework-backup`; regroup into **at most 5
  commits**, each body listing its task ids:
  1. `test(layered): record framework and site vectors from the oracle` — T1, T10;
  2. `feat(layered): port the options and the lgraph model` — T2–T5;
  3. `feat(layered): port the graph transform and the layout provider` — T6–T8;
  4. `test(layered): anchor unit tests on oracle site rows` — T11a–T11d;
  5. `docs(layered): ...` — brief, T9 note, T12, batch markers.

  The regrouped tree is byte-identical to the backup; each commit typechecks and passes the suite alone in a scratch
  worktree with absolute `ELK_*` dirs (corpus tests skip there by design). Journal the regroup on both branches. Then
  hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-framework
gh pr create --base main --head feature/layered-framework   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| `.melk` source | `tools/melk/sources/Layered.melk` (vendored) |
| Recorder patterns | `tools/vectors/{NodeMicroLayoutVectors,NodespacingSiteVectors,MetaDataVectors}.java` and their `.sh` |
| Replay patterns | `test/helpers/{node-micro-layout-replay,nodespacing-site-replay}.ts`, `test/melk/{recorder,helpers}.ts` |
| Models | `test/corpus/elkt-curated/**/*.elkt` (31), `test/golden/inputs/tickets/core/*.elkt` (4), `test/golden/inputs/realworld/**` (manifest rows) |
| Oracle | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, any landed file under `test/golden/refs/`, or
  `test/helpers/*-fixtures.ts`.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs (check `uptime`; rerun timeout-only failures at normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk             # all pass (staged-classes, bundle deps, freshness)
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + 5 s (stop 12)
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/   # only A refs/java/layered-*.json
npm run melk:generate Core Labels Polyomino \
  && git diff --exit-code src/core/options src/core/labels src/alg/common/compaction/options   # S4
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T12 is marked done.
- Parallel agents never run `npm run coverage` and never commit; the orchestrator commits per task.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's).
   Off limits: `tools/vectors/{vector-cache.sh,JavaVectors.java}`, landed `test/golden/refs/**`,
   `test/helpers/*-fixtures.ts`, `src/core/**`, `src/graph/**`, `src/alg/common/**`; `tools/melk/**` except under S4.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted).
3. **Locked decisions:** a change would contradict L1–L7, S1–S4, earlier missions' decisions or AD-1…AD-16, including
   any change to `LayoutMetaDataService.getInstance()`.
4. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a
   numeric expectation that would have to be hand-derived (L4); `layered-framework.json` needing re-recording after
   T6 has started replaying it.
5. **Divergence without a mechanism:** a TS result differs from an oracle row and the `file:line`, causal chain and
   ruled-out evidence cannot be named after instrumenting both sides.
6. **Recorder:** not byte-stable across two runs; the re-import self-check fails; a model is missing; the `metadata`
   group disagrees with the layered calls in `metadata.json` (i); the work seems to need OpenJDK or Guava source.
7. **Staged classes:** a staged class needs a member 7a code does not reference; a replay row reaches a throwing
   staged method; a forward reference the [inventory](batch-2/T3-lgraph-and-options-core.md#staged-classes) missed.
8. **Hash order:** a replay mismatch traced to iteration order at one of the 5 identity-hash sites
   (`ElkGraphImporter` ×3, `Tarjan` ×2).
9. **Out-of-bounds dependency:** an API beyond the Java surface (test-local helpers excepted); any `src/index.ts`
   export; a runtime dependency; a Node built-in in `src/`; an import `bundle-deps.json` forbids.
10. **Complexity:** a file cannot meet the limits with splits at Java method or section boundaries. Watch
    `ElkGraphImporter`, `LGraphUtil`, `ElkGraphLayoutTransferrer`, `LGraphAdapters`, `LNode`.
11. **Coverage:** T9 finds more than about 15 unreached scenarios; or 7a branch coverage stays below 90 % after T11
    and the remaining branches cannot be reached by an oracle row.
12. **Suite time:** more than about 5 s added to `npm test` over the [baseline](decisions.md#baseline) at similar load.
13. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- **Splits:** private helpers at Java method, section, switch-arm or loop boundaries (Java order and names kept);
  section modules behind a facade (P1); nested types in prefixed files (M15); overload names per
  `docs/architecture/alg-common.md` §6.5.
- **Recorder content within L3:** sweep shape and seeds, dump-format details, JSON field names, trimming the sweep to
  ≤ 5 MB (curated and ticket model rows are never trimmed).
- **melk generator edits** under S4.
- **Staged-class wording:** marker text and exception messages.
- **AD-10:** identity-hashed sites use insertion order, one journal row each.
- **AC6:** explicit stack, proven against a recursive reference in the test.
- **Java-derived values (L4):** enum constants, option ids, defaults.
- **Java quirks:** unreachable branches kept, journaled; `assert` sites use the dev-only helper.
- **Housekeeping:** new test-local helpers under `test/helpers/`; prose typos per the CLAUDE.md carve-out;
  1–3 line pre-existing fixes in touched files; timeout-only reruns at lower load; wording of tests, journal rows,
  `.agent-notes/layered-framework.md` and commit messages.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Framework recorder, plain option enums | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | LGraph model, options core, staged classes | T3 | 1 (T2) | [x] |
| [3](batch-3/overview.md) | `LayeredSpacings`; `LGraphAdapters` and `Tarjan` | T4, T5 | 2 | [x] |
| [4](batch-4/overview.md) | Graph transform and transform replay | T6 | 1 (T1), 3 | [x] |
| [5](batch-5/overview.md) | Provider and metadata; adapters replay | T7, T8 | 4 | [x] |
| [6](batch-6/overview.md) | Replay-alone coverage map | T9 | 5 | [x] |
| [7](batch-7/overview.md) | Site recorder (22 scenario groups, X5) | T10 | 6 | [x] |
| [8](batch-8/overview.md) | Site replay and anchored unit tests | T11a, T11b, T11c, T11d | 7 | [x] |
| [9](batch-9/overview.md) | Docs, roadmap, summary | T12 | 8 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Session summary (2026-10-27, halted after batch 6)

**Status:** stopped at stop 11 after T9, by the user's decision X5 (literal L4 reading): every unreached branch needs an
oracle site row, which exceeds the ~15-scenario cap, so T10 (site recorder) and T11 (anchored tests) need re-planning
before they run. T12 and the stop-13 regroup were not started; the branch keeps its per-task history.

**Tasks:** 9 of 12 done — T1–T9, plus `fix(T1)`/`fix(T8)` for X4. Batches 1–6 marked `[x]`; 7–9 open.

**Decisions:** five user decisions during the run (decisions.md X1–X5): X1 origin-identifier section file, X2 exception
registration, X3 pending-provider tripwire and held-back algorithm classes, X4 re-recorded adapters group (the first
recording was vacuous: `LGraphAdapter.getNodes()` walks layers only), X5 literal L4 scope. Flagged for review in the
journal: the `IHierarchyAwareLayoutProcessor` brand (only TS-only surface), `ExternalPortDummyArgs` parameter object,
`NON_LEAF_DEFAULT_TYPES` generator rule, the melk recorder's `List<Integer>` limitation (worked around in tests).

**Gates:** green after every batch (format, typecheck, complexity, architecture + melk, coverage ≥ 90/90/90/90, S4
byte-identity, refs diff = only `A refs/java/layered-framework.json`); `npm test` 71.4 s vs 75 s baseline (stop 12
clear). The mission-end `regen-goldens.sh` check was not run (mission not at its end).

**Follow-ups:** re-plan T10/T11 from `unreached.md` (15 numeric scenarios S1–S15 + structural candidates S16–S22);
T12 docs/roadmap; then the stop-13 regroup and the user's signed rebase.

## Re-plan of batches 7 and 8 (2026-10-28, under X5; awaiting X6)

T10 now records the 22 scenario groups of `unreached.md` (S1–S15 numeric, S16–S22 structural) through a single step
interpreter whose rows T11a replays generically ([batch-7/T10-site-recorder-x5.md](batch-7/T10-site-recorder-x5.md)).
T11 splits into four parallel tasks with disjoint write-sets: T11a (replay helper + replay test), T11b (graph classes),
T11c (transform sections, provider, hierarchy-aware marker), T11d (options, enums, target filter, node flexibility)
([batch-8/overview.md](batch-8/overview.md)). The original briefs stay in place, marked superseded.

Proposed **X6** (user): stop 11's "about 15 scenarios" becomes "the 22 groups S1–S22" (a 23rd group is a stop; rows per
group are free within L3's 5 MB); the U list (4 branches) and the X arms (31) stay untested; TS-only arms with no Java
counterpart (the `isHierarchyAwareLayoutProcessor` null/primitive guards) and the provider's `isCanceled` arm (reachable
only after 7f) are journaled, not anchored; the provider rows record the oracle's full layout output for 7f to replay
while 7a asserts the staged throw; landing commit 4 lists T11a–T11d.

## Mission summary (2026-10-28)

**Tasks:** 12 planned tasks done (T1–T12) over two sessions (2026-10-27 batches 1–6; 2026-10-28, after the out-of-memory
crash, the X5 re-plan and batches 7–9), one commit each plus fix commits (`fix(T1)`, `fix(T8)` for X4; `fix(T10)` for
the fixed-placement rows; `fix(T3)` for X7) and `docs(plans)` markers. T9 and T12 ran in the main session; T1 and T10
on java-architect (Sonnet); T2–T8 and T11a–T11d on typescript-pro (Sonnet; batches 1, 3, 5 and 8 in parallel). Seven
user decisions during the run (X1–X7); stops: 7 + 1 (T3 forward reference), 1 (T3 exception registration), 4 (T3
tripwire), 4 (T9 vacuous adapters replay), 3/11 (T9 literal L4 reading), 4 (T11 port-side view). The orchestrator
wrongly rejected two valid citations (AD-16b, elkgraph-model D10) during T11a review and corrected both the same turn.

**Exit evidence:**

- `test/golden/refs/java/layered-framework.json`: 272 rows (`transform` 129, `adapters` 142, `metadata` 1), JDK 21.0.1,
  oracle `8aaa3c14`, re-recorded once (X4), byte-stable; all rows replay at the AD-4 bar on the first run after X4.
- The registered layered option set equals the `LayeredMetaDataProvider`/`LayeredOptions` calls in `metadata.json`
  (449 calls; `test/melk/layered-options.test.ts`, `layered-registry.test.ts`); `PENDING_TYPES` is empty.
- `test/golden/refs/java/layered-sites.json`: 330 rows in the 22 scenario groups of `unreached.md` (X5/X6), byte-stable,
  strict JSON, one step interpreter; `LayeredSiteVectors.test.ts` replays all 330; 330 colocated cases cite a row id;
  every branch of the T9 table is anchored or in the unreachable list (`unreached.md` § Amendments).
- `LayeredSpacingTest`: 15 of 16 cases unchanged (`AfterLayoutTest` → 7f, S1).
- `test/architecture/staged-classes.json` lists the 9 staged files; the fitness test keeps markers and list in sync.
- Landed vectors and goldens unchanged: both `regen-goldens.sh` sets leave `test/golden/refs/` byte-identical; the refs
  diff against `main` is `A refs/java/layered-framework.json` + `A refs/java/layered-sites.json`.
- No `src/index.ts` export; `getInstance()` unchanged (L5, C8).

**Decisions:** L1–L7, S1–S4 as planned; X1–X7 during the run. Flagged for review: the `IHierarchyAwareLayoutProcessor`
brand (the only TS-only surface), the `ExternalPortDummyArgs` parameter object, the `NON_LEAF_DEFAULT_TYPES`
generator rule, the melk recorder's `List<Integer>` limitation, the 4,643-line single-file T10 recorder.

**Divergences found and fixed at origin:** two, both caught by oracle rows (X4 vacuous adapters replay; X7 port-side
view bounds). None numeric. Known divergences open by design are in `docs/conformance.md#alg-layered-framework`.

**Quality gates:** green after every batch (journal): `format:check`, `typecheck`, `complexity` clean; architecture +
melk 403; `coverage` exit 0 (584 files, 22,907 passed + 70 skipped; 99.25 / 97.34 / 99.00 / 99.26); S4 byte-identical;
stop 12: `npm test` 79.4 s at load 19.7 vs the 75 s baseline at ~15; `npm run docs:build` green; both `regen-goldens.sh`
sets byte-identical.

**Follow-ups:** in `plans/roadmap.md` § Revision 2026-10-28 (L2/S1/S2/S3/L6 scope moves, the staged-class list, the
7b/7c/7f hand-offs, the tooling notes).

