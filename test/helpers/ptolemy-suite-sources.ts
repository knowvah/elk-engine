// SPDX-License-Identifier: EPL-2.0
// The `@GraphResourceProvider` of the corpus-wide intermediate-processor suites (`InLayerConstraintProcessorTest`,
// `LongEdgeJoinerTest`, `NodeMarginCalculatorTest`): `new ModelResourcePath("realworld/ptolemy/**/")` with
// `new FileExtensionFilter("elkg")`. Two sources cover the vendored scope, `realworld/ptolemy` (T1's four models and the
// five of mission 7a) and `pipeline/realworld/ptolemy` (mission 7f's four, vendored outside `realworld/` because
// `LayeredFrameworkVectors` closes that tree); under `PIPELINE_SUITES_FULL=1` the root is the models repository, where
// the second path does not exist and the first lists the whole corpus.
import type { GraphSource } from './layout-test-runner.js';

/**
 * `gt_sinewaveoptimization_SinewaveOptimization` has a self loop, which needs SELF_LOOP_PREPROCESSOR (mission 7g, N1 of
 * `plans/layered-pipeline/suite-allocation.md`); it is left out of the vendored scope. The filter is a negative lookahead.
 */
const WITHOUT_SELF_LOOP_MODELS = /(?!gt_sinewaveoptimization_).*/;

export const PTOLEMY_GRAPHS: readonly GraphSource[] = [
  { path: 'realworld/ptolemy/**/', filter: WITHOUT_SELF_LOOP_MODELS, extensions: ['elkg'] },
  { path: 'pipeline/realworld/ptolemy/**/', filter: WITHOUT_SELF_LOOP_MODELS, extensions: ['elkg'] },
];
