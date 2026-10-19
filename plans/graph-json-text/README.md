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
| [6](batch-6/overview.md) | `ElkGraphJsonText.load` (amended by D13) | T13 | 5, 1b | [x] |
| [7](batch-7/overview.md) | Validation; serializer | T14–T15 | 6 | [x] |
| [8](batch-8/overview.md) | Formatter and `serialize` | T16 | 7 | [x] |
| [9](batch-9/overview.md) | Local sweep; docs and plans | T17–T18 | 8 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-10-16)

**Tasks:** 18/18 planned tasks done (T1-T18). T12 was superseded by D13 and executed as T12a-T12f plus T12h (inverse
state vectors); all tasks one unsigned commit each, plus `fix(T1)` (`_meta` provenance after patch `0002`),
`fix(T11)` (injectable line source), `fix(T16)` (named literals, explicit round-trip timeout), and one `docs(plans)`
commit per batch. T18 was executed by the `documentation-engineer` agent (the planned `technical-writer` has no
Edit/Bash).

**Evidence:** JVM vectors replayed in CI: lexer 554 rows (101 `lexError`), parse 439 (282 exact, 157 syntax rows by
presence; Document rows 366 exact + 124 presence), validate 28 (21 exact, 7 presence), write 126 (115 formatted
byte-exact, 11 errors; reparse 89 exact + 26 lossy), inverse state 69 cases x load/access/resolve (276/276),
converter rows 523 replayed. Curated: 34 entries (15 tier 1, 19 tier 2), 15 refs, 34/34 hashes. Local sweep
(`docs/conformance.md` section 8, size-capped): `tier1-parse-equal=344/344` (144 exact, 200 presence),
`tier1-validate-equal=344/344`, `tier2-parse-equal=666/666` (591 exact, 75 both reject), `writer-byte-exact=351/351`
(315 byte-exact, 36 oracle failures matched), `reparse-equal=315/315`, 0 nondeterministic (selection 345 <= 5 KB + 6
sampled larger; oracle 2 h 04 min, TS 4.2 s). Last batch gate (batch 8): format 0, typecheck 0, complexity clean,
coverage 0 with 17,265 passed + 68 curated `skipIf` branches (99.38/97.92/99.38/99.41), 4b vectors cmp-identical,
`regen-elkt-refs.sh` no diff.

**User decisions:** D12 approved at mission start (patch `0002`, harness `convert` mode only, seed 1); `_meta`
provenance of three existing refs updated after the patch (T1, stop 4); T7 `SessionVocabulary` (stop 5, D1 amended);
**D13** (2026-10-16): D11 option A, lazy linking with EMF proxies; the IAE mapping extension (an unresolved `.elkj`
reference on export follows the 2026-10-14 unknown-endpoint entry); **D2 amendment** (2026-10-16): size-capped sweep.

**Open flags and follow-ups:**

1. 45 SIGNED_INT/FLOAT converter rows need Xtext's `DefaultTerminalConverter` (`registerEFactoryConverters`),
   unported and unreachable from the grammar, plus 3 type-erasure skips (T9). A task with `src/xtext` in its
   write-set would port it.
2. `.elkt` likely has the same bare-CR diagnostic-line deviation fixed for `.elkj` in `fix(T11)`; 4b has no
   bare-CR diagnostic vector, so a vector must be recorded first.
3. `ElkNodeImpl.toString` proxy arm not ported (T12e; outside its write-set, no caller prints a proxy).
4. The sweep sample is 6 larger graphs instead of ~40 (T17); a fuller run is a parameter change but days of CPU.
5. Cleanups: the serializer duplicates the scope wiring of `createElkGraphJsonLinking` (T15); `ElkGraphCopy`
   duplicates 4b's `copyGraph` (AD-8; a shared home in `src/graph/util` would serve both); `ExceptionDiagnostic` and
   the cancellation stand-ins live in `src/xtext/linking/lazy/` and could move to `xtext/diagnostics`/`util`
   (T12d).
6. Pre-existing timing flake `src/xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.test.ts` (300 ms
   budget) under machine load; left unchanged (AD-13).
7. Write-set extensions, all journaled: the orchestrator's `exception-hierarchy.fitness.test.ts` entry (T12d) and
   `EValidatorRegistrar` null branch (T14); agents' new files `src/emf/ecore/util/InternalEList.ts` and
   `test/helpers/emf/ResourceNode.ts` (T12a), `test/helpers/graph-json-text-linking.ts` (T12f),
   `test/helpers/graph-json-text-shapes.ts` (T13), `test/helpers/elkj-write-cases.ts` (T15), and T3's
   `.prettierignore` entries for the lenient fixtures.
8. No ELK prose typo was corrected in this mission (nothing under "upstream typos").
9. Landing (stop 16): the commands under "Branch and landing (D9)" above. Commits are unsigned; the user signs by
   rebase (YubiKey PIN + touch per commit), pushes, opens the PR and merges with a merge commit.

### Final gates (2026-10-16, orchestrator)

format 0 · typecheck 0 · complexity clean · coverage 0 (17,273 passed + 68 curated `skipIf` branches;
99.38/97.92/99.38/99.41) · `docs:build` 0 · 4b vectors cmp-identical · `regen-elkt-refs.sh` no diff ·
`elkj-vectors.sh` cmp-identical (lexer, parse, validate, write, inverse) · `regen-elkj-refs.sh` no diff. The plain
full run hit the known `ImportedNamespaceAwareLocalScopeProvider` 300 ms flake once at load ≈ 54 (JVM replay running);
3/3 green in isolation. Also stale, outside T18's write-set: `docs/architecture/port-map.md` has no `graph.json.text`
section and `inventory.md`'s row predates the port (follow-up). Mission stops at stop 16 for signing and landing.

### Re-opened 2026-10-18 (user)

T16b ([batch-8/T16b-roundtrip-vectors.md](batch-8/T16b-roundtrip-vectors.md)): oracle round-trip vectors for the
`.elkj` writer, all 281 loadable inputs (T16b1 recorder, T16b2 replay). Stop 16 is reached again after it.

### Follow-ups (2026-10-18)

The open items are consolidated, with status, in [follow-ups.md](follow-ups.md): B1–B3 before landing (final gate,
T16b docs, signing), F1–F6 port fidelity, C1–C6 cleanups and tooling.

### T16b results (2026-10-18)

T16b1 recorded `test/golden/refs/java/graph-json-text-roundtrip.json` (281 rows, `tools/vectors/ElkjRoundTripVectors.java`,
about 2.8 CPU-hours; stage-1 double run byte-identical). T16b2 replays it in `test/golden/elkj-roundtrip.test.ts`:
244/244 written texts byte-equal (226 reparse exact + export equal, 18 presence), 37/37 error rows (36 serializer
failures matched by class; 1 copy failure `IndexOutOfBoundsException: targetIndex=1, size=1`, message byte-equal) and
27/27 unresolved-endpoint drops. Fix: `src/graph/json/text/formatting2/ElkGraphCopy.ts` ports the bidirectional
many-valued arm of EMF `Copier.copyReference`; T16 class counts become unresolved 28 → 27 plus `copy-failure` 1.
Flag: `input-lone-surrogate-escape` uses the recorder's `getBytes(UTF_8)` transport. Final gate 2026-10-18:
`elkj-vectors.sh` cmp-identical for lexer, parse, validate, write, inverse, roundtrip. Docs updated (follow-up B2);
open items are in [follow-ups.md](follow-ups.md).
