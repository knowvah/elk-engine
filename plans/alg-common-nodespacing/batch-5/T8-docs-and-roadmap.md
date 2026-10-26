<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Docs, inventory and roadmap

**Agent:** main session · **Commit:** `docs(T8): document nodespacing and record mission 6b`

## Context
Mission 6b (README). T1–T7 landed the code and the evidence. This task records them where the next missions (7a
layered, 8x) will look. It follows the format of 6a's T13 (`plans/alg-common/batch-3/T13-docs-and-roadmap.md`).

## Task
1. **`docs/architecture/alg-common.md`:** add a nodespacing section covering:
   - the package layout (cellsystem → contexts → algorithm → entry points);
   - the phase sequence of `NodeLabelAndSizeCalculator.process`;
   - the `portContexts` TreeSet semantics (equal volatile ids collapse);
   - the section-module splits made;
   - the evidence: the recorder, the groups and row counts, and the NS3 harness;
   - the runbook (`tools/vectors/node-micro-layout-vectors.sh`, `ELK_MODELS_DIR` at record time only, the cold-run
     note).
   Include one PlantUML diagram, from `diagrams/component-map.md`.
2. **`docs/architecture/{port-map,component-map,overview}.md`:** mark nodespacing and `NodeMicroLayout` ported, with
   their Java → TS paths.
3. **`docs/conformance.md#alg-common`:**
   - the `node-micro-layout.json` row counts per group;
   - the NS4 label-size formula and why (the JUnit framework's AWT metrics depend on the platform);
   - the NORTH/SOUTH `variants` rows, which are beyond the upstream test's active providers;
   - any known divergences or kept upstream quirks journaled in T1–T7;
   - ELK prose typos found, if any.
4. **`docs/translation-rules-collections.md`:** land each I-row drafted in the journal (next free I42). Skip this file
   if none was drafted.
5. **`plans/roadmap.md`:** append a "Revision 2026-MM-DD (alg-common-nodespacing)" section; never edit earlier lines.
   It records:
   - row 6b done, with its exit evidence;
   - the NS decisions;
   - the follow-ups:
     - the 4 deferred JUnit files, still for 7a/8x;
     - the `devAssert` helper (§6.8), still unwritten;
     - the live `TreeSet` before 7a;
     - anything journaled.
6. **`.agent-notes/alg-common-nodespacing.md`:** execution observations in the memory-rule template. If there are
   none, say so in the journal.
7. **README:** a "Mission summary" section (tasks, exit evidence, decisions, gates, follow-ups), as in 6a.
8. Run `npm run docs:build` and `npx vitest run test/architecture`, then the README's mission-end gates, including
   `regen-goldens.sh` (both sets) byte-identical.

## Write-set
`docs/architecture/{alg-common,port-map,component-map,overview}.md`, `docs/conformance.md`,
`docs/translation-rules-collections.md` (conditional), `plans/roadmap.md` (append only),
`.agent-notes/alg-common-nodespacing.md`, `plans/alg-common-nodespacing/README.md` (summary and batch status only).

## Read-set
- `decision-journal.md` (all entries), `decisions.md`, the T1 recorder header comment.
- `plans/alg-common/batch-3/T13-docs-and-roadmap.md` (format), `plans/roadmap.md` "Revision 2026-10-26 (alg-common)".

## Acceptance criteria
- Given `npm run docs:build`, when it runs, then it exits 0.
- Given `plans/roadmap.md`, when diffed against `main`, then only appended lines appear.
- Given `docs/conformance.md`, when read, then the row counts match `rowCounts` in `node-micro-layout.json`.
- Given the mission-end gates, when run, then `regen-goldens.sh` (both sets) leaves `test/golden/refs/` byte-identical.

## Observability / Rollback
N/A — docs only. Reversible: revert the commit.
