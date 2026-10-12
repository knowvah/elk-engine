<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine

A faithful TypeScript port of the [Eclipse Layout Kernel](https://www.eclipse.org/elk) (ELK), the
Java graph-layout library. No Java, no WASM: the layout algorithms are re-implemented in plain
TypeScript and verified against the Java implementation.

## Status

**Pre-alpha skeleton. No layout algorithms yet.** The repository currently holds the toolchain,
architecture, and verification scaffolding; algorithms are ported in later missions (see
[`plans/roadmap.md`](plans/roadmap.md)). `src/index.ts` exports nothing public yet.

## Goals

- **Faithful port**: the Java at the pinned ELK commit is the spec; every branch is ported.
- **Oracle-verified**: outputs are compared with ELK built from source (structure exact,
  coordinates within 1e-6).
- **Browser-safe**: `src/` uses no Node built-ins.
- **Zero runtime dependencies.**

## Public contract

The public API will be the ElkGraph object model plus `ElkGraphUtil` factories; ELK JSON is an
I/O adapter, and the first npm publish freezes this surface.

## Development

The library requires Node 22 or newer; the docs scripts require Node 24.2 or newer (Node 26 is
used in CI).

| Command             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `npm ci`            | Install dependencies                    |
| `npm run typecheck` | Type-check with the native TypeScript 7 |
| `npm test`          | Run the vitest suite                    |
| `npm run coverage`  | Run the suite with coverage thresholds  |
| `npm run build`     | Build the package                       |

## External directories

Scripts and tests locate sibling checkouts through environment variables. Library code under
`src/` never reads them.

| Variable         | Default                        | Content                                   |
| ---------------- | ------------------------------ | ----------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse ELK checkout at the pinned commit |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Oracle worktree built from ELK source     |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models checkout at the pinned commit  |

Defaults are relative to the repository root.

## Documentation

- [`CLAUDE.md`](CLAUDE.md): conventions for agents and contributors
- [`docs/architecture/overview.md`](docs/architecture/overview.md)
- [`docs/conformance.md`](docs/conformance.md)
- [`docs/translation-rules.md`](docs/translation-rules.md)
- [`plans/roadmap.md`](plans/roadmap.md)

## Documentation site

The site is published at <https://elk-engine.knowvah.com>.

| Command                | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run docs:dev`     | Copy brand assets, goldens and reports, then start the dev server       |
| `npm run docs:build`   | Same copy steps, then a production build in `docs-site/.vitepress/dist` |
| `npm run docs:preview` | Serve the last production build locally                                 |

The docs scripts need Node 24.2 or newer because they use `import.meta.main` (CI and volta use
Node 26). The site's brand theme, `@knowvah/theme`, installs from GitHub Packages through the
`@knowvah` scope mapping in `.npmrc`; locally, authentication comes from `~/.npmrc` and needs a
token with `read:packages`. Localization and maintenance are described in
[`docs-site/.vitepress/README.md`](docs-site/.vitepress/README.md).

The site is served in English and 23 other languages: Čeština, Dansk, Deutsch, Español, Eesti,
Suomi, Français, Magyar, Íslenska, Italiano, 日本語, 한국어, Nederlands, Norsk, Polski,
Português (Brasil), Română, Русский, Slovenčina, Svenska, Türkçe, 简体中文 and 繁體中文. The
reference pages (translation rules, port map, inventory, roadmap, parity) stay English.

## License

[EPL-2.0](LICENSE), the same license as upstream ELK. See [NOTICE.md](NOTICE.md) for attribution
and the pinned upstream commits.
