<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Architecture overview, inventory, component map

**Agent:** documentation-engineer · **Commit:** `docs(architecture): add elk overview, inventory, and component map`

## Context
dot-engine's `docs/architecture/` (overview, inventory, components) is the
model. elk-engine needs the equivalent for ELK so future missions can
plan from it. Bundle scope is locked in `../decisions.md#bundle-scope…`.

## Task
Write three docs under `docs/architecture/`.

## Write-set
`docs/architecture/overview.md`, `docs/architecture/inventory.md`,
`docs/architecture/component-map.md`.

## Read-set
- `~/git/knowvah/dot-engine/docs/architecture/overview.md` (shape)
- `$ELK_SOURCE_DIR/plugins/*/META-INF/MANIFEST.MF`, `plugins/pom.xml`
- `$ELK_SOURCE_DIR/plugins/<bundle>/src/**` — line counts only
  (exclude `src-gen/`, `xtend-gen/`)
- `test/architecture/bundle-deps.json` (T5)
- `../decisions.md` (AD-1…AD-15, Bundle scope)

## Specification
- `overview.md` (index first): what elk-engine is; relation diagram
  (PlantUML) ELK Java (spec) → oracle build → elk-engine; key flows
  (ElkGraph → `RecursiveGraphLayoutEngine` → algorithm provider → laid-out
  ElkGraph; JSON adapter in/out); tech stack table; links to inventory,
  port-map (T14), component-map, translation-rules (T15), conformance
  (T17).
- `inventory.md`: table of **every** directory in `$ELK_SOURCE_DIR/plugins`
  with columns: bundle, purpose (one line), hand-written Java+Xtend LOC,
  generated sources? (`.melk`, EMF, Xtext), scope (In / Deferred / Out),
  rationale. Totals row for in-scope LOC. Also the `test/` plugins with
  test-file counts and which bundle each tests.
- `component-map.md`: PlantUML component diagram of the in-scope bundles
  with `Require-Bundle` edges (labelled), matching `bundle-deps.json`
  exactly; a second small diagram of the core runtime pieces
  (`RecursiveGraphLayoutEngine`, `LayoutMetaDataService`,
  `AbstractLayoutProvider`, `IGraphLayoutEngine`, property system
  `IProperty`/`MapPropertyHolder`, `ElkGraph`) and how algorithms plug in.
- PlantUML only, ≤ 15 nodes per diagram, every edge labelled.
- SPDX HTML comment first line in each file.

## Acceptance criteria
- Given `inventory.md`, then every `plugins/*` directory appears once with
  a LOC figure and a scope matching decisions.md.
- Given `component-map.md`, then its bundle edges equal those in
  `bundle-deps.json` (no more, no fewer).
- Given all three docs, then no absolute filesystem paths appear (use
  `$ELK_SOURCE_DIR/...`).

## Quality bar
Gates in README.md (brief). Front-load tables; each file < 300 lines.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
