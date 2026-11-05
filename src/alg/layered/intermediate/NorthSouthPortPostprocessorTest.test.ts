// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test NorthSouthPortPostprocessorTest: after the NorthSouthPortPostprocessor no
 * layer holds a NORTH_SOUTH_PORT dummy. The Java has one `@TestAfterProcessor` method over
 * `tests/layered/north_south_ports/**` (7 files), so 7 oracle runs. Scope: complete, all 7 files vendored (7 cases).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/NorthSouthPortPostprocessorTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NorthSouthPortPostprocessor } from './NorthSouthPortPostprocessor.js';

defineLayoutTest({
  name: 'NorthSouthPortPostprocessorTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  graphs: [{ path: 'tests/layered/north_south_ports/**' }],
  afterProcessor: [
    {
      name: 'testAllNorthSouthPortDummiesRemoved',
      cls: NorthSouthPortPostprocessor,
      check: (graph: LGraph): void => {
        const hasNorthSouthPortDummies = graph
          .getLayers()
          .flatMap((layer) => layer.getNodes())
          .some((node) => node.getType() === NodeType.NORTH_SOUTH_PORT);

        if (hasNorthSouthPortDummies) {
          expect.fail();
        }
      },
    },
  ],
});
