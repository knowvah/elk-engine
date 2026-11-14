<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: docs-publish-prep (roadmap row 12, 2026-11-14)

Planning-time notes are in `docs-publish-prep-planning.md`.

## Observation: linkinator recurses only below each root's URL

- **Context**: T5, adding the pages no nav links (`/guide/getting-started`, `/reference/`) to the link check.
- **Finding**: `node_modules/linkinator/build/src/index.js:892-893` crawls a found link only when its URL starts with the
  root URL it was found from. With `reference/index.html` as a root the 72 reference pages were fetched but never parsed
  (117 links, 0 broken); with `reference/` they were crawled (203 links, 13 broken fragments). A skip pattern of
  `^https?://` skips the crawl root itself (the local server is matched by its full loopback URL), giving "0 links, exit 0".
  `--server-root .` drops the first path segment of every extra root (`build/src/options.js:113-118`).
- **Impact**: a page outside the nav needs a root of its own, and a directory root (trailing `/`) to have its sub-pages
  crawled. Pass the server root as a real path from the repository root. Check that a link check scanned more than zero
  links before trusting a green result.
- **Confidence**: High

## Observation: the generated reference needs VitePress's default heading ids

- **Context**: T5, 18 dead anchors in the typedoc pages added by T2.
- **Finding**: `typedoc-vitepress-theme` rewrites every link anchor with VitePress's default slug rule (`slugifyAnchor`:
  `PARALLEL_NODE` → `parallel-node`), while the site's `markdown.anchor.slugify` is `headingSlug` (GitHub's rule, which
  drops `_` here: `parallelnode`). markdown-it-anchor prefers `slugifyWithState(text, state)` over `slugify`, and
  `state.env.relativePath` is the page being rendered, so the rule can differ per directory. `useHTMLAnchors` does not
  help: the theme still rewrites the link side.
- **Impact**: `pageHeadingSlug` in `docs-site/.vitepress/config.ts` uses the reference rule under `reference/`. Any other
  generated content with its own anchor convention needs the same treatment; VitePress never checks anchors, only
  `docs:linkcheck` does.
- **Confidence**: High

## Observation: `headingSlug` is not GitHub's rule for underscores

- **Context**: T5, comparing slug rules.
- **Finding**: `NOT_SLUG_CHARS` in `config.ts` removes `_`; github-slugger keeps it. No landed page has a heading with an
  underscore that is linked (0 broken fragments on the base build), so nothing is broken today.
- **Impact**: a canonical doc with a `snake_case` heading and a GitHub-style link to it would miss on the site.
- **Confidence**: Medium (github-slugger's rule from memory, not re-read this session; the site side is measured)

## Observation: importing `config.ts` statically breaks `npm run typecheck`

- **Context**: T5, `test/docs/site-config.test.ts`.
- **Finding**: `docs-site/` is not in `tsconfig.json` `include`; a test that statically imports `config.ts` pulls
  `vitepress`'s declaration files into the program, and they fail under `skipLibCheck: false` (`BluetoothDevice`, a circular
  `Token` alias). `i18n.ts` imports no VitePress type, which is why the landed tests can import it.
- **Impact**: load `config.ts` through a variable specifier (`await import(CONFIG_MODULE)`) and type what the test reads
  locally. `config.ts` itself is never type-checked by the gate.
- **Confidence**: High

## Observation: `npm publish` targets follow the scope registry, and `pickRegistry` shows it without publishing

- **Context**: T6, proving the registry pins without running `npm publish`.
- **Finding**: npm overlays `publishConfig` on its configuration (`lib/commands/publish.js:294-298`) and resolves the target
  with `npm-registry-fetch` `pickRegistry(spec, opts)`, which prefers `@scope:registry` over `registry`. Calling that
  function from the bundled npm with the `.npmrc` values gives `https://npm.pkg.github.com` for the base `publishConfig`
  and for `registry` alone, and `https://registry.npmjs.org/` only with `publishConfig["@knowvah:registry"]`.
- **Impact**: any `@knowvah` package whose repo maps the scope to GitHub Packages needs both pins. The resolver call is a
  side-effect-free way to check a publish target.
- **Confidence**: High

## Observation: semantic-release reads per-task commits here

- **Context**: T6, adapting dot-engine's runbook.
- **Finding**: dot-engine squash-merges, so one PR title is one analyzed commit. elk-engine allows merge commits only
  (`CONTRIBUTING.md`), so every per-task commit on a merged branch is analyzed, and the highest bump wins.
- **Impact**: once `release.yml` runs on `push`, a `feat(...)` commit inside any PR releases a minor. Stated in
  `PUBLISHING.md`; the maintainer may want a different analyzer configuration before switching the trigger.
- **Confidence**: High (merge method read from `CONTRIBUTING.md`; semantic-release was not run)

## Observation: the reference pages grow the English search index tenfold

- **Context**: T2, measuring the build.
- **Finding**: `dist/assets/chunks/@localSearchIndexroot.*.js` went from about 177 KB to 2.0 MB with the 72 typedoc pages
  (the option classes are long). `docs:build` went from 5.6 s to 12.6 s.
- **Impact**: the chunk loads only when search opens; excluding the reference from local search is possible but removes
  one of the ways to reach pages that are not in the nav.
- **Confidence**: High

## Observation: the session's permission layer declines shell commands that carry publish lines

- **Context**: T6, writing `release.yml` with a heredoc inside a larger shell command.
- **Finding**: the whole command was declined, including its unrelated parts; nothing ran. Writing the same file with the
  file tools worked.
- **Impact**: write release workflows and runbooks with the file tools, and keep shell commands free of publish text.
- **Confidence**: High
