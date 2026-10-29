<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Replay foundation (rows, normalise, phase dump, step ops, compare)

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3): add the layered phase replay helpers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7b (README), B2, B4. Batch 2's per-class tests and T8's generic replay need one TS twin of T1's row format:
load a row, import its input with the 7a transform, mirror the configurator's property normalisation, run steps or a
prefix with **injected** factories (so a single class can be tested before the enum arms are wired), compute the
phase dump against the import state and compare at the AD-4 bar. Reuse, never edit, the 7a helpers:
`test/helpers/layered-framework-replay.ts` (`dumpLGraph`), `layered-site-replay-{args,compare,context,dump}.ts`
(C4 decode, `Ctx`, paths, tolerance compare).

## Task

1. `test/helpers/layered-phase-replay-rows.ts`: `loadRows(file)` → typed `PhaseRow[]`; input loading for `{ path,
   sha256 }` (JSON via `ElkGraphJson`, `.elkt` via the 4b text port; verify the hash) and `{ elk }`; `applyOptions(root,
   options)` through the metadata service; `importTarget(root, target)` as 7a's replay does.
2. `layered-phase-replay-normalise.ts`: `normalise(graph)` mirroring `GraphConfigurator.configureGraphProperties`
   and `copyPortContraints` (`J/GraphConfigurator.java:96-165`), one cited Java line per statement; seed 0 throws
   (B4). Uses `src/java/util/Random.ts`, `LGraphUtil.getDirection`, `Spacings`.
3. `layered-phase-replay-dump.ts`: `phaseDump(graph, importDump)` → B2 `Expected` (positional paths from the 7a
   `assignPaths`; `new/p<k>`, `new/e<k>` for elements absent from the import dump, in creation order; `changed` by C4
   value against the import dump, ignoring `processors`, `random`, `spacings`).
4. `layered-phase-replay-ops.ts`: `runSteps(row, factories)` and `runPrefix(row, factories)` with
   `factories = { createProcessor(name), createPhase(phase, strategy) }`; ops `importGraph`, `normalise`,
   `setProperty`, `layers`, `reverseEdge`, `runProcessor`, `runPhase`, `dump` with the Java argument shapes from
   T1's header; unknown op → error naming it.
5. `layered-phase-replay-compare.ts`: `compareExpected(actual, expected)` → diff list (AD-4, 1e-6 on hex doubles),
   and `compareFullDump` delegating to the 7a comparer when `expected.dump` is present.
6. Tests (structural only, L4): a vendored model imported, normalised and dumped with no steps has `changed: []`,
   `layers: []`, every edge `reversed: false`, and `RANDOM` is a `Random` seeded 1; `runSteps` with a fake processor
   that reverses one edge reports it; seed 0 throws; a `.elkt` input loads; an unknown op throws.

## Write-set

`test/helpers/layered-phase-replay-{rows,normalise,dump,ops,compare}.ts` and their `.test.ts`.

## Read-set

`test/helpers/{layered-framework-replay,layered-site-replay,layered-site-replay-args,layered-site-replay-compare,layered-site-replay-context,layered-site-replay-dump}.ts`,
`src/alg/layered/graph/transform/ElkGraphTransformer.ts`, `src/alg/layered/graph/{LGraph,LGraphUtil,Layer,LEdge}.ts`,
`src/alg/layered/options/{Spacings,InternalProperties,LayeredOptions}.ts`, `src/java/util/Random.ts`,
`J/GraphConfigurator.java:96-165`, `batch-1/T1-phase-recorder.md` § Interface contract, `decisions.md` B2, B4.

## Interface contract (consumed by T4–T8, T10–T12)

```ts
loadRows(file: string): PhaseRow[]
importRow(row): { graph: LGraph; importDump: LGraphDump }
normalise(graph: LGraph): void
runSteps(row, f: Factories): LGraph; runPrefix(row, f: Factories): LGraph
phaseDump(graph, importDump): Expected
compareExpected(actual: Expected, expected: Expected): Diff[]   // [] means equal
```

## Acceptance criteria

- Given a vendored model row input, when imported, normalised and dumped, then `changed` is empty and every edge is
  unreversed.
- Given a fake processor factory, when `runSteps` runs `runProcessor`, then the dump shows its effect.
- Given a row with seed 0, when `normalise` runs, then it throws.
- Given `npm run typecheck` and prettier, when run, then clean.

## Observability / Rollback

N/A. Reversible.
