<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: `AssertionError`, `devAssert`, the switch and the suite setup

## Context

CLAUDE.md maps Java `assert` to a "dev-only check helper, no production cost"; § 6.8 names it `devAssert`. It was
never written, so every mission since 6a left `assert` lines as comments. This task writes the helper per
[D1](../decisions.md#d1-lazy-thunks-devassertcheck-detail), [D2](../decisions.md#d2-runtime-switch-with-the-first-reviewed-module-global),
[D3](../decisions.md#d3-assertionerror-extends-error) and [D4](../decisions.md#d4-the-suite-runs-with-assertions-enabled).
No call site yet.

## Write-set

- Create `src/java/lang/AssertionError.ts`, `src/java/lang/AssertionError.test.ts`
- Create `src/java/lang/DevAssert.ts`, `src/java/lang/DevAssert.test.ts`
- Create `test/setup/dev-assertions.ts`, `test/setup/dev-assertions.test.ts`
- Modify `vitest.config.ts` (`test.setupFiles`)
- Modify `test/architecture/module-globals.fitness.test.ts` (one `ALLOWLIST` entry, D2)
- Modify `test/architecture/exception-hierarchy.fitness.test.ts` (register `AssertionError`, D3)
- Modify `docs/translation-rules.md` § 6.8 (and its § index row if the wording changes)

## Read-set

- `docs/translation-rules.md` § 6.8 (lines ~487-492) and the exception rows of § 6
- `src/java/lang/RuntimeException.ts` (shim style: SPDX, Javadoc `@see` URL, `name`)
- `test/architecture/module-globals.fitness.test.ts:30-90`; `test/architecture/exception-hierarchy.fitness.test.ts:1-120`
- `vitest.config.ts`

## Steps (tests first)

1. Write `AssertionError.test.ts` and `DevAssert.test.ts` red. Cover: disabled by default (`assertionsEnabled()` false
   on a fresh import is not testable once setup ran, so assert the module's initial value through
   `setAssertionsEnabled(false)` paths). Disabled: neither thunk is called (spy counts 0) and no throw. Enabled and
   true: detail not called. Enabled and false: throws `AssertionError`, `instanceof Error`, not `instanceof Exception`,
   `name === 'AssertionError'`, `message` = `String(detail())`, or `''`/`undefined` per JS `Error` when no detail.
   Restore the switch in `finally`.
2. Implement both files. Keep `DevAssert.ts` free of ELK imports (`src/java` imports nothing from ELK directories).
3. Add the setup file, `setupFiles`, the guard test, and the two fitness entries.
4. Rewrite § 6.8: the D1 signature, disabled by default, the switch (D2), suite enabled (D4), the site convention (D5)
   in two lines. Recount the statements with the doc's `G` helper at `8bca22f4` (143 by `^\s*assert[ (]` at
   planning; the doc says 141 with `'^\s*assert '`) and state the pattern used.

## Acceptance criteria

- Given assertions are disabled, when `devAssert(check, detail)` runs, then neither thunk is called and nothing throws.
- Given assertions are enabled and `check()` returns false, when `devAssert` runs, then it throws an `AssertionError`
  whose message is `String(detail())`, and `catch (e) { if (e instanceof Exception) … }` does not catch it.
- Given the default vitest run, when `test/setup/dev-assertions.test.ts` runs, then `assertionsEnabled()` is `true`;
  with `ELK_DEV_ASSERTIONS=off` it is `false`.
- Given the module-globals and exception-hierarchy fitness tests, when they run, then both pass with the new entries
  and no stale entry.

## Quality bar

`npx vitest run src/java/lang test/setup test/architecture`, `npm run typecheck`, `npx prettier --check` on the files,
`npm run complexity`. Then a full `npx vitest run`: green (no site exists yet). Commit `feat(t1): add assertionerror
and the devassert helper` (unsigned, per README).

## Observability

N/A: no new observable operations (library code, no telemetry).

## Rollback

Reversible: revert the commit. Nothing outside the repo depends on the helper.
