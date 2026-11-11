// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue628Test: nodes of a hierarchical graph keep the node-node spacing and a common y. Java: `@Algorithm`,
 * `@DefaultConfiguration(nodes = false)`, one `@GraphResourceProvider` (`tickets/layered/**` filtered by `628.+\.elkt`),
 * four `@Configurator` methods and one `@Test` (4 oracle runs); the model is vendored under `compound/` (mission 7h, T1).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue628Test.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { GreedySwitchType } from '../options/GreedySwitchType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `compound/`; the models repository holds it at the Java path
  { path: 'compound/tickets/layered/**', filter: /628.+\.elkt/ },
  { path: 'tickets/layered/**', filter: /628.+\.elkt/ },
] as const;

/** Guava `DoubleMath.fuzzyEquals`: equal, or within the tolerance, or both NaN. */
function fuzzyEquals(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance || a === b || (Number.isNaN(a) && Number.isNaN(b));
}

function configureGreedySwitchHierarchical(graph: ElkNode): void {
  graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, GreedySwitchType.TWO_SIDED);
}

function unconfigureGreedySwitchHierarchical(graph: ElkNode): void {
  graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, null);
}

function configureGreedySwitch(graph: ElkNode): void {
  graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, GreedySwitchType.TWO_SIDED);
}

function unconfigureGreedySwitch(graph: ElkNode): void {
  graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, null);
}

/** `stream().filter(n -> n.getIdentifier().equals(id)).findFirst().get()`. */
function findChild(parent: ElkNode, identifier: string): ElkNode {
  for (const node of parent.getChildren()) {
    if (node.getIdentifier() === identifier) {
      return node;
    }
  }
  throw new Error('No value present');
}

function testNoLabelNodeOverlaps(graph: ElkNode): void {
  const l1 = graph.getChildren().get(0);
  const l2_1 = findChild(l1, 'l2_1');
  const l2_2 = findChild(l1, 'l2_2');

  expect(fuzzyEquals(l2_1.getY(), l2_2.getY(), 1e-5), 'Y-coordinates not equal.').toBe(true);
  assertEqualsWithin(
    'Spacing between the nodes not as expected.',
    10.0,
    l2_2.getX() - (l2_1.getX() + l2_1.getWidth()),
    1e-5,
  );
}

const SPEC: LayoutTestSpec = {
  name: 'Issue628Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: { nodes: false },
  graphs: GRAPHS,
  configurators: {
    configureGreedySwitchHierarchical,
    unconfigureGreedySwitchHierarchical,
    configureGreedySwitch,
    unconfigureGreedySwitch,
  },
  afterLayout: { testNoLabelNodeOverlaps },
};

defineLayoutTest(SPEC);

describe('Issue628Test (non-vacuity)', () => {
  it('runs 4 cases (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(4);
  });

  it('(non-vacuity) every configurator run compares two sibling nodes with a real gap', () => {
    const seen = { runs: 0, pairs: 0, gaps: [] as number[] };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.runs += 1;
          const l1 = graph.getChildren().get(0);
          const l2_1 = findChild(l1, 'l2_1');
          const l2_2 = findChild(l1, 'l2_2');
          seen.pairs += 1;
          seen.gaps.push(l2_2.getX() - (l2_1.getX() + l2_1.getWidth()), l2_1.getWidth(), l2_2.getWidth());
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(4);
    expect(seen.runs).toBe(4);
    expect(seen.pairs).toBe(4);
    expect(seen.gaps.every((value) => Number.isFinite(value))).toBe(true);
    // the node sizes (every third value) are not zero, so the spacing check compares real nodes
    expect(seen.gaps.filter((_, index) => index % 3 !== 0).every((width) => width > 0)).toBe(true);
  });
});
