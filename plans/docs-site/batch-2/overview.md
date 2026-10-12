<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Registry, English content, ELK renderer

Three parallel tasks with disjoint write-sets. At the end the English site has its real pages,
the locale registry exists with zero locales (HTML set identical to T1's except for new pages),
and the pure ELK-JSON renderer is tested.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T2](T2-locale-registry.md) | Locale registry, nav/sidebar generation, completeness gate, `strings.ts` | typescript-pro | `docs-site/.vitepress/{i18n.ts,config.ts,theme/strings.ts}`, `test/docs/locale-complete.test.ts`, `test/docs/fixtures/site/**` | T1 | [ ] |
| [T3](T3-english-content.md) | English pages (include wrappers + hand-written) and committed PlantUML SVGs | documentation-engineer | `docs-site/index.md`, `docs-site/guide/*.md`, `docs-site/conformance.md`, `docs-site/public/diagrams/*.svg` | T1 | [ ] |
| [T4](T4-elk-renderer.md) | `renderElkSvg` + `ElkDiagram.vue` | typescript-pro | `docs-site/.vitepress/theme/{elkSvg.ts,ElkDiagram.vue}`, `test/docs/elk-svg.test.ts` | T1 | [ ] |

T2 and T3 both touch the nav: T2 owns `config.ts` and reads T3's page list from this brief
(decisions.md#english-only), not from the filesystem, so they can run concurrently.

Batch done when every task's acceptance criteria pass and the README gates are green.
