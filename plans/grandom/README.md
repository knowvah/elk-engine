<!-- SPDX-License-Identifier: EPL-2.0 -->

# Random graph generator (`.elkr`) — Mission Brief (mission 4f; roadmap row 4d)

## Objective

Port the hand-written part of `org.eclipse.elk.core.debug.grandom` to `src/core/debug/grandom/`: a hand-written lexer
and recursive-descent parser for `GRandom.xtext` (on the `src/xtext` subset from missions 4b/4c), the `gRandom` EMF
model as plain classes (D3), `GRandomValidator`, `ConfigurationParser`, `GeneratorOptions` (+ `RandVal`),
`RandomGraphGenerator` (1,799 lines, split by Java section, D4) and `BlindTextGenerator`, drawing the exact JVM
`Random` sequence. Every behaviour is proven against JVM recordings written **before** the code (AD-13). Exit (D1):
the nine `test/corpus/generated/*.elkr` inputs regenerate their committed `*.json` **byte for byte**, and every row of
`grandom-{lexer,parse,validate,generate}.json` replays green. `BlindTextGenerator` and the other unseeded paths stay
out of exact goldens (invariant rows only). Internal only: nothing is exported from `src/index.ts` (AD-14); entry
points `GRandomText` (parse, validate) and `RandomGraphGenerator.generate` (D6). The `.ide` bundle stays deferred and
`.ui` out of scope; the label is 4f because `plans/text-follow-ups` already used "4d".

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md). AD-1…AD-16
   (`plans/elk-engine-skeleton/decisions.md`), the standing rules and amendments (`plans/core-metadata/decisions.md`),
   4b's G1–G8 (`plans/graph-text/decisions.md`) and corpus D7 (`plans/conformance-corpus/decisions.md`) apply.
3. Read `.agent-notes/` (at least `graph-text.md`, `graph-json-text.md`, `vector-cache-and-key-line.md`) and state
   what affects the approach.
4. If the branch does not exist: `git switch -c feature/grandom` from `main`, then
   `git add plans/grandom && git commit -m "docs(plans): add grandom mission brief"`.
   Otherwise `git switch feature/grandom`.
5. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing (D9)

`feature/grandom` off `main`. One **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits,
≤72 chars, lowercase, no attribution), plus one `docs(plans): mark batch N done` per batch. The journal cites task
ids, never SHAs. The executor **never signs, pushes, opens a PR, or merges**. At mission end it stops (stop 14) and
hands the user these commands (YubiKey PIN + touch per commit; replug the key if `ssh-keygen -vvv` shows
`FIDO_ERR_RX`):

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/grandom
gh pr create --base main --head feature/grandom   # body: summary + size justification
# after the required checks pass: merge on GitHub with "Create a merge commit" (never rebase: it drops signatures)
```

## Inputs (read-only)

| What | Where |
|------|-------|
| ELK grammar, Xtend, Java (the spec) | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/` |
| Xtend compiled to Java (settles Xtend semantics) | `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.core.debug.grandom/xtend-gen/` |
| Generated code (edge-case spec only: lexer, model, `GRandomPackage` literals) | same bundle, `src-gen/` |
| `ElkMath.boundi` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java` |
| Patterns to mirror | `src/graph/text/**`, `src/graph/json/text/**`, `src/xtext/**`, `tools/vectors/{elkt,elkj}-vectors.sh`, `Elkt*Vectors.java` |
| Corpus harness (the exit oracle) | `tools/oracle/harness/{GrandomGenerator,CaseRunner}.java`, `tools/oracle/regen-generated.sh` |
| Corpus (frozen, AD-13) | `test/corpus/generated/*.{elkr,json}` (9 pairs) |
| Oracle jars | `$ELK_ORACLE_DIR/oracle-build.json` (grandom jar already built); Xtext 2.36.0 |
| JDK | JDK 21 on PATH |

**AD-9:** never read OpenJDK, Guava or ANTLR-runtime source (Javadoc + vectors only). Xtext and EMF EPL source are
allowed. **Never edit `tools/vectors/vector-cache.sh`:** its bytes salt every cache entry, so an edit re-records all
`.elkt`/`.elkj` programs (the `.elkj` round-trip alone is ~2.8 CPU-hours).

## Quality gates

Agents run their own tests + `npm run typecheck` + `npx prettier --check <files>` + `npm run complexity`. The
orchestrator runs, after every batch:

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + ~10 s
tools/oracle/regen-elkt-refs.sh && tools/oracle/regen-elkj-refs.sh \
  && git diff --exit-code test/golden/refs/ test/corpus/  # existing refs + corpus frozen
# from batch 1 on (lexer; all four from batch 2), every landed grandom vector must re-record byte-identical:
tools/vectors/elkr-vectors.sh /tmp/elkr-check && for f in test/golden/refs/java/grandom-*.json; do \
  cmp "$f" "/tmp/elkr-check/$(basename "$f")"; done
# after batch 5: no placeholder left (stop 13)
! grep -rn 'GRANDOM_PLACEHOLDER' src/
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

Parallel agents never run `npm run coverage` (shared `coverage/`) and never commit (shared index); the orchestrator
commits per task. `npm run docs:build` green before T15 is marked done.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing (colocated `.test.ts` implicit; complexity-only
   rewrites excepted — see push-forward).
2. The same gate check fails twice in a row.
3. A change would contradict D1–D9, AD-1…AD-16, 4b G1–G8, or the standing rules.
4. AD-13: any byte diff in a ref, a landed vector or a `test/corpus/generated/*.json`, or a test that can only pass by
   changing its assertion. Widening the T12–T14 replay filter and adding corpus cases are additions, not changes.
5. A TS result differs from a vector, ref or corpus byte and the mechanism (`file:line`, causal chain, ruled out)
   cannot be named — including a JVM `Random` draw-order or float divergence the dump of both draw sequences cannot
   localise. Never edit the expected value.
6. A shim's behaviour is undecidable from Javadoc + existing vectors (`Random`, `Collections.shuffle`, float
   rounding), or the work seems to need OpenJDK, Guava or ANTLR-runtime source (AD-9).
7. Oracle: Xtext is not 2.36.0, a grandom class cannot be loaded, a seeded scenario is not deterministic across two
   recorder runs, or the recorder's export differs from `CaseRunner.export` on a corpus input.
8. A seeded scenario turns out to use unseeded randomness beyond the three known kinds (edge labels, cross-hierarchy
   `sample`, no seed), so the masking rule would have to grow beyond D1.
9. An API beyond `GRandomText.parse`/`validate`, `ConfigurationParser`, `RandomGraphGenerator.generate`,
   Xtext-mirroring internals and test-local helpers seems needed — or any export from `src/index.ts`.
10. A runtime dependency or a non-EPL-compatible dev dependency seems necessary.
11. A file cannot meet the complexity limits with splits at Java method/section boundaries beyond D4's six files.
12. The mission adds more than ~10 s to `npm test` over the baseline in [decisions.md](decisions.md#baseline-pre-flight-2026-10-22)
    (compare at similar load), the generate replay > 10 s, or the 200-node stress scenario > 1 s in TS.
13. A T12 placeholder survives T14, or a T12–T14 step needs a not-yet-ported form to pass its own rows.
14. Mission end: stop and hand over the landing commands above.

## Push-forward — decide and journal

- Vector JSON layout beyond the agreed row shapes; scenario, fixture, token-type and invariant-field names.
- Which ~35–45 generate scenarios to record, as long as they cover T3's coverage list.
- Internal file splits inside `parser/` and `generators/` beyond D4 at Java method boundaries; private helper names
  (Java names stay Java's). Xtend constructs per `docs/translation-rules.md` §8; identical Java logic → one helper.
- Complexity-only, semantics-neutral rewrites, also outside the write-set; verify with `npm run complexity`.
- The placeholder marker text, as long as it contains `GRANDOM_PLACEHOLDER` (the batch-5 gate greps for it).
- ELK prose typos per the carve-out, listed in `docs/conformance.md` — `BlindTextGenerator` words only for a clear
  typo, never validator messages compared against vectors.
- Test names, commit messages, journal wording, `.agent-notes/grandom.md` entries.
- A 1–3 line pre-existing-violation fix in a file already being touched (grep references first).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| [1](batch-1/overview.md) | Vector script and lexer vectors | T1 | — | [x] |
| [2](batch-2/overview.md) | Remaining vectors; shims; model; lexer | T2–T6 | 1 | [ ] |
| [3](batch-3/overview.md) | GeneratorOptions; parser | T7–T8 | 2 | [ ] |
| [4](batch-4/overview.md) | Validator + facade; ConfigurationParser | T9–T10 | 3 | [ ] |
| [5](batch-5/overview.md) | RandomGraphGenerator (sequential) | T11–T14 | 4 | [ ] |
| [6](batch-6/overview.md) | Docs, runbook, roadmap | T15 | 5 | [ ] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)
