<!-- SPDX-License-Identifier: EPL-2.0 -->

# Text follow-ups: Mission Brief (mission 4d)

## Objective

Close the open port-fidelity and cleanup follow-ups of mission 4c
([`plans/graph-json-text/follow-ups.md`](../graph-json-text/follow-ups.md)): **F1** Xtext's `DefaultTerminalConverter`
over EMF EFactory conversions (replays the SIGNED_INT/FLOAT/terminal converter rows), **F2** the `.elkt` bare-CR
diagnostic lines (vector first), **F4** the 9 EMF proxy `toString` arms (vector first), **F5** a fuller `.elkj`
oracle sweep (`--sample 40`), **F6** the round-trip recorder reloading from the `String` (full re-record, drop the
test-side transport), **C1** one `.elkj` scope provider shared by linking and serializer, **C3** the cancellation and
diagnostic stand-ins moved to their Xtext/Equinox packages, and **C6** the architecture docs. C4 stays open (out of
scope). Every behaviour change is proven by JVM vectors or the oracle **before** the code (AD-13). Internal only:
nothing is exported from `src/index.ts` (AD-14).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). AD-1…AD-16
   (`plans/elk-engine-skeleton/decisions.md`), the standing rules (`plans/core-metadata/decisions.md`), 4b's G1–G8
   (`plans/graph-text/decisions.md`) and 4c's D1–D13 (`plans/graph-json-text/decisions.md`) apply.
3. Read `.agent-notes/` (at least `graph-text.md`, `graph-json-text.md`) and state what affects the approach.
4. Preconditions (D1): `fix/scope-lookup-budget` (C5) is merged to `origin/main`; `git status` shows no tracked changes (the
   untracked `plans/text-follow-ups/`, `.claude/mission-active` and `.serena/` are expected); the oracle is built (`$ELK_ORACLE_DIR/oracle-build.json` exists). Any miss: stop 6.
5. If the branch does not exist: `git fetch && git switch -c feature/text-follow-ups origin/main`, then
   `git add plans/text-follow-ups && git commit -m "docs(plans): add text-follow-ups mission brief"`, then launch the
   F5 sweep (D2, [batch-5/overview.md](batch-5/overview.md#launch)) and journal its command, start time and pid.
   Otherwise `git switch feature/text-follow-ups` and check that the sweep and the F6 re-record are alive (D2, D3).
6. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing (D1)

`feature/text-follow-ups` off `origin/main`. One **unsigned** commit per task, subject `<type>(TN): <desc>`
(Conventional Commits, ≤72 chars, lowercase, no attribution). The journal cites task ids, never SHAs. The executor
**never signs, pushes, opens a PR, or merges**. At mission end it stops and hands the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' origin/main
git push -u origin feature/text-follow-ups
gh pr create --base main --head feature/text-follow-ups   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit"
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK Java (the spec) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.{graph,graph.text,graph.json.text}/` |
| Xtext 2.36.0 / EMF EPL source | `https://raw.githubusercontent.com/eclipse/xtext/v2.36.0/…`, eclipse-emf on GitHub (not on disk) |
| Oracle jars + harness | `$ELK_ORACLE_DIR/oracle-build.json`; `tools/oracle/`; `tools/vectors/*.sh` |
| elk-models (sweep only) | `$ELK_MODELS_DIR` (pinned `ac5af2b`) |
| 4c follow-ups and journal | `plans/graph-json-text/{follow-ups.md,decision-journal.md}` |

**AD-9:** never read OpenJDK or Guava source (Javadoc + JVM vectors only). Xtext, EMF and Equinox EPL source is allowed.

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>` + `npm run complexity`. The
orchestrator runs, after every batch:

```bash
npm run format:check && npm run typecheck && npm run complexity   # complexity: never trust plain lizard's exit code
npm run coverage                                                  # 90/90/90/90
tools/vectors/elkt-vectors.sh "$TMPDIR/elkt" && for f in lexer parse validate write; do \
  cmp test/golden/refs/java/graph-text-$f.json "$TMPDIR/elkt/graph-text-$f.json"; done
tools/oracle/regen-elkt-refs.sh && tools/oracle/regen-elkj-refs.sh && git diff --exit-code test/golden/refs/
git show --name-only --format= HEAD                               # ⊆ the task's write-set
```

`elkj-vectors.sh` takes hours (follow-up C4): run it once, in the final gate, with `ElkjRoundTripVectors` excluded
until T10 has landed its ref. Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit
(shared index); the orchestrator commits per task. `npm run docs:build` green before T9 and T11 are marked done.
A gate flake while a JVM job runs is rerun alone once (PF5).

## Stop conditions: halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (colocated `.test.ts` is implicit).
2. The same gate check fails twice in a row after fix attempts (investigate to a named cause first).
3. A change would contradict D1–D8 (incl. D7: the fitness tests resist beyond the pre-approved rule; D8: the Java
   wires more than one scope provider instance), AD-1…AD-16, or the standing rules.
4. AD-13: a test, vector, golden or tolerance can only pass by changing it, except PF1–PF3 and D7's pre-approved rule.
5. AD-9: the behaviour can only be settled by reading OpenJDK source.
6. The oracle or corpus is missing (the user runs `tools/oracle/build.sh`).
7. A JVM job (F5 sweep, F6 re-record) dies or hangs (60 min without progress) a second time.
8. T1's 20-id scratch check changes any row besides `input-lone-surrogate-escape`.
9. Re-recording in T2/T3 changes any existing row of `graph-text-{lexer,parse,validate,write}.json` or `graph.json`;
   only added rows are expected.
10. An F5/F6 divergence for which a diagnosis artifact (mechanism, origin `file:line`, causal chain, ruled out) cannot
    be produced. A diagnosed divergence outside D4's in-mission test becomes a new follow-up row, not a stop.
11. Mission end: stop and hand over the landing commands above.

## Push-forward: decide and journal

- **PF1** (user-approved 2026-10-20): raise a row-count literal by exactly the rows this mission's new vectors add;
  journal old → new and the vector diff. Lower bounds (`toBeGreaterThan`) stay untouched.
- **PF2** T8 adds the newly converted terminals to the `REPLAYED` sets and removes the "not registered" comments.
- **PF3** T10 deletes the test-side surrogate transport in `elkj-roundtrip.test.ts` (D3).
- **PF4** File names and places per AD-7 (mirroring the Java/EMF/Xtext/Equinox package); a lizard flag at a Java
  method boundary is handled as prior missions did (`tools/complexity/`), and journalled.
- **PF5** A gate flake under JVM load is rerun alone once; failing alone means it is real.
- **PF6** D4 in-mission fixes; 1–3 line pre-existing-violation fixes in touched files; anything else becomes a new
  row in [`follow-ups.md`](../graph-json-text/follow-ups.md) or an `.agent-notes/text-follow-ups.md` entry. Test
  names, commit and journal wording, scenario names.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1a](batch-1a/overview.md) | Vectors first: F6 recorder, F2 lone CR, F4 proxies | T1–T3 | — | [ ] |
| [1b](batch-1b/overview.md) | EMF factory, C3 moves, C1 scope provider, C6 docs | T4–T7 | — (parallel with 1a) | [ ] |
| [2](batch-2/overview.md) | F1 terminal converters | T8 | T4 | [ ] |
| [3](batch-3/overview.md) | Docs closure for batches 1–2 | T9 | 1a, 1b, 2 | [ ] |
| [4](batch-4/overview.md) | F6 ingest (after the re-record) | T10 | T1, T9 | [ ] |
| [5](batch-5/overview.md) | F5 ingest (after the sweep) | T11 (+T11b) | sweep, T10 | [ ] |
| Final | Full gates incl. `elkj-vectors.sh`; stop 11 | — | 5 | [ ] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)
