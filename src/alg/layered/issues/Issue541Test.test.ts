// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test Issue541Test: laying out the 541 models raises no NPE in EndLabelSorter. The Java
 * has one `@Test` that checks nothing ("We don't actually test anything") and `@DefaultConfiguration`, over
 * `tickets/layered/**` filtered by `541.+` (2 oracle runs); the models are vendored under `labels/` (mission 7f2, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue541Test.java
 */
// Entry through the enum, not a processor class (E1).
import '../intermediate/IntermediateProcessorStrategy.js';
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import { EndLabelSorter } from '../intermediate/EndLabelSorter.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `labels/`; the models repository holds them at the Java path
  { path: 'labels/tickets/layered/**', filter: /541.+/ },
  { path: 'tickets/layered/**', filter: /541.+/ },
] as const;

const SPEC: LayoutTestSpec = {
  name: 'Issue541Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: {
    testLargeEnoughNodes: (): void => {
      // We don't actually test anything. This test is only supposed to check whether an NPE occurs in
      // EndLabelSorter.
    },
  },
};

defineLayoutTest(SPEC);

describe('Issue541Test (non-vacuity)', () => {
  it('(non-vacuity) the EndLabelSorter ran on each model, with end labels or label dummies to sort', () => {
    const seen = { runs: 0, endLabelNodes: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {},
      beforeProcessor: [
        {
          cls: EndLabelSorter,
          check: (lGraph) => {
            seen.runs += 1;
            for (const node of lGraph.getLayers().flatMap((layer) => layer.getNodes())) {
              seen.endLabelNodes += node.hasProperty(InternalProperties.END_LABELS) ? 1 : 0;
            }
          },
        },
      ],
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(2);
    expect(seen.runs).toBeGreaterThanOrEqual(cases.length);
    expect(seen.endLabelNodes).toBeGreaterThan(0);
  });
});
