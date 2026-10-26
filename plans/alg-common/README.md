<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.common (part a) — Mission Brief (mission 6a; roadmap row 6)

## Objective

Port `org.eclipse.elk.alg.common` to `src/alg/common/`, except `nodespacing/**` and `NodeMicroLayout`, which are
mission 6b (AC1):
- the root geometry (`BowyerWatsonTriangulation`, `NaiveMinST`, `RectilinearConvexHull`, `TEdge`, `TTriangle`, `Point`,
  `Tree`, `ICostFunction`);
- `utils`, `networksimplex`, `compaction` (with `oned` and `options`), `overlaps`, `polyomino` (with `structures`) and
  `spore`;
- `PolyominoOptions`, generated from the vendored `Polyomino.melk`.

The packages without Java tests get evidence from a new oracle recorder (AC3).

Exit (roadmap row 6, as split by AC1):
- these JUnit ports are green: `RectilinearConvexHullTest`, `NetworkSimplexTest`, `OneDimensionalCompactorTest` and
  `Issue475Test`;
- the `NaiveMinST` replay matches the JVM's `HashSet` tie order (V6–V8);
- every `alg-common.json` scenario replays exactly.

The other 4 test files need layered and are roadmap follow-ups (P5). Internal only: nothing is exported from
`src/index.ts` (AD-14), and no algorithm provider is ported.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). These also apply:
   - AD-1…AD-16: `plans/elk-engine-skeleton/decisions.md`
   - C1–C10 and the standing rules: `plans/core-metadata/decisions.md`
   - J-decisions: `plans/elk-json-adapter/decisions.md`; G1–G8: `plans/graph-text/decisions.md`
   - D1–D9: `plans/grandom/decisions.md`; M1–M17: `plans/core-engine/decisions.md`
   - R1–R7 plus the two R2 amendments: `plans/core-remainder/decisions.md` and `plans/core-remainder/decision-journal.md`
3. Read `.agent-notes/` (at least `alg-common-planning.md`, `core-remainder.md`, `core-engine.md`,
   `vector-cache-and-key-line.md`) and state what affects the approach.
4. Set up the branch:
   - If `feature/alg-common` does not exist: `git switch -c feature/alg-common` from `main`, then
     `git add plans/alg-common .agent-notes/alg-common-planning.md && git commit -m "docs(plans): add alg-common mission brief"`.
   - Otherwise: `git switch feature/alg-common`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.
   Sub-batches with the same number (1a/1b, 2a/2b) run together.

## Branch and landing

Work happens on `feature/alg-common`, branched from `main`.

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus one `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 12):**
  1. Keep the per-task history on a local `feature/alg-common-backup` branch.
  2. Regroup into **at most 5 commits** by layer, each body listing its task ids. The regrouped tree must be
     byte-identical to the backup.
  3. Verify that each commit typechecks and passes the suite on its own. Use a scratch worktree with absolute
     `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR` and `ELK_MODELS_DIR` (the defaults are repo-relative).
  4. Journal the regrouping on both branches.
- The executor **never signs, pushes, opens a PR, or merges**. At the end it hands the user these commands:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/alg-common
gh pr create --base main --head feature/alg-common   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit" (never rebase: it drops signatures)
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK `alg.common` Java (the spec), called `J` below | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/` |
| ELK `alg.common` tests, called `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/` |
| Oracle (T4) | `$ELK_ORACLE_DIR`; pattern `tools/vectors/{comment-vectors.sh,CommentVectors.java}` + `vector-cache.sh` |
| Corpus model for `Issue475Test` | `$ELK_MODELS_DIR/tickets/core/475_fixedLayoutWithLongLabels.elkt` |
| Collections inventory (AD-10) | `docs/translation-rules-collections.md` §2.1 (V6–V8), §2.2 (I-rows, next free I38) |
| Translation rules | `docs/translation-rules.md` §6.2, §6.3, §6.5, §12 (JDK shims) |
| Patterns to mirror | `src/core/comments/*` (5b ports), `src/core/math/ElkMath*.ts` (section modules), `src/java/util/{JavaHashMap,JavaHashSet,HashStrategy}.ts` |
| JDK | JDK 21 on PATH |

- **AD-9:** never read OpenJDK or Guava source; use the Javadoc plus vectors only. EMF source (EPL) may be read.
- **Never edit `tools/vectors/vector-cache.sh`, `tools/vectors/JavaVectors.java`**, or any landed vector or golden.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs. Check `uptime` first: timeout-only failures at high foreign load are rerun at normal load (stop 2).

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + ~10 s (stop 11)
git diff --name-status main -- test/golden/refs/ test/corpus/   # only `A` lines (new vector files)
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` must be green before T13 is marked done.
- Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit (shared index).

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the current task's write-set needs changing. Colocated `.test.ts` files count as part
   of the task. Complexity-only rewrites are excepted.
2. **Repeated failure:** the same gate check fails twice in a row. Timeout-only failures at high foreign load
   don't count; rerun at normal load.
3. **Locked decisions:** a change would contradict AC1–AC4, P1–P7, AD-1…AD-16, earlier missions' decisions
   (C, J, G, D, M, R) or the standing rules.
4. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a
   JUnit expectation that disagrees with the port.
5. **Divergence without a named mechanism:** a TS result differs from a JUnit expectation or an `alg-common.json` row
   and the mechanism (`file:line`, causal chain, ruled out) cannot be named. Instrument the oracle first.
6. **Codegen:** generating `Polyomino` changes any generated file other than `PolyominoOptions.ts`,
   `PolyominoOptions` needs a hand edit, or `DEFAULT_BUNDLES` would have to change (`test/melk/emit.test.ts:110`).
7. **Hash order:** a V6/V7/V8 replay mismatch traced to `JavaHashSet`/`JavaHashMap` or `KVector.hashCode`; or an
   identity-hashed site (AD-10) that changes an observable result in a JUnit case or a vector.
8. **Oracle and vectors:** a recorder is not byte-stable across two runs; a scenario has a tie that cannot be designed
   out (other than the intended `NaiveMinST` ties); the work seems to need OpenJDK or Guava source (AD-9).
9. **Out-of-bounds dependency:** an API beyond the Java surface (test-local helpers excepted), any `src/index.ts`
   export, a runtime dependency, a Node built-in in `src/`, or an import the bundle-dependency fitness map forbids.
10. **Complexity limits:** a file cannot meet them with splits at Java method or section boundaries. Watch
    `OneDimensionalCompactor`, `NetworkSimplex`, `PlanarGrid`, `RectangleStripOverlapRemover`, `PolyominoCompactor`.
11. **Suite time:** the mission adds more than about 10 s to `npm test` over the [baseline](decisions.md#baseline) at
    similar load.
12. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- **Overloads and splits:** naming per §6.5; private helper splits at Java section boundaries for complexity, keeping
  Java order and names; nested classes and enums in prefixed files (M15).
- **AD-10 sites:** identity-hashed → `Map`/`Set` in insertion order; journal each site and draft its I-row (T13 lands
  them).
- **Test content:** T4 case design, seeds, input shapes and JSON field names within AC3; unit-test cases derived from
  the Java source where no JUnit exists.
- **Unreachable branches and `/*d*/` lines:** keep them (AC4); journal any that cannot run.
- **Helpers and prose:** test-local helpers under `test/helpers/`; ELK prose typos per the CLAUDE.md carve-out, listed
  in `docs/conformance.md`.
- **Pre-existing violations:** a 1–3 line fix in a file already being touched, after grepping for references.
- **Wording:** test names, commit messages, journal and `.agent-notes/alg-common.md` entries.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1a](batch-1a/overview.md) | Options codegen, primitives, network simplex graph | T1–T3 | — | [x] |
| [1b](batch-1b/overview.md) | Oracle recorder, Issue475, polyomino structures | T4–T6 | — | [x] |
| [2a](batch-2a/overview.md) | NetworkSimplex, root algorithms, compaction.oned | T7–T9 | 1a, 1b | [x] |
| [2b](batch-2b/overview.md) | Overlaps, spore, polyomino compactor | T10–T12 | 1a, 1b | [x] |
| [3](batch-3/overview.md) | Docs, inventory and roadmap | T13 | 2a, 2b | [x] |

## Mission summary (2026-10-26)

**Tasks:** 13 planned tasks (`T1`…`T13`), one commit each, plus `docs(plans)` batch markers. T5 stopped once (stop 1:
the vendored ticket model) and resumed after the user's AC5 decision; T7 stopped once at the batch-2 gate (stack depth)
and resumed after the user's AC6 decision.

**Exit evidence (roadmap row 6, as split by AC1):** the listed JUnit ports are green (`RectilinearConvexHullTest`,
`NetworkSimplexTest`, `OneDimensionalCompactorTest` 17 of 17, `Issue475Test`). Every `alg-common.json` scenario replays
exactly: `triangulation` 22, `polyomino` 108 (3 rows expect `IndexOutOfBoundsException`), `overlaps` 34 and `spore` 18
(8 scanline, 10 depth-first compaction). V6-V8 are implemented and proven by the 22 `triangulation` rows (edge
iteration order and both cost trees, including the all-ties `constant` cost). Landed vectors, goldens and corpus are
unchanged: only `refs/java/alg-common.json` was added.

**Decisions:** AC1-AC4 and P1-P7 as planned. Two user decisions during execution: AC5 (vendor the 475 model and add it
to `TICKET_INPUTS`, an AD-13 change) and AC6 (input-depth recursions become explicit-stack loops proven against a
verbatim recursive reference; first case `NetworkSimplex`). Identity-hashed sites are in insertion order with inventory
rows I38-I41 in `docs/translation-rules-collections.md` (`NGraph.java:56`, `GreedyRectangleStripOverlapRemover.java:33`,
`CGroup.java:66`, `OneDimensionalCompactor.java:500`; all lookup only). Known divergences and upstream quirks are in
`docs/conformance.md#alg-common`.

**Quality gates:** batch 1 and batch 2 gates are recorded in the decision journal (format:check, typecheck and
complexity clean; coverage green, last at 455 files, 19,991 passed + 69 skipped, 99.17 % lines, 97.01 % branches,
99.18 % functions; `npm test` 54.0-63.1 s against the 54.6 s baseline at load 6.6-11.6). Task T13 added docs only
(`docs:build` and the architecture fitness test checked by the task). Final gates and landing: see the orchestrator
entry below.

**Final gates (orchestrator, 2026-10-26):** `regen-goldens.sh` (both sets) byte-identical; `format:check`, `typecheck`,
`complexity`, `docs:build` clean; `coverage` green (19,991 passed + 69 skipped; 99.17/97.01/99.18/99.18); `npm test` 53.5 s
at load ~8 (baseline 54.6 s). Landing: regrouped per stop 12 (see the journal).

**Follow-ups:** 6b is nodespacing plus `NodeMicroLayout` with AC2 evidence; promote one live `TreeSet` to
`src/java/util` before layered (three task-local stand-ins: T9, T10, T11); the `devAssert` helper of translation rules
6.8 is still unwritten; check unbounded-depth recursive ports with `--jitless` (spore `DepthFirstCompaction` for 8x,
layered DFS passes for 7a); the `fromPattern` test helper is duplicated in two polyomino tests; deferred JUnit:
`InsidePortLabelTest`, `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest` for 7a and `NodeMicroLayoutTest`
for 8x. Roadmap revision 2026-10-26 records the same.

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)
