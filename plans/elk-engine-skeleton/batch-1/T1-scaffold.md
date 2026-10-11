<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Project scaffold

**Agent:** typescript-pro · **Commit:** `chore(scaffold): initialize typescript project`

## Context
elk-engine is a faithful TypeScript port of the Eclipse Layout Kernel
(Java). This is the first code in an empty repo (one empty root commit).
Mirror the setup of the sibling project `~/git/knowvah/dot-engine`, but on
the newer toolchain chosen for this project. The repo directory will be
renamed — never write its absolute path anywhere.

## Task
Create the npm package, TypeScript config, vitest config with coverage
thresholds, git hygiene files, and a placeholder entry module with a test.

## Write-set
`package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`,
`vitest.config.ts`, `.gitignore` (Modify — keep existing lines),
`.gitattributes`, `src/index.ts`, `src/index.test.ts`.

## Read-set
- `~/git/knowvah/dot-engine/package.json` (scripts, engines, volta, exports shape)
- `~/git/knowvah/dot-engine/tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`
- `~/git/knowvah/dot-engine/.gitignore:30-45` (`.claude/` local-settings entries)
- `../decisions.md#ad-6-toolchain`, `#ad-14-public-contract`, `#ad-15-naming-and-rename-safety`

## Decisions that bind this task
- AD-6: `typescript` **7.0.2** exact; `vitest` + `@vitest/coverage-v8`
  **5.0.x**; `esbuild` 0.28.x; `tsx`; `@types/node`. No runtime
  `dependencies` at all (AD-8/stop #8).
- AD-15: `name` `@knowvah/elk-engine`, `version` `0.0.0-development`,
  `license` `EPL-2.0`, `author` `Scott Seely`, `repository`
  `git+https://github.com/knowvah/elk-engine.git`, `bugs`
  `https://github.com/knowvah/elk-engine/issues`. No `homepage`.
- AD-14: `src/index.ts` exports nothing public yet (`export {};` plus a
  module doc comment). Do not export `src/java/*`.

## Specification
- `package.json`: `"type": "module"`, `main`/`module`/`types` →
  `./dist/index.js` / `./dist/index.d.ts`, `exports` `"."` only, `files`
  `["dist","src","!src/**/*.test.ts"]`, `engines.node >=22.0.0`,
  `volta.node 26.3.1`, `publishConfig.access public`. Scripts:
  `typecheck` = `tsc --noEmit`; `test` = `vitest run`; `coverage` =
  `vitest run --coverage`; `build` = `npm run build:js && npm run build:types`;
  `build:js` = esbuild bundle `src/index.ts` → `dist/index.js` (esm,
  sourcemap); `build:types` = `tsc -p tsconfig.build.json`.
- `tsconfig.json`: strict, ES2022, NodeNext/NodeNext, declaration +
  declarationMap + sourceMap, `types: ["node"]`, include `src/**/*`,
  `test/**/*`, `tools/**/*.ts`. Drop any option TS 7 rejects (e.g. no
  `--stableTypeOrdering`); if TS 7 rejects something dot-engine needs,
  journal it.
- `tsconfig.build.json`: extends base, `rootDir: src`, `emitDeclarationOnly`,
  excludes tests.
- `vitest.config.ts`: include `src/**/*.test.ts`, `test/**/*.test.ts`;
  `passWithNoTests: true`; coverage provider v8, `include: ['src/**']`,
  exclude `src/**/*.test.ts`, reporters text + json-summary + cobertura,
  thresholds statements/branches/functions/lines all **90**.
- `.gitignore`: keep `.serena/cache/` and the `.claude/` lines already
  present; add `node_modules/`, `dist/`, `coverage/`, `.idea/`,
  `*.log`, `.oracle-build.log`, `.DS_Store`. Do **not** ignore `plans/`
  (committed, as in dot-engine).
- `.gitattributes`: `* text=auto eol=lf`; `*.jar binary`.
- Every `.ts` file starts with `// SPDX-License-Identifier: EPL-2.0`.
- `src/index.test.ts`: asserts the module namespace has no exported keys
  (`expect(Object.keys(mod)).toEqual([])`) — documents AD-14 for now.

## Interface contracts (outputs consumed by every later task)
Scripts `typecheck`, `test`, `coverage`, `build`; vitest discovers
`src/**/*.test.ts` and `test/**/*.test.ts`; coverage measures `src/**` only;
`tsx` available for `tools/*.ts`.

## Acceptance criteria
- Given a clean checkout, when `npm ci && npm run typecheck`, then exit 0
  and `npx tsc --version` reports 7.0.2.
- Given the scaffold, when `npm run coverage`, then exit 0 with all four
  thresholds configured at 90.
- Given the scaffold, when `npm run build`, then `dist/index.js` and
  `dist/index.d.ts` exist.
- Given `package.json`, then `name` is `@knowvah/elk-engine`, `license`
  `EPL-2.0`, `dependencies` absent or empty, repository →
  `knowvah/elk-engine`.

## Quality bar
Gates in README.md. No `any`. Lockfile committed.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not create LICENSE/README/CLAUDE.md/CI (other tasks own them). Do not
add typedoc, semantic-release, or docs tooling (later missions).
