<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK Textual JSON (`.elkj`) — Mission Brief (roadmap mission 4c)

## Objective

Port the `graph.json.text` bundle (`ElkGraphJson.xtext` + 13 Xtend/Java files, 908 hand-written lines) to
`src/graph/json/text/`, on the Xtext subset from mission 4b (`src/xtext`), whose grammar-agnostic parse runtime
first moves from `src/graph/text/parser/ParseRecords.ts` to `src/xtext/parser/` (D1). A hand-written lexer and
recursive-descent parser (one method per rule, D7), the Xtend value converters, flat naming, scoping, linking
(eager with lazy-equivalent results, D11), validation, and the `.elkj` writer (sequencer + `ElkGraphJsonFormatter`,
D3). Every behaviour is proven against JVM recordings written **before** the code (AD-13) on the CoreOptions-only
registry (D4). Exit (D2 = A′): curated refs and all vectors green in CI; local sweep: the 1,448 ELK-native `.elkj`
files (the oracle's `ConvertGraphHandler` steps applied to 898 `.elkt` + 550 `.json`) parse and validate equal to
the oracle, ELK JSON read as `.elkj` parses equal, and 1,448 graphs write byte-exact and re-parse equal. Internal
only: nothing is exported from `src/index.ts` (AD-14); entry point `ElkGraphJsonText` (D5).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). AD-1…AD-16
   (`plans/elk-engine-skeleton/decisions.md`), the standing rules and their amendments
   (`plans/core-metadata/decisions.md`) and 4b's G1–G8 (`plans/graph-text/decisions.md`, where D4–D9 carry them) apply.
3. Read `.agent-notes/` (at least `graph-text.md`, `elk-json-adapter.md`) and state what affects the approach.
4. If the branch does not exist: `git switch -c feature/graph-json-text` from `main`, then
   `git add plans/graph-json-text && git commit -m "docs(plans): add graph-json-text mission brief"`.
   Otherwise `git switch feature/graph-json-text`.
5. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing (D9)

`feature/graph-json-text` off `main`. One **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional
Commits, ≤72 chars, lowercase, no attribution). The journal cites task ids, never SHAs. The executor **never signs,
pushes, opens a PR, or merges**. At mission end it stops (stop 16) and hands the user these commands (YubiKey PIN +
touch per commit; replug the key if `ssh-keygen -vvv` shows `FIDO_ERR_RX`):

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/graph-json-text
gh pr create --base main --head feature/graph-json-text   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit" (never rebase: it drops signatures)
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK Xtend + grammar (the spec) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/` |
| Xtend compiled to Java (settles Xtend semantics) | `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.json.text/xtend-gen/` |
| Generated code (edge-case spec only, D7) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/` |
| ELK's `.elkj` producer (D2 tier 1) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json.text.ui/src/org/eclipse/elk/graph/json/text/ui/ConvertGraphHandler.xtend:140-180` |
| Xtext 2.36.0 EPL source | as in `plans/graph-text/README.md` "Inputs" (tycho cache `org.eclipse.xtext.source_2.36.0…jar`, p2 `org.eclipse.xtext.util.source`) |
| Mission 4b port (patterns to mirror) | `src/graph/text/**`, `src/xtext/**`, `docs/architecture/elk-text.md`, `tools/vectors/Elkt*Vectors.java` |
| Oracle jars + harness | `$ELK_ORACLE_DIR/oracle-build.json` (graph.json.text jar already built); `tools/oracle/{run.sh,harness/}` |
| elk-models (sweep only) | `$ELK_MODELS_DIR` (pinned `ac5af2b`): 898 `.elkt`, 550 realworld `.json`; **no `.elkj`** (D2) |
| JDK | JDK 21 on PATH |

**AD-9:** never read OpenJDK or Guava source (Javadoc + vectors only). Xtext and EMF EPL source are allowed.

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>` + `npm run complexity`. The
orchestrator runs, after every batch:

```bash
npm run format:check                                 # exit 0
npm run typecheck                                    # exit 0
npm run complexity                                   # clean; never trust plain lizard's exit code
npm run coverage                                     # exit 0; 90/90/90/90; npm test ≤ ~60 s
tools/vectors/elkt-vectors.sh /tmp/elkt-check && for f in lexer parse validate write; do \
  cmp test/golden/refs/java/graph-text-$f.json /tmp/elkt-check/graph-text-$f.json; done   # 4b vectors frozen
tools/oracle/regen-elkt-refs.sh && git diff --exit-code test/golden/refs/ test/corpus/elkt-curated/
# once landed, each must also leave the repo byte-identical:
tools/vectors/elkj-vectors.sh test/golden/refs/java  # after T2 (runs every Elkj*Vectors.java)
tools/oracle/regen-elkj-refs.sh                      # after T6
git show --name-only --format= HEAD                  # ⊆ the task's write-set
```

Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit (shared index); the orchestrator
commits per task. `npm run docs:build` green before T18 is marked done.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (colocated `.test.ts` implicit; complexity-only
   rewrites excepted — see push-forward).
2. The same gate check fails twice in a row.
3. A change would contradict D1–D11, AD-1…AD-16, carried G1–G8, or the standing rules.
4. AD-13: any byte diff in an existing ref or a landed vector, or a test that can only pass by changing its assertion.
5. T7 changes any 4b test or ref, or needs more than import and generic-parameter changes in `src/graph/text`.
6. The work seems to need OpenJDK, Guava or ANTLR-runtime source.
7. Oracle: Xtext is not 2.36.0, a class cannot be loaded, the core registry's option ids differ from the TS
   registry's, or the `convert` mode is not deterministic across two runs.
8. A TS result differs from a vector, ref or the oracle and the mechanism (`file:line`, causal chain, ruled out)
   cannot be named. Never edit the expected value.
9. D11: a vector shows proxy-dependent behaviour that eager resolution cannot reproduce (option A returns to the user).
10. The writer can only match by porting Xtext's generic NFA sequencer or `formatting2` beyond what
    `ElkGraphJsonFormatter` needs.
11. An API beyond `load`/`validate`/`serialize`, Xtext-mirroring internals, type guards and test-local helpers is needed.
12. A runtime dependency or a non-EPL-compatible dev dependency seems necessary.
13. `npm test` > ~60 s, TS sweep > 2 min, or loading the largest model > 1 s.
14. A sweep divergence's diagnosis points outside `src/graph/json/text`, `src/xtext`, `src/core/util/internal`.
15. A file cannot meet the complexity limits with splits at Java method/section boundaries.
16. Mission end: stop and hand over the landing commands above.

## Push-forward — decide and journal

- `src/xtext/parser` internals from the T7 move (file split, generic-parameter names, private helpers); Xtext names
  stay Xtext's. Xtend constructs per `docs/translation-rules.md` §8. Identical Java logic → one shared helper.
- Vector JSON layout beyond the agreed row shapes; scenario, fixture and token-type names.
- The ~30 curated inputs, as long as they cover all three tiers, every rule, the three keyword spellings, unresolved
  references and every diagnostic kind.
- Complexity-only, semantics-neutral rewrites, also outside the write-set; verify with `npm run complexity`.
- The internal shape of the eager linker's diagnostic deferral (D11 B), as long as the vectors match.
- Test names, commit messages, journal wording, `.agent-notes/graph-json-text.md` entries.
- A 1–3 line pre-existing-violation fix in a file already being touched (grep references first).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1](batch-1/overview.md) | Evidence: oracle modes and JVM vectors | T1–T5 | — | [x] |
| [1b](batch-1b/overview.md) | Curated refs and vendored inputs | T6 | T1 | [x] |
| [2](batch-2/overview.md) | Shared parse runtime; lexer | T7–T8 | 1 | [x] |
| [3](batch-3/overview.md) | Value converters; naming and scoping | T9–T10 | 2 | [x] |
| [4](batch-4/overview.md) | Parser | T11 | 3 | [x] |
| [5](batch-5/overview.md) | Linking — re-scoped by D13 (lazy linking, EMF proxies); T12 superseded | T12a–T12f, T12h | 4 | [x] |
| [6](batch-6/overview.md) | `ElkGraphJsonText.load` (amended by D13) | T13 | 5, 1b | [ ] |
| [7](batch-7/overview.md) | Validation; serializer | T14–T15 | 6 | [ ] |
| [8](batch-8/overview.md) | Formatter and `serialize` | T16 | 7 | [ ] |
| [9](batch-9/overview.md) | Local sweep; docs and plans | T17–T18 | 8 | [ ] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)
