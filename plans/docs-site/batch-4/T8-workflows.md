<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — CI docs gate, Pages deploy, repo docs

**Agent:** devops-engineer · **Commit:** `ci: build the docs site in ci and deploy it to github pages`

## Context
D11. `ci.yml` exists (format check, typecheck, coverage, Code Quality upload). Pages is configured
as `build_type: workflow` with the custom domain already validated; nothing is deployed yet.

## Task
1. `ci.yml`: `permissions` adds `packages: read`; `setup-node` gains
   `registry-url: https://npm.pkg.github.com` and `scope: '@knowvah'`; `npm ci` gets
   `env: NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; add `- run: npm run docs:build` after
   `npm run coverage`. Leave the `upload-coverage` job untouched.
2. `docs.yml`: copy `../dot-engine/.github/workflows/docs.yml` (push to `main` +
   `workflow_dispatch`; permissions `contents: read`, `pages: write`, `id-token: write`,
   `packages: read`; concurrency `pages`; build job uploads `docs-site/.vitepress/dist`; deploy job
   uses `actions/deploy-pages@v5` with the `github-pages` environment). SPDX line 1.
3. `README.md`: a "Documentation site" section (URL, `docs:dev`/`docs:build`, link to
   `docs-site/.vitepress/README.md`); keep every existing section.
4. `CONTRIBUTING.md` (new): gates incl. `npm run format:check` and `npm run docs:build`, PR flow
   under the ruleset (merge commits only, signed commits, `ci` + `lint-title`), one-time signing
   setup copied from `../dot-engine/CONTRIBUTING.md` "Commit signing", docs translation pointer.
5. `docs-site/.vitepress/README.md` (maintainer doc, adapt dot-engine's): how a language is
   registered, adding a language, adding/removing an English page, English-only pages, keeping
   translations current, and the three on-call failures (Packages auth, stale translation,
   completeness gate) with detection and mitigation.

## Write-set
`.github/workflows/ci.yml`, `.github/workflows/docs.yml`, `README.md`, `CONTRIBUTING.md`,
`docs-site/.vitepress/README.md`.

## Read-set
- `../decisions.md#ci`, `#landing`; `../README.md#stop-conditions` (for the on-call section)
- `.github/workflows/ci.yml` (all), `../dot-engine/.github/workflows/{ci.yml,docs.yml}` (all),
  `../dot-engine/CONTRIBUTING.md:1-60`, `../dot-engine/docs-site/.vitepress/README.md` (all)

## Acceptance criteria
- Given `ci.yml`, then it parses (`ruby -ryaml` or `python3 -c 'import yaml'`), `permissions.packages`
  is `read`, and the step order is format:check, typecheck, coverage, docs:build.
- Given `docs.yml`, then it parses and deploys `docs-site/.vitepress/dist` with `pages: write`
  and `id-token: write` and the `github-pages` environment.
- Given `docs-site/.vitepress/README.md`, then it documents the three on-call failures with
  detection and mitigation each.
- Given `npm run format:check`, then both workflow files and both Markdown files pass.

## Quality bar
README gates. Workflow comments explain the Packages auth and the separate-job rationale.

## Observability
The two workflows are the SLIs (Phase 4): their success and build wall time.

## Rollback
Reversible — revert the commit; a failed deploy leaves the previous deployment live.

## Boundaries
Do not add `release.yml`, TypeDoc, or ESLint. Do not change `pr-title.yml`.
