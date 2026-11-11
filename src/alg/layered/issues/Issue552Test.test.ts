// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue552Test: no port of a node with a self loop is left at y=0. Java: `@Algorithm`, `@DefaultConfiguration`, one
 * `@GraphResourceProvider`, one `@Test` (1 oracle run); the model is vendored under `compound/` (mission 7h, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue552Test.java
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
  // vendored under `compound/`; the models repository holds it at the Java path
  { path: 'compound/tickets/layered/552_hierarchySelfLoopPorts.elkt' },
  { path: 'tickets/layered/552_hierarchySelfLoopPorts.elkt' },
] as const;

function testSelfLoopPortPlacement(graph: ElkNode): void {
  for (const node of graph.getChildren()) {
    for (const port of node.getPorts()) {
      // No port must be left at y=0.0
      expect(port.getY() > 0).toBe(true);
    }
  }
}

const SPEC: LayoutTestSpec = {
  name: 'Issue552Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { testSelfLoopPortPlacement },
};

defineLayoutTest(SPEC);

describe('Issue552Test (non-vacuity)', () => {
  it('runs 1 case (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(1);
  });

  it('(non-vacuity) the loop visits ports and the graph holds self loops', () => {
    const seen = { nodes: 0, ports: 0, loops: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          for (const node of graph.getChildren()) {
            seen.nodes += 1;
            seen.ports += node.getPorts().size();
          }
          seen.loops += [...graph.getContainedEdges()].filter((edge) => edge.isSelfloop()).length;
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.nodes).toBeGreaterThan(0);
    expect(seen.ports).toBeGreaterThan(0);
  });
});
