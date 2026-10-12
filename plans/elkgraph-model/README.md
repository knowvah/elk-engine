<!-- SPDX-License-Identifier: EPL-2.0 -->

# Property System + ElkGraph Model — Mission Brief (roadmap mission 2)

## Objective

Port the `org.eclipse.elk.graph` bundle: the property system (`graph.properties`), the ElkGraph
object model as plain TS classes keeping the Java accessor names (AD-11), `ElkGraphUtil`,
`ElkReflect`, `GraphIdentifierGenerator`, and the `core.math`/`core.options` classes the Java
`PropertyTest` needs (`KVector`, `KVectorChain`, `Spacing`, `ElkMargin`, `ElkPadding`, `PortSide`,
`Direction`, `SizeConstraint`). The EMF behaviour the model relies on (unique live lists with
inverse and containment semantics, `EMap`, `eContainer`/`eAllContents`) lands as a minimal
`src/emf/` runtime (D1). Every behaviour is proven by JVM-recorded vectors written **before** the
implementation (`test/golden/refs/java/graph.json`, D9) and by the four ported JUnit classes.
Nothing is exported from `src/index.ts` (AD-14, roadmap §2).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md).
3. If the branch does not exist: `git switch -c feature/elkgraph-model` from `main`, then
   `git add plans/elkgraph-model && git commit -m "docs(plans): add elkgraph-model mission brief"`.
   Otherwise `git switch feature/elkgraph-model`.
4. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch

`feature/elkgraph-model` off `main`. One commit per task (Conventional Commits, no attribution).
Merge to `main` with a **merge commit** at mission end. Never push.

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK Java (the spec) | `$ELK_SOURCE_DIR` (default `../elk`), pinned `8aaa3c14`; `plugins/org.eclipse.elk.graph/` |
| Oracle jars (T2 vectors) | `../elk-oracle/oracle-build.json` → `jars["org.eclipse.elk.graph"]` |
| EMF 2.37 jars + source (EPL-2.0) | `~/.m2/repository/p2/osgi/bundle/org.eclipse.emf.{common,ecore}{,.source}/` |
| Guava jar (T2 classpath only) | the version `tools/oracle/run.sh` resolves from the p2 cache |
| JDK for vectors | JDK 21 on PATH |

**AD-9: never read or copy OpenJDK source.** EMF source **may** be read (EPL-2.0, D1). Guava:
Javadoc only.

## Quality gates

Agents run their own tests + `npm run typecheck` + `npm run format:check`. The orchestrator runs,
after every batch:

```bash
npm run format:check                                # exit 0
npm run typecheck                                   # exit 0
npm run coverage                                    # exit 0; 90/90/90/90 over src/**
java tools/vectors/JavaVectors.java test/golden/refs/java \
  && git diff --exit-code test/golden/refs/java/    # frozen vectors unchanged
tools/vectors/graph-vectors.sh test/golden/refs/java \
  && git diff --exit-code test/golden/refs/java/graph.json   # after T2: byte-identical
git show --name-only --format= HEAD                 # ⊆ the task's write-set
lizard -C 10 -a 5 -T nloc=30 -w <changed .ts/.java files>    # complexity (hook-enforced too)
```

Parallel agents never run `npm run coverage` (shared `coverage/` dir); the orchestrator does.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing.
2. The same gate check fails twice in a row.
3. A change would contradict D1–D10 ([decisions.md](decisions.md)), M1–M8, AD-1…AD-15, or the
   conformance-corpus decisions.
4. AD-13: an existing assertion, vector, or golden would have to change — including any diff in
   the seven frozen vector files on regeneration, or in `graph.json` once T2 has landed.
5. AD-9: the work seems to need OpenJDK source, or Guava source beyond its Javadoc.
6. T2: a scenario cannot be made deterministic after one scripting revision (identity hashes in
   recorded text), or the oracle/EMF jars cannot be resolved from the p2 cache.
7. T6/T9: the EList or EMap model is rejected by a `graph.json` row after 3 revisions — report the
   unexplained rows.
8. A ported JUnit case (`KVectorTest`, `KVectorChainTest`, `PropertyTest`, `ElkGraphUtilTest`) can
   only pass by changing its assertion or dropping the case.
9. The model would need a method the Java does not have, beyond the TS-forced ones in D3/D5/D10
   (type guards, `PropertyMap`, public constructors, `ElkGraphPackage` constants).
10. `npm test` exceeds ~60 s total.
11. The work seems to need a runtime dependency or a non-EPL-compatible dev dependency.
12. A JUnit expectation contradicts the JVM-recorded `graph.json` for the same input (record both).

## Push-forward — decide and journal

- `graph.json` schema details, scenario names, step order, extra scenarios (append-only after T2).
- Internal helper names and private structure of `src/emf`, `LinkedList`, `EnumSet`, provided the
  interface contracts in the task files hold.
- Trivial EMF pass-throughs beyond D2/D4 when a ported body calls them (journal each).
- The exact `toString()` text for the four identity-hash cases (D10), class name = Java FQ name.
- A 1–3 line pre-existing-violation fix in a file already being touched (grep references first).
- Deterministic sampling of a large replay to bound test time, keeping every edge scenario.
- Commit message, test names, journal wording, `.agent-notes/elkgraph-model.md` entries.
- Where the `PropertyTest` cloner registration lives in the test file (`beforeAll`, D6).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | Shims, vectors, property interfaces, enums | T1–T4 | — | [x] |
| 2 | core.math, EMF runtime | T5–T6 | 1 | [x] |
| 3 | Property classes + ElkReflect, model interfaces + base impls | T7–T8 | 2 | [x] |
| 4 | Model completion + ElkGraphUtil + vector replay | T9 | 3 | [x] |
| 5 | GraphIdentifierGenerator, docs | T10–T11 | 4 | [ ] |

## Document index

- [decisions.md](decisions.md) — D1–D10 · [decision-journal.md](decision-journal.md)
- [diagrams/component-map.md](diagrams/component-map.md) · [diagrams/data-flow.md](diagrams/data-flow.md)
- Batches: [1](batch-1/overview.md) · [2](batch-2/overview.md) · [3](batch-3/overview.md) ·
  [4](batch-4/overview.md) · [5](batch-5/overview.md)

## Mission end

All batches `[x]`; gates green; `.agent-notes/elkgraph-model.md` holds novel observations;
merge `feature/elkgraph-model` → `main` (merge commit). Report: classes delivered, `graph.json`
scenario/step counts, model revisions (D2), anything journaled for the user, next roadmap
mission (3: core metadata slice + `.melk` codegen).

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with `[ ]` →
its `overview.md` → first incomplete task.
