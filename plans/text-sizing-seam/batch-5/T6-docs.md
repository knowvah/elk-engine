<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: docs

**Agent:** `documentation-engineer`, sonnet, with [agent-rules.md](../agent-rules.md). **Decisions:** TX1–TX8.
**Writes:** `docs/conformance.md`, `docs/architecture/text-sizing-seam.md` (new), `docs/architecture/overview.md` (one link
line in its list of architecture pages).

## Read-set

- `plans/text-sizing-seam/decisions.md`, and `decision-journal.md`'s rows for T1-T5 (every number comes from there; do not
  re-measure)
- `docs/conformance.md:38-85` (§ 1, the patch table, which still says "one patch today" with only `0001`), `:334-360`
  (§ 4), `:1350-1450` (the FX8 notes in the 7f and 7f2 sections), `:2115-2140` (the shape of the row-9 section)
- `docs/architecture/parity-dashboard.md` (the shape of an architecture page with a runbook)

## Changes

1. **§ 1 patch table.** Make it list the series as it is: add the missing `0002` row (effect and paired seam, from
   `tools/oracle/patches/0002-*.patch` and the grandom or graph mission that added it, as `git log` for the file shows), and
   the `0003` row: effect (TX2: property, values, default unchanged) and paired seam (TX5: `test/helpers/layout-test-text-measurer.ts`,
   `ELK_TEST_TEXT_MEASURER`). Fix the "one patch today" sentence.
2. **§ 4 step 3.** Add one sentence: a seam whose Java site lives in a test bundle has its TS twin in `test/helpers/`, beside
   that framework's port (TX5, row-10 precedent).
3. **Reference platform (#52 ruling).** Next to the FX8 notes, pin: macOS on Apple Silicon (arm64), JDK 21.0.1, is the
   reference platform for JVM measurements; `layered-label-metrics.json` was recorded there and is never re-recorded on
   another OS, JDK or CPU; CI uses it as stored; its file records only `jdk`, so this paragraph is where the platform is
   recorded. Keep the existing lines; add, do not rewrite.
4. **New section `## Text-sizing seam (roadmap row 10) {#text-sizing-seam}`**, before `## Temporary gaps`: what was patched
   and why only the test bundle (TX1); the two modes and which side uses which (TX3); the fixed measure (TX4); the evidence
   with the journal's counts: TX7's three non-impact checks, `label-sizing.json` (models, labels, layouts at 1e-6), the
   corpus comparison (models, labels), the runner parity table summary, the regenerated refs (TX8); and what is left out (a
   font model; #58's missing texts; the snapshot unchanged).
5. **`docs/architecture/text-sizing-seam.md`**: a PlantUML component diagram (Java `TestConfiguration` → `TextMeasurer` →
   AWT or fixed; TS `ensureSensibleLabelSize` → `TextMeasurer` → snapshot or fixed), and a runbook: how to run a suite in
   fixed mode on each side, how to re-record `label-sizing.json`, how to run the corpus comparison, and what to do when the
   snapshot lacks a text (unchanged FX8 procedure, reference platform only).

Run `npx prettier --write` on the three files, `npm run docs:build` (link check), and the translation lint if
`docs/conformance.md` is covered by it (`npx vitest run test/architecture`).

## Acceptance criteria

- Given `docs/conformance.md`, when § 1 is read, then it lists 0001, 0002 and 0003, each with its paired TS seam.
- Given the FX8 notes, when read, then the reference platform (macOS arm64, JDK 21.0.1) is stated beside them.
- Given `npm run docs:build`, when it runs, then it exits 0.

**Observability:** N/A. **Rollback:** Reversible.
