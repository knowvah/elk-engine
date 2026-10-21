<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: C6 architecture docs (documentation-engineer)

**Goal:** `docs/architecture/port-map.md` and `inventory.md` describe the finished `graph.json.text` port (4c) as they
describe `graph.text` (4b).

## Context

`port-map.md` has a `graph.text → src/graph/text/` section (lines 208-232) but none for `graph.json.text`, and its
third-party paragraph (lines 230-232) says only `src/graph/text` may import `src/xtext`; the boundary fitness test
allows both text bundles (`test/architecture/module-boundaries.fitness.test.ts:40`, `XTEXT_CLIENT_BUNDLES`). The
`src/xtext` row (line 206) names only `graph.text`. `inventory.md:36`'s `graph.json.text` row predates the port.

## Write-set

- `docs/architecture/port-map.md`
- `docs/architecture/inventory.md`

## Read-set

- `docs/architecture/port-map.md:1-110` (Summary, Conventions, "Reproducing the counts"), `:198-232`
- `docs/architecture/inventory.md:1-60`
- `docs/architecture/elk-json-text.md` (file map, evidence; link targets)
- `ls -R src/graph/json/text` and the Java packages under
  `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/`

## Rules

- Counts come from the "Reproducing the counts" procedure, not by hand; state any number you could not reproduce.
- Mirror the `graph.text` section's columns, footnotes and "not in the Summary totals" note.
- Do not touch the `src/equinox` row: T9 adds it after T5 lands (batch 3).
- Prettier-formatted tables (`npx prettier --write` on the two files).

## Acceptance criteria

- Given the counting procedure, when the `graph.json.text → src/graph/json/text/` section is added, then each package
  row's file count matches the procedure's output and the section links to `elk-json-text.md`.
- Given the third-party paragraph and the `src/xtext` row, then they name both `src/graph/text` and
  `src/graph/json/text` as the only importers of `src/xtext`.
- Given `inventory.md`, then the `graph.json.text` row describes the finished port (parser, linking, validation,
  writer; evidence pointer) in the style of the `graph.text` row.
- Given the change, then `npm run docs:build` and `npm run format:check` pass.

## Observability

N/A: documentation only.

## Rollback

Reversible: revert the commit.

## Commit

`docs(T7): map the graph.json.text port in the architecture docs`
