<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java Foundations Completion — Mission Brief (roadmap mission 1)

## Objective

Close the JVM-vector gaps listed in `docs/translation-rules.md` §9 and
`docs/translation-rules-collections.md` §2.4, then write the shims they gate, from Javadoc only
(AD-9): `l2i`, float32 helpers, `Int64`, `String`/`Integer`/`Double` hashing and text
(`Double.toString`, `parseDouble`, strict `Integer.valueOf`), Java exception classes,
`JavaHashMap`/`JavaHashSet` (clean-room model, M1), `PriorityQueue`, and the full `src/guava/`
helper set (translation-rules §4). **No ELK class is ported.** Every shim is proven by
JVM-generated vectors written *before* the shim (AD-13). The CLAUDE.md corrections the roadmap
lists already landed (`e2d5456`); `StrictMath.ts` stays out of scope.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md).
3. If the branch does not exist: `git switch -c feature/java-foundations` from `main`, then
   `git add plans/java-foundations && git commit -m "docs(plans): add java-foundations mission brief"`.
   Otherwise `git switch feature/java-foundations`.
4. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch

`feature/java-foundations` off `main`. One commit per task (Conventional Commits, no attribution).
Merge to `main` with a **merge commit** at mission end. Never push.

## Inputs (read-only)

| What | Where |
|------|-------|
| JDK for vectors | JDK 21 on PATH (vectors record `jdk`; must be 21.x) |
| Guava jar (T14 only) | `$HOME/.m2/repository/p2/osgi/bundle/com.google.guava/<ver>/` — the version `tools/oracle/run.sh` resolves |
| ELK source (grep for call sites only) | `$ELK_SOURCE_DIR` (default `../elk`) at the pinned commit |

**AD-9: never read or copy OpenJDK source** (GPLv2). Guava: Javadoc only, no source copying.

## Quality gates

Agents run their own tests + `npm run typecheck`. The orchestrator runs, after every batch:

```bash
npm run typecheck                                   # exit 0
npm run coverage                                    # exit 0; 90/90/90/90 over src/**
java tools/vectors/JavaVectors.java test/golden/refs/java \
  && git diff --exit-code test/golden/refs/java/lang.json test/golden/refs/java/random.json
git show --name-only --format= HEAD                 # ⊆ the task's write-set
lizard -C 10 -L 30 -a 5 -w <changed .ts/.java files>  # complexity (hook-enforced too)
```

Vector tasks also: the regenerated *new* vector files equal the committed ones (determinism).

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing.
2. The same gate check fails twice in a row.
3. A change would contradict M1–M8 ([decisions.md](decisions.md)), AD-1…AD-15, or the
   conformance-corpus decisions.
4. AD-13: an existing assertion, vector, or golden would have to change — including any diff in
   `lang.json`/`random.json` on regeneration or any change under `test/golden/refs/elk/`.
5. AD-9: the work seems to need OpenJDK source, Guava source beyond its Javadoc, or a shim cannot
   be written from spec + vectors.
6. `JavaHashMap` or `PriorityQueue`: 3 rejected model revisions (M1/M8) — report unexplained vectors.
7. A `DoubleToString`/`parseDouble` mismatch not explained by the Javadoc definition.
8. A JVM vector contradicts a Javadoc statement — record both, do not pick one.
9. Native `Math.log10` misses a power of ten and a Javadoc-exact fix would affect non-powers.
10. `npm test` exceeds ~60 s total even with deterministic sampling.
11. The work seems to need a runtime dependency or a non-EPL-compatible dev dependency.

## Push-forward — decide and journal

- Vector file schema details, row order, sample sizes, seeds for generated inputs (within each
  file's declared coverage).
- Shim internals and helper names, provided interface contracts hold.
- Extra probe vectors for `JavaHashMap`/`PriorityQueue` (new rows only; never edit existing rows).
- Guava method subset per family = every method in translation-rules §4 plus overloads ELK calls
  (grep-verified).
- JVM exception with `message == null` → TS `message` `undefined`.
- Deterministic sampling of a large suite to bound test time, keeping every edge row.
- A 1–3 line pre-existing-violation fix in a file already being touched.
- Commit message, test name, and journal wording.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | Vectors A + exceptions + guava boundary | T1–T3 | — | [x] |
| 2a | Numeric, Int64, String/Integer, Double | T4–T7 | 1 | [x] |
| 2b | DoubleToString, Vectors B, Guava 1 | T8–T10 | 1 | [x] |
| 3 | JavaHashMap, PriorityQueue, Guava 2 | T11–T13 | 2a, 2b | [x] |
| 4 | Guava 3 (hash-backed) + Guava vectors | T14 | 3 | [ ] |
| 5 | Translation-rules docs | T15 | 4 | [ ] |

Batches 2a and 2b may run concurrently (disjoint write-sets; only T9 writes `JavaVectors.java`).
Parallel agents never run `npm run coverage` (shared `coverage/` dir); the orchestrator does.

## Document index

- [decisions.md](decisions.md) — M1–M8 · [decision-journal.md](decision-journal.md)
- [diagrams/component-map.md](diagrams/component-map.md) · [diagrams/data-flow.md](diagrams/data-flow.md)
- Batches: [1](batch-1/overview.md) · [2a](batch-2a/overview.md) · [2b](batch-2b/overview.md) ·
  [3](batch-3/overview.md) · [4](batch-4/overview.md) · [5](batch-5/overview.md)

## Mission end

All batches `[x]`; gates green; `.agent-notes/java-foundations.md` holds novel observations;
merge `feature/java-foundations` → `main` (merge commit). Report: shims delivered, vector counts,
any model revisions (M1/M8), anything journaled as needing the user, next roadmap mission (2).

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with `[ ]` →
its `overview.md` → first incomplete task.
