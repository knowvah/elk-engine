<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — `.elkj` oracle sweep and the TS sweep test

**Agent:** tooling-engineer · **Commit:** `test(T17): sweep elk-native elkj, elk json as elkj and the writer`

## Context
4b precedent: `tools/oracle/elkt-sweep.sh` (stamped, two JVM runs per kind, byte comparison → `nondeterministic`,
output under `$ELK_ORACLE_DIR/sweep/…`, never the repo, AD-5), `tools/oracle/ElktSweep.java` (validate and write
kinds), `test/corpus/elkt-sweep.test.ts` (one `it` per indicator, `elkt sweep: <indicator>=<n>/<total> …` log, skip
without models or sweep). D2 = A′ tiers; D12 seed for `convert`.

## Task
1. `elkj-sweep.sh` + `ElkjSweep.java`, kinds (core registry, two runs each):
   - `convert`: 898 `.elkt` + 550 `.json` → 1,448 ELK-native `.elkj` (T1 mode, D12 seed) in `convert/`;
   - `parse` and `validate` of those 1,448 `.elkj` (tier 1);
   - `parse-elkj` of 550 realworld `.json` + `tools/vectors/{graph-json,transfer}-scenarios` + `test/corpus/generated/
     *.json` (tier 2; malformed inputs record the oracle's failure);
   - `write`: the 1,448 source graphs → `serialize(format())` + the oracle's reparse (the T5 procedure).
2. `elkj-sweep.test.ts`: indicators `tier1-parse-equal`, `tier1-validate-equal`, `tier2-parse-equal`,
   `writer-byte-exact`, `reparse-equal`, logged as `elkj sweep: …`, failing with per-model reports; syntax errors by
   presence; skipped with a message when elk-models or the sweep dir is absent (CI has neither).
3. Run it; record counts and the TS sweep time in the journal. Any divergence is diagnosed against the oracle (stop 8,
   14), never accepted as a number.

## Write-set
`tools/oracle/elkj-sweep.sh`, `tools/oracle/ElkjSweep.java`, `test/corpus/elkj-sweep.test.ts`.

## Read-set
`tools/oracle/{elkt-sweep.sh,ElktSweep.java}`, `test/corpus/elkt-sweep.test.ts`, `test/corpus/corpus.ts`,
T1/T13/T14/T16 contracts, `decisions.md#d2`, `#d12`.

## Acceptance criteria
- Given two sweep runs, when compared, then no case is nondeterministic (D12 makes `convert` stable).
- Given the sweep, when the TS test runs, then every indicator is at its bar (README objective) or a divergence is
  diagnosed and the task stops.
- Given no elk-models, when `npm test` runs, then the sweep test skips with a message and nothing fails.

## Observability / Rollback
The indicators are this mission's observability (Phase 4). Reversible: revert the commit.
