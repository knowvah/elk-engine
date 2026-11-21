<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: port alignment and N/S border offsets through whole layered layouts

## Context

No whole-layout layered row sets `org.eclipse.elk.portAlignment.*`; only `full/options/port-border-offset/external-ports-{0,5,-5}`
set `org.eclipse.elk.port.borderOffset` (`tools/vectors/LayeredPipelineVectors.java:2519-2552`). Layered sizes nodes in
`LabelAndNodeSizeProcessor` through `NodeDimensionCalculation`, which places ports with `PortPlacementCalculator`
(`src/alg/common/nodespacing/internal/algorithm/PortPlacementCalculator.ts`: border offset `:148-151`, `:259-262`;
`centerSinglePort` `:280-290`; DISTRIBUTED `:304`, `:319`; `alignPorts` `:334-365`). Shape and matrix:
[D4](../decisions.md#d4).

## Task

1. In `LayeredPipelineVectors.java`, add `scenarios/PortAlignment/*` and `scenarios/PortBorderOffset/*` with
   `sc(cls, name, family, elk, target, null)` (`:2621-2632`), whole plan plus dump. Graph: a small layered graph (3-5
   nodes) whose node under test has fixed size (`nodeSize.constraints` empty, size larger than its ports need),
   FIXED_SIDE, two ports per side, edges so every side's ports are connected. Matrix per D4 (~35 rows): default
   alignment × 5 values; per-side `.north/.south/.east/.west` × BEGIN, END, JUSTIFIED; single-port side × JUSTIFIED,
   DISTRIBUTED; N/S ports of a regular node with `port.borderOffset` +5 and −5, alone and with BEGIN and END. Register the
   family in `FAMILIES` as the recorder requires. Keep the recorder under 5,000 lines and the ref under 16 MiB.
2. Regenerate: `tools/vectors/layered-pipeline-vectors.sh "$TMPDIR/layered-evidence-gaps/T4/out"` (detached,
   `nice -n 10`), copy over `test/golden/refs/java/layered-pipeline.json`, run the D5 diff (base rows equal, only the new
   ids, `rowCounts.scenarios` +N).
3. Sanity-check the evidence: port positions differ across the five default-alignment rows (otherwise the node is not
   fixed-size enough; adjust and rerun), and the border-offset rows move N/S ports relative to the zero-offset row.
4. Run `npx vitest run src/alg/layered/LayeredPipelineVectors.test.ts src/alg/layered/LayeredPipelineReplay.test.ts` and
   any test that cross-checks `scenarios/*` ids (`CROSS`). Grow inventories under D6 only.
5. Journal: row ids, the matrix, runtime, and which `PortPlacementCalculator` arms the new rows cover (from the
   coverage report of the task's tests) that no layered row covered before.

## Write-set

`tools/vectors/LayeredPipelineVectors.java`, `test/golden/refs/java/layered-pipeline.json` (by script only), and an
inventory test only if one pins scenario ids. Scratch `$TMPDIR/layered-evidence-gaps/T4/`.

## Read-set

`LayeredPipelineVectors.java:1-70`, `:2240-2260`, `:2500-2560`, `:2600-2650`; `tools/vectors/layered-pipeline-vectors.sh`;
`src/alg/layered/LayeredPipelineVectors.test.ts:1-120`; `PortPlacementCalculator.ts:140-160, :250-370`;
`plans/layered-pipeline/README.md:165-180`.

## Acceptance criteria

- Given the regenerated ref, when diffed by id against the base, then only `scenarios/PortAlignment/*`,
  `scenarios/PortBorderOffset/*` and `rowCounts` differ.
- Given the five `portAlignment.default` rows, when their dumps are compared, then the node under test's port positions
  differ between BEGIN, CENTER, END and JUSTIFIED.
- Given the TS replay, when the pipeline tests run, then every new row matches at the AD-4 bar.
- Given a row with `port.borderOffset` −5 on a north port, when replayed, then it matches the oracle (the negative north
  branch `:150`).

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the recorder and the ref.
