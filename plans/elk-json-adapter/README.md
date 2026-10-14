<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK JSON Adapter — Mission Brief (roadmap mission 4)

## Objective

Port the `graph.json` bundle (`ElkGraphJson`, `JsonImporter`, `JsonExporter`, `JsonAdapter`,
`JsonMetaDataConverter`, `JsonImportException`; 1,971 Xtend/Java lines) to `src/graph/json/`, on a
Gson 2.11.0 subset ported to `src/gson/` (J1, J2) and `core.util.Maybe`. Every behaviour is proven
against JVM recordings written **before** the code (AD-13): Gson vectors (`gson.json`), import/export
vectors (`graph-json.json`), `transferLayout` replay vectors (`graph-json-transfer.json`) and oracle
`parse`-mode refs of the 4 committed goldens (`refs/elk-parse/`). Exit: TS import→export of those
goldens is byte-identical to the oracle (J7, J8); 32 of the 36 `graph.json.test` methods ported with
assertions unchanged; the 4 layout-dependent ones deferred to missions 5/7h (J6) with a replay test
covering `transferLayout` now. A local-only sweep compares all 550 elk-models `.json` inputs. The
adapter is an I/O layer, not public API: nothing is exported from `src/index.ts` (AD-14).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). Mission-3
   standing rules (`plans/core-metadata/decisions.md` "Standing rules") still apply.
3. Read `.agent-notes/` (all files; at least `core-metadata.md`, `elkgraph-model.md`,
   `java-foundations.md`) and state what affects the approach.
4. If the branch does not exist: `git switch -c feature/elk-json-adapter` from `main`, then
   `git add plans/elk-json-adapter && git commit -m "docs(plans): add elk-json-adapter mission brief"`.
   Otherwise `git switch feature/elk-json-adapter`.
5. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch

`feature/elk-json-adapter` off `main`. One commit per task, subject `<type>(TN): <desc>`
(Conventional Commits, ≤72 chars, lowercase, no attribution). Merge to `main` with a **merge
commit** at mission end. Never push.

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK Java/Xtend (the spec) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/` |
| JUnit/Xtend tests | `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/` |
| Oracle jars + harness | `../elk-oracle/oracle-build.json`; `tools/oracle/{run.sh,harness/}`; patch 0001 (`EXPORT_SEED`) |
| Gson | `~/.m2/repository/p2/osgi/bundle/com.google.gson/2.11.0/` jar (run only; **never read its source**, J1) |
| elk-models (sweep only) | `$ELK_MODELS_DIR` (default `../../eclipse-elk/elk-models`), 550 `.json` |
| JDK | JDK 21 on PATH |

**AD-9 / J1:** never read OpenJDK, Gson or Guava source; Javadoc + JVM vectors only.

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>`. The orchestrator
runs, after every batch:

```bash
npm run format:check                                # exit 0
npm run typecheck                                   # exit 0
npm run coverage                                    # exit 0; 90/90/90/90; npm test ≤ 60 s
java tools/vectors/JavaVectors.java test/golden/refs/java \
  && tools/vectors/graph-vectors.sh test/golden/refs/java \
  && tools/vectors/metadata-vectors.sh test/golden/refs/java \
  && git diff --exit-code test/golden/refs/        # frozen refs unchanged
# once landed, each of these must also leave test/golden/refs/ byte-identical:
tools/vectors/gson-vectors.sh test/golden/refs/java          # after T1
tools/vectors/graph-json-vectors.sh test/golden/refs/java    # after T3
tools/vectors/transfer-vectors.sh test/golden/refs/java      # after T4
tools/oracle/regen-parse-refs.sh                             # after T5
git show --name-only --format= HEAD                 # ⊆ the task's write-set
git diff --name-only <batch-base>..HEAD | grep -E '\.(ts|java)$' | grep -v '\.test\.ts$' \
  | grep -v '^src/core/options/CoreOptions.ts$' | xargs lizard -C 10 -a 5 -T nloc=30 -w
```

Parallel agents never run `npm run coverage` (shared `coverage/`); the orchestrator does.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (a colocated `.test.ts` of a write-set
   file is implicitly in it — standing rule).
2. The same gate check fails twice in a row.
3. A change would contradict J1–J10, AD-1…AD-15, M1–M8, D1–D10, C1–C10 or the standing rules.
4. AD-13: an existing assertion, vector or golden would have to change — any byte diff in existing
   `test/golden/refs/**`, or in `gson.json`, `graph-json.json`, `graph-json-transfer.json`,
   `refs/elk-parse/` once each has landed.
5. AD-9 / J1: the work seems to need OpenJDK, Gson or Guava source (beyond Javadoc).
6. A vector task finds the oracle's Gson is not 2.11.0, a class cannot be loaded from the oracle
   jars / p2 cache, or a value has no encoding in the agreed format.
7. A Gson behaviour the port needs has no vector (J1).
8. A TS result differs from a vector, ref or the oracle and the cause cannot be named (mechanism,
   `file:line`, ruled out). Never edit the golden to match.
9. A file cannot meet the complexity limits with Java-section splits (J3 + standing rule), or would
   need a sibling file beyond those J3 names.
10. A ported test can only pass by changing or dropping an assertion (the 4 J6 deferrals excepted).
11. A method or API the Java does not have is needed — beyond the `Random` ctor parameter (J4), the
    J3 state interfaces, type guards and test-local helpers.
12. The work seems to need a runtime dependency or a non-EPL-compatible dev dependency.
13. `npm test` exceeds ~60 s, or the local sweep exceeds ~120 s.
14. A sweep model diverges and the diagnosis points outside `src/graph/json`/`src/gson`.

## Push-forward — decide and journal

- `src/gson` internals (file split, private helpers, unconstrained error text) — public names are Gson's.
- Vector JSON layout beyond the agreed contracts (key and scenario names); call order inside a
  scenario always follows the JVM.
- Fixture files under `tools/vectors/graph-json-scenarios/`, incl. inputs adapted from the Xtend tests.
- How the replay test applies recorded geometry, as long as compared bytes come only from the JVM.
- Exception-class mapping where a `src/java/lang` shim exists; NPE → `TypeError` (D10).
- Xtend constructs per translation-rules §8 (`=>`, `?:`, `dispatch`, lambdas, ranges).
- Test names, commit messages, journal wording, `.agent-notes/elk-json-adapter.md` entries.
- A 1–3 line pre-existing-violation fix in a file already being touched (grep references first).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | Vectors and goldens first | T1–T5 | — | [x] |
| 2 | Gson element model | T6 | 1 | [x] |
| 3 | Gson reader, writer; `JsonAdapter` | T7–T9 | 2 | [x] |
| 4 | Gson façade, importer core, exporter, converter | T10–T13 | 3 | [x] |
| 5 | Importer edges | T14 | 4 | [x] |
| 6 | `ElkGraphJson`, `transferLayout` | T15–T16 | 5 | [x] |
| 7 | Ported tests, round-trip, sweep | T17–T19 | 6 | [x] |
| 8 | Docs + close-out | T20 | 7 | [ ] |

## Document index

- [decisions.md](decisions.md) — J1–J10 · [decision-journal.md](decision-journal.md)
- [diagrams/component-map.md](diagrams/component-map.md) · [diagrams/data-flow.md](diagrams/data-flow.md)
- Batches: [1](batch-1/overview.md) · [2](batch-2/overview.md) · [3](batch-3/overview.md) ·
  [4](batch-4/overview.md) · [5](batch-5/overview.md) · [6](batch-6/overview.md) ·
  [7](batch-7/overview.md) · [8](batch-8/overview.md)

## Mission end

All batches `[x]`; gates green; `.agent-notes/elk-json-adapter.md` holds novel observations; merge
`feature/elk-json-adapter` → `main` (merge commit). Report: classes delivered, tests ported vs
deferred (J6), sweep result, anything journaled for the user, next roadmap mission (4b: `graph.text`).

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with `[ ]` →
its `overview.md` → first incomplete task.
