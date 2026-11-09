// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test NodeMarginCalculatorTest: node margins are present and non-negative after
 * each processor that computes them. The Java has four `@TestAfterProcessor` methods (InnermostNodeMarginCalculator,
 * SelfLoopRouter, CommentNodeMarginCalculator, EndLabelPreprocessor) over `realworld/ptolemy/**` (`*.elkg`, read here
 * through the `.json` twins), 550 models, so 2200 oracle runs.
 *
 * Scope: the vendored ptolemy models (13 minus the self-loop model of N1) and three of the four hooks: Innermost,
 * CommentNodeMarginCalculator and EndLabelPreprocessor, 12 cases each (36). SelfLoopRouter stays mission 7g's: its
 * processor throws until then, so no `cls` can name it. The Java sets no `@FailIfNotExecuted` anywhere in the class, so a
 * hook whose processor is in no plan of a model passes without running, here as there. Measured with
 * `failIfNotExecuted` set temporarily: Innermost fires on 12 of 12 models; CommentNodeMarginCalculator and
 * EndLabelPreprocessor fire on 0 of 12 (the ptolemy models have no comments and no end labels), so those 24 cases pass
 * vacuously, as the Java's do on the same models. With `ELK_MODELS_DIR` and
 * `PIPELINE_SUITES_FULL=1` the whole corpus (self-loop models then need mission 7g).
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
import { CommentNodeMarginCalculator } from './CommentNodeMarginCalculator.js';
import { EndLabelPreprocessor } from './EndLabelPreprocessor.js';
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
    {
      name: 'testNodeMarginsAfterCommentNodeMarginCalculator',
      cls: CommentNodeMarginCalculator,
      check: testNodeMargins,
    },
    {
      name: 'testNodeMarginsAfterEndLabelPreprocessor',
      cls: EndLabelPreprocessor,
      check: testNodeMargins,
    },
  ],
});
