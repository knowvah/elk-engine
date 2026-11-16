// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue596Test: the single child of a hierarchical node with outside port labels is placed at its centre. Java:
 * `@Algorithm`, `@DefaultConfiguration`, one `@GraphResourceProvider`, one `@Test` (1 oracle run); the model is vendored
 * under `compound/` (mission 7h, T1). The method is named `testEdgeStartsAtPort` in the Java and checks the child's x.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue596Test.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `compound/`; the models repository holds it at the Java path
  { path: 'compound/tickets/layered/596_outsideHierarchicalPortLabels.elkt' },
  { path: 'tickets/layered/596_outsideHierarchicalPortLabels.elkt' },
] as const;

const TOLERANCE = 0.5;

function testEdgeStartsAtPort(graph: ElkNode): void {
  // The graph contains a single hierarchical node...
  const outer = graph.getChildren().get(0);

  // ...whose single child should be place at the center
  const inner = outer.getChildren().get(0);

  assertEqualsWithin('', (outer.getWidth() - inner.getWidth()) / 2, inner.getX(), TOLERANCE);
}

const SPEC: LayoutTestSpec = {
  name: 'Issue596Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testEdgeStartsAtPort },
};

defineLayoutTest(SPEC);

describe('Issue596Test (non-vacuity)', () => {
  it('runs 1 case (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(1);
  });

  it('(non-vacuity) the inner node is inset from the outer one and carries outside port labels', () => {
    const seen = { insetX: 0, outerPorts: 0, labelledPorts: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          const outer = graph.getChildren().get(0);
          const inner = outer.getChildren().get(0);
          seen.insetX = inner.getX();
          seen.outerPorts = outer.getPorts().size();
          seen.labelledPorts = [...outer.getPorts()].filter((port) => !port.getLabels().isEmpty()).length;
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.insetX).toBeGreaterThan(0);
    expect(seen.outerPorts).toBeGreaterThan(0);
    expect(seen.labelledPorts).toBeGreaterThan(0);
  });
});
