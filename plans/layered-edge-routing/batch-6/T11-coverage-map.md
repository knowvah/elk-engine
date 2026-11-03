<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Replay-alone coverage map

**Agent:** main session · **Commit:** `docs(T11): map edge-routing branches unreached by the replays`

## Context

Mission 7e (README), R12, L4 under X5. 7d's `plans/layered-node-placement/unreached.md` (with its T11/T12 corrections)
is the precedent and format; 7d's T9 brief (`plans/layered-node-placement/batch-4/T9-coverage-map.md`) is the
procedure. The classes measured are the 7e set only: `src/alg/layered/p5edges/**` (section and prefixed files
included) and the six processors `src/alg/layered/intermediate/{HyperedgeDummyMerger*,HierarchicalPortPositionProcessor,
LayerSizeAndGraphHeightCalculator,LongEdgeJoiner,NorthSouthPortPostprocessor,FinalSplineBendpointsCalculator*}.ts`.

## Task

1. Run, alone, with the log kept outside the reports directory (vitest clears it) and the load recorded:
   `npx vitest run --coverage --coverage.include='src/alg/layered/{p5edges,intermediate}/**'
   --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text
   --coverage.reportsDirectory=<scratch>/T11 src/alg/layered/LayeredRoutingVectors.test.ts`; keep only the 7e
   classes (the 7b/7c/7d processors, the staged `DebugUtil` and the enums' throwing arms are X).
2. Classify every untaken branch and uncovered function: **S** (a step or call scenario: graph or arguments, steps,
   expected shape, the geometry field it decides), **J** (structural, Java-derived, unit-tested from the Java), **U**
   (unreachable through 7e: labels and comments 7f, self loops/wrapping/compaction 7g, nested graphs 7h, the
   hierarchical orthogonal router 7f, `NorthSouthPortPostprocessor.processSelfLoop` 7g, dead by construction with the
   Java line), **X** (throwing arms, staged members). Per-row runs (`-t '<row id>'`) attribute an arm to a row in
   about 5 s when a classification needs it. Say which S items are `calls` scenarios (pure geometry) and which are
   step scenarios.
3. Write `unreached.md` in 7d's layout (per-class table, the S list with stable ids `sites/<Class>/<name>` or
   `calls/<Class>/<name>`, the J list, the U list with mechanisms, totals). Stop 9 above about 30 S scenarios.

## Write-set

`plans/layered-edge-routing/unreached.md`.

## Read-set

`plans/layered-node-placement/unreached.md` and `batch-4/T9-coverage-map.md` (format and procedure), the 7e source
files, the Java per branch, `decisions.md` R12, `.agent-notes/layered-crossing-min.md` (per-row coverage).

## Architecture decisions

R12 (categories; `calls` for pure-geometry branches), L4, X5.

## Interface contract (consumed by T13, T14)

`unreached.md`: one row per S scenario with its id, graph or arguments, steps, expected shape and the field it
decides; one row per J item with the structural case; one row per U item with the mechanism and Java line.

## Acceptance criteria

- Given the coverage run, when filtered to the 7e classes, then every untaken branch and uncovered function appears
  exactly once in the S, J, U or X lists (a script in the scratchpad checks the partition).
- Given the S list, when counted, then at most about 30 scenarios (else stop 9).

## Observability / Rollback

N/A (a document). Reversible.
