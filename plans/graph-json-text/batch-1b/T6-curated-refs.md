<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Curated list, `regen-elkj-refs.sh` (convert + vendor + parse refs)

**Agent:** tooling-engineer · **Commit:** `test(T6): add curated elkj inputs and oracle parse refs`

## Context
4b precedent: `test/corpus/elkt-curated.json` (`{models:[{id,path,covers}]}`), `tools/oracle/regen-elkt-refs.sh`
(core registry, pin checks, staged swap, `_meta.json` with `inputSha256`), `test/corpus/vendor-elkt-curated.sh` and
the `-text` rule for vendored inputs. Here the tier-1 inputs do not exist in elk-models: they are the oracle's
`convert` output (T1, D12 seed), so vendoring copies the *converted* file.

## Task
1. `test/corpus/elkj-curated.json`: `{models:[{id, tier, source, covers}]}` — ~30 entries: tier 1 (`source` = an
   elk-models `.elkt` or `.json`, converted), tier 2 (`source` = a realworld `.json` or a repo ELK JSON, read as
   `.elkj`). Cover every grammar rule, the three keyword spellings where corpus-reachable, missing and duplicate
   identifiers (D12), unresolved references, ports/labels/nesting, and the largest model. List uncoverable features in
   `uncoveredByCorpus` (tier 3 lives in the T3–T5 scenarios).
2. `tools/oracle/regen-elkj-refs.sh` (no arguments; pin and Xtext checks as `regen-elkt-refs.sh`;
   `ORACLE_REGISTRY=core`): run `convert` for tier-1 entries with the D12 seed, copy each converted `.elkj` and each
   tier-2 source into `test/corpus/elkj-curated/<id>.<ext>` (staged swap), then `parse` (tier 1) / `parse-elkj`
   (tier 2) on the vendored files into `test/golden/refs/elkj-parse/<id with / → __>.json` + `_meta.json`
   (`elkCommit`, `modelsCommit`, patches, `inputSha256` of the vendored bytes, `generatedBy`). Byte-stable, no
   timestamps.
3. `.gitattributes`: `test/corpus/elkj-curated/** -text`.

## Write-set
`test/corpus/elkj-curated.json`, `tools/oracle/regen-elkj-refs.sh`, `test/corpus/elkj-curated/**`,
`test/golden/refs/elkj-parse/**`, `.gitattributes` (one appended line).

## Read-set
`tools/oracle/regen-elkt-refs.sh`, `test/corpus/vendor-elkt-curated.sh`, `test/corpus/elkt-curated.json`,
T1's interface contract, `decisions.md#d2`, `#d12`.

## Interface contracts (outputs)
Curated list shape above; refs at `test/golden/refs/elkj-parse/` with `_meta.json.inputSha256` keyed by id; vendored
inputs at `test/corpus/elkj-curated/`. Consumed by T13 (curated test) and T17.

## Acceptance criteria
- Given the script run twice, when the repo is diffed, then nothing changed (vendored bytes and refs identical).
- Given each vendored file, when hashed, then it equals `_meta.json.inputSha256[id]`.
- Given elk-models absent, when the script runs, then it exits non-zero with a message naming `test/corpus/fetch.sh`.

## Observability / Rollback
N/A — tooling only. Reversible: revert the commit.
