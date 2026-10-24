<!-- SPDX-License-Identifier: EPL-2.0 -->

# Core engine + simple providers — Mission Brief (mission 5a; roadmap row 5)

## Objective

Port the layout-running half of `org.eclipse.elk.core` to `src/core/`: `RecursiveGraphLayoutEngine`,
`LayoutAlgorithmResolver`, `GraphValidator`, `TopdownSizeApproximator{,Util}`, `TestController`, the two progress
monitors, `AlgorithmFactory`, the rest of `ElkUtil`, the small interfaces and exceptions they need, and the three
simple providers `FixedLayoutProvider`, `BoxLayoutProvider`, `RandomLayoutProvider`. Emptying `PENDING_TYPES`
registers `fixed`, `box` and `random` exactly as the oracle's core-only registry does, which retires every mission-5
placeholder left by missions 3, 4 and 4b. Exit (roadmap row 5): the first TS layouts — curated fixed/box/random
goldens — equal the oracle within 1e-6 (AD-4), the ported `core.test` cases pass, and a local comparison of
898 retarget cases per algorithm is counted in `docs/conformance.md` (M5). The rest of `core` (comments, splines,
`alg/*` beyond `ILayoutProcessor`, `ElkMath`, adapters, selection, `ElkSpacings`, `LayoutConfigurator`) is mission
5b (M1). Internal only: nothing is exported from `src/index.ts` (AD-14).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). AD-1…AD-16
   (`plans/elk-engine-skeleton/decisions.md`), C1–C10 and the standing rules and amendments
   (`plans/core-metadata/decisions.md`), J-decisions (`plans/elk-json-adapter/decisions.md`), 4b's G1–G8
   (`plans/graph-text/decisions.md`) and corpus D0–D10 (`plans/conformance-corpus/decisions.md`) apply.
3. Read `.agent-notes/` (at least `core-metadata.md`, `elkgraph-model.md`, `elk-json-adapter.md`, `grandom.md`,
   `conformance-corpus.md`) and state what affects the approach.
4. If the branch does not exist: `git switch -c feature/core-engine` from `main`, then
   `git add plans/core-engine && git commit -m "docs(plans): add core-engine mission brief"`.
   Otherwise `git switch feature/core-engine`.
5. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing

`feature/core-engine` off `main`. One **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional
Commits, ≤72 chars, lowercase, no attribution), plus one `docs(plans): mark batch N done` per batch. The journal cites
task ids, never SHAs. The executor **never signs, pushes, opens a PR, or merges**. At mission end it stops (stop 13)
and hands the user these commands (YubiKey PIN + touch per commit):

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/core-engine
gh pr create --base main --head feature/core-engine   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit" (never rebase: it drops signatures)
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK core Java (the spec); `J` below | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/` |
| ELK core tests | `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/` |
| graph.json tests (deferred cases) | `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/*.xtend` |
| `.melk` codegen and its runbook | `tools/melk/`, `docs/architecture/melk-codegen.md` |
| Oracle (goldens, sweep) | `tools/oracle/{README.md,regen-goldens.sh,sweep.sh,run.sh}`, `tools/oracle/harness/GraphOverlay.java` |
| Corpus | `$ELK_MODELS_DIR` pinned in `test/corpus/manifest.json` |
| Patterns to mirror | `src/core/data/**`, `src/core/util/{InstancePool,LoggedGraph}.ts`, `test/golden/compare-json.ts` |
| JDK | JDK 21 on PATH; Maven 3.9 only if the oracle must be rebuilt |

**AD-9:** never read OpenJDK or Guava source (Javadoc + vectors only). **Never edit
`tools/vectors/vector-cache.sh`** (it salts every cache entry; the `.elkj` re-record is ~2.8 CPU-hours).

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>` + `npm run complexity`. The
orchestrator runs, after every batch, **alone** (never concurrently with JVM gates — coverage times out under load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + ~10 s (stop 12)
git diff --exit-code main -- test/golden/refs/java/ test/corpus/generated/   # landed vectors/corpus frozen (AD-13)
# from batch 1 on: both golden sets byte-stable
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/
# after batch 5: no placeholder and no pending type left (stops 11)
! grep -rn 'BOX_GROUPING_PLACEHOLDER' src/ && grep -q 'PENDING_TYPES: readonly string\[\] = \[\];' tools/melk/config.ts
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit (shared index); the orchestrator
commits per task. `npm run docs:build` green before T20 is marked done.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (colocated `.test.ts` implicit; complexity-only
   rewrites excepted — see push-forward).
2. The same gate check fails twice in a row.
3. A change would contradict M1–M9, AD-1…AD-16, C1–C10, J-decisions, G1–G8 or the standing rules.
4. AD-13: any byte diff in a landed ref or vector, or a test that can only pass by changing its assertion — the M9
   tripwire edits excepted; a golden/vector regeneration not traced to registry state (M7).
5. A TS result differs from a golden or vector and the mechanism (`file:line`, causal chain, ruled out) cannot be
   named — instrument the oracle and dump values first; never edit the expected value. Includes a `Random`
   draw-order or float divergence in `random`.
6. A shim's behaviour is undecidable from Javadoc + existing vectors, or the work seems to need OpenJDK or Guava
   source (AD-9).
7. Oracle: `regen-goldens.sh` is not byte-stable across two runs; a chosen golden case is nondeterministic or throws
   and no replacement exists; T19's sweep outputs cannot be produced.
8. An API beyond the Java surface, test-local helpers and `applyOverlay` seems needed — or any `src/index.ts` export.
9. A runtime dependency or a non-EPL-compatible dev dependency seems necessary.
10. A file cannot meet the complexity limits with splits at Java method/section boundaries (watch
    `layoutRecursively`, 316 Java lines, and the Box placement methods).
11. The T12 grouping placeholder survives T13, or a task before T13 needs a grouping `PackingMode` to pass.
12. The mission adds more than ~10 s to `npm test` over the baseline in [decisions.md](decisions.md#baseline)
    (compare at similar load), or one golden layout takes > 1 s in TS.
13. Mission end: stop and hand over the landing commands above.

## Push-forward — decide and journal

- Which golden models (~3 per algorithm within M4), and replacing a golden case the oracle rejects.
- Private helper splits inside a Java method at section boundaries for complexity, Java order kept; Java names stay.
- Complexity-only, semantics-neutral rewrites, also outside the write-set; verify with `npm run complexity`.
- The T12 placeholder message, as long as it contains `BOX_GROUPING_PLACEHOLDER`.
- ELK prose typos per the CLAUDE.md carve-out, listed in `docs/conformance.md`.
- T19 report layout; triaging corpus mismatches into known divergences when the mechanism is named.
- Test names, commit messages, journal wording, `.agent-notes/core-engine.md` entries.
- A 1–3 line pre-existing-violation fix in a file already being touched (grep references first).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1](batch-1/overview.md) | Types, monitors, ElkUtil 1, golden data, Property seam | T1–T5 (+T7) | — | [x] |
| [2](batch-2/overview.md) | ElkUtil 2, TestController, Fixed | T6–T8 | 1 | [x] |
| [3](batch-3/overview.md) | Resolver, Random | T9–T10 | 2 | [x] |
| [4](batch-4/overview.md) | GraphValidator, Box A | T11–T12 | 3 | [x] |
| [5](batch-5/overview.md) | Box B, TopdownSizeApproximator, graph.text stand-ins | T13–T15 | 4 | [x] |
| [6](batch-6/overview.md) | RecursiveGraphLayoutEngine | T16 | 5 | [x] |
| [7](batch-7/overview.md) | Layout goldens + issues; JSON deferrals | T17–T18 | 6 | [x] |
| [8](batch-8/overview.md) | Corpus comparison; docs + roadmap | T19–T20 | 7 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-10-23)

**Tasks:** 20/20 planned tasks landed, one commit each (`T1`…`T20`), plus three fix commits (`fix(T2)` deprecation
scope, `fix(T14)` lazy dependency constants per M16, `fix(T19)` translation-compatible fences) and four
`docs(plans)` batch markers. T7, T9 and T11 ran one batch early (dependency-safe reorders, journaled).

**Exit evidence (roadmap row 5):** all 9 fixed/box/random oracle goldens equal the TS layouts within 1e-6 (T17,
0.6–3 ms per layout); ported JUnit/Xtend cases green (`ElkUtilTest`, `GraphValidatorTest`, three of four
`RecursiveGraphLayoutEngineTest` cases, `Issue457Test`, `Issue489Test`, `PropertyTest` seam, the two J6 JSON tests,
the two C10 content-assist tests); corpus comparison (T19, `docs/conformance.md#core-layouts-fixed-box-random`):
geometry equal on all 2,282 cases both sides lay out; the 497 mismatches are option keys of unported bundles and the
18 TS-only throws need the default `layered` (both close with mission 7h); 372 random cases excluded as oracle
nondeterministic. The 11 deferred `.elkt` validator rows replay unchanged (M7); no vector or landed ref changed.

**Decisions:** M1–M9 as planned; eight user decisions during execution (M10 ElkUtil split, M11 ElkRectangle into 5a,
M12 lazy algorithm option constants, M13/M14 registry-independent stub tests, M15 Box split, M16 lazy dependency
constants, M17 engine split). Flagged for review: the `random-seed-1` variant grows native/generated sweep tiers
(T4 journal row); `AbstractLayoutProvider.initialize` and `IElkProgressMonitor` getters are typed non-null where Java
passes/returns `null` (`.agent-notes/core-engine.md`); `test/melk/held-back.ts` remains as identity filters.

**Quality gates (final, whole branch):** format:check 0; typecheck 0; complexity clean (543 files, 4,480
functions); coverage 0 — 363 files, 18,868 passed + 68 skipped, 99.36/97.52/99.29/99.38 (162 s at load ~30–50 from
another project; the mission's 45 new/changed test files take ~3.5 s apart from the pre-existing `.elkt` sweep, whose
A/B against `main` at equal load was 77/62 s vs 74/78 s — stop 12 not triggered); landed vectors/corpus frozen; both
golden sets byte-stable; no `BOX_GROUPING_PLACEHOLDER`, `PENDING_TYPES` empty, no `MISSION5`; `docs:build` green.

**Follow-ups:** 5b `core-remainder` (roadmap revision 2026-10-23, without `ElkRectangle`); rerun
`tools/corpus/ts-layout-compare.ts` after 7h; `testEmptyAlgorithmId` in 7a; showcase entries for the algorithm
goldens; widen the two non-null-typed signatures above; a `devAssert` helper (`docs/translation-rules.md` §6.8) for
the `assert` comment sites.
