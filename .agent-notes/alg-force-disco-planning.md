<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — alg-force-disco (mission 8b, 2026-11-11)

## Observation: V8's Math.log differs from the oracle JVM's in 0.43% of inputs

- **Context**: Deciding how to handle `EadesModel.attractive` (`Math.log`, iterated).
- **Finding**: 200,000 seeded inputs on the arm64 JVM 21.0.1: V8 differs from JVM `Math.log` in 858 (one ulp) and from
  `StrictMath.log` in 858 with the same first samples; `Math.log` and `StrictMath.log` gave bit-identical Eades layouts in 18 of 18 runs.
- **Impact**: a port on native `Math.log` drifts. Perturbing 1 in 256 calls by one ulp changed coordinates by 1.2e-12 at 300 iterations
  and by 390 at 1,000 iterations. FD3 ports the fdlibm algorithm.
- **Confidence**: High on arm64; x86_64 unverified.

## Observation: inputs without elk.algorithm record layered

- **Context**: Probing the oracle on `test/corpus/generated/disco-components-small.json`.
- **Finding**: the output's `resolvedAlgorithm` is `org.eclipse.elk.layered`. The debug properties `discoGraph` and `discoPolys` are
  absent from the JSON output.
- **Impact**: every golden input must name its algorithm or carry `retarget`; a test asserts each ref's `resolvedAlgorithm` (FD2).
- **Confidence**: High

## Observation: disco's only order-observable hashed site is adjustedPorts

- **Context**: Reading `ElkGraphTransformer.applyLayout`.
- **Finding**: the two extension-map loops set a port's position from the first edge met (`adjustedPorts`); every other iteration
  is per-entry or order-free. Polyomino extension order is read only as a length and a direction set.
- **Impact**: one reversed-order twin (FD4), and row designs with at most 8 extension entries to avoid treeified bins.
- **Confidence**: High
