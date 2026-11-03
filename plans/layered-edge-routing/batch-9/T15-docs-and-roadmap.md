<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Docs, roadmap, notes, summary

**Agent:** main session · **Commit:** `docs(T15): record mission 7e, its plan and follow-ups`

## Context

Mission 7e (README). 7d's T13 is the pattern (`docs/architecture/alg-layered-placement.md` 171 lines,
`docs/conformance.md` § "alg.layered, part d" at `:1116`, `plans/roadmap.md` § Revision 2026-11-02 at `:816`, the README
summary); every document is append-or-extend, never rewrite. `docs/architecture/alg-layered.md` is at 469 lines, so
part e goes to the sibling `docs/architecture/alg-layered-routing.md` with a one-line pointer from § 1's document
table and a `## 11. Part e` stub in `alg-layered.md` (the 7c T13 rule).

## Task

1. `docs/architecture/alg-layered-routing.md` (part e: edge routing, mission 7e): package map (TS paths, section and
   prefixed files, the enum `create` section), the six processors and why (R1), rows, the routing geometry and the
   two refs (R2, R3, `calls`), the recursion rewrite (R8: `dfs`), the Java idioms reproduced (R6: `float xpos`, boxed
   double streams, the formatter; R7: the shared `Random`; R9: the containers and the `Pair` set verdict), evidence
   (row counts equal to both `rowCounts`, the three invariants, the sweep counts and timings, coverage, the Java
   baseline), runbook (`tools/vectors/layered-routing-vectors.sh test/golden/refs/java`, `tools/oracle/routing-sweep.sh
   [--force]`, `ROUTING_SWEEP_STRIDE=1 npx vitest run test/corpus/routing-sweep.test.ts`, `java -cp <classpath>
   tools/vectors/LayeredRoutingVectors.java --dump <case id> $ELK_MODELS_DIR <outDir>`, the `java-tests.sh` line
   with the three classes), and the failure table (geometry diff beyond 1e-6; a refusal outside R1's categories; the
   entry-point temporal dead zone; `MODELS_REPO` absent; a cap exceeded).
2. `docs/conformance.md`: section `## alg.layered, part e: edge routing (mission 7e) {#alg-layered-routing}` before
   `## Temporary gaps` with counts equal to `rowCounts`, the Java baseline (three suites, start and end, `MODELS_REPO`
   set), the invariants, the sweep, the anchored cases and coverage, the untouched landed files; the index row after
   the 7d row: `| -   | [alg.layered edge routing](#alg-layered-routing) | How is the fifth phase (7e) proven? |`.
3. `docs/architecture/overview.md`: the 7e sentence after the 7d one in "What elk-engine is" and the document table
   row for `alg-layered-routing.md`.
4. `plans/roadmap.md` § `## Revision <date> (layered-edge-routing)`, append-only: row 7e done with the evidence line;
   the scope moves (R1, binding for 7f–7h: the six processors in 7e; `HierarchicalPortOrthogonalEdgeRouter`,
   `HypernodesProcessor`, `ConstraintsPostprocessor`, `EndLabelSorter`, `HierarchicalNodeResizer` 7f); the tally
   `7b 10 / 7c 10 / 7d 5 / 7e 6 / 7f 19 / 7g 9`; hand-offs (7f: `ElkLayered`, `GraphConfigurator`, the full-layout
   issue tests `Issue587/680/682`, `DotDebugUtil`/`JsonDebugUtil`; 7g: `NorthSouthPortPostprocessor.processSelfLoop`,
   the self-loop spline router over `NubsSelfLoop`; the `layered-placement.json` cap flag unchanged; any R9 verdict).
5. `.agent-notes/layered-edge-routing.md`: the session's observations in the memory-rule template (factual only).
6. README "Mission summary": tasks, exit evidence, decisions taken during the run, divergences fixed at origin, gates,
   flags for the user, follow-ups pointer. `npm run docs:build` green; `npm run format:check` clean.

## Write-set

`docs/architecture/alg-layered-routing.md`, `docs/architecture/alg-layered.md`, `docs/conformance.md`,
`docs/architecture/overview.md`, `plans/roadmap.md`, `.agent-notes/layered-edge-routing.md`,
`plans/layered-edge-routing/README.md`.

## Read-set

`docs/architecture/alg-layered-placement.md` (pattern), `docs/conformance.md:1116-1190`, `plans/roadmap.md:816-`,
`plans/layered-node-placement/batch-7/T13-docs-and-roadmap.md`, `decision-journal.md` (this mission), `unreached.md`.

## Architecture decisions

All of R1–R14 are summarised, none changed.

## Acceptance criteria

- Given `npm run docs:build` and `npm run format:check`, when run, then green.
- Given the roadmap diff, when inspected, then added lines only.
- Given the conformance counts, when compared with both `rowCounts` and the sweep output, then equal.

## Observability / Rollback

N/A. Reversible.
