<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — English content and diagrams

**Agent:** documentation-engineer · **Commit:** `docs(site): add the english pages and architecture diagrams`

## Context
`docs/*.md` stays canonical (D3); the site wraps it. Four hand-written pages describe what the
project is today (pre-alpha, no algorithm ported, Java foundations done). PlantUML fences are
rendered once and committed (D4).

## Task
1. Render the four PlantUML fences in `docs/architecture/overview.md` and `component-map.md`:
   extract each fence to a scratch `.puml`, `plantuml -tsvg`, save as
   `docs-site/public/diagrams/<file>-<n>.svg` (e.g. `overview-1.svg`). Journal the PlantUML version.
2. Include wrappers (front matter `title`, then `<!--@include: ../../docs/...-->`):
   `conformance.md` ← `docs/conformance.md`; `guide/architecture.md` ← `docs/architecture/overview.md`
   + `component-map.md`, with each ```plantuml fence replaced by `![…](/diagrams/….svg)` — use
   VitePress include line ranges (`{a,b}`) to skip the fences rather than editing `docs/`;
   `guide/translation-rules.md` ← `docs/translation-rules.md`; `guide/collections-rules.md` ←
   `docs/translation-rules-collections.md`; `guide/port-map.md` ← `docs/architecture/port-map.md`;
   `guide/inventory.md` ← `docs/architecture/inventory.md`; `guide/roadmap.md` ← `plans/roadmap.md`.
   Rewrite relative links inside included content only where VitePress cannot resolve them; if
   an included file needs a change, STOP (write-set).
3. Hand-written pages: `guide/overview.md` (what elk-engine is, the oracle, the status, the public
   contract from README.md and CLAUDE.md), `guide/java-foundations.md` (the shims and vector files
   delivered by `plans/java-foundations/README.md#mission-summary`, as a reader-facing summary with
   paths), `guide/contributing.md` (gates, PR workflow, signed commits, docs commands; from
   CLAUDE.md "Verification" and the ruleset), `index.md` (hero + "Choose your path" table + status
   callout; actions: Overview, Showcase `/showcase/`, GitHub).
4. Links: internal links are root-absolute (`/guide/overview`); a dead link fails `docs:build`.

## Write-set
`docs-site/index.md`, `docs-site/guide/{overview,architecture,java-foundations,contributing,translation-rules,collections-rules,port-map,inventory,roadmap}.md`,
`docs-site/conformance.md`, `docs-site/public/diagrams/*.svg`.

## Read-set
- `../decisions.md#canonical`, `#diagrams`, `#english-only`
- `../dot-engine/docs-site/index.md`, `guide/overview.md:1-60` (shape only)
- `README.md`, `CLAUDE.md:1-60`, `docs/architecture/overview.md`, `docs/architecture/component-map.md`,
  `plans/java-foundations/README.md` (Mission summary section), `plans/roadmap.md:1-60`

## Acceptance criteria
- Given `docs-site/conformance.md`, then its body is an `@include` of `docs/conformance.md`.
- Given `guide/architecture.md`, when built, then the page shows four `<img src="/diagrams/…svg">`
  and no raw `@startuml` text.
- Given `npm run docs:build`, then exit 0 with zero dead-link errors.
- Given `index.md`, then the hero actions link to `/guide/overview`, `/showcase/` and the GitHub repo.

## Quality bar
README gates. SPDX comment line 1 of every `.md`. Prose lines ≤ 100 chars except tables. Each page
< 300 lines. No OpenJDK-derived prose (AD-9).

## Observability
N/A.

## Rollback
Reversible — revert the commit.

## Boundaries
Never edit `docs/**`, `plans/roadmap.md`, or `CLAUDE.md`. Do not touch `.vitepress/**` (T2, T4).
