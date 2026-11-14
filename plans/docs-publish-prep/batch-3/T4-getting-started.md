<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: getting-started page

**Agent:** orchestrator. **Decisions:** DP4, DP6. **Commit:** `docs(site): english-only getting-started page with tested examples`.

## Write-set

- `docs-site/guide/getting-started.md` (new): a "Proposed surface, not published" notice at the top (link to the surface
  ruling issue once T9 files it; until then to `docs/architecture/public-api.md` on GitHub as a blob URL, as the row-11
  hand-off does); install line marked as future; one short section per example with
  `<<< @/../test/docs/examples/<name>.ts` and a sentence on what it shows; a link to `/reference/`.
- `docs-site/.vitepress/i18n.ts` and `scripts/docs-i18n-status.mjs`: append `'guide/getting-started.md'` to both
  `TRANSLATABLE_EXCLUDES` copies.
- `README.md` (repository): a short "Documentation" pointer to the page and the API reference, marked proposed. Only if
  `README.md` already has a docs-site link section; otherwise journal and skip.

## Read-set

- `decisions.md#dp6`; `docs-site/.vitepress/i18n.ts:120-140, 280-356`; `.agent-notes/docs-site.md` (dead-link scope:
  front-matter and nav links are not checked by VitePress)
- `test/docs/locale-complete.test.ts:81-120` (pinned nav/sidebar: do not touch `navFor`/`sidebarFor`)
- VitePress code-snippet import syntax (`https://vitepress.dev/guide/markdown#import-code-snippets`; fetch it before
  relying on paths outside `srcDir`)

## Steps

1. Check the snippet syntax resolves a file outside `docs-site/` (the `@` alias is the source root). If VitePress refuses,
   journal the error and fall back to `docs-site/guide/examples/` holding a re-export or copy **only** if a test proves it
   byte-equal to the tested file; prefer the direct import.
2. Write the page and the excludes; `npm run docs:build`; open the built HTML and confirm each snippet rendered the file's
   full text.
3. Confirm no existing English page and no locale module changed (`git diff --stat`).

## Acceptance criteria

- Given the built site, when `/guide/getting-started.html` is read, then it contains the full source of each example file.
- Given `docs:build`, when `assertLocaleComplete` runs, then no locale reports the page missing.
- Given `git diff <base>`, when listed, then `navFor`, `sidebarFor`, `locale-complete.test.ts` and every `locales/*.ts`
  are unchanged.

**Observability:** N/A — static docs. **Rollback:** Reversible.
