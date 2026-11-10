// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue870Test: the network simplex node placer handles a specific edge configuration. The Java has one `@GraphResourceProvider` over
 * `tickets/layered/870_networkSimplexNodePlacer.elkt` and one `@Test` with an empty body, no `@DefaultConfiguration`
 * (1 oracle run); the model is vendored under `loops/` (mission 7g, T1). The suite asserts that the layout completes.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue870Test.java
 */
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `loops/`; the models repository holds it at the Java path
  { path: 'loops/tickets/layered/870_networkSimplexNodePlacer.elkt' },
  { path: 'tickets/layered/870_networkSimplexNodePlacer.elkt' },
] as const;

function ensureLayoutDoesNotFail(_graph: ElkNode): void {
  // Empty, as in the Java: the layout itself must not throw.
}

const SPEC: LayoutTestSpec = {
  name: 'Issue870Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  graphs: GRAPHS,
  afterLayout: { ensureLayoutDoesNotFail },
};

defineLayoutTest(SPEC);

describe('Issue870Test (non-vacuity)', () => {
  it('(non-vacuity) the single case ran the layout over a graph with nodes', () => {
    const seen = { nodes: 0, loops: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.nodes += [...graph.getChildren()].length;
          seen.loops += [...graph.getContainedEdges()].filter((e) => e.isSelfloop()).length;
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.nodes).toBeGreaterThan(0);
  });
});
