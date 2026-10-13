<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — Docs + close-out

**Agent:** documentation-engineer (items 1–4); orchestrator (item 5) ·
**Commit:** `docs(T20): document the elk json adapter port`

## Task
1. `docs/architecture/elk-json.md` (new, ≤ 300 lines, SPDX `<!-- -->`): file map (J3 splits), the
   Gson subset and why (J1, J2: raw number text, lenient reader, key order, writer settings), the
   exporter `Random` seam (J4, patch 0001), evidence (vectors, `elk-parse`, sweep) and a
   **Regenerating** runbook: `gson-vectors.sh`, `graph-json-vectors.sh`, `transfer-vectors.sh`,
   `regen-parse-refs.sh`, `json-sweep.sh` + `ELK_MODELS_DIR=… npx vitest run test/corpus/json-sweep.test.ts`,
   each with its expected outcome (run every command). Include `diagrams/data-flow.md` §2 (PlantUML).
2. `docs/architecture/port-map.md`: mark the `graph.json` row and `core.util.Maybe` ported; add
   `src/gson` as a third-party subset row like `src/guava`; link the new page.
3. `docs/translation-rules.md`: one pointer to `elk-json.md` in §8 (file at its 500-line cap:
   replace a sentence, do not grow it).
4. `docs/conformance.md` "Temporary gaps": the 4 deferred tests (J6) with missions; under
   behavioural notes the J5 quirks (each one line, "kept: upstream behaviour"); the patch-0001 seam
   row in §1 updated from "pending that port" to the `JsonExporter` constructor parameter.
5. Orchestrator: journal close-out, mission summary appended to `README.md`, `.agent-notes/elk-json-adapter.md`
   (novel observations only), batch checkboxes.

## Write-set
`docs/architecture/elk-json.md`, `docs/architecture/port-map.md`, `docs/translation-rules.md`,
`docs/conformance.md`, `plans/elk-json-adapter/{README,decision-journal}.md` (append/checkboxes),
`plans/elk-json-adapter/batch-8/overview.md` (checkbox), `.agent-notes/elk-json-adapter.md`.

## Acceptance criteria
- Given `npm run docs:build` and `npm run format:check`, then both pass.
- Given `docs/translation-rules.md`, then ≤ 500 lines and it links to `elk-json.md`.
- Given `docs/conformance.md`, then all 4 deferred tests and every J5 quirk are listed.
- Given `elk-json.md`'s runbook, then every command is present with its expected outcome.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No code changes. Never rewrite earlier journal rows or other missions' `plans/` files.
