<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Layout JSON comparator

**Agent:** typescript-pro · **Commit:** `test(golden): add elk layout json comparator`

## Context
Conformance (AD-4): structure exact, numeric coordinates within absolute
tolerance 1e-6. Goldens are ELK JSON graphs laid out by the oracle. Future
missions compare TS output against them; this task builds the comparator
(pure function, TDD). ELK JSON shape: graph/node objects with `id`, `x`,
`y`, `width`, `height`, `children[]`, `ports[]`, `labels[]` (with `text`),
`edges[]` (with `sources[]`, `targets[]`, `sections[]` each having
`id`, `startPoint`, `endPoint`, `bendPoints[]`, `incomingShape`,
`outgoingShape`, `incomingSections`, `outgoingSections`), `layoutOptions`
/ `properties` maps, optional `junctionPoints`.

## Task
Implement `compareLayout` with tests written first.

## Write-set
`test/golden/compare-json.ts`, `test/golden/compare-json.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonExporter.xtend` (which keys are emitted)
- `~/git/knowvah/dot-engine/test/golden/compare-json.ts` (pattern only)
- `../decisions.md#ad-4-conformance-bar`

## Interface contract (output; consumed by T16 and future missions)
```ts
export interface Diff {
  path: string;   // JSON-path-like, ids for keyed arrays: "children[id=n1].ports[id=p1].x"
  kind: 'structure' | 'value' | 'type' | 'missing' | 'extra';
  expected?: unknown;
  actual?: unknown;
}
export interface CompareOptions { tol?: number }   // default 1e-6
export function compareLayout(expected: unknown, actual: unknown,
                              opts?: CompareOptions): { ok: boolean; diffs: Diff[] };
export function formatDiffs(diffs: Diff[], max?: number): string;
```
Rules:
- Arrays of objects that all have string `id` (`children`, `ports`,
  `labels` when id'd, `edges`, `sections`) are matched **by id**; order
  ignored. Count mismatch or id set mismatch → `structure` diffs.
- Other arrays (`bendPoints`, `sources`, `targets`, `junctionPoints`,
  `incomingSections`, …) compared positionally; length mismatch →
  `structure`.
- Numbers: `|e - a| <= tol` else `value`; `NaN` equals only `NaN`.
- Type mismatch → `type`; key only in expected → `missing`; only in
  actual → `extra`.
- Strings/booleans/null exact.

## Acceptance criteria
- Given identical graphs, then `ok === true` and `diffs` is `[]`.
- Given one node `x` differing by 2e-6, then exactly one `value` diff at
  `children[id=…].x`; differing by 5e-7 → no diff.
- Given a missing edge section or a bend-point count mismatch, then a
  `structure` diff regardless of `tol` (even `tol: Infinity`).
- Given children reordered with matching ids, then no diffs.
- Given `formatDiffs` with 100 diffs and `max` 10, then 10 lines plus a
  "… 90 more" line.

## Quality bar
Gates in README.md (brief). Pure functions, no I/O. Functions ≤ 30 NLOC,
CCN ≤ 10 (complexity hook) — split per JSON kind.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
