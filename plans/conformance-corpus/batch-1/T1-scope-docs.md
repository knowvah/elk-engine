<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Scope docs + roadmap revision

**Agent:** documentation-engineer · **Commit:** `docs(scope): add grammar bundles and conformance roadmap`

## Context
elk-engine is a faithful TypeScript port of Eclipse ELK. During planning the user widened the
bundle scope (decisions D0): `graph.text`, `graph.json.text`, `core.debug.grandom` are in scope;
their `.ide` bundles are deferred, `.ui` bundles out; `core.debug` and `alg.disco.debug` are
"reference only". `CLAUDE.md` was already edited on the working tree and is uncommitted.
`plans/` content must never be rewritten (CLAUDE.md, Mission section): **append only**.

## Task
Commit the CLAUDE.md edit, bring the architecture docs in line with D0, and append a roadmap
revision.

## Write-set
`CLAUDE.md`, `docs/architecture/inventory.md`, `docs/architecture/port-map.md`, `plans/roadmap.md`.

## Read-set
- `../decisions.md#d0--bundle-scope-amendment`, `#d8`, `#d10`
- `CLAUDE.md:127-170` (ELK Source Map, already edited — verify, do not rewrite)
- `docs/architecture/inventory.md:30-50,74` · `docs/architecture/port-map.md:80-95,488-498`
- `plans/roadmap.md:1-40,96-115,160-170`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.{graph.text,graph.json.text,core.debug.grandom}/META-INF/MANIFEST.MF`

## Specification
- **inventory.md:** scope column for `core.debug` → Reference, `core.debug.grandom` → In,
  `core.debug.grandom.ide` → Deferred, `core.debug.grandom.ui` → Out, `alg.disco.debug` →
  Reference; the same for the `graph.text*` / `graph.json.text*` rows (runtime In, `.ide`
  Deferred, `.ui` Out). Update the In/Deferred/Out totals line; add the Reference class to the
  legend.
- **port-map.md:** lines 87 and 494 list `core.debug*` / `graph.text*` as out of scope; correct
  them to D0. Add LOC rows for the three in-scope bundles (Java LOC by `wc -l` over
  hand-written `.java`/`.xtend`/`.xtext`, excluding `src-gen`/`xtend-gen`: graph.text 1,352;
  graph.json.text 972; core.debug.grandom 2,543 — re-measure, do not trust these).
- **roadmap.md:** append a section `## Revision 2026-10-11 (conformance-corpus)` that:
  inserts **4b** `graph.text` (needs 2, 3, 4; includes `.elkt` writer per D10; exit: every
  elk-models `.elkt` parses equal to the oracle's parse-only JSON; realworld `.json` ≡ `.elkt`),
  **4c** `graph.json.text` (needs 4b's parser approach), **4d** `core.debug.grandom` (needs 4b;
  exit: reproduces `test/corpus/generated/*.json` byte for byte); rescopes **mission 9** to
  "TS sweep + per-algorithm dashboard" (the oracle side is this mission); supersedes line 112's
  "Not in scope" for `core.debug*` per D0. Do not edit existing lines.

## Acceptance criteria
- Given `git diff main -- plans/roadmap.md`, then it shows only added lines.
- Given inventory.md, then `graph.text`, `graph.json.text`, `core.debug.grandom` read In; the
  three `.ide` rows Deferred; the three `.ui` rows Out; `core.debug`, `alg.disco.debug` Reference.
- Given `rg -n 'core\.debug\*|graph\.text\*' docs/architecture`, then no hit claims those
  bundles are wholly out of scope.
- Given CLAUDE.md, then it is ≤ 200 lines and its ELK Source Map matches D0.

## Quality bar
README gates. SPDX header stays first line. Lines ≤ 100 chars except tables.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not touch `tools/`, `test/`, or `plans/elk-engine-skeleton/`.
