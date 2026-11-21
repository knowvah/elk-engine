<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: the three Medium splitter arms

## Context

`src/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitter.ts` (Java `…/p5edges/orthogonal/HyperEdgeSegmentSplitter.java`):

| Arm | TS / Java | Condition (untaken branch) |
| --- | --------- | -------------------------- |
| `:220 if[1]` | `:220` / `:228` | `firstPossibleAreaIndex >= 0` false: no free area reaches the segment, split stays at `center(segment)` |
| `:400 if[1]` | `:400` / `:398` | `oldArea.startPosition <= centre − T` false: no `newArea1` |
| `:406 if[1]` | `:406` / `:404` | `centre + T <= oldArea.endPosition` false: no `newArea2` |

Both `useArea` arms sit under `oldArea.size / 2 >= T` (`:390` / `:388`). Free areas: `:84-91` / `:98-103` (gap
`≥ 2T` between sorted combined coordinates gives `FreeArea(c[i−1] + T, c[i] − T)`). `T = 0.2 × min(minDiff(incoming),
minDiff(outgoing))`, each list `distinct()` (`OrthogonalRoutingGenerator.java:176, :248-270`; TS
`OrthogonalRoutingGenerator.ts:150-152`). Classification: `plans/layered-edge-routing/unreached.md:22-24, :105, :114, :226`.
Ladder and candidates: [D3](../decisions.md#d3).

## Task

1. Search (TS scratch, pure double arithmetic, mirroring the Java expressions exactly): for `:400` and `:406`, inputs to
   `useArea` that take the arm; for `:220` and `:400`, coordinate sets (incoming/outgoing per segment, with the
   cross-list constraint on `T`) that a routing step can produce. Journal method, budget and hits.
2. Rung 1: for each arm with a layout candidate, add a `sites/HyperEdgeSegmentSplitter/<name>` row to
   `tools/vectors/LayeredRoutingVectors.java` (`siteSpecs` `:2687-2703`; node positions/sizes and port offsets fix the
   coordinates). Confirm on the oracle that the arm is taken: add temporary tracing to a scratch copy of the recorder or
   a scratch harness class (never to `~/git/knowvah/elk` or the oracle worktree), or compare the TS replay with a
   temporary counter at the arm, removed before commit.
3. Rung 2: for an arm no layout row reaches, add `calls/HyperEdgeSegmentSplitter/<method>-<name>` rows invoking the
   private method by reflection (`:2521-2534`, `:2748-2753` pattern) and a matching handler in
   `test/helpers/layered-routing-replay-ops.ts`.
4. Rung 3: for an arm neither reaches, write the proof in `plans/layered-evidence-gaps/unreached.md` (stop 4 if it does
   not hold).
5. Regenerate with `tools/vectors/layered-routing-vectors.sh "$TMPDIR/layered-evidence-gaps/T3/out"` (detached,
   `nice -n 10`), copy the outputs over `test/golden/refs/java/layered-routing.json` / `layered-routing-steps.json`, run
   the D5 diff, then update the routing count pins (`src/alg/layered/LayeredRoutingVectors.test.ts` and siblings; D6)
   and run them. Record every arm's result (rung, row ids or proof) in `unreached.md`.

## Write-set

`tools/vectors/LayeredRoutingVectors.java`; `test/golden/refs/java/layered-routing.json`, `layered-routing-steps.json`
(by script only); `test/helpers/layered-routing-replay-ops.ts` (rung 2 only) and its test; the routing tests whose row
counts or id lists grow; `plans/layered-evidence-gaps/unreached.md`. Scratch `$TMPDIR/layered-evidence-gaps/T3/`.

## Read-set

`HyperEdgeSegmentSplitter.ts` (and the Java) `:40-110`, `:195-240`, `:380-420`; `HyperEdgeSegmentSplitterFreeArea.ts`;
`OrthogonalRoutingGenerator.java:170-280, :400-415`; `LayeredRoutingVectors.java:60-80, :170-180, :2515-2540,
:2680-2760, :3030-3048`; `tools/vectors/layered-routing-vectors.sh`; `plans/layered-edge-routing/unreached.md:1-40,
:100-120, :220-230`.

## Acceptance criteria

- Given each of the three arms, when T3 ends, then `unreached.md` names its rung and either the row ids that reach it
  (with the evidence the arm is taken on the oracle) or a proof.
- Given the regenerated routing refs, when diffed by id, then only the new rows and `rowCounts` differ.
- Given `npx vitest run src/alg/layered/LayeredRoutingVectors.test.ts src/alg/layered/p5edges/orthogonal`, then every new
  row matches at the AD-4 bar.
- Given the coverage report after T3, when `HyperEdgeSegmentSplitter.ts` is read, then each arm with a row is covered.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the recorder, refs, helper and `unreached.md`.
