<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `HierarchicalPortOrthogonalEdgeRouter`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the hierarchical port orthogonal edge router`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T6/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal;
a hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line;
everything else stays verbatim.

## Context

Mission 7f, F1. `J/intermediate/HierarchicalPortOrthogonalEdgeRouter.java` (871 lines) runs after P5 under ORTHOGONAL on external-port
levels (`J/p5edges/OrthogonalEdgeRouter.java:~138`), so it is a default-path class for most ptolemy levels. The landed
`NorthToSouth`/`SouthToNorth` routing direction strategies run only from here (`p5edges/orthogonal/direction`).

## Task

1. `src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter.ts` facade with `process` (`:101`) and sections for
   `restoreNorthSouthDummies` … `connectNodeToDummy` (`:160-282`), the dummy coordinates and ordering group
   (`setNorthSouthDummyCoordinates` … `assignAscendingCoordinates`, `:283-513`), `routeEdges` (`:~515-597`),
   `removeTemporaryNorthSouthDummies` (`:598-703`), `fixCoordinates` (`:704-818`) and `correctSlantedEdgeSegments` (`:819-871`).
   The two anonymous comparators (`:424`, `:449`) stay comparators with `DoubleCompare`-compatible semantics; `LinkedHashSet` →
   `Set` (`:515-518`). Unboxing nullable properties gets the explicit check (F11).
2. Replay `scenarios/HierarchicalPortOrthogonalEdgeRouter/*` and `models/*/HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER/*` with the class
   injected; report coverage of the landed `NorthToSouth`/`SouthToNorth` strategies.

## Write-set

`src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter*.ts` and their tests.

## Read-set

`J/intermediate/HierarchicalPortOrthogonalEdgeRouter.java`, `src/alg/layered/p5edges/orthogonal/**` (the API it calls, read only),
`src/alg/layered/intermediate/HierarchicalPortConstraintProcessor.ts` (the N/S dummy properties), `docs/translation-rules.md`,
`test/helpers/layered-pipeline-replay-*.ts`, `decisions.md` F1, F11, F16.

## Interface contract (consumed by T8)

`new HierarchicalPortOrthogonalEdgeRouter()`, `process(graph, monitor)`.

## Acceptance criteria

- Given an external-port scenario for each side and each `PortConstraints` value, when replayed, then node, port and edge geometry equal the row within 1e-6.
- Given the rows, when run with coverage, then `NorthToSouth`/`SouthToNorth` run from this class (the 7e hand-off), or the gap is reported for T13.
- Given `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A — no new observable operations. Reversible.
