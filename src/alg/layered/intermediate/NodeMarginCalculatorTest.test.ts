// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test NodeMarginCalculatorTest: node margins are present and non-negative after
 * each processor that computes them. The Java has four `@TestAfterProcessor` methods (InnermostNodeMarginCalculator,
 * SelfLoopRouter, CommentNodeMarginCalculator, EndLabelPreprocessor) over `realworld/ptolemy/**` (`*.elkg`, read here
 * through the `.json` twins), 550 models, so 2200 oracle runs.
 *
 * Scope: the vendored ptolemy models (13 minus the self-loop model of N1), and only the InnermostNodeMarginCalculator
 * hook, 12 cases. The other three hooks are in no vendored plan: SelfLoopRouter is mission 7g, CommentNodeMarginCalculator
 * and EndLabelPreprocessor are mission 7f2, and none of them exists as a class yet (their enum arms throw), so no `cls`
 * can name them. The Java sets no `@FailIfNotExecuted` anywhere in the class, so over this scope those three hooks pass
 * without running; they are added with their processors in 7g and 7f2, using the same `testNodeMargins` body. With
 * `ELK_MODELS_DIR` and `PIPELINE_SUITES_FULL=1` the whole corpus (self-loop models then need mission 7g).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/NodeMarginCalculatorTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { PTOLEMY_GRAPHS } from '../../../../test/helpers/ptolemy-suite-sources.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { InnermostNodeMarginCalculator } from './InnermostNodeMarginCalculator.js';

function testNodeMargins(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      expect(node.getMargin() !== null).toBe(true);
      expect(node.getMargin().top >= 0).toBe(true);
      expect(node.getMargin().right >= 0).toBe(true);
      expect(node.getMargin().bottom >= 0).toBe(true);
      expect(node.getMargin().left >= 0).toBe(true);
    }
  }
}

defineLayoutTest({
  name: 'NodeMarginCalculatorTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: PTOLEMY_GRAPHS,
  afterProcessor: [
    {
      name: 'testNodeMarginsAfterInnermostNodeMarginCalculator',
      cls: InnermostNodeMarginCalculator,
      check: testNodeMargins,
    },
  ],
});
