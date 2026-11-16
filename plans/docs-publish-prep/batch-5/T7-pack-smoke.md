<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: pack-and-install rehearsal

**Agent:** `typescript-pro` (sonnet); the orchestrator adds the script line and commits. **Decisions:** DP8, DP2.
**Commit:** `test(release): pack and clean-install rehearsal`.

## Write-set

- `tools/release/pack-contents.ts` (new): pure functions — parse `npm pack --json` output; check the file list
  (required: `package.json`, `README.md`, `LICENSE`, `dist/index.js`, `dist/index.d.ts`; forbidden: `*.test.ts`, `test/`,
  `coverage/`, `plans/`, `docs-site/`); return a list of problems.
- `test/release/pack-contents.test.ts` (new; vitest only collects `src/` and `test/`, `vitest.config.ts:6`): TDD for the above with literal file lists (good list → `[]`; each forbidden
  or missing kind → its named problem).
- `tools/release/pack-smoke.ts` (new, run with `tsx`): the effectful shell.
  1. Default mode: `npm run build`, `npm pack --json --pack-destination <tmp>`, check contents, create `<tmp>/consumer`
     with a minimal `package.json` (`"type": "module"`), `npm install --offline --no-audit --no-fund <tarball>`
     (zero runtime deps, so no network), and `node -e "await import('@knowvah/elk-engine')"`; the import must succeed.
  2. `--entry <file>`: copy the packed package to `<tmp>/pkg`, replace its `dist/index.js` with an esbuild bundle of
     `<file>` built with the same options as `build:js` (`--bundle --format=esm`), pack and install that, then in a fresh
     `node` process: register the providers the first example needs, read the first example's input twin
     (`test/golden/examples-inputs/`), lay it out, export, and compare with its ref at 1e-6 (reuse
     `test/golden/compare-json.ts` from the parent process on the child's stdout, so the consumer process imports only
     the package).
  Timeouts on every child process (30 s each; 120 s for the build); clean up `<tmp>` on success; on failure print where
  the files are. Uses `$TMPDIR` via `os.tmpdir()`; nothing under the worktree is written except `dist/` by the build.
- `package.json`: script `pack:smoke` = `tsx tools/release/pack-smoke.ts`.

## Read-set

- `decisions.md#dp8`; `package.json` (`build:js`, `files`, `exports`); `test/public-api/candidate-index.ts`
- `test/docs/examples/*.ts` and `test/docs/examples.test.ts` (which providers the first example registers)
- `test/golden/compare-json.ts`; `.agent-notes/docs-site.md` (lizard and regex literals)

## Acceptance criteria

- Given a good and a bad file list, when `checkPackContents` runs, then it returns `[]` and the named problems.
- Given the current tree, when `npm run pack:smoke` runs, then the tarball passes the contents check and imports in a
  clean project.
- Given `--entry test/public-api/candidate-index.ts`, when the rehearsal runs, then the bundled package lays out the first
  example's input in a clean process and the output equals its oracle ref at 1e-6. A difference is stop 6 (likely
  mechanism to check first: module evaluation order in the bundle, `CoreOptions` cycle).

**Observability:** N/A — local and CI rehearsal; failures print the temp path. **Rollback:** Reversible.
