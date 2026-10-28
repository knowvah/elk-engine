<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Site replay and anchored unit tests

> **Superseded under X5** by T11a–T11d ([overview](overview.md)); kept for the record.

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11): anchor layered unit tests on oracle site rows`
`S` = `src/alg/layered`; `H` = `test/helpers`.

## Context

Mission 7a (README), L4. T10 recorded one oracle row per scenario that reaches a branch the framework replays leave
untaken (`plans/layered-framework/unreached.md`). This task replays every row generically and adds a readable unit
test per branch whose literals equal the row (6c D1: literal annotated with the row id; the replay is the authority).

- **Patterns:** `H/nodespacing-site-replay.ts`, `src/alg/common/nodespacing/NodespacingSiteVectors.test.ts`, and the
  re-anchored tests listed in `plans/ad13-rederivation/batch-3/T3a-replay-and-context-sites.md`.

## Task

1. `H/layered-site-replay.ts`: load `layered-sites.json`, import `input` (via `H/layered-framework-replay.ts`), apply
   `steps` by op name to the TS objects, return the `expected`-shaped result.
2. `S/LayeredSiteVectors.test.ts`: one `it` per row at the AD-4 bar.
3. Colocated tests (`S/graph/*.test.ts`, `S/options/Spacings.test.ts`, `S/graph/transform/*.test.ts`): one case per
   `unreached.md` row, literals equal to the oracle row, comment `// oracle: <row id>; <Java file:line>`. Existing
   assertions are never changed (AD-13).
4. Unreachable branches listed in `unreached.md` stay untested and journaled.

## Write-set

`H/layered-site-replay.ts`, `S/LayeredSiteVectors.test.ts`, the colocated `*.test.ts` files of the classes named in
`unreached.md` (adding cases only).

## Read-set

`plans/layered-framework/unreached.md`, `test/golden/refs/java/layered-sites.json`, the T10 recorder header,
`H/layered-framework-replay.ts`, the pattern files above, the Java lines each row cites.

## Acceptance criteria

- Given every `layered-sites.json` row, when replayed, then it matches at the AD-4 bar.
- Given every `unreached.md` scenario, then a colocated test asserts its oracle values with the row id in a comment.
- Given `npm run coverage`, then branch coverage of each non-staged 7a class is at least 90 %, or the remainder is in
  the unreachable list (else stop 11).
- Given `git diff` against the T10 commit, then no existing assertion changed.

## Observability / Rollback

N/A — tests only. Reversible: revert the commit.
