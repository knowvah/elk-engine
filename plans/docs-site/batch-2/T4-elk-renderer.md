<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — ELK-JSON SVG renderer

**Agent:** typescript-pro · **Commit:** `feat(docs): render elk json layouts to svg for the showcase`

## Context
The showcase shows the oracle goldens (ELK JSON with computed geometry). No TypeScript engine
exists yet, so the site needs a small renderer (D6): a pure function plus a thin Vue wrapper.

## Task
1. `theme/elkSvg.ts`: `renderElkSvg(graph, options?)` returns an SVG string. Nodes → `<g>` with a
   `<rect>` at `(x, y, width, height)` relative to the parent (ELK child coordinates are relative
   to the parent's content area), nested for hierarchy; ports → small `<rect>` at port `(x, y)`
   relative to the node; labels (`labels[]` on nodes, ports, edges) → `<text>` at label `(x, y)`;
   edges → one `<polyline>` per `sections[]` entry through `startPoint`, `bendPoints`, `endPoint`
   (edge coordinates are relative to the edge's container, see the ELK JSON format doc). Compute
   the root `viewBox` from the root `width`/`height` plus `padding` (default 8). Escape text.
   Ignore unknown keys. Keep every function ≤ 30 NLOC (split by element kind).
2. `theme/ElkDiagram.vue`: props `graph: object`, `alt?: string`; renders the string via
   `v-html` inside a `<figure>`; no imports from `i18n.ts`.
3. TDD: `test/docs/elk-svg.test.ts` first (red), using `test/golden/refs/elk/ptolemy-scrambler.json`
   and small inline graphs.

## Write-set
`docs-site/.vitepress/theme/elkSvg.ts`, `docs-site/.vitepress/theme/ElkDiagram.vue`,
`test/docs/elk-svg.test.ts`.

## Read-set
- `../decisions.md#renderer`
- `test/golden/refs/elk/ptolemy-scrambler.json` (structure), `test/golden/compare-json.ts:1-60`
  (field names the comparator reads)
- ELK JSON format: https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html
  (WebFetch if available; otherwise the field names in the golden are the spec)

## Interface contract (outputs, consumed by T5)
```ts
export interface ElkSvgOptions { padding?: number }
export function renderElkSvg(graph: ElkGraphJson, options?: ElkSvgOptions): string;
// ElkGraphJson: { id, x?, y?, width?, height?, children?, ports?, labels?, edges? } per ELK JSON
```
`<ElkDiagram :graph="g" alt="…"/>` registered by T5 in `theme/index.ts`.

## Acceptance criteria
- Given `ptolemy-scrambler.json`, when rendered, then the SVG contains one `<g data-id="…">` per
  descendant node (count = total nodes in the file), nested by hierarchy, and one `<polyline>` per
  edge section.
- Given a node with a label at `(2, 3)`, then a `<text>` element is emitted at the node's absolute
  position plus `(2, 3)`.
- Given a label text `a<b`, then the SVG contains `a&lt;b`.
- Given a graph with an unknown key `layoutOptions`, then rendering succeeds and ignores it.
- Given `padding: 20`, then the `viewBox` starts at `-20 -20`.

## Quality bar
README gates; `npx vitest run test/docs/elk-svg.test.ts` green; functions ≤ 30 NLOC, CCN ≤ 10;
no `any`; SPDX headers. The `.vue` file is not parsed by lizard; keep its script trivial.

## Observability
N/A.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/` imports (the site must not depend on internal shims). Do not register the component
(T5 owns `theme/index.ts`).
