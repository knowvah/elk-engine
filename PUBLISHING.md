<!-- SPDX-License-Identifier: EPL-2.0 -->

# Publishing @knowvah/elk-engine

**Nothing has been published yet.** The release tooling is in place and has never been run: no `npm publish`, no
`npm login`, no semantic-release run, no tag. Everything on this page is the **maintainer's** to do, in the order given
([#91](https://github.com/knowvah/elk-engine/issues/91)).

> **The first publish freezes the ElkGraph API (AD-14) and cannot be undone.** A published version can be deprecated
> but not changed, and after 72 hours not removed. Do not publish before the export surface is accepted
> (`docs/architecture/public-api.md`).

Once the bootstrap below is done, releases are automated with **semantic-release and npm Trusted Publishing (OIDC)**, as
in [`@knowvah/dot-engine`](https://github.com/knowvah/dot-engine): no long-lived token, and nobody runs `npm publish` by
hand again.

## What is in place

| Piece                           | State                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.releaserc.json`               | Branch `main`, tags `v<version>`, plugins commit-analyzer, release-notes-generator, npm, github     |
| `.github/workflows/release.yml` | **Manual trigger only** (`workflow_dispatch`), job limited to `main`, environment `release`         |
| `package.json` `publishConfig`  | `access: public`; `registry` and `@knowvah:registry` both `https://registry.npmjs.org/` (see below) |
| `npm run publish:check`         | Typecheck, build, `npm pack --dry-run`: shows exactly what would ship                               |
| `npm run pack:smoke`            | Packs the tarball, installs it in a clean project, imports it; with `--entry`, lays out a graph     |
| `prepublishOnly`                | Typecheck and build before any publish, so a stale `dist/` cannot ship                              |

**Why the two registry pins matter.** The repository's `.npmrc` maps the `@knowvah` scope to GitHub Packages, because
the docs theme installs from there. npm prefers a scope registry over `registry`, so without
`publishConfig["@knowvah:registry"]` a plain `npm publish` of this package would go to GitHub Packages, not to npmjs.
The pin was checked with npm's own resolver (`npm-registry-fetch` `pickRegistry`): before the pins it returns
`https://npm.pkg.github.com`, with them `https://registry.npmjs.org/`.

## Bootstrap (once, maintainer only)

### 1. Rule on the export surface

Accept, amend or reject `docs/architecture/public-api.md` ([#90](https://github.com/knowvah/elk-engine/issues/90)) and apply its "On acceptance" steps, so that `src/index.ts`
exports the surface. Until then the package builds to an empty module. `npm run pack:smoke` and
`npm run pack:smoke -- --entry test/public-api/candidate-index.ts` show the difference.

### 2. Choose the first version

`package.json` holds `0.0.0-development` and stays that way: with semantic-release the version lives in the git tag,
on npm and in the GitHub Release. For the first, manual publish the version must be set by hand (step 3). Two things to
weigh:

- `0.x` signals an unstable API; `1.0.0` says the frozen surface is a commitment. AD-14 freezes the surface either way.
- semantic-release continues from the highest `v<version>` tag on `main`. With no such tag, its first run would publish
  `1.0.0`, whatever was published by hand. Step 4 prevents that.

### 3. First publish, by hand

The `@knowvah` npm organization already exists (dot-engine publishes under it). Trusted publishing is configured on a
package's settings page, which exists only once the package does, so the first publish is manual and interactive:

```sh
git checkout main && git pull            # publish from the merged tree
npm run publish:check                    # typecheck + build + the dry-run file list
npm run pack:smoke                       # the tarball installs and imports in a clean project
npm version <first-version> --no-git-tag-version   # sets package.json for this publish only
npm login                                # once per machine
npm publish                              # prompts for the 2FA one-time password
git checkout package.json package-lock.json   # back to 0.0.0-development; do not commit the bump
```

`publishConfig.access` is `public`, so no `--access` flag is needed.

### 4. Tag the published commit

```sh
git tag v<first-version> <the commit that was published>
git push origin v<first-version>
```

semantic-release reads this tag as the last release and computes the next version from the commits after it.

### 5. Configure the trusted publisher

npmjs.com → **@knowvah/elk-engine → Settings → Trusted Publishers → Add → GitHub Actions**:

| Field                | Value         |
| -------------------- | ------------- |
| Organization or user | `knowvah`     |
| Repository           | `elk-engine`  |
| Workflow filename    | `release.yml` |
| Environment          | `release`     |

### 6. Switch the release trigger

In `.github/workflows/release.yml` replace `on: workflow_dispatch:` with

```yaml
on:
  push:
    branches: [main]
```

and update its header comment. From then on every merge to `main` runs semantic-release. Until this step the workflow
runs only when dispatched by hand, and a dispatch before steps 3 to 5 fails at the publish step.

### 7. Optional: require an approval per release

The `release` environment is created without protection on the first workflow run. To require an approval before each
publish: GitHub → repository **Settings → Environments → `release` → Required reviewers**.

## Day to day, after the bootstrap

semantic-release analyzes **every commit that reaches `main`** since the last tag. This repository merges pull requests
with merge commits, not squashes (`CONTRIBUTING.md`), so that is the merge commit, whose subject is the PR title, **and
each per-task commit the PR brings in**. The highest bump among them wins:

| Commit                                               | Release |
| ---------------------------------------------------- | ------- |
| `fix: …`, `perf: …`                                  | patch   |
| `feat: …`                                            | minor   |
| `feat!: …` or a `BREAKING CHANGE:` footer            | major   |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, etc. | none    |

A `docs:` pull request that contains one `feat(...)` commit therefore releases a minor version. Write commit types with
that in mind once the trigger is switched.

When a release is cut, the workflow publishes to npm with provenance, pushes the `v<version>` tag, creates the GitHub
Release with generated notes, and mirrors the tarball to GitHub Packages (for consumers whose `@knowvah` scope points
there). Nothing is committed back to `main`.

## What gets published

`package.json` `files`: `dist/` (the esbuild ESM bundle `dist/index.js`, its source map, and the `.d.ts` tree),
`src/` without tests, and `NOTICE.md`. npm always adds `package.json`, `README.md` and `LICENSE` (EPL-2.0). At the time
of writing the dry run lists 4,212 files, 2.2 MB packed, 11.5 MB unpacked.

| import                | bundle          | types             |
| --------------------- | --------------- | ----------------- |
| `@knowvah/elk-engine` | `dist/index.js` | `dist/index.d.ts` |

There is one entry point and there are no runtime dependencies. The `exports` map blocks deep imports such as
`@knowvah/elk-engine/src/...`, so only what `src/index.ts` exports is API.

## Removing a published version

- Within **72 hours** of publishing: `npm unpublish @knowvah/elk-engine@<version>`.
- A version number can **never be reused**; cut a new one with a new releasable commit.
- After 72 hours, use `npm deprecate @knowvah/elk-engine@<version> "<message>"`: the version stays installable and
  warns on install.

## Notes

- Trusted publishing requires npm 11.5.1 or newer. The workflow uses Node 26, which bundles a newer npm, and fails
  early if a runner ever ships an older one.
- Provenance is automatic with trusted publishing; no `--provenance` flag.
- `npm run release` runs semantic-release locally. Do not use it: releases are cut by the workflow, which holds the
  OIDC identity.
