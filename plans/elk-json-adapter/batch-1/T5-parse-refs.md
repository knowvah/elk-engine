<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Oracle `parse` refs of the 4 committed goldens (`refs/elk-parse/`)

**Agent:** tooling-engineer · **Commit:** `test(T5): record oracle parse refs of the committed goldens`

## Context
The mission's exit evidence (J7): the oracle's import→export (no layout) of the 4 committed layout
goldens. Inputs are already in the repo (`test/golden/refs/elk/*.json`), so the check runs in CI
without vendoring elk-models. T18 compares TS output byte for byte (J8).

## Task
1. `tools/oracle/regen-parse-refs.sh` (style of `regen-goldens.sh`): build a cases file with mode
   `parse` for the 4 files in `test/golden/refs/elk/` (not `_meta.json`), run `tools/oracle/run.sh
   --cases` with `EXPORT_SEED=1`, write `test/golden/refs/elk-parse/<same name>.json` and
   `_meta.json` (elkCommit, patch list, exportSeed, gsonVersion from the jar, JDK version,
   `generatedBy`, input sha256 per file).
2. Run twice; byte-identical. Prettier must not touch the refs (confirm `test/golden/` is in
   `.prettierignore`).

## Write-set
`tools/oracle/regen-parse-refs.sh`, `test/golden/refs/elk-parse/*.json`,
`test/golden/refs/elk-parse/_meta.json`.

## Read-set
- `tools/oracle/{run.sh,regen-goldens.sh,README.md}`, `tools/oracle/harness/{CaseRunner,CaseSpec}.java`
- `test/golden/refs/elk/_meta.json`, `.prettierignore`

## Interface contract (consumed by T18)
`test/golden/refs/elk-parse/<name>.json` — oracle pretty-printed export text; `_meta.json` keys as
above. Export flags are the oracle's (`CaseRunner.java:71-78`).

## Acceptance criteria
- Given the 4 goldens, when the script runs twice, then 4 refs + `_meta.json` are byte-identical.
- Given `_meta.json`, then it records elkCommit `8aaa3c14…`, patch 0001, exportSeed 1, Gson 2.11.0.
- Given `git diff test/golden/refs/elk/`, then empty.

## Quality bar
README gates; `shellcheck` clean; SPDX `#` header; honours `ELK_ORACLE_DIR` (AD-15).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No edits to the oracle harness, patches or existing refs.
