// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue316Test: node size calculation is applied to hierarchical nodes with `INCLUDE_CHILDREN`. Java: `@Algorithm`,
 * `@DefaultConfiguration()`, one `@GraphResourceProvider` over two models, two `@Test` methods (4 oracle runs); the models
 * are vendored under `compound/` (mission 7h, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue316Test.java
 */
import { describe, expect, it } from 'vitest';
import { allNodes } from '../../../../test/helpers/graph-test-navigation.js';
import { haveOverlaps } from '../../../../test/helpers/graph-test-utils.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `compound/`; the models repository holds them at the Java path
  { path: 'compound/tickets/layered/316_wrongGraphSizeWithIncludeChildren.elkt' },
  { path: 'compound/tickets/layered/316_wrongGraphSizeWithIncludeChildren2.elkt' },
  { path: 'tickets/layered/316_wrongGraphSizeWithIncludeChildren.elkt' },
  { path: 'tickets/layered/316_wrongGraphSizeWithIncludeChildren2.elkt' },
] as const;

function ensurePortsDontOverlap(graph: ElkNode): void {
  const overlaps = allNodes(graph, false)
    .map((node) => node.getPorts().toArray())
    .some((ports) => haveOverlaps(ports));

  if (overlaps) {
    throw new Error('Port overlaps detected!');
  }
}

function ensureNodesBigEnoughForLabels(graph: ElkNode): void {
  for (const node of allNodes(graph, false)) {
    // We only care about hierarchical nodes
    if (!node.getChildren().isEmpty()) {
      for (const label of node.getLabels()) {
        if (
          label.getX() < 0 ||
          label.getY() < 0 ||
          label.getX() + label.getWidth() > node.getWidth() ||
          label.getY() + label.getHeight() > node.getHeight()
        ) {
          throw new Error('Node label not fully contained in node.');
        }
      }
    }
  }
}

const SPEC: LayoutTestSpec = {
  name: 'Issue316Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { ensurePortsDontOverlap, ensureNodesBigEnoughForLabels },
};

defineLayoutTest(SPEC);

describe('Issue316Test (non-vacuity)', () => {
  it('runs 4 cases (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(4);
  });

  it('(non-vacuity) the runs visit hierarchical nodes with labels and ports of non-zero size', () => {
    const seen = { runs: 0, hierarchicalLabelled: 0, labelsChecked: 0, portSets: 0, portsSized: 0, labelSized: 0 };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.runs += 1;
          for (const node of allNodes(graph, false)) {
            const ports = node.getPorts().toArray();
            seen.portSets += ports.length > 1 ? 1 : 0;
            seen.portsSized += ports.filter((p) => p.getWidth() > 0 && p.getHeight() > 0).length;
            if (!node.getChildren().isEmpty() && !node.getLabels().isEmpty()) {
              seen.hierarchicalLabelled += 1;
              for (const label of node.getLabels()) {
                seen.labelsChecked += 1;
                seen.labelSized += label.getWidth() > 0 && label.getHeight() > 0 ? 1 : 0;
              }
            }
          }
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(2);
    expect(seen.runs).toBe(2);
    expect(seen.hierarchicalLabelled).toBeGreaterThan(0);
    expect(seen.labelSized).toBe(seen.labelsChecked);
    expect(seen.portSets).toBeGreaterThan(0);
    expect(seen.portsSized).toBeGreaterThan(0);
  });
});
