<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: release configuration, in place and not run

**Agent:** orchestrator. **Decisions:** DP7, DP9. **Commit:** `ci(release): semantic-release config behind a manual trigger`.

## Write-set

- `.releaserc.json` (new): as `../dot-engine/.releaserc.json` (branches `main`, `tagFormat` `v${version}`, plugins
  commit-analyzer, release-notes-generator, npm, github).
- `.github/workflows/release.yml` (new): from `../dot-engine/.github/workflows/release.yml`, with SPDX header and these
  changes: `on: workflow_dispatch` only; job `if: github.ref == 'refs/heads/main'`; environment `release`; the header
  comment says the trigger stays manual until the maintainer's first publish and trusted-publisher setup, then becomes
  `push: branches: [main]` (DP9 issue 2); package name `@knowvah/elk-engine` in the mirror step; action versions as in this
  repo's `ci.yml` (`actions/checkout@v7.0.0`, `actions/setup-node@v6`) unless dot-engine's newer pins are required.
- `package.json`: devDependencies `semantic-release` and the four plugins at dot-engine's ranges (re-check with
  `npm view <pkg> version license`; all MIT at planning); scripts `release` (`semantic-release`), `publish:check`,
  `prepublishOnly`; `homepage` `https://elk-engine.knowvah.com/`; `publishConfig.registry` and
  `publishConfig["@knowvah:registry"]` = `https://registry.npmjs.org/` (keep `access: public`).
- `package-lock.json` (by `npm install`).
- `PUBLISHING.md` (new, SPDX): from `../dot-engine/PUBLISHING.md`, rewritten for this package: the `@knowvah` npm org
  already exists (dot-engine publishes under it); steps for the maintainer only: surface ruling first, first manual
  publish with 2FA from `main`, first version, tag `v<version>` on that commit so semantic-release continues from it,
  trusted publisher (repo `elk-engine`, workflow `release.yml`, environment `release`), switch the trigger, optional
  required reviewers; what gets published (`files`, the single entry); unpublish window. State plainly that the first
  publish freezes the ElkGraph API (AD-14).
- `CONTRIBUTING.md`: a short "Releasing" section pointing at `PUBLISHING.md` and saying PR titles drive versions once the
  trigger is switched (the PR-title workflow already lints them).

## Read-set

- `decisions.md#dp7`; `../dot-engine/.releaserc.json`, `../dot-engine/.github/workflows/release.yml`,
  `../dot-engine/PUBLISHING.md`, `../dot-engine/package.json:1-40, 85-120`
- `package.json`, `.npmrc` (the scope mapping and its comment), `.github/workflows/ci.yml`, `.github/workflows/pr-title.yml`
- `CONTRIBUTING.md`

## Steps

1. Edit `package.json`, install, and run `npm run publish:check`; journal the `npm pack --dry-run` file list and size.
   Confirm no `*.test.ts` and no `test/` path is in it.
2. Write the workflow; check it with `actionlint` if installed, else journal that YAML was only parsed (e.g.
   `node -e` with a YAML-free check of the `on:` keys by grep).
3. Run `npx semantic-release --help` only (proves the install; contacts nothing). Do not run it otherwise.
4. Confirm `npm config get registry --location=project` is unchanged and that `npm publish --dry-run` (no network write)
   reports `registry.npmjs.org` as the target; journal its output. If `--dry-run` would contact the registry for auth,
   skip it and journal why.

## Acceptance criteria

- Given `release.yml`, when read, then its only trigger is `workflow_dispatch` and the job is limited to `main`.
- Given `package.json`, when `npm publish --dry-run` resolves the target, then it is `https://registry.npmjs.org/`.
- Given `npm run publish:check`, when run, then it exits 0 and the file list holds `dist/index.js`, `dist/index.d.ts`,
  `LICENSE`, `README.md` and no test file.

**Observability:** N/A until the maintainer enables releases; the GitHub Release and npm provenance are then the record.
**Rollback:** Reversible (nothing ran; delete the files and revert `package.json`).
