<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: spore (eclipse-elk/elk#1242, #1244)

**Agent:** typescript-pro (sonnet), or the orchestrator. **Decisions:** D3, D4, D5.5, D9.

## Context

`plugins/org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ElkGraphImporter.java` at `8bca22f4` makes four
changes:

- a `Random random` field;
- in `importGraph`, `randomSeed = elkGraph.getProperty(SporeCompactionOptions.RANDOM_SEED)`, with `0` giving
  `new Random()` and any other value `new Random(randomSeed)`, placed after `spacingNodeNode` and before the cost-function
  switch;
- in the node loop, `shiftUntilUnique(vertex, nodeMap)` in place of the `Math.random()` loop;
- in `updateGraph`, a centre already in `updatedNodeMap` is shifted with `shiftUntilUnique`, and the node is translated
  by the shift (`n.translate(center.clone().sub(oldCenter))`) before `originalVertex` is set.

The new private `shiftUntilUnique` draws `random.nextDouble()` twice per step.

The port sites are `src/alg/spore/ElkGraphImporter.ts`: the `JITTER_*` constants `:31-34`, the class doc `:45`, the fields
`:48-58`, `createNodes` `:192-221` and `updateGraph` `:257-271`. `Node.translate` exists
(`src/alg/common/spore/Node.ts:39`). The vector-proven shim is `src/java/util/Random.ts`; its unseeded constructor is
the `new Random()` case. T1 generated `SporeCompactionOptions.RANDOM_SEED`.

## Task

1. Port `test/org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test/RandomSeedTest.java` (new, 6 tests) as
   `src/alg/spore/RandomSeedTest.test.ts`, and the `ScanlineOverlapRemovalTest.java` delta (+25) into
   `src/alg/spore/ScanlineOverlapRemovalTest.test.ts`. Run them: `defaultSeedIsOne`, `seedSelectsTheShift` and the
   reproducibility tests must fail or flicker before the port. Journal which ones.
2. Port the four changes above. Keep method boundaries (`shiftUntilUnique` is its own private method), the comments
   verbatim, and `unboxInteger` for the `int` read, as the bundle's other ports do. Rename the `JITTER_*` constant doc
   from `Math.random()` to `random.nextDouble()`. Update the PK4 wording in the class doc. `Math.random` is not tracked by
   `test/architecture/math-call-sites.json` (transcendental functions only), so that file does not change.
3. Run `src/alg/spore`, `test/helpers/spore-*.test.ts` and `test/architecture`. The re-recorded `spore-layout.json` rows
   (the `jitter` `runsAgree`, the D4 row moved by the scanline fix, any row that reaches the new `updateGraph` shift) must
   go green through the port. The two PK4 jitter blocks change under D5.7 only. Other changes to TS replay assertions
   are allowed only under D4/D5.5. List each one in the hand-back.
4. Renumber `ElkGraphImporter.java:N` references in `src/alg/spore/**`, `test/helpers/spore-*` and
   `tools/vectors/SporeLayoutVectors.java` comments, unless T3 already did those (D9; check with `git diff`).

## Write-set

`src/alg/spore/**`; `test/helpers/spore-*.ts`; `tools/vectors/SporeLayoutVectors.java` (comment line references only,
if T3 left them).

## Read-set

`git -C ../elk diff e7eaea57 8bca22f4 -- plugins/org.eclipse.elk.alg.spore test/org.eclipse.elk.alg.spore.test`;
`docs/architecture/alg-packing.md` §§ 3.2, 4; `src/java/util/Random.ts:30-60`.

## Acceptance criteria

- Given the ported `RandomSeedTest`, when it runs after the port, then all six tests pass on five repeated suite runs.
- Given `spore-layout.json` at `8bca22f4`, when `SporeLayoutVectors.test.ts` and `ElkGraphImporter.test.ts` run, then
  every row passes at the AD-4 bar. The `jitter` rows assert `runsAgree: true`, as recorded.
- Given the port, when `git grep -n 'Math.random' -- src/alg/spore` runs, then it prints only comments that name the
  old Java. `npx vitest run test/architecture` passes.
- Given the two PK4 jitter blocks after D5.7, when they run three times, then they see one distinct dump per row.

## Interface contracts

Input from T1: `SporeCompactionOptions.RANDOM_SEED`. Output for T7: a deterministic port for the newly comparable
corpus cases.

## Observability / rollback

N/A: no new observable operations. Reversible.
