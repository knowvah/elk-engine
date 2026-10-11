<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Bundle scope in code + fitness

**Agent:** typescript-pro · **Commit:** `test(architecture): add grammar bundles to module boundaries`

## Context
`tools/bundle-deps.ts` derives `test/architecture/bundle-deps.json` from each in-scope bundle's
`Require-Bundle`; `module-boundaries.fitness.test.ts` enforces it on `src/` by longest-prefix
directory lookup (AD-8). D0 adds three bundles. `src/` gets no files in this mission.

## Task
Add `graph.text`, `graph.json.text`, `core.debug.grandom` to the in-scope list, regenerate the
committed JSON by script, and assert the new mappings. Write the new assertions first (TDD).

## Write-set
`tools/bundle-deps.ts`, `test/architecture/bundle-deps.json` (regenerated, never hand-edited),
`test/architecture/module-boundaries.fitness.test.ts` (append tests only).

## Read-set
- `../decisions.md#d0--bundle-scope-amendment`
- `tools/bundle-deps.ts:20-60,100-182`
- `test/architecture/module-boundaries.fitness.test.ts:120-200`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.{graph.text,graph.json.text,core.debug.grandom}/META-INF/MANIFEST.MF`
- `.agent-notes/elk-engine-skeleton.md` ("longest-prefix bundle lookup has a silent hole")

## Specification
- Append the three suffixes to `IN_SCOPE_SUFFIXES` (`tools/bundle-deps.ts:26`). Directory
  mapping follows the existing rule (package path minus `org/eclipse/elk/`):
  `src/graph/text`, `src/graph/json/text`, `src/core/debug/grandom`.
- Regenerate with the script's `--write` flag (`WRITE_FLAG`), never by hand.
- Each new bundle requires only ELK-owned `core` and `graph` (third-party Xtext/ANTLR/EMF
  entries are filtered by the existing logic). If the manifests say otherwise, the manifest wins
  — journal it.

## Acceptance criteria
- Given the regenerated JSON, when the fitness test runs, then `src/graph/text`,
  `src/graph/json/text`, and `src/core/debug/grandom` each require exactly `[core, graph]`.
- Given longest-prefix lookup, when resolving `src/graph/json/text/X.ts`, then the bundle is
  `org.eclipse.elk.graph.json.text`, not `org.eclipse.elk.graph.json`.
- Given `src/core/debug/X.ts` (the reference-only `core.debug`), then lookup does not resolve it
  to `core.debug.grandom`. Assert the current behavior (resolves to `core`) and journal the hole.
- Given the existing assertions, then none changed (append-only diff in the test file).

## Quality bar
README gates; `npm test` includes the fitness suite.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/` files. Do not add a "forbidden directories" list (out of scope; journal only).
