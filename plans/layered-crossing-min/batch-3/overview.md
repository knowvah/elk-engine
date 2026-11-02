<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — p3order lower half

One task after batch 2. The heuristics, the constraint resolver, the port distributors and the sweep copy depend on the
counters (T5) and the LGraph model but not on `GraphInfoHolder`; `GraphInfoHolder` and the sweep driver depend on them
and on `greedyswitch`, which depends back on `GraphInfoHolder` — that seam is batch 4.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T6  | Heuristics, constraint resolver, port distributors, `SweepCopy`, the two interfaces ([brief](T6-p3order-lower.md)) | typescript-pro | src/alg/layered/p3order/{ICrossingMinimizationHeuristic,ISweepPortDistributor,SweepCopy,ForsterConstraintResolver,BarycenterHeuristic,MedianHeuristic,ModelOrderBarycenterHeuristic,AbstractBarycenterPortDistributor,LayerTotalPortDistributor,NodeRelativePortDistributor,GreedyPortDistributor}.ts + tests | T5 | [x] |
