<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: one JUnit delta assertion; `fromPattern` in `test/helpers/`

## Context

Issue #46 items 2 and 3. `test/helpers/edge-route-orthogonal.ts:27-32` has a private copy of
`test/helpers/junit-delta.ts`'s `assertEqualsWithin` that throws `AssertionFailure` instead of `Error`.
`fromPattern` is defined identically in two polyomino tests. Decisions [D3](../decisions.md#d3-assertionfailure-moves-into-junit-deltats)
and [D6](../decisions.md#d6-frompattern--testhelperspolyomino-fixturests).

## Write-set

- Modify `test/helpers/junit-delta.ts`, `test/helpers/edge-route-orthogonal.ts`
- Create `test/helpers/polyomino-fixtures.ts`
- Modify `src/alg/common/polyomino/ProfileFill.test.ts`, `src/alg/common/polyomino/structures/Polyomino.test.ts`
  (remove the local function, add the import; nothing else)

## Read-set

- `test/helpers/junit-delta.ts` (13 lines), `test/helpers/edge-route-orthogonal.ts` (71 lines),
  `test/helpers/edge-route-orthogonal.test.ts` (must stay byte-identical)
- `src/alg/common/polyomino/ProfileFill.test.ts:1-20`, `src/alg/common/polyomino/structures/Polyomino.test.ts:1-20`

## Steps

1. Record `npx vitest run` counts for `edge-route-orthogonal.test.ts`, the two polyomino tests and the 21 files that
   import `junit-delta` (`grep -rl "helpers/junit-delta" src`).
2. Move `AssertionFailure` (class and doc comment) into `junit-delta.ts`; its `assertEqualsWithin` throws it.
3. In `edge-route-orthogonal.ts`, delete the private function and class, `import { AssertionFailure,
   assertEqualsWithin } from './junit-delta.js'`, and `export { AssertionFailure }`. Drop imports it no longer uses.
4. Grep the `junit-delta` callers for any assertion on the error's class or `name` (`toThrow(Error)` still passes);
   report what you find.
5. Move `fromPattern` verbatim to `polyomino-fixtures.ts` (SPDX header, a one-line comment naming its two users),
   export it, import it in both tests.
6. Rerun step 1's files; `npm run typecheck`; `npx prettier --check` the changed files.

## Acceptance criteria

- Given `edge-route-orthogonal.test.ts` unchanged, when it runs, then all its cases pass, including `:57`'s
  `toThrow(AssertionFailure)`.
- Given the 21 `junit-delta` callers, when they run, then each has the same case count and status as in step 1.
- Given the two polyomino tests, when they run, then they have the same counts and neither defines `fromPattern`.
- Given `git diff`, when inspected, then no `expect` line changed.

## Observability / rollback

N/A — test code only. Reversible.
