<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: north/south routing strategies (arms 1-6)

## Context

`NorthToSouthRoutingStrategy` and `SouthToNorthRoutingStrategy` run only from `HierarchicalPortOrthogonalEdgeRouter`.
It routes the hyper edges between the north/south external-port dummies of a graph and its first or last layer. Three
arms are open in each file:

- the dummy-segment return (`:38 if[0]`);
- the straight-edge skip (`:58 if[1]`);
- the split-partner bend points (`:78 if[0]`).

The fourth arm of the 7g hand-off (`:54 if[1]`) is reached by `sites/OrthogonalEdgeRouter/extPortSelfLoop/*`. Guards,
Java lines and leads: [arms.md](../arms.md) § North/south.

## Method (D4: proof first, then construct)

1. Write each guard's full precondition from the Java:
   - `NorthToSouthRoutingStrategy.java:45-92`;
   - `OrthogonalRoutingGenerator.java:176,408,452-464` (when a segment is split, and the dummy and split partner it
     creates);
   - `HierarchicalPortOrthogonalEdgeRouter.java` (which graphs reach the strategies; how the external dummies get
     their x).
2. Arms 1-2 and 5-6 come from one split. Build two hyper edge segments in a critical conflict:
   - Solve the dependency weights of the conflict from the Java (a crossing both ways) for two or three north
     external ports and their targets.
   - Set the port positions with `FIXED_POS` on the compound node, the parent's port constraints, or explicit
     node positions, as the Java needs.
   - Confirm with an instrumented copy of `OrthogonalRoutingGenerator.java` (D2) that logs splits, and with
     `calculateBendPoints` arguments logged in the strategy copies.
3. Arms 3-4: run the candidate once on the oracle, read the target anchor x from a probe, set the source port x to it
   (or within 1e-3) with `FIXED_POS`, and run again. Do not scan.
4. Screen each candidate in TS (a pseudo-row through the compound site replay, with coverage of the arm), then
   confirm it on the oracle. Keep the smallest graph per arm.

## Deliverable (report to the orchestrator)

For each of arms 1-6:

- the outcome (D3);
- the inline ELK JSON of the compound `run` row (D1), or the proof (Java lines and the invariant);
- for outcome 4, what was tried and the closest approach, meaning which conjunct failed and by how much;
- the oracle probe output (the instrumented log lines) and the TS screen result.

Commit-ready files go in `tools/arm-search/north-south/`: the generator or solver that produced each row, and the
instrumentation patches it used.

## Write-set

`tools/arm-search/north-south/**`, `$TMPDIR/layered-arm-search/north-south/`.

## Read-set

The Java files above; `src/alg/layered/p5edges/orthogonal/**` (read only);
`tools/vectors/LayeredCompoundVectors.java:2860-2906` (the `SITE_n` inputs and `SITE_ROWS`);
`src/alg/layered/LayeredCompoundSites.test.ts`; `.agent-notes/layered-loops-evidence.md` (tolerances, restored
external dummies).

## Acceptance criteria

- Given each of arms 1-6, when the task ends, then the report gives exactly one outcome with its evidence.
- Given a claimed outcome-1 input, when the orchestrator runs it on the oracle and in TS, then the arm is taken on
  both sides.
- Given the 4 h budget, when it runs out, then every arm without a row or proof is reported as outcome 4 with its
  closest approach.

## Observability

N/A. Search logs stay in scratch, and the report quotes them.

## Rollback

Reversible: new tool files only.
