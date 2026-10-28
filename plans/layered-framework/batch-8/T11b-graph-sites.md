<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11b — Graph sites: LGraphUtil, LNode, LEdge, LPort, strings, Tarjan, adapters

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11b): anchor lgraph unit tests on oracle site rows`
`S` = `src/alg/layered`.

## Context

Mission 7a (README), L4 under X5/X6. T10 recorded `test/golden/refs/java/layered-sites.json`; T11a replays it
generically (the authority). This task adds a readable colocated unit test per unreached branch of the graph classes
whose literals equal the oracle row (6c D1: literal annotated with the row id; comment names the Java mechanism).
Existing assertions are never changed (AD-13). If a literal you would write disagrees with the port's result, do not
change either: stop with the diagnosis artifact (mechanism, `file:line`, causal chain, ruled out).

- **Patterns:** the re-anchored tests of `plans/ad13-rederivation/batch-3/T3a-replay-and-context-sites.md` § Re-anchor;
  `test/helpers/lgraph-builders.ts` and `test/helpers/lgraph-adapter-fixtures.ts` (reuse; extend only in new
  `test/helpers/lgraph-site-*.ts` files).

## Task

One case per `unreached.md` "Every untaken branch" row whose category is S1–S7, S9, S10, or J in the files below,
reading the values from the matching `layered-sites.json` row(s) (groups S1–S7, S9, S10, S16–S18, and the
`site/strings/*` rows of S19 for `LGraph`, `LLabel`, `LGraphElement`, `LNode`, `LPort`, `LEdge`). Each case builds the
scenario with the TS API (not through the replay helper), asserts the row's values as literals, and carries
`// oracle: <row id>; <Java file:line>`. A row value that is `{ exception }` becomes a `toThrow` on the Java-chain error
class and message.

Files (add cases only): `S/graph/{LGraphUtil,LGraphUtilLayers,LGraphUtilGraphProperties,LGraphUtilPorts,
LGraphUtilExternalPorts,LGraphUtilOther,LNode,LEdge,LPort,LGraph,LLabel,LGraphElement,Tarjan,LGraphAdapters}.test.ts`.
The U branches (`unreached.md` § Unreachable) stay untested.

## Write-set

The test files listed above (new cases only; existing cases untouched), new files `test/helpers/lgraph-site-*.ts`.
Not `S/graph/transform/**`, not `LNodeNodeType.test.ts`, not the two vectors tests, not `src/**` non-test files.

## Read-set

`plans/layered-framework/unreached.md`, the JSON rows of your groups, the T10 recorder header (ops and expected
shapes), the Java lines each `unreached.md` row cites under
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/`.

## Quality bar

`npx vitest run src/alg/layered/graph`, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`,
`npx vitest run test/architecture`. Then `npx vitest run --coverage --coverage.include='src/alg/layered/graph/**'
--coverage.exclude='**/*.test.ts' --coverage.exclude='src/alg/layered/graph/transform/**' src/alg/layered/graph`
and report per-file branch % — the batch gate needs ≥ 90 % per non-staged class. Never `npm run coverage`, never commit.

## Acceptance criteria

- Given every S1–S7, S9, S10, S16–S18 and listed S19 row, then one colocated case asserts its values with the row id.
- Given the coverage run above, then every listed file is ≥ 90 % branches or its remainder is in the U list.
- Given `git diff`, then no existing assertion changed and no file outside the write-set changed.

## Hand-back

Return only: files written, case counts per file, per-file branch %, divergences with diagnosis, journal row text.
