<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Replay-alone coverage map

**Agent:** main session · **Commit:** `docs(T9): map node-placement branches unreached by the replays`

## Context

Mission 7d (README), N11, L4 under X5. 7c's `plans/layered-crossing-min/unreached.md` (with its T11/T12
corrections) is the precedent and format; 7c's T9 brief (`plans/layered-crossing-min/batch-6/T9-coverage-map.md`)
is the procedure. The classes measured are the 7d set only: `src/alg/layered/p4nodes/**` (section and prefixed
files included) and the five processors `src/alg/layered/intermediate/{InnermostNodeMarginCalculator,
LabelAndNodeSizeProcessor,InLayerConstraintProcessor,HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.ts`.

## Task

1. Run, alone, with the log kept outside the reports directory (vitest clears it) and the load recorded:
   `npx vitest run --coverage --coverage.include='src/alg/layered/{p4nodes,intermediate}/**'
   --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text
   --coverage.reportsDirectory=<scratch>/T9 src/alg/layered/LayeredPlacementVectors.test.ts`; keep only the 7d
   classes from the `intermediate` directory (the 7b/7c processors, the staged `DebugUtil` and the enums' throwing
   arms are X).
2. Classify every untaken branch and uncovered function: **S** (a step scenario: graph, steps, expected shape, the
   geometry field it decides), **J** (structural, Java-derived, unit-tested from the Java), **U** (unreachable through
   7d: label dummies and label processors 7f, nested graphs 7h, the before-P5 processors
   `HIERARCHICAL_PORT_POSITION_PROCESSOR`/`LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` 7e, dead by construction with the
   Java line), **X** (throwing arms, staged members). Per 7c's `.agent-notes/layered-crossing-min.md:296` a per-row run
   (`-t '<row id>'`) attributes an arm to a row in about 5 s when a classification needs it.
3. Write `unreached.md` in 7c's layout (per-class table, the S list with stable ids `sites/<Class>/<name>`, the J
   list, the U list with mechanisms, totals). Stop 9 above about 25 S scenarios.

## Write-set

`plans/layered-node-placement/unreached.md`.

## Read-set

`plans/layered-crossing-min/unreached.md` (format), `plans/layered-crossing-min/batch-6/T9-coverage-map.md`, the
coverage output, the 7d sources and the Java per branch (`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/{p4nodes,intermediate}`).

## Architecture decisions relevant

N11 (U categories), N6 (a twin's loop arms are J, never S), N8 (`DebugUtil` and the logging branches: the
`monitor.isLoggingEnabled()` arms of BK are J, covered by T6's logging-monitor case; the `DebugUtil` call in
`LinearSegmentsNodePlacer` is X).

## Interface contract (consumed by T11, T12a, T12b)

Each S scenario has a stable id `sites/<Class>/<name>` (rows append `/<variant>`), an inline graph description, a
step list in the recorder's op vocabulary (T1 header), and the `expected` fields (`layers`, `ports`, `changed`,
`geometry.nodes[path]`, `geometry.layers`) T12 asserts. Each J item names the Java line and the TS test file that
owns it (T12a or T12b by directory).

## Acceptance criteria

- Given the run, when the table is written, then every untaken branch and uncovered function appears exactly once
  under S, J, U or X.
- Given the S list, when counted, then ≤ 25 scenarios or stop 9.
- Given every U item, when read, then it names its category and, for dead-by-construction, the Java line.

## Observability / Rollback

N/A. Reversible.
