<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12b — Anchored unit tests: Brandes-Köpf

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12b): anchor brandes-koepf tests on oracle placement rows`

## Context

Mission 7d (README), N11, L4/X5, 6c D1. As T12a, for `src/alg/layered/p4nodes/bk/**`: `BKNodePlacer*`, `BKAligner`,
`BKCompactor*`, `BKAlignedLayout*`, `ThresholdStrategy*`, `NeighborhoodInformation`, `ICompactor`. The BK rows span
the 12 straightening-by-alignment variants on the variant set (N2) and the `sites/BK*/…` rows T11 recorded; the
`placeBlock` twin (T6) is J.

## Task

1. For every S and J item of `unreached.md` in the `bk/` files: load the row through T3's `loadPlacementRows`, run
   it with `BKNodePlacer` injected (a factories object local to the file), assert the fields the branch decides with
   literals copied from the row (`geometry.nodes[path]`, `layers`, `changed`; `decodeHex` for hex doubles;
   coordinates at AD-4, else exact), `// oracle: <row id>; <Java file:line>`, one case per row, existing cases
   untouched. Threshold, alignment-direction and class-shift branches are asserted through the chosen layout's node
   positions, the field BK writes (`BKNodePlacer.java:272`), never through private state the Java test could not see.
2. No `src/` non-test edit; a literal that disagrees with the port is a stop with the diagnosis artifact.
3. Directory coverage run (`--coverage.include='src/alg/layered/p4nodes/bk/**'` plus
   `LayeredPlacementVectors.test.ts`): report the branch percentage per class and the U items behind any shortfall.

## Write-set

`src/alg/layered/p4nodes/bk/*.test.ts` (new cases only; existing cases untouched).

## Read-set

`plans/layered-node-placement/unreached.md`, the rows named (read from the JSON by script into `<scratch>/T12b`),
`test/helpers/layered-placement-replay-*.ts`, `test/helpers/layered-framework-replay.ts` (`decodeHex`),
`src/alg/layered/LayeredPlacementVectors.test.ts` (factories), the Java lines cited
(`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/*.java`),
`decisions.md` N3, N6, N7, N11.

## Architecture decisions relevant

N3 (AD-4 on coordinates), N6 (`placeBlock` twin arms are J), N7 (`sinkNodes` iteration order is insertion order:
a case may pin it only through the positions it yields, with the row as the literal), N11.

## Interface contract

None consumed downstream; T13 reads the hand-back's per-class coverage table.

## Acceptance criteria

- Given every S row for the `bk/` files, when the suite runs, then a case cites it and passes.
- Given the directory coverage run, when read, then ≥ 90 % branches per class, the U list excepted.
- Given `git diff --stat`, when inspected, then only `src/alg/layered/p4nodes/bk/*.test.ts` changed.

## Observability / Rollback

N/A. Reversible.
