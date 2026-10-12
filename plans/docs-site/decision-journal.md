<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision Journal — docs-site

| When | Task | Type | Entry |
|------|------|------|-------|
| 2026-10-11 | start | setup | Branch `feature/docs-site` created from `main` (44a01f7); brief committed as d810ff2. D2 provenance: i18n machinery is copied from `../dot-engine` at commit `33a928d8` (fix(ortho): route self-loops instead of losing them). |
| 2026-10-11 | T1 | push-forward | Executed by the orchestrator directly rather than a `typescript-pro` agent: single-task batch, and every read-set file was already in context; re-briefing an agent would only re-read it. Later multi-task batches dispatch agents as the brief says. |
| 2026-10-11 | T1 | push-forward | `.npmrc` carries only the `@knowvah:registry` scope line + rationale. dot-engine's `allow-remote=all` line is omitted: it exists for a tarball-URL override this repo does not have, and local npm is 11.16.0. Dev-deps: `vitepress@^1.6.4`, `@knowvah/theme@0.3.0` (exact, D1), `@fontsource/jetbrains-mono@^5.3.0`; resolved vitepress 1.6.4, theme 0.3.0, fontsource 5.3.0, vue 3.5.43. |
| 2026-10-11 | T1 | baseline | `npm run docs:build` cold (cache + dist removed), 3 samples: wall 2.00 / 1.75 / 1.64 s (`/usr/bin/time -p real`); vitepress-reported 1.34 / 1.19 / 1.19 s. Search index chunk `dist/assets/chunks/@localSearchIndexroot.cVud1dAQ.js` = 232 bytes (the brief's path said `dist/assets/`; VitePress 1.6.4 emits it under `chunks/`). Home page only at T1, so the English index size used by stop condition 8 for locale comparison is re-measured after T3 lands content. |
| 2026-10-11 | T1 | note | `npm audit`: esbuild ≤0.24.2 (GHSA-67mh-4wv8-2f99, dev-server only) via vitepress's nested vite; "No fix available" inside the 1.6.x line. Accepted under D1 (VitePress 1.6.4 locked; 2.0 is alpha). Revisit when VitePress 1.6.5+ or a stable 2.x exists. |
| 2026-10-11 | T1 | convention | Task commits contain exactly the task write-set; the brief's checkbox/journal updates land in a separate `docs(plans): …` commit right after, so the `git show --name-only HEAD ⊆ write-set` gate is checked against the task commit. |
| 2026-10-11 | T1 | gates | format:check ✓ typecheck ✓ coverage ✓ (100/100/100/100, src thresholds unchanged) docs:build ✓ (`dist/index.html` present; `--vp-c-brand` in `dist/assets/style.*.css`; `base '/'`, `search.provider 'local'`) lizard ✓ (config.ts, theme/index.ts, copy-brand-assets.mjs) `git diff --stat src test/golden test/corpus` empty ✓ |
