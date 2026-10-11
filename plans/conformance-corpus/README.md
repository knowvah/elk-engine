<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformance Corpus — Mission Brief

## Objective

Decide and build **what elk-engine's conformance is measured against**. The unit is the
**layout algorithm**: a case is `(algorithm, model, variant)`, and the dashboard has one row per
algorithm, as dot-engine has one per Graphviz engine. This mission ports **no ELK code**. It:

- widens the bundle scope to the three grammar bundles (`graph.text`, `graph.json.text`,
  `core.debug.grandom`);
- teaches the oracle to read `.elkt`, retarget algorithms, apply variants, time out, and
  generate graphs from `.elkr` configs;
- classifies the elk-models corpus (898 distinct models);
- fills the 7 algorithms that have no models with seeded generated graphs;
- sweeps oracle-only verdicts and publishes a per-algorithm parity report.

The TS ports of the grammars become roadmap missions 4b–4d (T1 appends them).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md).
3. If the branch does not exist: `git switch -c feature/conformance-corpus` from `main`.
   The uncommitted `CLAUDE.md` edit made during planning travels with the switch;
   T1 commits it. Then commit the brief:
   `git add plans/conformance-corpus .agent-notes/conformance-corpus-planning.md && git commit -m "docs(plans): add conformance-corpus mission brief"`.
   Otherwise `git switch feature/conformance-corpus`.
4. Find the first batch below with `[ ]`, read its `overview.md`, and resume at its first
   incomplete task.

## Branch

`feature/conformance-corpus` off `main`. One commit per task (Conventional Commits, no
attribution lines). Merge to `main` with a **merge commit** at mission end. Never push.

## External inputs (read-only; never modify)

| Var | Default (relative to repo root) | Pinned |
|-----|---------------------------------|--------|
| `ELK_SOURCE_DIR` | `../elk` | `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` |
| `ELK_ORACLE_DIR` | `../elk-oracle` | same, empty patch series; already built |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | `ac5af2ba511c0037e4f347e8bd91f013950951c7` |

New env var (read only by `tools/`): `ELK_SWEEP_TIMEOUT_MS`, default `30000`.

## Quality gates (after every task)

```bash
npm run typecheck                      # exit 0
npm run coverage                       # exit 0; 90/90/90/90 over src/**
git show --name-only --format= HEAD    # ⊆ the task's write-set
```

Tasks touching `tools/oracle/` also run: `shellcheck` on every changed `.sh`;
`tools/oracle/regen-goldens.sh` then `git diff --exit-code test/golden/refs` (must be clean).
Oracle Java compiles through `tools/oracle/run.sh` (it compiles `ElkOracle.java` each run).

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (new `.java` helper files under
   `tools/oracle/harness/` are inside the T3/T5/T6 write-sets).
2. The same gate check fails twice in a row.
3. A change would contradict D0–D10, OR-1/OR-2 ([decisions.md](decisions.md)), or AD-1…AD-15.
4. AD-13: an existing assertion, ref, vector, or golden would have to change, including any
   `regen-goldens.sh` diff or a 6th curated golden (`test/corpus/corpus.test.ts:95`).
5. The oracle behaves unexpectedly: `build.sh` fails after the runbook; Xtext standalone cannot
   parse an `.elkt` that ELK's `GraphFromFile` reads; the census `count` is not 898.
6. A fix needs an oracle patch (`tools/oracle/patches/`) or any edit to `$ELK_SOURCE_DIR` or the
   elk-models clone.
7. An `oracle-error` whose root cause cannot be fixed inside the harness write-set.
8. A zero-model algorithm has no generated config with verdict `ok` after 3 config attempts.
9. The first full sweep takes longer than 60 minutes.
10. The work seems to need OpenJDK source (AD-9), a runtime dependency, or a non-EPL dev dependency.

## Push-forward — decide and journal

- Flag names and CLI syntax, provided the task's interface contract holds.
- `ElkOracle.java` internal structure, helper classes under `harness/`, JVM batch size.
- Exact option values per variant within the fixed set (D6).
- `.elkr` parameters (form, size, density) within D7's limits.
- One retry of a transient network or p2 failure.
- A 1–3 line pre-existing violation fix in a file already being touched.
- Report formatting, column order, journal wording, commit message text.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | Scope + oracle input | T1–T3 | — | [x] |
| 2 | Census + oracle retarget | T4–T5 | 1 | [x] |
| 3 | Generated corpus + manifest | T6–T7 | 2 | [ ] |
| 4 | Sweep | T8 | 3 | [ ] |
| 5 | Report + conformance docs | T9–T10 | 4 | [ ] |

Within a batch, the overview's `Depends On` column decides parallelism.

## Document index

- [decisions.md](decisions.md) — D0–D10, OR-1, OR-2, known divergence #1
- [decision-journal.md](decision-journal.md) — append during execution
- [diagrams/component-map.md](diagrams/component-map.md) — what this mission touches
- [diagrams/data-flow.md](diagrams/data-flow.md) — census, sweep, report flows
- Batches: [1](batch-1/overview.md) · [2](batch-2/overview.md) · [3](batch-3/overview.md) ·
  [4](batch-4/overview.md) · [5](batch-5/overview.md)

## Mission end

All batches `[x]`; gates green; first full sweep recorded in the journal (wall time, verdict
counts); `.agent-notes/conformance-corpus.md` holds any novel observations; merge
`feature/conformance-corpus` → `main` (merge commit). Report: verdict counts per algorithm,
anything journaled as needing the user, and the next roadmap mission.

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with `[ ]` → its
`overview.md` → first incomplete task.
