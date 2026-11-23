<!-- SPDX-License-Identifier: EPL-2.0 -->

# tools/typedoc: the API reference toolchain

This directory is a private npm package of its own. It exists for one reason: **TypeDoc has no release that supports
TypeScript 7**, and the project compiler is TypeScript 7.0.2 (AD-6). TypeDoc 0.28.20 declares the peer
`typescript` `5.0.x … 6.0.x`, and npm cannot give a peer another package under the name `typescript` while the root
holds TypeScript 7 (`overrides` fails with `ERESOLVE`). So TypeDoc gets its own `node_modules` with TypeScript 6.0.3,
and the root is untouched: `npx tsc --version` at the root still prints 7.0.2. Decision: DP3 in
[`plans/docs-publish-prep/decisions.md`](../../plans/docs-publish-prep/decisions.md).

## How it is used

`npm run docs:api` (run by `docs:build` and `docs:dev`) does two things:

1. `npm ci --prefix tools/typedoc`: installs the four pinned packages from `package-lock.json` here. None is in the
   `@knowvah` scope, so no registry token is needed.
2. `tools/typedoc/node_modules/.bin/typedoc --options tools/typedoc/typedoc.json`: writes Markdown into
   `docs-site/reference/`, which is generated, gitignored and never committed. VitePress then builds it as `/reference/`.

| File                 | Role                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `typedoc.json`       | Options. `entryPoints` is `src/index.ts`, the accepted export surface                        |
| `tsconfig.json`      | TypeScript 6's view of the sources: extends the root build config                            |
| `reference-index.md` | The top of the generated index page (`readme` + `mergeReadme`), with the frozen-surface note |
| `package-lock.json`  | The exact toolchain. Change it only by `npm install` in this directory, and commit it        |

TypeDoc **errors** fail the build. Warnings are printed and tolerated: most come from `{@link}` targets in comments
ported from Java that name symbols outside the exported surface, and from internal types that exported signatures
mention. No source comment is edited to silence one.

## Bumping, and when this goes away

Bump the four versions together (`npm install --save-exact --save-dev typedoc@<v> ...` here), run `npm run docs:build`
and `npm run docs:linkcheck`, and compare the warning count with the last journaled one. When a TypeDoc release
supports TypeScript 7, move the three TypeDoc packages to the root `devDependencies`, point `docs:api` at the root
binary, and delete this package.
