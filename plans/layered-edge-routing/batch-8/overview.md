<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Anchored unit tests

Two parallel tasks after T13 (7d's batch 6): one colocated case per S and J item of `unreached.md`, literals equal to
a routing row (6c D1), comment `// oracle: <row id>; <Java file:line>`. Write-sets are disjoint by directory; the
tasks never edit a `src/` non-test file (a port defect found here is a stop with a diagnosis). `sites/*` and `calls/*`
rows are branch probes: the three JUnit ports stay restricted to `models/*` rows and are in neither write-set. Each
task uses a private scratchpad subdirectory.

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T14a | Orthogonal, polyline and processor anchored tests ([brief](T14a-router-tests.md)) | typescript-pro | src/alg/layered/p5edges/orthogonal/**/*.test.ts, src/alg/layered/p5edges/{OrthogonalEdgeRouter,PolylineEdgeRouter*}.test.ts, src/alg/layered/intermediate/{HyperedgeDummyMerger*,HierarchicalPortPositionProcessor,LayerSizeAndGraphHeightCalculator,LongEdgeJoiner,NorthSouthPortPostprocessor}.test.ts | T13 | [x] |
| T14b | Spline anchored tests ([brief](T14b-spline-tests.md)) | typescript-pro | src/alg/layered/p5edges/splines/*.test.ts, src/alg/layered/intermediate/FinalSplineBendpointsCalculator*.test.ts | T13 | [x] |

The batch is done when every S row is anchored, the README gates are green and per-class branch coverage is ≥ 90 %
except U-explained shortfalls (else stop 10). Agents never run `npm run coverage` and never commit.
