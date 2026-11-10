<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `loops/routing` core: `RoutingDirector`, `RoutingSlotAssigner`, `LabelPlacer`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port self-loop routing direction, slots and labels`
Scratch: `$TMPDIR/7g/T10/`.

## Context

W1, W6, W8, W14. `J/intermediate/loops/routing/{RoutingDirector (357), RoutingSlotAssigner (433), LabelPlacer (403)}.java`.
`RoutingSlotAssigner` draws from `InternalProperties.RANDOM` (`:64`, the one draw site of the mission; stop 6) through the
landed orthogonal `HyperEdgeSegment`/cycle detection. Hashed containers (W6): `slLoopToSegmentMap`, `slLoopActivityOverPorts`
(`:161,171`, looked up), `slotsWithLabelConflicts` (`HashSet<Integer>`, `:403-412`, membership).

## Task

1. Port `JT/intermediate/loops/routing/RoutingDirectorTest.java` (1 run) **first** to
   `src/alg/layered/intermediate/loops/routing/RoutingDirectorTest.test.ts`, Java literals unchanged (the Java reads private
   fields by reflection, `java.lang.reflect.Field`; the TS reads the same fields through a typed cast, journaled).
2. Port the three classes; `@see` on every symbol.

## Write-set

`src/alg/layered/intermediate/loops/routing/{RoutingDirector,RoutingSlotAssigner,LabelPlacer}.ts` (plus sections), their tests,
`RoutingDirectorTest.test.ts`.

## Read-set

The three Java files and the test, T5's classes, `src/alg/layered/p5edges/orthogonal/HyperEdgeSegment*.ts`,
`HyperEdgeCycleDetector.ts`, `decisions.md` W6, W8.

## Acceptance criteria

- Given `RoutingDirectorTest`, when run, then it passes with the Java's assertions unchanged.
- Given `RoutingSlotAssigner`, when it needs randomness, then it reads only `InternalProperties.RANDOM` and passes it to the landed
  cycle detection unchanged; T16's self-loop rows prove the draw sequence (a mismatch there is diagnosed at this class first).
- Given each hashed container, when audited, then the journal holds an `ad10` row.

## Observability / Rollback

N/A. Reversible.
