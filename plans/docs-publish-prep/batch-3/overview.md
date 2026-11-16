<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: site pages; link check and switcher fix

T4 then T5, in order: T5's link check must cover T4's page. Both are small; the orchestrator does them.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T4](T4-getting-started.md) | English-only getting-started page with the examples; exclude it from translation | orchestrator | `docs-site/guide/getting-started.md`, both `TRANSLATABLE_EXCLUDES` copies, `README.md` | T2, T3 | [x] |
| [T5](T5-link-check.md) | linkinator check, the switcher 404 fix, weekly external check | orchestrator | `docs-site/.vitepress/config.ts`, `package.json`, `package-lock.json`, `.github/workflows/links.yml`, `test/docs/site-config.test.ts` | T4 | [x] |

Gate after the batch: typecheck, format, `npx vitest run test/docs`, `npm run docs:build && npm run docs:linkcheck`
(0 broken), and `git diff <base> -- docs-site/.vitepress/locales test/docs/locale-complete.test.ts` empty.
