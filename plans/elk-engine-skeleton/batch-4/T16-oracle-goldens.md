<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — Oracle golden references

**Agent:** typescript-pro · **Commit:** `test(golden): add oracle-generated elk layout goldens`

## Context
AD-5: CI must not need a JVM, so oracle outputs for the curated corpus
are committed. Future missions compare TS layout output against them with
`compareLayout` (T7). This task generates them via the harness (T11) for
the manifest's golden ids (T12) and adds a JVM-free consistency test.

## Task
Write the regeneration script, generate and commit refs, add the test.

## Write-set
`tools/oracle/regen-goldens.sh`, `test/golden/refs/elk/<id>.json` (one per
manifest golden id), `test/golden/refs/elk/_meta.json`,
`test/golden/oracle-refs.test.ts`.

## Read-set
- `tools/oracle/run.sh` contract (`batch-3a/T11-oracle-harness.md#interface-contract`)
- `test/corpus/manifest.json`, `test/corpus/corpus.ts` (T12 contract)
- `test/golden/compare-json.ts` (T7 contract)
- `$ELK_ORACLE_DIR/oracle-build.json`
- `../decisions.md#ad-4…`, `#ad-5…`, `#ad-13…`

## Specification
- `regen-goldens.sh` (bash, SPDX, shellcheck-clean): require models dir at
  the manifest commit (same rule as `corpus.ts`, implement via
  `npx tsx -e` or `jq`-free shell — no new deps); collect golden input
  paths; call `tools/oracle/run.sh <tmpdir> <inputs…>`; rename outputs to
  `<id>.json`; replace `test/golden/refs/elk/` contents atomically; write
  `_meta.json` = `{ elkCommit, patches, jdk, modelsCommit, generatedBy:
  "tools/oracle/regen-goldens.sh" }` from `oracle-build.json` and the
  manifest (no timestamps — keep regeneration byte-stable).
- `oracle-refs.test.ts` (no JVM, always runs):
  - ref ids == manifest golden ids (1:1);
  - each ref parses and `compareLayout(ref, ref).ok`;
  - `_meta.json.modelsCommit === manifest.commit` and
    `elkCommit === contents of tools/oracle/ELK_COMMIT`;
  - each ref has positions/sizes on every node (sanity that layout ran).

## Acceptance criteria
- Given the oracle and models clone, when `regen-goldens.sh`, then one ref
  per golden id and `_meta.json` are written; running it again produces no
  `git diff`.
- Given the committed refs, when `npm test` on a machine without a JVM,
  then `oracle-refs.test.ts` passes.
- Given a manifest id without a ref (simulate in a test via a fixture
  array), then the 1:1 check reports it.

## Quality bar
Gates in README.md (brief). Refs are pretty-printed oracle output, never
hand-edited (AD-13; stop #4).

## Observability
Script prints count of refs written and harness wall time.

## Rollback
Reversible — revert the commit.
