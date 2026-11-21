<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: `withAssertions` to `test/helpers/`; #119

## Context

#127 items 1 and 5; [D1](../decisions.md#d1-withassertions-moves-to-test-helpers-with-assertionsts),
[D7](../decisions.md#d7-119). Every later task imports this helper.

## Write-set

- `test/helpers/with-assertions.ts` (new; SPDX header; one export)
- `src/java/lang/DevAssert.test.ts` (delete the local helper `:7-16`, import it)
- `src/alg/layered/issues/Issue447Test.test.ts` (delete `:38-45`, import from `test/helpers/junit-delta.ts`)

## Read-set

`src/java/lang/DevAssert.ts`, `src/java/lang/DevAssert.test.ts:1-40`, `test/helpers/junit-delta.ts:1-30`,
`src/alg/layered/issues/Issue447Test.test.ts:1-70`, `test/setup/dev-assertions.ts`.

## Interface output (consumed by T2-T6)

```ts
export function withAssertions<T>(enabled: boolean, body: () => T): T; // restores the previous state in `finally`
```

## Steps

1. Run `npx vitest run src/java/lang/DevAssert.test.ts src/alg/layered/issues/Issue447Test.test.ts`; journal counts.
2. Move the helper verbatim (doc comment adjusted only to say where it lives). No title or body of `DevAssert.test.ts`
   changes (D1).
3. #119 swap; the two calls stay byte-identical.
4. Rerun step 1 (same counts, same titles) and the same with `ELK_DEV_ASSERTIONS=off`; typecheck; prettier on the three
   files. Commit `test(helpers): share withassertions; issue447test uses junit-delta`.

## Acceptance criteria

- Given the moved helper, when `DevAssert.test.ts` runs in either mode, then the same 10 tests pass with the same titles.
- Given `Issue447Test.test.ts`, when grepped for `function assertEqualsWithin`, then there is no hit, and its tests pass.
- Given `test/helpers/with-assertions.ts`, when its exports are listed, then there is exactly one.

## Observability / rollback

N/A — test code only. Reversible.
