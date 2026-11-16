<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: link check and the language-switcher 404s

**Agent:** orchestrator (diagnosis mode for the 138 links). **Decisions:** DP5.
**Commit:** `fix(site): link check in ci and no switcher links to missing pages`.

## Write-set

- `package.json`: devDependency `linkinator` `8.1.0` (exact or `^8.1.0` as the file's convention; MIT); script
  `docs:linkcheck`.
- `package-lock.json` (by `npm install`; the root install needs the `@knowvah` token from `~/.npmrc`, already present).
- `docs-site/.vitepress/config.ts`: `themeConfig.i18nRouting: false` with a comment giving the mechanism (below).
- `test/docs/site-config.test.ts` (new): asserts the exported VitePress config has `themeConfig.i18nRouting === false`
  and `cleanUrls === true` (the two facts the link check depends on). If importing `config.ts` in vitest has side effects
  that fail (it calls `assertLocaleComplete` on import), assert on the source text instead and say why in the test.
- `.github/workflows/links.yml` (new): weekly `schedule` + `workflow_dispatch`; same setup steps as `docs.yml`'s build job
  (Node 26, `@knowvah` registry auth with `packages: read`); `npm run docs:build`; linkinator with external URLs included,
  `--retry`, a timeout, and skips for hosts that rate-limit; `permissions: contents: read, packages: read`. Never on
  `pull_request`.

## Read-set

- `decisions.md#dp5` (probe numbers and the mechanism); `.agent-notes/docs-publish-prep-planning.md`
- `node_modules/vitepress/dist/client/theme-default/composables/langs.js` (whole, 25 lines)
- `docs-site/.vitepress/config.ts:130-170`; `.github/workflows/docs.yml`
- `npx linkinator --help` (flags: `--recurse`, `--clean-urls`, `--check-fragments`, `--skip`, `--server-root`)

## Steps

1. **Reproduce first.** Build, run the internal check with the T5 flags; record the count and the grouped pattern (at
   planning: 138 = 6 English-only pages × 23 locales, parent = the English page, target = `/<locale>/<same path>`).
2. **Diagnose.** Confirm in the built HTML of `/guide/translation-rules` that the switcher hrefs are the 23 locale paths;
   state the mechanism with `langs.js:15` as origin and `config.ts` (no `i18nRouting`) as the condition; rule out a
   missing translation (the pages are excluded by design, D5 of `plans/docs-site/decisions.md`).
3. Write `site-config.test.ts` (red), set `i18nRouting: false` (green), rebuild, rerun: 0 broken. Confirm a translated
   page's switcher now links to locale roots, and journal that UX change.
4. Define `docs:linkcheck` to include extra roots (`/guide/getting-started`, `/reference/`, so pages without nav links are
   checked too) and to skip external URLs. Run it; 0 broken.
5. Run the external variant once locally with a per-request timeout; journal counts. Fix broken external links only in
   files this mission writes; anything else: one `follow-up` issue listing them.

## Interface contracts (outputs)

- Script name `docs:linkcheck`, runnable after `docs:build` with no network (consumed by T8's CI step).

## Acceptance criteria

- Given the planning-time tree, when the check runs, then it reports 138 broken links of the switcher pattern (reproduced).
- Given `i18nRouting: false`, when the site is rebuilt and checked, then 0 internal links or fragments are broken.
- Given `links.yml`, when read, then it has no `pull_request` or `push` trigger and read-only permissions.

**Observability:** the weekly external check is the signal for link rot; its failure files nothing automatically.
**Rollback:** Reversible (drop the option and the dependency).
