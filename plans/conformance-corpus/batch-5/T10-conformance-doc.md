<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Conformance documentation

**Agent:** documentation-engineer · **Commit:** `docs(conformance): define the per-algorithm conformance unit`

## Context
`docs/conformance.md` (200 lines) defines the oracle, the AD-4 comparator, goldens, seam
patches, the runbook, and gates. This mission added the unit (D1), tiers, verdicts (D4, OR-2),
variants (D6), generated corpus (D7), the sweep, the report (D9), and known divergence #1 (D8).

## Task
Update `docs/conformance.md` so it describes exactly what the tools now do.

## Write-set
`docs/conformance.md`.

## Read-set
- `../decisions.md` (all)
- `docs/conformance.md:1-200`
- `tools/oracle/README.md` and `--help`/usage of `run.sh`, `sweep.sh`, `regen-generated.sh`
- `test/corpus/variants.json` · `docs/parity-report.md` (header only)

## Specification
- New section after §1: **Conformance unit** — case = `(algorithm, model, variant)`; caseId
  format; the four tiers (native, retarget, generated, ported JUnit) with which variants each
  runs; D2 retarget semantics; D3 model id and source.
- §2: add the verdict table (D4 + `timeout`) and the determinism rule (D5). Add known
  divergence **#1** to the concrete-entries list (D8; approved by the user 2026-10-11).
- §3: census, generated corpus, `regen-generated.sh`, sweep cache path, report regeneration.
- §5 runbook rows: Xtext/ANTLR jar missing from the p2 cache; sweep hang or OOM
  (`ELK_SWEEP_TIMEOUT_MS`, batch size); census drift after a pin bump.
- §6 gates: add the sweep and report commands for changes to `tools/oracle/` or `tools/corpus/`.
- Update the section index table. Stay under 500 lines (split to `conformance-corpus.md` if not).

## Acceptance criteria
- Given every flag, env var, script, and verdict named in the doc, then it exists in `tools/`
  (check with `rg`).
- Given §2, then known divergence #1 is listed with its cause, scope (invalid grammar input), and
  the approving decision (D8).
- Given the runbook, then each of the three new failure modes has detection and mitigation.

## Quality bar
README gates. SPDX first line; table style matches the existing doc.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not change the AD-4 tolerance or comparator text.
