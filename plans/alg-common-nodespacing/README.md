<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.common nodespacing — Mission Brief (mission 6b; roadmap row 6b)

## Objective

Port `org.eclipse.elk.alg.common.nodespacing` (26 classes in `cellsystem`, `internal`, `internal/algorithm` and the
package root; 6,123 Java lines) and `NodeMicroLayout` to `src/alg/common/`. Mission 6a ported the rest of `alg.common`
(`plans/alg-common/`).

The evidence comes from an oracle sweep, as AC2 requires (`plans/alg-common/decisions.md#ac2`). A new recorder runs
`NodeMicroLayout` over:
- the 8 models in `tests/core/{node_size,label_placement}`;
- the curated set and the vendored tickets;
- the `PortLabelPlacementVariantsTest` configurations;
- a synthetic option sweep.

The recorded inputs are stored in the JSON. TS replays every row at the AD-4 bar (NS1–NS6).

Exit (roadmap row 6b):
- every `node-micro-layout.json` row replays (numbers within 1e-6; ids, counts and throws exactly);
- branch coverage on `src/alg/common/nodespacing/**` is ≥ 90 %;
- landed vectors and goldens are unchanged.

Internal only: nothing is exported from `src/index.ts` (AD-14), and no provider is ported. The 4 nodespacing JUnit
files stay deferred to 7a/8x (`plans/alg-common/decisions.md` P5).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). These also apply:
   - AD-1…AD-16: `plans/elk-engine-skeleton/decisions.md`
   - C1–C10 and the standing rules: `plans/core-metadata/decisions.md`
   - J-decisions: `plans/elk-json-adapter/decisions.md`; G1–G8: `plans/graph-text/decisions.md`
   - D1–D9: `plans/grandom/decisions.md`; M1–M17: `plans/core-engine/decisions.md`
   - R1–R7 plus the R2 amendments: `plans/core-remainder/decisions.md`
   - AC1–AC6 and P1–P7: `plans/alg-common/decisions.md`
3. Read `.agent-notes/` (at least `alg-common-nodespacing-planning.md`, `alg-common.md`, `alg-common-planning.md`,
   `vector-cache-and-key-line.md`) and state what affects the approach.
4. Set up the branch:
   - If `feature/alg-common-nodespacing` does not exist: `git switch -c feature/alg-common-nodespacing` from `main`,
     then `git add plans/alg-common-nodespacing .agent-notes/alg-common-nodespacing-planning.md && git commit -m
     "docs(plans): add alg-common-nodespacing mission brief"`.
   - Otherwise: `git switch feature/alg-common-nodespacing`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work happens on `feature/alg-common-nodespacing`, branched from `main`.

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus one `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 12):**
  1. Keep the per-task history on a local `feature/alg-common-nodespacing-backup` branch.
  2. Regroup into **at most 5 commits**, each body listing its task ids:
     - recorder and vectors (T1);
     - cell system and contexts (T2, T3);
     - algorithms, entry points and replay (T4–T7);
     - docs (T8 and the plan files).
     The regrouped tree must be byte-identical to the backup.
  3. Verify that each commit typechecks and passes the suite on its own. Use a scratch worktree with absolute
     `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR` and `ELK_MODELS_DIR`. Seven corpus tests skip there by design.
  4. Journal the regrouping on both branches.
- The executor **never signs, pushes, opens a PR, or merges**. At the end it hands the user these commands:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/alg-common-nodespacing
gh pr create --base main --head feature/alg-common-nodespacing   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit" (never rebase: it drops signatures)
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK `alg.common` Java (the spec), called `J` below; `N` = `J/nodespacing` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/` |
| Deferred JUnit (configurators to mirror in T1 only) | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/nodespacing/` |
| Models (T1, record time only) | `$ELK_MODELS_DIR/tests/core/{node_size,label_placement}/**/*.elkt`, `test/corpus/elkt-curated/**`, `test/golden/inputs/tickets/core/*.elkt` |
| Oracle (T1) | `$ELK_ORACLE_DIR`; patterns `tools/vectors/{alg-common-vectors.sh,AlgCommonVectors.java}` (+ `ElktParseVectors.java:160-230` for `.elkt` loading and JSON export) + `vector-cache.sh` |
| Patterns to mirror | `src/alg/common/networksimplex/NetworkSimplex*.ts` (section modules), `src/alg/common/overlaps/*` (6a ports, nested-type files), `src/core/util/adapters/*` |
| Translation rules | `docs/translation-rules.md` §6.2, §6.5, §6.8 (asserts), §12; collections `docs/translation-rules-collections.md` (next free I42) |
| JDK | JDK 21 on PATH |

- **AD-9:** never read OpenJDK or Guava source; Javadoc plus vectors only. EMF source (EPL) may be read.
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
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/   # only `A refs/java/node-micro-layout.json`
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- After T7: branch coverage for `src/alg/common/nodespacing/**` from `coverage/coverage-summary.json` (or the HTML
  report) is ≥ 90 % (stop 10).
- `npm run docs:build` must be green before T8 is marked done.
- Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit (shared index).

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the current task's write-set needs changing. Colocated `.test.ts` files count as part
   of the task; rewrites made only for complexity are excepted. Explicitly out of bounds:
   - `src/graph/json/**` (the ELK JSON adapter);
   - `src/core/util/adapters/**`;
   - `src/guava/TreeMultimap.ts`;
   - `src/alg/common/overlaps/**`.
2. **Repeated failure:** the same gate check fails twice in a row. Timeout-only failures at high foreign load don't
   count; rerun at normal load.
3. **Locked decisions:** a change would contradict NS1–NS6, AC1–AC6, P1–P7, AD-1…AD-16, earlier missions' decisions
   (C, J, G, D, M, R) or the standing rules.
4. **AD-13:**
   - a byte diff in a landed ref, vector or golden;
   - a test that can only pass by changing its assertion;
   - `node-micro-layout.json` would need re-recording after T7 has started consuming it.
5. **Divergence without a named mechanism:** a TS result differs from a vector row, and the mechanism (`file:line`,
   causal chain, ruled out) cannot be named. Instrument the oracle first.
6. **Recorder:**
   - not byte-stable across two runs;
   - the JSON round-trip self-check fails (the adapter loses an input);
   - a model is missing at record time;
   - the work seems to need OpenJDK or Guava source (AD-9).
7. **Ordering:** a replay mismatch traced to the `portContexts` comparator order or to EnumMap/EnumSet order.
8. **Out-of-bounds dependency:**
   - an API beyond the Java surface (test-local helpers excepted);
   - any `src/index.ts` export;
   - a runtime dependency;
   - a Node built-in in `src/`;
   - an import the bundle-dependency fitness map forbids.
9. **Complexity limits:** a file cannot meet them with splits at Java method or section boundaries. Watch:
   - `PortLabelPlacementCalculator`
   - `GridContainerCell`
   - `NodeLabelLocation`
   - `PortPlacementCalculator`
   - the two `*PortPlacementSizeCalculator`s
10. **Coverage:** nodespacing branch coverage stays below 90 % after T7, and the uncovered branches cannot be reached by
    a Java-derived unit test.
11. **Suite time:** the mission adds more than about 10 s to `npm test` over the [baseline](decisions.md#baseline) at
    similar load.
12. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- **Overloads and splits:**
  - naming per §6.5;
  - private helper splits at Java section, switch-arm or loop boundaries for complexity, keeping Java order and names;
  - section modules behind a facade (P1);
  - nested types in prefixed files (M15).
- **Recorder content** (within NS2/NS4/NS6):
  - the shape of the synthetic sweep and its seeds;
  - the label-size formula;
  - JSON field names;
  - trimming the sweep's cross product to stay ≤ 5 MB (never model rows).
- **Unit tests:** cases derived from the Java source.
- **Suite time:** an overrun of 5–10 s (journal the measurement).
- **Unreachable branches:** kept as in the Java; journal any that cannot run.
- **The 3 `assert` sites:** commented per NS5.
- **AD-10 sites:** identity-hashed → `Map`/`Set` in insertion order; journal each and draft its I-row (T8 lands
  them).
- **Helpers and prose:**
  - test-local helpers go under `test/helpers/`;
  - ELK prose typos follow the CLAUDE.md carve-out and are listed in `docs/conformance.md`.
- **Pre-existing violations:** a 1–3 line fix in a file already being touched, after grepping for references.
- **Wording:** test names, commit messages, journal and `.agent-notes/alg-common-nodespacing.md` entries.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1](batch-1/overview.md) | Oracle recorder, cell system | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | Node and port contexts | T3 | 1 (T2) | [x] |
| [3](batch-3/overview.md) | Port placement, port labels and margins, cell creators and sizing | T4–T6 | 2 | [x] |
| [4](batch-4/overview.md) | Entry points and oracle replay | T7 | 1 (T1), 3 | [x] |
| [5](batch-5/overview.md) | Docs, inventory and roadmap | T8 | 4 | [x] |

## Mission summary (2026-10-26)

**Tasks:** 8 planned tasks (`T1`…`T8`), one commit each, plus `docs(plans)` batch markers. No task stopped; no user
decision was needed during the run. T1 (java-architect) and T2–T7 (typescript-pro) ran on Sonnet; T8 ran in the main
session.

**Exit evidence (roadmap row 6b):** every row of `test/golden/refs/java/node-micro-layout.json` replays at the AD-4 bar
on the first run: 326 rows (`corpus` 16, `curated` 70, `variants` 4, `sweep` 236), 23 of them exceptions matched by
class and message (20 `IllegalArgumentException` for models whose ports have no side, 3
`UnsupportedConfigurationException` for rejected placements). The recorder is byte-stable (cold, recorded and cached
runs identical), the NS1 round trip holds on every row, and a missing model fails the script by name. Branch coverage
of `src/alg/common/nodespacing/**` is 99.87 % (748/749; the miss is the NS5 `default` arm in
`PortLabelPlacementCalculatorSimpleInside.ts`). Landed vectors, goldens and corpus are unchanged: only
`refs/java/node-micro-layout.json` was added.

**Decisions:** NS1–NS6 and Q1–Q6 as planned; no execution decision was added. Push-forward choices are in the journal:
the NS4 formula (`6.5 * text.length()` × `13.0`), the pairwise sweep (`Random(6101)`, 11 factors, 233 valid rows + 3
throw rows), compact `input` export, and the complexity splits (every one at a Java method, section or switch-arm
boundary; `PortLabelPlacementCalculator` is a facade over four section modules, Q1; the T4 free-port sections share
helpers under the 2026-10-14 shared-helper amendment). No identity-hashed AD-10 site exists in the package, so
`docs/translation-rules-collections.md` is unchanged (I42 stays free). Upstream quirks kept are listed in
`docs/conformance.md#alg-common-nodespacing-quirks`.

**Flags for the user (AD-13 review):** four agents corrected their own hand-derived expectations after a test first
failed, each traced to a Java rule the derivation had missed and each with the implementation untouched (journal rows
of type `flag`: T2 one test input; T3 one port order; T4 one 2-port margin case rewritten with 3 ports; T5 one margin
value; T6 five values). The T7 oracle replay independently confirms every corrected path. T4 also reports writing its
implementation before its tests (expectations still hand-derived). The user decides whether any of these needs
re-derivation.

**Quality gates:** every batch gate is recorded in the decision journal (`format:check`, `typecheck`, `complexity`
clean; `coverage` green, last at 484 files, 20,837 passed + 69 skipped, 99.22 % statements, 97.22 % branches, 98.93 %
functions, 99.23 % lines; `npm test` 62.0 s against the 55.4 s baseline, +6.6 s, inside the stop-11 journal band; the
replay itself is about 1 s). Final gates and landing: see the orchestrator entry in the journal.

**Follow-ups:** the 4 deferred JUnit files stay for 7a (`InsidePortLabelTest`, `NextToPortLabelPlacementTest`,
`PortLabelPlacementVariantsTest`) and 8x (`NodeMicroLayoutTest`); the `devAssert` helper (§6.8) is still unwritten and
now has three more commented sites; the live `TreeSet` follow-up from 6a stands for `CrossingsCounter` and the 6a
stand-ins (`NodeContext` uses the landed `TreeMultimap`); the 10 sideless corpus/curated models gain port coverage only
once layered assigns sides; hand-derived nodespacing expectations should check the four rules listed in
`.agent-notes/alg-common-nodespacing.md` first. Roadmap revision 2026-10-26 (alg-common-nodespacing) records the same.

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)
