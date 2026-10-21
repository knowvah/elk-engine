<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vector cache and key line: Mission Brief (mission 4e)

## Objective

Close the last two mission 4c follow-ups ([`plans/graph-json-text/follow-ups.md`](../graph-json-text/follow-ups.md)).
**C4:** `tools/vectors/elkj-vectors.sh` takes hours (3 h 46 min in the 4d final gate: the round-trip recorder 3 h 06 min,
of which `ptolemy_Trilateration_largest` alone 2 h 37 min; the write recorder 40 min). A shared, salted result cache
(D1) makes a run with nothing changed take minutes and a new scenario cost one row, while every frozen ref stays
byte-identical. **F7:** the `.elkt` parser's `#parsePropertyKey` (`src/graph/text/parser/ElkGraphParser.ts:231`)
returns the ANTLR `first.line` (LF only) instead of the node-model line (LF, lone CR, CRLF): new JVM validate vectors
first (AD-13), then route it through `cursor.lineOf`. Internal only: nothing is exported from `src/index.ts` (AD-14).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). AD-1…AD-16
   (`plans/elk-engine-skeleton/decisions.md`), the standing rules (`plans/core-metadata/decisions.md`), 4b's G1–G8
   (`plans/graph-text/decisions.md`) and 4c's D1–D13 (`plans/graph-json-text/decisions.md`) apply.
3. Read `.agent-notes/` (at least `graph-text.md`, `graph-json-text.md`, `text-follow-ups.md`) and state what affects
   the approach.
4. Preconditions: `origin/main` contains the PR #15 merge; `git status` shows no tracked changes (the untracked
   `plans/vector-cache-and-key-line/`, `.claude/` and `.serena/` are expected); `$ELK_ORACLE_DIR/oracle-build.json`
   exists. Any miss: stop 9.
5. If the branch does not exist: `git fetch && git switch -c feature/vector-cache-and-key-line origin/main`, then
   `git add plans/vector-cache-and-key-line && git commit -m "docs(plans): add vector-cache-and-key-line mission brief"`.
   Otherwise `git switch feature/vector-cache-and-key-line`; if T4's cold run was started, check it is alive.
6. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing (D7)

`feature/vector-cache-and-key-line` off `origin/main`. One **unsigned** commit per task, subject `<type>(TN): <desc>`
(Conventional Commits, ≤72 chars, lowercase, no attribution). The journal cites task ids, never SHAs. The executor
**never signs, pushes, opens a PR, or merges**. At mission end it stops and hands the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' origin/main
git push -u origin feature/vector-cache-and-key-line
gh pr create --base main --head feature/vector-cache-and-key-line   # body: summary + evidence
# after the required checks pass: merge on GitHub with "Create a merge commit"
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK Java (the spec) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/` (`ElkGraphValidator.xtend`) |
| Oracle jars + vector scripts | `$ELK_ORACLE_DIR/oracle-build.json`; `tools/vectors/*.sh`, `tools/vectors/Elk{t,j}*Vectors.java` |
| 4d final-gate profile | `$ELK_ORACLE_DIR/final-gate/elkj-vectors.log` (per-row `done <id> <wall> ms wall, <cpu> ms cpu`) |
| Follow-up list and 4d journal | `plans/graph-json-text/follow-ups.md`; `plans/text-follow-ups/decision-journal.md` (T2 STOP 1) |

**AD-9:** never read OpenJDK or Guava source (Javadoc + JVM vectors only). Xtext and EMF EPL source is allowed.

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>` + `npm run complexity`
(and `bash -n` on shell files). The orchestrator runs, after every batch:

```bash
npm run format:check && npm run typecheck && npm run complexity   # complexity: never trust plain lizard's exit code
npm run coverage                                                  # 90/90/90/90
tools/vectors/elkt-vectors.sh "$TMPDIR/elkt" && for f in lexer parse validate write; do \
  cmp test/golden/refs/java/graph-text-$f.json "$TMPDIR/elkt/graph-text-$f.json"; done
tools/oracle/regen-elkt-refs.sh && tools/oracle/regen-elkj-refs.sh && git diff --exit-code test/golden/refs/
git show --name-only --format= HEAD                               # ⊆ the task's write-set
```

`elkj-vectors.sh` runs cold only in T4 (hours) and warm in the final gate (D3). Parallel agents never run
`npm run coverage` (shared `coverage/`) and never commit (shared index); the orchestrator commits per task.
`npm run docs:build` green before T5 is marked done. A gate flake while a JVM job runs is rerun alone once (PF5).

## Stop conditions: halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (a colocated `.test.ts` only for PF1 literals).
2. The same gate check fails twice in a row after fix attempts (investigate to a named cause first).
3. A change would contradict D1–D7, AD-1…AD-16, or the standing rules (no OpenJDK/Guava source, no attribution,
   keep `plans/`, zero runtime deps, browser-safe `src/`).
4. AD-13: a test, vector, golden or tolerance can only pass by changing it, except PF1.
5. D5 observability: the new lone-CR validate row passes before the fix (the key line is not visible to the vector).
6. Re-recording changes any existing row of any `graph-text-*.json` or `graph-json-text-*.json`; only T1's two added
   validate rows are expected.
7. A cold and a warm `elkj-vectors.sh` run differ, or either differs from the refs, and no diagnosis artifact
   (mechanism, origin `file:line`, causal chain, ruled out) can be produced.
8. T4's warm run takes ≥ 15 min (target < 5 min; 5–15 min: push forward and journal the cause).
9. The oracle or corpus is missing (the user runs `tools/oracle/build.sh`).
10. A JVM job dies or hangs (60 min without progress) a second time.
11. Mission end: stop and hand over the landing commands above.

## Push-forward: decide and journal

- **PF1** (D6, user-approved 2026-10-21): raise a row-count literal by exactly the rows the new vectors add; journal
  old → new. Lower bounds (`toBeGreaterThan`) stay untouched.
- **PF2** Shell style matches the existing vector scripts: `set -euo pipefail`, bash 3.2-compatible (macOS
  `/bin/bash`: no `source <(…)`, no associative arrays), SPDX header, `node` for hashing and JSON. Helper names free.
- **PF3** Cache file formats: per-row = the row JSON as the recorder emits it; whole-program = a copy of the output
  file plus a `.done` marker written last.
- **PF4** F7 scenario names and contents: the validate directory's `<check>-<what>` style, checks anchored on the key
  feature only, an `@covers` header line like their neighbours.
- **PF5** A gate flake under JVM load is rerun alone once; failing alone means it is real.
- **PF6** 1–3 line pre-existing-violation fixes in touched files; anything else becomes a new row in
  [`follow-ups.md`](../graph-json-text/follow-ups.md) or an `.agent-notes/vector-cache-and-key-line.md` entry. Test
  names, commit and journal wording.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1](batch-1/overview.md) | F7 vectors + fix; write-recorder row cache | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | Shared `vector-cache.sh` in both scripts | T3 | T2 | [x] |
| [3](batch-3/overview.md) | C4 proof: cold, warm, evicted rows | T4 | T3 | [x] |
| [4](batch-4/overview.md) | Docs and follow-ups closure | T5 | T1, T4 | [x] |
| Final | Full gates, `elkj-vectors.sh` warm; stop 11 | — | 4 | [ ] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)
