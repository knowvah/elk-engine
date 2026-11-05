// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test LongEdgeJoinerTest: after the LongEdgeJoiner no layer holds a LONG_EDGE
 * dummy. The Java has one `@TestAfterProcessor` method over `realworld/ptolemy/**` (`*.elkg`, read here through the
 * `.json` twins), 550 models, so 550 oracle runs.
 *
 * Scope: the vendored ptolemy models (13 minus the self-loop model of N1, 12 cases); with `ELK_MODELS_DIR` and
 * `PIPELINE_SUITES_FULL=1` the whole corpus (self-loop models then need mission 7g, SELF_LOOP_PREPROCESSOR).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LongEdgeJoinerTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { PTOLEMY_GRAPHS } from '../../../../test/helpers/ptolemy-suite-sources.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LongEdgeJoiner } from './LongEdgeJoiner.js';

defineLayoutTest({
  name: 'LongEdgeJoinerTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: PTOLEMY_GRAPHS,
  afterProcessor: [
    {
      name: 'testRemovedNodes',
      cls: LongEdgeJoiner,
      check: (graph: LGraph): void => {
        for (const layer of graph) {
          for (const node of layer) {
            expect(node.getType() !== NodeType.LONG_EDGE).toBe(true);
          }
        }
      },
    },
  ],
});
