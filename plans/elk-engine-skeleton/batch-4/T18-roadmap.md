<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Follow-on mission roadmap

**Agent:** documentation-engineer · **Commit:** `docs(plans): add elk-engine port roadmap`

## Context
This mission is the skeleton; the roadmap is "what the future work will
look like". It plays the role of dot-engine's batch table in
`plans/graphviz-ts-port/README.md`, but at mission granularity: each entry
becomes a future `/plan-mission` input.

## Task
Write `plans/roadmap.md`.

## Write-set
`plans/roadmap.md`.

## Read-set
- `docs/architecture/inventory.md`, `port-map.md` (T13, T14) — sizes
- `docs/translation-rules.md` (T15) — shims needed (e.g. `JavaHashMap`)
- `test/architecture/bundle-deps.json` — ordering constraints
- `../decisions.md` (AD-11, AD-12, AD-14, Bundle scope)
- `~/git/knowvah/dot-engine/plans/graphviz-ts-port/README.md` (batch table shape)

## Specification
Front-loaded table: `| # | Mission | Scope | Depends on | Size (Java LOC / est. tasks) | Exit criteria |`,
then one short section per mission. Required missions, in dependency order
(merge/split only with a stated reason):
1. **Java foundations completion** — remaining shims found by T15
   (`JavaHashMap` if needed, Guava helpers, `PriorityQueue` semantics).
2. **Property system + ElkGraph model** — `IProperty`, `Property`,
   `MapPropertyHolder`, `EMapPropertyHolder` analog, ElkGraph classes,
   `ElkGraphUtil` (AD-11; public API per AD-14).
3. **ELK JSON adapter** — port `JsonImporter`/`JsonExporter` (Xtend);
   round-trip tests vs oracle refs.
4. **`.melk` codegen** — `tools/melk/` generator (AD-12) + metadata dump
   verification; `CoreOptions` first.
5. **Core engine + simple providers** — `RecursiveGraphLayoutEngine`,
   `LayoutMetaDataService`, `AbstractLayoutProvider`, progress monitor,
   `FixedLayoutProvider`, `BoxLayoutProvider`, `RandomLayoutProvider` —
   **first end-to-end TS layouts compared to goldens**.
6. **alg.common** — node spacing / label placement, compaction, network
   simplex, polyomino, spore utilities.
7. **Layered** — split by phase: graph import/export + intermediate
   framework; p1 cycles; p2 layers; p3 order (+ counting); p4 nodes (BK,
   network simplex); p5 edges (orthogonal, splines, polyline); intermediate
   processors (loops, labels, wrapping, compaction); components/compound.
8. **Remaining algorithms** — mrtree, radial, force/stress, rectpacking,
   disco, spore, topdownpacking, vertiflex (one mission each or grouped by
   size).
9. **elkt → JSON corpus conversion** via an oracle harness mode (unlocks
   the 898 `.elkt` models) and a full-corpus sweep + parity dashboard.
10. **Text-sizing seams** — first oracle patch + TS `TextMeasurer`-style
    seam (pattern: dot-engine AD-10).
11. **Deferred bundles decision** — libavoid, graphviz.dot/layouter
    (evaluate delegating to `@knowvah/dot-engine`).
12. **Docs site** (typedoc with TS 6 alias, vitepress) and **first
    publish** (semantic-release; GitHub repo + npm name claimed by the
    user). Note: the first publish freezes the ElkGraph API (AD-14).
13. **ELK upgrade** — process for moving the pin past `8aaa3c14`.

## Acceptance criteria
- Given the roadmap, then missions 1–13 appear in an order consistent with
  `bundle-deps.json` (no mission depends on a later one).
- Given each mission, then scope, dependencies, size estimate, and exit
  criteria are stated.
- Given mission 12, then it states that the first publish freezes the
  ElkGraph API.

## Quality bar
Gates in README.md (brief). < 300 lines; front-load the table.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
