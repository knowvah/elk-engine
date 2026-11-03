<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14a — Anchored unit tests: orthogonal, polyline, the five processors

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T14a): anchor orthogonal and polyline tests on oracle routing rows`

## Context

Mission 7e (README), R12, R14, L4/X5, 6c D1. T11's `unreached.md` (with the T13 corrections) lists every branch of
these classes the replays leave untaken; T13 recorded `sites/*` and `calls/*` rows per S scenario. Each colocated
test gains cases whose literals equal a row, with `// oracle: <row id>; <Java file:line>`; J items get structural
cases from the Java (constants, exception classes and messages, enum ordinals, the `dfs` loop arms); U items get
nothing. The generic replay (T10) stays the authority. 7d's T12a/T12b are the pattern
(`plans/layered-node-placement/batch-6/`, `src/alg/layered/p4nodes/bk/BKNodePlacer.sites.test.ts:1-40`).

## Task

1. For every S and J item of `unreached.md` in this task's files: load the row through T3's `loadRoutingRows`, run
   it with the class injected (`runSteps` or `runCall` with a factories/callers object local to the file; T10's may
   be copied, `test/helpers/` is outside the write-set), assert the fields the branch decides with literals copied
   from the row (`geometry.edges[path].bendPoints`/`junctionPoints`, `geometry.nodes[path].pos[0]`, `geometry.graph`,
   `layers`, `changed`, or a `calls` result; hex doubles decoded with `decodeHex`), one case per row, existing cases
   untouched. Where a case would only duplicate the generic replay, assert the specific field the branch decides
   (7a T11 rule). Coordinates compare at AD-4 (`toBeCloseTo(…, 6)` or the helper's comparator), everything else
   exactly. A `.sites.test.ts` file per class is fine when the colocated test is long.
2. No `src/` non-test edit; a literal that disagrees with the port is a stop with the diagnosis artifact (mechanism,
   origin `file:line`, causal chain, ruled out).
3. Mutation check in a scratch copy for at least three anchored branches (flip the branch, the case must fail); report.
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/p5edges/orthogonal/**/*.test.ts`, `src/alg/layered/p5edges/{OrthogonalEdgeRouter,PolylineEdgeRouter*}.test.ts`,
`src/alg/layered/intermediate/{HyperedgeDummyMerger*,HierarchicalPortPositionProcessor,LayerSizeAndGraphHeightCalculator,
LongEdgeJoiner,NorthSouthPortPostprocessor}.test.ts`.

## Read-set

`plans/layered-edge-routing/unreached.md`, the rows by id in `layered-routing-steps.json`, the Java per branch,
`src/alg/layered/p4nodes/bk/BKNodePlacer.sites.test.ts` (pattern), `test/helpers/layered-routing-replay-*.ts`,
`test/helpers/layered-framework-replay.ts:156` (`decodeHex`), `decisions.md` R12, R14.

## Architecture decisions

R12, R14 (L4), 6c D1 (literals equal a row), X5.

## Acceptance criteria

- Given every S row of this task's classes, when its anchored case runs, then it passes and cites the row and the
  Java line.
- Given the mutation check, when a branch is flipped, then its case fails.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
