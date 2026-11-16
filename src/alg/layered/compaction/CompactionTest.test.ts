// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { Direction } from '../../../core/options/Direction.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { CGraph } from './oned/CGraph.js';
import { CGroup } from './oned/CGroup.js';
import { CNode } from './oned/CNode.js';
import { OneDimensionalCompactor } from './oned/OneDimensionalCompactor.js';

/**
 * Tests for the layered bundle's {@link OneDimensionalCompactor}.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/compaction/CompactionTest.java
 */

const EPSILON = 0.0001;
const SPACING = 5;

/** JUnit `assertEquals(message, expected, actual, delta)`. */
function assertEquals(expected: number, actual: number, message = ''): void {
  expect(actual, message).toBeGreaterThanOrEqual(expected - EPSILON);
  expect(actual, message).toBeLessThanOrEqual(expected + EPSILON);
}

class CTestNode extends CNode {
  constructor(rect: ElkRectangle) {
    super();
    this.hitbox = rect;
  }

  getHorizontalSpacing(): number {
    return SPACING;
  }

  getVerticalSpacing(): number {
    return SPACING;
  }

  applyElementPosition(): void {
    this.hitbox.x = this.hitbox.x;
  }

  getElementPosition(): number {
    return this.hitbox.x;
  }

  override toString(): string {
    return ''; // dont spam the debug output
  }
}

class CTestNodeSpacing extends CTestNode {
  private readonly hSpacing: number;
  private readonly vSpacing: number;

  constructor(rect: ElkRectangle, hSpacing: number, vSpacing: number) {
    super(rect);
    this.hSpacing = hSpacing;
    this.vSpacing = vSpacing;
  }

  override getHorizontalSpacing(): number {
    return this.hSpacing;
  }

  override getVerticalSpacing(): number {
    return this.vSpacing;
  }
}

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));

const compacter = (graph: CGraph): OneDimensionalCompactor =>
  new OneDimensionalCompactor(graph).setConstraintAlgorithm(OneDimensionalCompactor.QUADRATIC_CONSTRAINTS);

const rect = (x: number, y: number, w: number, h: number): ElkRectangle => new ElkRectangle(x, y, w, h);

function add<T extends CNode>(graph: CGraph, node: T): T {
  graph.cNodes.push(node);
  return node;
}

describe('CompactionTest', () => {
  it('testLeftCompaction', () => {
    const graph = newGraph();
    const left = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const right = add(graph, new CTestNode(rect(30, 0, 20, 20)));

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(25, right.hitbox.x);
  });

  it('testLeftCompactionEqualCoordinate', () => {
    const graph = newGraph();
    const top = add(graph, new CTestNodeSpacing(rect(0, 0, 20, 20), 0, 0));
    const bot = add(graph, new CTestNodeSpacing(rect(30, 20, 20, 20), 0, 0));

    compacter(graph)
      .setConstraintAlgorithm(OneDimensionalCompactor.SCANLINE_CONSTRAINTS)
      .changeDirection(Direction.LEFT)
      .compact()
      .finish();

    assertEquals(0, top.hitbox.x);
    assertEquals(0, bot.hitbox.x);
  });

  it('testLeftCompactionSpacingAware', () => {
    const graph = newGraph();
    const left = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const right = add(graph, new CTestNode(rect(30, 20 + SPACING - 1, 20, 20)));

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(25, right.hitbox.x);
  });

  it('testRightCompaction', () => {
    const graph = newGraph();
    const left = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const right = add(graph, new CTestNode(rect(30, 0, 20, 20)));

    compacter(graph).changeDirection(Direction.RIGHT).compact().finish();

    assertEquals(5, left.hitbox.x);
    assertEquals(30, right.hitbox.x);
  });

  it('testUpCompaction', () => {
    const graph = newGraph();
    const upper = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const lower = add(graph, new CTestNode(rect(0, 30, 20, 20)));

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, upper.hitbox.y);
    assertEquals(25, lower.hitbox.y);
  });

  it('testDownCompaction', () => {
    const graph = newGraph();
    const upper = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const lower = add(graph, new CTestNode(rect(0, 30, 20, 20)));

    compacter(graph).changeDirection(Direction.DOWN).compact().finish();

    assertEquals(5, upper.hitbox.y);
    assertEquals(30, lower.hitbox.y);
  });

  it('testLeftGroupCompaction', () => {
    const graph = newGraph();
    const left = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const upperRight = add(graph, new CTestNode(rect(40, 5, 20, 20)));
    const lowerRight = add(graph, new CTestNode(rect(30, 25, 20, 20)));

    graph.cGroups.push(new CGroup(upperRight, lowerRight));

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(25, upperRight.hitbox.x);
    assertEquals(15, lowerRight.hitbox.x);
  });

  it('testRightGroupCompaction', () => {
    const graph = newGraph();
    const left = add(graph, new CTestNode(rect(0, 5, 20, 20)));
    const upperRight = add(graph, new CTestNode(rect(40, 0, 20, 20)));
    const lowerRight = add(graph, new CTestNode(rect(10, 25, 20, 20)));

    graph.cGroups.push(new CGroup(left, lowerRight));

    compacter(graph).changeDirection(Direction.RIGHT).compact().finish();

    assertEquals(15, left.hitbox.x);
    assertEquals(40, upperRight.hitbox.x);
    assertEquals(25, lowerRight.hitbox.x);
  });

  it('testUpGroupCompaction', () => {
    const graph = newGraph();
    const upperLeft = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const lowerLeft = add(graph, new CTestNode(rect(5, 40, 20, 20)));
    const right = add(graph, new CTestNode(rect(25, 30, 20, 20)));

    graph.cGroups.push(new CGroup(lowerLeft, right));

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, upperLeft.hitbox.y);
    assertEquals(25, lowerLeft.hitbox.y);
    assertEquals(15, right.hitbox.y);
  });

  it('testDownGroupCompaction', () => {
    const graph = newGraph();
    const upperLeft = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const lowerLeft = add(graph, new CTestNode(rect(5, 40, 10, 20)));
    const right = add(graph, new CTestNode(rect(25, 10, 20, 20)));

    graph.cGroups.push(new CGroup(upperLeft, right));

    compacter(graph).changeDirection(Direction.DOWN).compact().finish();

    assertEquals(15, upperLeft.hitbox.y);
    assertEquals(40, lowerLeft.hitbox.y);
    assertEquals(25, right.hitbox.y);
  });

  it('testNoSpacingAppliedWithinGroups', () => {
    const graph = newGraph();
    const one = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const two = add(graph, new CTestNode(rect(20, 10, 20, 20)));
    const three = add(graph, new CTestNode(rect(40, 20, 20, 20)));

    graph.cGroups.push(new CGroup(one, two, three));

    const four = add(graph, new CTestNode(rect(22, 80, 20, 20)));
    const five = add(graph, new CTestNode(rect(42, 90, 20, 20)));
    const six = add(graph, new CTestNode(rect(62, 100, 20, 20)));

    graph.cGroups.push(new CGroup(four, five, six));

    compacter(graph)
      .changeDirection(Direction.LEFT)
      .compact()
      .changeDirection(Direction.RIGHT)
      .compact()
      .changeDirection(Direction.UP)
      .compact()
      .changeDirection(Direction.DOWN)
      .compact()
      .finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(20, two.hitbox.x);
    assertEquals(40, three.hitbox.x);
    assertEquals(0, four.hitbox.x);
    assertEquals(20, five.hitbox.x);
    assertEquals(40, six.hitbox.x);

    assertEquals(0, one.hitbox.y);
    assertEquals(10, two.hitbox.y);
    assertEquals(20, three.hitbox.y);
    assertEquals(35, four.hitbox.y);
    assertEquals(45, five.hitbox.y);
    assertEquals(55, six.hitbox.y);
  });

  it('testSubsequentDirectionsCompaction', () => {
    const graph = newGraph();
    const one = add(graph, new CTestNode(rect(0, 0, 20, 20)));
    const two = add(graph, new CTestNode(rect(25, 0, 20, 20)));
    const three = add(graph, new CTestNode(rect(0, 25, 20, 20)));
    const four = add(graph, new CTestNode(rect(25, 25, 20, 20)));

    const directions = EnumSet.of(Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN);

    // subsequently apply all combinations of four subsequent compaction steps
    for (const d1 of directions) {
      for (const d2 of directions) {
        for (const d3 of directions) {
          for (const d4 of directions) {
            compacter(graph)
              .changeDirection(d1)
              .compact()
              .changeDirection(d2)
              .compact()
              .changeDirection(d3)
              .compact()
              .changeDirection(d4)
              .compact()
              .finish();

            // the way we modeled the graph, every node should stay where it is
            const currentDirections = `${d1.toString()} ${d2.toString()} ${d3.toString()} ${d4.toString()}`;
            assertEquals(0, one.hitbox.x, currentDirections);
            assertEquals(0, one.hitbox.y, currentDirections);

            assertEquals(25, two.hitbox.x, currentDirections);
            assertEquals(0, two.hitbox.y, currentDirections);

            assertEquals(0, three.hitbox.x, currentDirections);
            assertEquals(25, three.hitbox.y, currentDirections);

            assertEquals(25, four.hitbox.x, currentDirections);
            assertEquals(25, four.hitbox.y, currentDirections);
          }
        }
      }
    }
  });

  it('testHorizontalSpacings', () => {
    const graph = newGraph();

    // test horizontal direction
    const one = add(graph, new CTestNodeSpacing(rect(0, 0, 20, 20), 5, 0));
    const two = add(graph, new CTestNodeSpacing(rect(50, 0, 20, 20), 7, 0));
    const three = add(graph, new CTestNodeSpacing(rect(150, 0, 20, 20), 10, 0));

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(27, two.hitbox.x);
    assertEquals(57, three.hitbox.x);

    compacter(graph).changeDirection(Direction.RIGHT).compact().finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(27, two.hitbox.x);
    assertEquals(57, three.hitbox.x);

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(27, two.hitbox.x);
    assertEquals(57, three.hitbox.x);
  });

  it('testVerticalSpacingDuringHorizontalCompaction', () => {
    const graph = newGraph();

    const one = add(graph, new CTestNodeSpacing(rect(150, 11, 20, 20), 0, 10));
    const two = add(graph, new CTestNodeSpacing(rect(0, 40, 20, 20), 0, 5));
    const three = add(graph, new CTestNodeSpacing(rect(150, 76, 20, 20), 0, 15));

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(20, one.hitbox.x);
    assertEquals(0, two.hitbox.x);
    assertEquals(0, three.hitbox.x);
  });

  it('testVeticalSpacings', () => {
    const graph = newGraph();

    // test horizontal direction
    const one = add(graph, new CTestNodeSpacing(rect(0, 0, 20, 20), 0, 5));
    const two = add(graph, new CTestNodeSpacing(rect(0, 50, 20, 20), 0, 7));
    const three = add(graph, new CTestNodeSpacing(rect(0, 150, 20, 20), 0, 10));

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, one.hitbox.y);
    assertEquals(27, two.hitbox.y);
    assertEquals(57, three.hitbox.y);

    compacter(graph).changeDirection(Direction.DOWN).compact().finish();

    assertEquals(0, one.hitbox.y);
    assertEquals(27, two.hitbox.y);
    assertEquals(57, three.hitbox.y);

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, one.hitbox.y);
    assertEquals(27, two.hitbox.y);
    assertEquals(57, three.hitbox.y);
  });

  it('testHorizontalSpacingDuringVerticalCompaction', () => {
    const graph = newGraph();

    const one = add(graph, new CTestNodeSpacing(rect(16, 150, 20, 20), 5, 0));
    const two = add(graph, new CTestNodeSpacing(rect(40, 0, 20, 20), 10, 0));
    const three = add(graph, new CTestNodeSpacing(rect(76, 150, 20, 20), 15, 0));

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(20, one.hitbox.y);
    assertEquals(0, two.hitbox.y);
    assertEquals(0, three.hitbox.y);
  });
});
