<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11a — Generic site replay

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11a): replay layered site vectors`
`S` = `src/alg/layered`; `H` = `test/helpers`.

## Context

Mission 7a (README), L4 under X5/X6. T10 recorded `test/golden/refs/java/layered-sites.json`: one row per scenario of
`plans/layered-framework/unreached.md` (groups S1–S22), each `{ id, site, input, steps, expected }` built by the
recorder's step interpreter (T10 brief § Design). This task is the TS twin of that interpreter: the oracle-anchored
authority (6c D1) that T11b–T11d's literals are checked against. A mismatch is diagnosed (`~/.claude/rules/diagnosis.md`),
never fixed by editing the JSON or `src/` (stops 4, 5, 7, 8): report the mechanism and stop.

- **Patterns:** `H/nodespacing-site-replay.ts` + `src/alg/common/nodespacing/NodespacingSiteVectors.test.ts` (row
  loop, `expectSame`, hex decoding); `H/layered-framework-replay.ts` (`importInput`, `findImportTarget`, `dumpLGraph`,
  `registerLayered`, paths, C4 decoding, `layerAll`) — import from it, do not copy.

## Task

1. `H/layered-site-replay.ts`: load the file once; for a row, import `input` (or start from `new LGraph()` as `g0`),
   keep a path table (T1 positional paths; created elements get the next index on their owner in creation order,
   exactly as the T10 header states), apply each step by `op` through one dispatch table (one entry per documented
   op, Java signature in a comment), collect `expected` by label (a thrown Java-chain error becomes
   `{ exception: { class, message } }` with the simple class name), decode hex doubles.
2. `S/LayeredSiteVectors.test.ts`: `it.each` over rows; numbers within 1e-6 (AD-4), everything else exact; unique
   ids; per-site counts equal `rowCounts`; whole-graph labels (`lgraph`, `elk`) compared with the T1 comparators
   (`compareLGraphDump`, the ELK JSON key-order-insensitive comparison).
3. Provider rows (`site/provider/*`): the TS `ElkLayered` is staged (7f), so `layout` throws
   `UnsupportedOperationException` naming 7f; replay these rows as "expected throw" and leave the recorded `elk` for
   7f — the test names the staged method per row (`doLayout` for `flat`, `doCompoundLayout` for `include-children`
   and `cancelled`). Journal row text supplied in the hand-back.

## Write-set

`H/layered-site-replay.ts` (new), `S/LayeredSiteVectors.test.ts` (new). Nothing else; stop if another file needs a change.

## Read-set

`test/golden/refs/java/layered-sites.json` (header and sample rows per site; the file may be large: read by site),
the T10 recorder header, `H/layered-framework-replay.ts`, the pattern files above, `S/graph/*.ts`, `S/options/*.ts`
signatures as needed.

## Quality bar

`npx vitest run src/alg/layered/LayeredSiteVectors.test.ts`, `npm run typecheck`, `npx prettier --check <files>`,
`npm run complexity`, `npx vitest run test/architecture`. Never `npm run coverage`, never commit.

## Acceptance criteria

- Given every row, when replayed, then it matches at the AD-4 bar (numbers 1e-6, all else exact).
- Given `rowCounts`, then per-site counts and the total match; ids are unique.
- Given a step op the header documents, then the dispatch table has exactly one entry for it (test asserts the op
  set of the file ⊆ the table's keys).

## Hand-back

Return only: files written, test counts, any divergence with its diagnosis artifact, and the journal row text.
