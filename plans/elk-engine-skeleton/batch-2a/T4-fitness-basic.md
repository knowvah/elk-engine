<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Basic fitness tests (SPDX, browser-safe, module globals)

**Agent:** test-automator · **Commit:** `test(architecture): add spdx, browser-safety, and module-global fitness tests`

## Context
elk-engine expresses architectural constraints as tests (AD-8), like
dot-engine's `test/architecture/`. Scaffold exists (T1): vitest discovers
`test/**/*.test.ts`. Tests may use Node APIs (they run in Node); `src/`
may not.

## Task
Write three fitness tests. Each must fail with a message naming the
offending file (and line where applicable).

## Write-set
`test/architecture/spdx-header.fitness.test.ts`,
`test/architecture/no-node-builtins.fitness.test.ts`,
`test/architecture/module-globals.fitness.test.ts`.

## Read-set
- `~/git/knowvah/dot-engine/test/architecture/module-globals.fitness.test.ts` (pattern; header comment style)
- `../decisions.md#ad-8-fitness-functions`

## Specification
- **spdx-header**: walk `src/`, `test/`, `tools/` (skip `node_modules`,
  `dist`, `coverage`, `test/golden/refs/**`, any `*.json`); for `.ts`,
  `.mjs`, `.java`, `.sh` files require `SPDX-License-Identifier: EPL-2.0`
  within the first 3 lines (after a shebang if present). Assert the
  offender list equals `[]`.
- **no-node-builtins**: for every `src/**/*.ts` (including tests? —
  **exclude** `*.test.ts`), fail on imports/requires of `node:*` or any
  bare Node built-in name (use `module.builtinModules` from `node:module`
  to get the list), and on any `process.` reference. Assert offenders `[]`.
- **module-globals**: find top-level `let` / `export let` in
  `src/**/*.ts` (excluding tests); compare to an `ALLOWLIST` record
  (`'src/path.ts::name' → reason`), initially **empty**. Fail on any
  unlisted global and on any stale allowlist entry. Header comment explains
  why: callers may run many layouts per page; ELK layout state must live on
  per-run objects (e.g. `Random` instances), not module scope.
- Each test also includes a **self-check**: run the detector on an
  in-memory sample string that violates the rule and assert it is caught
  (so a broken detector cannot pass vacuously).
- Use only `node:fs`, `node:path`, `node:url`, `node:module`; no new deps.

## Acceptance criteria
- Given a `.ts`/`.java`/`.sh` file under `src/`, `test/`, or `tools/`
  lacking the SPDX line, when `npm test`, then the spdx test fails naming it.
- Given `src/x.ts` importing `node:fs` or `path`, or reading `process.env`,
  then no-node-builtins fails naming file:line.
- Given a new top-level `let` in `src/` not in the allowlist, then
  module-globals fails naming `src/...::name`.
- Given the current tree, then all three pass.

## Quality bar
Gates in README.md (brief). Detector logic as small pure functions at the
top of each file (testable by the self-checks).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
