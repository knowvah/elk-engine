// SPDX-License-Identifier: EPL-2.0
// The `@GraphResourceProvider` of the corpus-wide intermediate-processor suites (`InLayerConstraintProcessorTest`,
// `LongEdgeJoinerTest`, `NodeMarginCalculatorTest`): `new ModelResourcePath("realworld/ptolemy/**/")` with
// `new FileExtensionFilter("elkg")`. Two sources cover the vendored scope, `realworld/ptolemy` (T1's four models and the
// five of mission 7a) and `pipeline/realworld/ptolemy` (mission 7f's four, vendored outside `realworld/` because
// `LayeredFrameworkVectors` closes that tree); under `PIPELINE_SUITES_FULL=1` the root is the models repository, where
// the second path does not exist and the first lists the whole corpus.
import type { GraphSource } from './layout-test-runner.js';

/**
 * Every ptolemy model is in scope, `gt_sinewaveoptimization_SinewaveOptimization` and its self loop included: mission 7g
 * ported SELF_LOOP_PREPROCESSOR and removed the filter that left the model out (N1 of
 * `plans/layered-pipeline/suite-allocation.md`), so the corpus-wide case counts equal the oracle's run counts.
 */
export const PTOLEMY_GRAPHS: readonly GraphSource[] = [
  { path: 'realworld/ptolemy/**/', extensions: ['elkg'] },
  { path: 'pipeline/realworld/ptolemy/**/', extensions: ['elkg'] },
];
