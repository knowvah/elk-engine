// SPDX-License-Identifier: EPL-2.0
/*
 * Port of ConcreteSortByInputModelTest (mission 7f, T12a): concrete examples that must not break under the consider
 * model order strategy. The Java has 32 `@Test`s (32 runs), one per pair of an outgoing and an incoming port side
 * (`testOutgoing<Side>Incoming<Side>` and the `...MultipleNodes` twin), 16 pairs in all. Every Java method has the same
 * statements: a graph of two nodes (or three, `n1`, `ni`, `n2`, for the MultipleNodes twin) of 20x20 with FIXED_SIDE
 * port constraints, four ports `p1..p4` on the sides under test, the edges `p1 -> p4` and `p2 -> p3`, the shared model
 * order options, one layout with CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER = false, two `assertTrue`s, then the same
 * layout and the same two `assertTrue`s with CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER = true. The table below carries
 * what varies per method, taken from the Java: the port sides, the two assertions (message, subjects, axis), and the
 * progress monitor of the first layout (`NullElkProgressMonitor` in testOutgoingSouthIncomingNorth and its
 * MultipleNodes twin, `BasicProgressMonitor` elsewhere). The assertions are the Java's `<` comparisons of coordinates.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/ConcreteSortByInputModelTest.java
 */
import { describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredLayoutProvider } from '../LayeredLayoutProvider.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { GreedySwitchType } from '../options/GreedySwitchType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';

const NODE_SIZE = 20;

/** Something with a position: a node or a port. */
interface Positioned {
  getX(): number;
  getY(): number;
}

type Axis = 'X' | 'Y';

/** `assertTrue(message, a.get<Axis>() < b.get<Axis>())`: message, a, axis, b. */
type Check = readonly [message: string, a: string, axis: Axis, b: string];

interface Case {
  readonly name: string;
  readonly multiple: boolean;
  readonly out: PortSide;
  readonly in: PortSide;
  readonly nullMonitor?: boolean;
  readonly checks: readonly [Check, Check];
}

const CASES: readonly Case[] = [
  {
    name: 'testOutgoingEastIncomingWest',
    multiple: false,
    out: PortSide.EAST,
    in: PortSide.WEST,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingWestMultipleNodes',
    multiple: true,
    out: PortSide.EAST,
    in: PortSide.WEST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingNorth',
    multiple: false,
    out: PortSide.EAST,
    in: PortSide.NORTH,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingNorthMultipleNodes',
    multiple: true,
    out: PortSide.EAST,
    in: PortSide.NORTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingSouth',
    multiple: false,
    out: PortSide.EAST,
    in: PortSide.SOUTH,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingSouthMultipleNodes',
    multiple: true,
    out: PortSide.EAST,
    in: PortSide.SOUTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingEast',
    multiple: false,
    out: PortSide.EAST,
    in: PortSide.EAST,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingEastIncomingEastMultipleNodes',
    multiple: true,
    out: PortSide.EAST,
    in: PortSide.EAST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingWest',
    multiple: false,
    out: PortSide.NORTH,
    in: PortSide.WEST,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingWestMultipleNodes',
    multiple: true,
    out: PortSide.NORTH,
    in: PortSide.WEST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingNorth',
    multiple: false,
    out: PortSide.NORTH,
    in: PortSide.NORTH,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingNorthMultipleNodes',
    multiple: true,
    out: PortSide.NORTH,
    in: PortSide.NORTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingSouth',
    multiple: false,
    out: PortSide.NORTH,
    in: PortSide.SOUTH,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingSouthMultipleNodes',
    multiple: true,
    out: PortSide.NORTH,
    in: PortSide.SOUTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingEast',
    multiple: false,
    out: PortSide.NORTH,
    in: PortSide.EAST,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingNorthIncomingEastMultipleNodes',
    multiple: true,
    out: PortSide.NORTH,
    in: PortSide.EAST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingWest',
    multiple: false,
    out: PortSide.SOUTH,
    in: PortSide.WEST,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingWestMultipleNodes',
    multiple: true,
    out: PortSide.SOUTH,
    in: PortSide.WEST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingNorth',
    multiple: false,
    out: PortSide.SOUTH,
    in: PortSide.NORTH,
    nullMonitor: true,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingNorthMultipleNodes',
    multiple: true,
    out: PortSide.SOUTH,
    in: PortSide.NORTH,
    nullMonitor: true,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingSouth',
    multiple: false,
    out: PortSide.SOUTH,
    in: PortSide.SOUTH,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingSouthMultipleNodes',
    multiple: true,
    out: PortSide.SOUTH,
    in: PortSide.SOUTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingEast',
    multiple: false,
    out: PortSide.SOUTH,
    in: PortSide.EAST,
    checks: [
      ['p1 before p2', 'p1', 'X', 'p2'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingSouthIncomingEastMultipleNodes',
    multiple: true,
    out: PortSide.SOUTH,
    in: PortSide.EAST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingWest',
    multiple: false,
    out: PortSide.WEST,
    in: PortSide.WEST,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingWestMultipleNodes',
    multiple: true,
    out: PortSide.WEST,
    in: PortSide.WEST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingNorth',
    multiple: false,
    out: PortSide.WEST,
    in: PortSide.NORTH,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingNorthMultipleNodes',
    multiple: true,
    out: PortSide.WEST,
    in: PortSide.NORTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingSouth',
    multiple: false,
    out: PortSide.WEST,
    in: PortSide.SOUTH,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p3 before p4', 'p3', 'X', 'p4'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingSouthMultipleNodes',
    multiple: true,
    out: PortSide.WEST,
    in: PortSide.SOUTH,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p4 before p3', 'p4', 'X', 'p3'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingEast',
    multiple: false,
    out: PortSide.WEST,
    in: PortSide.EAST,
    checks: [
      ['p1 above p2', 'p1', 'Y', 'p2'],
      ['p4 above p3', 'p4', 'Y', 'p3'],
    ],
  },
  {
    name: 'testOutgoingWestIncomingEastMultipleNodes',
    multiple: true,
    out: PortSide.WEST,
    in: PortSide.EAST,
    checks: [
      ['Node order of n1 and ni', 'n1', 'Y', 'ni'],
      ['p3 above p4', 'p3', 'Y', 'p4'],
    ],
  },
];

/** The graph of a method and its named nodes and ports, created in the Java's order. */
function createGraph(testCase: Case): { parent: ElkNode; subjects: ReadonlyMap<string, Positioned> } {
  const parent = ElkGraphUtil.createGraph();
  const n1 = ElkGraphUtil.createNode(parent);
  const ni = testCase.multiple ? ElkGraphUtil.createNode(parent) : null;
  const n2 = ElkGraphUtil.createNode(parent);
  for (const node of [n1, ni, n2]) {
    node?.setDimensions(NODE_SIZE, NODE_SIZE);
  }

  parent.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  // Model order configuration.
  parent.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_EDGES);
  parent.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER, false);
  // No crossing minimization, hence only model order is used.
  parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.NONE);
  parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, GreedySwitchType.OFF);
  // For presentation.
  parent.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
  parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
  parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
  parent.setProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, 20.0);
  for (const node of [n1, ni, n2]) {
    node?.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
  }
  // Make sure that the order is correct.
  parent.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.MODEL_ORDER);

  const p1 = ElkGraphUtil.createPort(n1);
  p1.setProperty(LayeredOptions.PORT_SIDE, testCase.out);
  const p2 = ElkGraphUtil.createPort(ni ?? n1);
  p2.setProperty(LayeredOptions.PORT_SIDE, testCase.out);
  const p3 = ElkGraphUtil.createPort(n2);
  p3.setProperty(LayeredOptions.PORT_SIDE, testCase.in);
  const p4 = ElkGraphUtil.createPort(n2);
  p4.setProperty(LayeredOptions.PORT_SIDE, testCase.in);

  ElkGraphUtil.createSimpleEdge(p1, p4);
  ElkGraphUtil.createSimpleEdge(p2, p3);

  const subjects = new Map<string, Positioned>([
    ['n1', n1],
    ['n2', n2],
    ['p1', p1],
    ['p2', p2],
    ['p3', p3],
    ['p4', p4],
  ]);
  if (ni !== null) {
    subjects.set('ni', ni);
  }
  return { parent, subjects };
}

function assertTrue(message: string, condition: boolean): void {
  expect(condition, message).toBe(true);
}

function assertCheck(subjects: ReadonlyMap<string, Positioned>, [message, a, axis, b]: Check): void {
  const get = (name: string): number => {
    const subject = subjects.get(name)!;
    return axis === 'X' ? subject.getX() : subject.getY();
  };
  assertTrue(message, get(a) < get(b));
}

describe('ConcreteSortByInputModelTest', () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      registerLayered();
      const { parent, subjects } = createGraph(testCase);
      const layoutProvider = new LayeredLayoutProvider();
      layoutProvider.layout(
        parent,
        testCase.nullMonitor === true ? new NullElkProgressMonitor() : new BasicProgressMonitor(),
      );
      for (const check of testCase.checks) {
        assertCheck(subjects, check);
      }

      // Check for port model order, which should result in the same graph.
      parent.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER, true);

      layoutProvider.layout(parent, new BasicProgressMonitor());
      for (const check of testCase.checks) {
        assertCheck(subjects, check);
      }
    });
  }
});
