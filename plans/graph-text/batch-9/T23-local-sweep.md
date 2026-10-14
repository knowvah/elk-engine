<!-- SPDX-License-Identifier: EPL-2.0 -->

# T23 — `.elkt` oracle sweep and conformance section

**Agent:** tooling-engineer · **Commit:** `test(T23): sweep all elkt and realworld json models`

## Context
G7: the committed evidence is the vectors and ~30 curated refs; the full evidence is local. This task builds the
local sweep that measures the Phase 4 indicators over `$ELK_MODELS_DIR` (898 `.elkt`, 550 realworld `.json`),
compares the TS port with the oracle, and publishes counts in `docs/conformance.md`. It is the mission's
exit measurement; a divergence is diagnosed (mechanism, `file:line`, ruled-out), never normalised away.

## Task
1. `tools/oracle/elkt-sweep.sh [--force]` (shape of `tools/oracle/json-sweep.sh`; read it and `sweep.sh`): checks
   `$ELK_MODELS_DIR` and `$ELK_ORACLE_DIR/oracle-build.json`, computes a stamp (oracle build, harness + tool
   sources, models commit, hash of every input) and skips when fresh. Output tree under
   `$ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>/` (AD-5: never in the repo), subdirs `parse/`, `validate/`,
   `write/`, `results.jsonl`, `summary.json`. Everything runs with `ORACLE_REGISTRY=core` (T1; G3).
2. Cases, each in **two separate JVM runs** compared byte-identical (D5; differing -> `nondeterministic`, reported
   separately, excluded from pass counts):
   - **parse**: 898 `.elkt` via `run.sh --cases` in `parse` mode (`tools/oracle/run.sh:1-16`; the id is the model path
     without extension; `.elkt` input given explicitly because `json-sweep.sh` only lists `.json`);
   - **validate**: 898 `.elkt` -> issues `{severity,message,line,code}` through the T4 recorder's validation path;
   - **write**: 898 `.elkt` (parsed, then written) + 550 realworld `.json` (via `ElkGraphJson`) -> formatted text via the
     T5 path (`EcoreUtil.copy` + `serialize(format())`, G2), or the exception class for failures.
   validate/write need a JVM driver over a directory of inputs, which T4/T5 do not provide: add
   `tools/oracle/ElktSweep.java` (single-file source program or class compiled by the script, same core-only classpath as
   `tools/vectors/elkt-vectors.sh`; reuse the T4/T5 classes' logic by calling them, do not copy; pinned-commit check;
   Xtext version check = stop 6) writing one JSON file per case and a result line per case.
3. `test/corpus/elkt-sweep.test.ts` (pattern: `test/corpus/json-sweep.test.ts:1-100`; skip with a message when the
   models dir or the sweep dir is absent): per model, TS vs oracle:
   - **parse-equal**: `exportLikeOracle(load(elkt).root)` vs oracle parse output through `compareLayout` (1e-6); oracle
     `throws` rows: TS `errors` non-empty (presence, D8 #1);
   - **validate-equal**: `validate(root)` issues equal exactly (order, severity, message, line, code), excluding G3 deferrals
     (`MISSION5_ALGORITHMS` filter from T20);
   - **writer byte-exact**: `serialize` equals oracle text for all 1,448 inputs; failures match by presence;
   - **reparse-equal**: `load(serialize(g))` equals `g` (`canonNode`) for 1,448;
   - **D3**: `.json` ≡ `.elkt` for the 550 realworld pairs under T22's rule, and the same comparison on the oracle's
     two outputs to separate upstream differences from port defects.
   One `it` per indicator; each logs `elkt sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k>` and fails with the
   per-model diff report. Test timeout 120 s (stop 11 if the TS side exceeds it); also assert the largest model
   (`realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt`) parse+link < 1 s.
4. Run the sweep; for every divergence write the diagnosis artifact in the journal (mechanism, origin `file:line`,
   causal chain, ruled out). Fix only inside `src/graph/text`, `src/xtext`, `src/core/util/internal`; a divergence
   pointing elsewhere is **stop 12**. Divergences that are approved deferrals (G3 mission 5, D8 #1 syntax text, upstream
   data in D3) are listed by id with their reason.
5. `docs/conformance.md`: new section "ELK Text (`.elkt`)" (before "Temporary gaps"): what is compared, the registry
   mode (core-only; mission 5/7 regenerate), the five indicator counts with the bar, deferrals (G3 ids by count,
   known divergence D8 #1, D3 upstream differences with the rule), the `isQuotingNecessary` quirk (G1: always false
   -> property strings never quoted; ELK-behaviour kept), the cross-reference to `architecture/elk-text.md`, and the
   regeneration command. Update the "Temporary gaps" list with the G3 deferral if any ref depends on it.
6. Journal the counts (append to `plans/graph-text/decision-journal.md`).

## Write-set
`tools/oracle/elkt-sweep.sh`, `tools/oracle/ElktSweep.java`, `test/corpus/elkt-sweep.test.ts`, `docs/conformance.md`.
(The sweep output lives outside the repo; the orchestrator confirms `git status` shows no sweep files.)

## Read-set
- `tools/oracle/{json-sweep.sh,sweep.sh,run.sh:1-140}`, `tools/oracle/harness/{CaseRunner,ElkModelReader,CaseSpec}.java`
- `tools/vectors/{elkt-vectors.sh,ElktValidateVectors.java,ElktWriteVectors.java}` (T2–T5 as landed)
- `test/corpus/{json-sweep.test.ts,corpus.ts}`, `test/golden/compare-json.ts`, `test/helpers/*`, `src/graph/text/ElkGraphText.ts`
- `docs/conformance.md:24-72,103-180,281-345`; `../decisions.md#operational-readiness-phase-4`

## Decisions
- [G3](../decisions.md#g3--option-registry-for-refs), [G5](../decisions.md#g5--diagnostic-fidelity), [G7](../decisions.md#g7--evidence-layout),
  [Phase 4](../decisions.md#operational-readiness-phase-4); D3, D5, D8 #1, AD-5; stop 11, 12.

## Interface contract
Sweep tree layout (consumed by the test and by `docs/architecture/elk-text.md` runbook):
`results.jsonl` lines `{"id","kind":"parse|validate|write","status":"ok|throws|nondeterministic|oracle-error|timeout",...}`;
`summary.json` `{elkCommit, modelsCommit, registry:"core", counts:{<kind>:{ok,throws,nondeterministic}}}`.

## Acceptance criteria
- Given the pinned models and oracle, when `elkt-sweep.sh` runs twice, then the second run is skipped as fresh and `--force` reproduces byte-identical outputs.
- Given the TS side, then parse-equal 898/898 (minus approved deferrals), validate-equal 898/898 (minus G3), writer byte-exact 1,448/1,448, reparse-equal 1,448/1,448, D3 550/550 (minus listed upstream differences).
- Given any mismatch outside the approved deferrals, then the task is not done: a diagnosis artifact exists, or stop 12 is raised.
- Given the 253 KB model, then parse + link takes under 1 s and the whole TS sweep under 2 min.

## Quality bar
README gates (coverage not affected: sweep test is local-only, skipped in CI with a message); `shellcheck` clean;
lizard clean on `ElktSweep.java`; two-run determinism; counts in `docs/conformance.md` equal the journal.

## Observability
Phase 4 indicators, produced by this task and re-run on demand (library, no runtime telemetry): parse-equal /898,
validate-equal /898, writer byte-exact /1,448, reparse-equal /1,448, D3 realworld `.json` ≡ `.elkt` /550. Threshold: any
mismatch outside G3 deferrals / D8 #1 / listed D3 upstream differences = failure; per-model verdicts stay under
`$ELK_ORACLE_DIR/sweep/` (AD-5). Report location: the `.elkt` section of `docs/conformance.md` plus the journal;
`docs/parity-report.md` is untouched.

## Rollback
Reversible — revert the commit.

## Boundaries
No edit to refs, vectors, T1–T22 files or the existing sweeps. Never loosen tolerance or drop a model to get green (STOP 4).
No OpenJDK/Guava source. Do not commit; the orchestrator commits per task.
