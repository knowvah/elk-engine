<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK Text (`.elkt`) — Mission Brief (roadmap mission 4b)

## Objective

Port the `graph.text` bundle (`ElkGraph.xtext` + 17 Xtend files, 1,352 lines) to `src/graph/text/`,
on a faithful Xtext 2.36 runtime subset in `src/xtext/` (EPL source) and `core.util.internal.LayoutOptionProxy`.
A hand-written lexer and recursive-descent parser (one method per rule, D8, G6), the Xtend value
converters, naming, scoping, linking and validation, and the `.elkt` writer: a grammar-specific
sequencer plus the `formatting2` subset `ElkGraphFormatter` needs (G1, D10). Every behaviour is
proven against JVM recordings written **before** the code (AD-13) on the CoreOptions-only registry
(G3). Exit (roadmap 4b, D3, G7): curated refs and all vectors green in CI; local sweep: every
elk-models `.elkt` parses and validates equal to the oracle, every `.elkt` and realworld `.json`
writes byte-exact and re-parses equal, realworld `.json` ≡ `.elkt` (D3). Internal only: nothing is
exported from `src/index.ts` (AD-14); entry point `ElkGraphText` (G4).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). Standing rules
   and their 2026-10-14 amendments (`plans/core-metadata/decisions.md`) apply.
3. Read `.agent-notes/` (at least `elk-json-adapter.md`, `core-metadata.md`, `elkgraph-model.md`) and
   state what affects the approach.
4. If the branch does not exist: `git switch -c feature/graph-text` from `main`, then
   `git add plans/graph-text && git commit -m "docs(plans): add graph-text mission brief"`.
   Otherwise `git switch feature/graph-text`.
5. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing (G8)

`feature/graph-text` off `main`. One **unsigned** commit per task, subject `<type>(TN): <desc>`
(Conventional Commits, ≤72 chars, lowercase, no attribution). The journal cites task ids, never
SHAs. The executor **never signs, pushes, opens a PR, or merges**. At mission end it stops (stop 14)
and hands the user these commands to run in their own terminal (YubiKey PIN + touch per commit):

```bash
git rebase --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/graph-text
gh pr create --base main --head feature/graph-text   # body: summary + size justification
# after the required checks pass: merge on GitHub with a merge commit
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK Xtend + grammar (the spec) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/` |
| Xtend compiled to Java (settles Xtend semantics) | `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.text/xtend-gen/` |
| Generated code (edge-case spec only, G1/G6) | `…/org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/` |
| Xtext 2.36.0 EPL source | `~/.m2/repository/.cache/tycho/https/eclipse.mirror.rafal.ca/releases/2024-09/202409111000/plugins/org.eclipse.xtext.source_2.36.0.v20240825-0714.jar`; `org.eclipse.xtext.util` source: `~/.m2/repository/p2/osgi/bundle/org.eclipse.xtext.util.source/2.36.0.v20240825-0714/*.jar` |
| Oracle jars + harness | `$ELK_ORACLE_DIR/oracle-build.json`; `tools/oracle/{run.sh,harness/}` |
| elk-models (sweep only) | `$ELK_MODELS_DIR` (default `../../eclipse-elk/elk-models`): 898 `.elkt`, 550 realworld `.json` |
| JDK | JDK 21 on PATH |

**AD-9:** never read OpenJDK or Guava source (Javadoc + vectors only). Xtext and EMF EPL source are allowed.

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>` +
`npm run complexity`. The orchestrator runs, after every batch:

```bash
npm run format:check                                 # exit 0
npm run typecheck                                    # exit 0
npm run complexity                                   # clean; never trust plain lizard's exit code
npm run coverage                                     # exit 0; 90/90/90/90; npm test ≤ ~60 s
java tools/vectors/JavaVectors.java test/golden/refs/java \
  && tools/vectors/graph-vectors.sh test/golden/refs/java \
  && tools/vectors/metadata-vectors.sh test/golden/refs/java \
  && tools/vectors/gson-vectors.sh test/golden/refs/java \
  && tools/vectors/graph-json-vectors.sh test/golden/refs/java \
  && tools/vectors/transfer-vectors.sh test/golden/refs/java \
  && tools/oracle/regen-parse-refs.sh \
  && git diff --exit-code test/golden/refs/          # frozen refs unchanged
# once landed, each must also leave test/golden/refs/ byte-identical:
tools/vectors/elkt-vectors.sh test/golden/refs/java  # after T2 (runs T2–T5 recorders)
tools/oracle/regen-elkt-refs.sh                      # after T1
git show --name-only --format= HEAD                  # ⊆ the task's write-set
```

Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit (shared index);
the orchestrator commits per task. `npm run docs:build` green before T24 is marked done.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (colocated `.test.ts` implicit;
   complexity-only rewrites excepted — see push-forward).
2. The same gate check fails twice in a row.
3. A change would contradict G1–G8, D3/D8/D10, AD-1…AD-15, or the standing rules (+ 2026-10-14 amendments).
4. AD-13: any byte diff in an existing ref or a landed vector, or a test that can only pass by
   changing its assertion (the G3 mission-5 deferrals excepted).
5. The work seems to need OpenJDK, Guava or ANTLR-runtime source. (Xtext/EMF EPL source is fine;
   the src-gen lexer is the edge-case spec only, G6.)
6. Oracle: Xtext is not 2.36.0, a class cannot be loaded, or the `ORACLE_REGISTRY=core` registry's
   option ids differ from the TS registry's.
7. A TS result differs from a vector, ref or the oracle and the mechanism (`file:line`, causal
   chain, ruled out) cannot be named. Never edit the expected value.
8. The writer can only match by porting Xtext's generic NFA sequencer or `formatting2` beyond G1.
9. An API beyond G4's `load`/`validate`/`serialize`, Xtext-mirroring internals, type guards and
   test-local helpers is needed.
10. The work seems to need a runtime dependency or a non-EPL-compatible dev dependency.
11. `npm test` > ~60 s, TS sweep > 2 min, or parse+link of the largest model > 1 s with the scope cache.
12. A sweep divergence's diagnosis points outside `src/graph/text`, `src/xtext`, `src/core/util/internal`.
13. A file cannot meet the complexity limits with splits at Java method/section boundaries.
14. Mission end: stop and hand over the landing commands above.

## Push-forward — decide and journal

- `src/xtext` internals (file split, private helpers); public names are Xtext's. Xtend constructs per
  `docs/translation-rules.md` §8. Identical Java logic → one shared helper (standing rule).
- Vector JSON layout beyond the agreed contracts; scenario, fixture and token-type names.
- The ~30 curated models, as long as they cover every rule, both section forms, proxies, quoting
  and every diagnostic kind.
- Complexity-only, semantics-neutral rewrites, also outside the write-set (user, 2026-10-14);
  verify with `npm run complexity`.
- G3 deferrals of validator rows that depend on `fixed`/`box`/`random`, with a test naming mission 5.
- Test names, commit messages, journal wording, `.agent-notes/graph-text.md` entries.
- A 1–3 line pre-existing-violation fix in a file already being touched (grep references first).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | Evidence: oracle refs and JVM vectors | T1–T5 | — | [x] |
| 2a | Fitness, Xtext converters and naming, lexer | T6–T9 | 1 | [x] |
| 2b | `LayoutOptionProxy`, Xtext validation base, `formatting2` | T10–T12 | 1 | [x] |
| 3 | ElkGraph converters; Xtext scoping | T13–T14 | 2a, 2b | [x] |
| 4 | Parser; Xtext linker | T15–T16 | 3 | [x] |
| 5 | ElkGraph naming, scoping, linker | T17 | 4 | [x] |
| 6 | `ElkGraphText.load`; semantic sequencer | T18–T19 | 5 | [x] |
| 7 | Validator; formatter | T20–T21 | 6 | [ ] |
| 8 | `validate`/`serialize`, round trip, D3 | T22 | 7 | [ ] |
| 9 | Local sweep; docs | T23–T24 | 8 | [ ] |

## Document index

- [decisions.md](decisions.md) — G1–G8 + operational readiness · [decision-journal.md](decision-journal.md)
- [diagrams/component-map.md](diagrams/component-map.md) · [diagrams/data-flow.md](diagrams/data-flow.md)
- Batches: [1](batch-1/overview.md) · [2a](batch-2a/overview.md) · [2b](batch-2b/overview.md) ·
  [3](batch-3/overview.md) · [4](batch-4/overview.md) · [5](batch-5/overview.md) ·
  [6](batch-6/overview.md) · [7](batch-7/overview.md) · [8](batch-8/overview.md) · [9](batch-9/overview.md)

## Mission end

All batches `[x]`; gates green; sweep counts in `docs/conformance.md` and the journal;
`.agent-notes/graph-text.md` holds novel observations. Append a mission summary here (tasks, evidence,
user decisions, flags, follow-ups for missions 4c/4d/5/7), then stop 14. Next roadmap mission: 4c
(`graph.json.text`).

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with `[ ]` →
its `overview.md` → first incomplete task.
