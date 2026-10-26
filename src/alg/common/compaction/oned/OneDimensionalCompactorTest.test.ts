// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from './CGraph.js';
import { CGroup } from './CGroup.js';
import { CNode } from './CNode.js';
import type { ISpacingsHandler } from './ISpacingsHandler.js';
import { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

/**
 * Several tests for the {@link OneDimensionalCompactor}.
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/compaction/oned/OneDimensionalCompactorTest.java
 */

const EPSILON = 0.0001;
const SPACING = 5;

/** JUnit `assertEquals(expected, actual, delta)`. */
function assertEquals(expected: number, actual: number, message = ''): void {
  expect(actual, message).toBeGreaterThanOrEqual(expected - EPSILON);
  expect(actual, message).toBeLessThanOrEqual(expected + EPSILON);
}

const TEST_SPACING_HANDLER: ISpacingsHandler = {
  getVerticalSpacing: () => SPACING,
  getHorizontalSpacing: () => SPACING,
};

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));

const node = (graph: CGraph, x: number, y: number, w: number, h: number): CNode =>
  CNode.of()
    .hitbox(new ElkRectangle(x, y, w, h))
    .create(graph);

const compacter = (graph: CGraph): OneDimensionalCompactor =>
  new OneDimensionalCompactor(graph).setConstraintAlgorithm(OneDimensionalCompactor.QUADRATIC_CONSTRAINTS);

describe('OneDimensionalCompactorTest', () => {
  it('testLeftCompaction', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const right = node(graph, 30, 0, 20, 20);

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(20, right.hitbox.x);
  });

  it('testLeftCompactionEqualYCoordinate', () => {
    const graph = newGraph();
    const top = node(graph, 0, 0, 20, 20);
    const bot = node(graph, 30, 20, 20, 20);

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
    const left = node(graph, 0, 0, 20, 20);
    const right = node(graph, 30, 20 + SPACING - 1, 20, 20);

    compacter(graph).setSpacingsHandler(TEST_SPACING_HANDLER).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(25, right.hitbox.x);
  });

  it('testLeftCompactionSpacingAware2', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const right = node(graph, 30, 20 + SPACING + 1, 20, 20);

    compacter(graph).setSpacingsHandler(TEST_SPACING_HANDLER).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(0, right.hitbox.x);
  });

  it('testRightCompaction', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const right = node(graph, 30, 0, 20, 20);

    compacter(graph).changeDirection(Direction.RIGHT).compact().finish();

    assertEquals(10, left.hitbox.x);
    assertEquals(30, right.hitbox.x);
  });

  it('testUpCompaction', () => {
    const graph = newGraph();
    const upper = node(graph, 0, 0, 20, 20);
    const lower = node(graph, 0, 30, 20, 20);

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, upper.hitbox.y);
    assertEquals(20, lower.hitbox.y);
  });

  it('testDownCompaction', () => {
    const graph = newGraph();
    const upper = node(graph, 0, 0, 20, 20);
    const lower = node(graph, 0, 30, 20, 20);

    compacter(graph).changeDirection(Direction.DOWN).compact().finish();

    assertEquals(10, upper.hitbox.y);
    assertEquals(30, lower.hitbox.y);
  });

  // The connection in the Java sketch indicates a grouping, not an edge.
  it('testLeftGroupCompaction', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const upperRight = node(graph, 40, 5, 20, 20);
    const lowerRight = node(graph, 30, 25, 20, 20);

    CGroup.of().nodes(upperRight, lowerRight).create(graph);

    compacter(graph).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, left.hitbox.x);
    assertEquals(20, upperRight.hitbox.x);
    assertEquals(10, lowerRight.hitbox.x);
  });

  it('testRightGroupCompaction', () => {
    const graph = newGraph();
    const left = node(graph, 0, 5, 20, 20);
    const upperRight = node(graph, 40, 0, 20, 20);
    const lowerRight = node(graph, 10, 25, 20, 20);

    CGroup.of().nodes(left, lowerRight).create(graph);

    compacter(graph).changeDirection(Direction.RIGHT).compact().finish();

    assertEquals(20, left.hitbox.x);
    assertEquals(40, upperRight.hitbox.x);
    assertEquals(30, lowerRight.hitbox.x);
  });

  it('testUpGroupCompaction', () => {
    const graph = newGraph();
    const upperLeft = node(graph, 0, 0, 20, 20);
    const lowerLeft = node(graph, 5, 40, 20, 20);
    const right = node(graph, 25, 30, 20, 20);

    CGroup.of().nodes(lowerLeft, right).create(graph);

    compacter(graph).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, upperLeft.hitbox.y);
    assertEquals(20, lowerLeft.hitbox.y);
    assertEquals(10, right.hitbox.y);
  });

  it('testDownGroupCompaction', () => {
    const graph = newGraph();
    const upperLeft = node(graph, 0, 0, 20, 20);
    const lowerLeft = node(graph, 5, 40, 10, 20);
    const right = node(graph, 25, 10, 20, 20);

    CGroup.of().nodes(upperLeft, right).create(graph);

    compacter(graph).changeDirection(Direction.DOWN).compact().finish();

    assertEquals(20, upperLeft.hitbox.y);
    assertEquals(40, lowerLeft.hitbox.y);
    assertEquals(30, right.hitbox.y);
  });

  // Two separate groups, three nodes each: no spacing is applied within a group.
  it('testNoSpacingAppliedWithinGroups', () => {
    const graph = newGraph();
    const one = node(graph, 0, 0, 20, 20);
    const two = node(graph, 20, 10, 20, 20);
    const three = node(graph, 40, 20, 20, 20);

    CGroup.of().nodes(one, two, three).create(graph);

    const four = node(graph, 22, 80, 20, 20);
    const five = node(graph, 42, 90, 20, 20);
    const six = node(graph, 62, 100, 20, 20);

    CGroup.of().nodes(four, five, six).create(graph);

    compacter(graph)
      .setSpacingsHandler(TEST_SPACING_HANDLER)
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

  /* --------------------------------------------------
   * Testing subsequent calls with different directions
   * -------------------------------------------------- */

  it('testSubsequentDirectionsCompaction', () => {
    const graph = newGraph();
    const one = node(graph, 0, 0, 20, 20);
    const two = node(graph, 25, 0, 20, 20);
    const three = node(graph, 0, 25, 20, 20);
    const four = node(graph, 25, 25, 20, 20);

    const directions = [...EnumSet.of(Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN)];

    // subsequently apply all combinations of four subsequent compaction steps
    for (const d1 of directions) {
      for (const d2 of directions) {
        for (const d3 of directions) {
          for (const d4 of directions) {
            compacter(graph)
              .setSpacingsHandler(TEST_SPACING_HANDLER)
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

  /* --------------------------------------------------
   *        Testing different kinds of spacings.
   * --------------------------------------------------*/

  // Horizontal spacing should be preserved when compaction leftwards or rightwards.
  it('testHorizontalSpacings', () => {
    const graph = newGraph();

    // test horizontal direction
    const one = node(graph, 0, 0, 20, 20);
    const two = node(graph, 50, 0, 20, 20);
    const three = node(graph, 150, 0, 20, 20);

    const spacingHandler: ISpacingsHandler = {
      getVerticalSpacing: () => SPACING,
      getHorizontalSpacing: (cNode1, cNode2) => {
        // order realizes a "max" function
        if (cNode1 === three || cNode2 === three) return 10;
        if (cNode1 === two || cNode2 === two) return 7;
        if (cNode1 === one || cNode2 === one) return 5;
        return SPACING;
      },
    };

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(27, two.hitbox.x);
    assertEquals(57, three.hitbox.x);

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.RIGHT).compact().finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(27, two.hitbox.x);
    assertEquals(57, three.hitbox.x);

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(0, one.hitbox.x);
    assertEquals(27, two.hitbox.x);
    assertEquals(57, three.hitbox.x);
  });

  // "Two" is "center node". Node "one" is supposed to be blocked by "two", while "three" can move freely.
  it('testVerticalSpacingDuringHorizontalCompaction', () => {
    const graph = newGraph();

    const one = node(graph, 150, 11, 20, 20);
    const two = node(graph, 0, 40, 20, 20);
    const three = node(graph, 150, 76, 20, 20);

    const spacingHandler: ISpacingsHandler = {
      getVerticalSpacing: (cNode1, cNode2) => {
        // order realizes a "max" function
        if (cNode1 === three || cNode2 === three) return 15;
        if (cNode1 === one || cNode2 === one) return 10;
        if (cNode1 === two || cNode2 === two) return 5;
        return 0;
      },
      getHorizontalSpacing: () => 0,
    };

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.LEFT).compact().finish();

    assertEquals(20, one.hitbox.x);
    assertEquals(0, two.hitbox.x);
    assertEquals(0, three.hitbox.x);
  });

  // Vertical spacing should be preserved when compaction upwards or downwards.
  it('testVerticalSpacings', () => {
    const graph = newGraph();

    const one = node(graph, 0, 0, 20, 20);
    const two = node(graph, 0, 50, 20, 20);
    const three = node(graph, 0, 150, 20, 20);

    const spacingHandler: ISpacingsHandler = {
      getVerticalSpacing: (cNode1, cNode2) => {
        // order realizes a "max" function
        if (cNode1 === three || cNode2 === three) return 10;
        if (cNode1 === two || cNode2 === two) return 7;
        if (cNode1 === one || cNode2 === one) return 5;
        return 0;
      },
      getHorizontalSpacing: () => 0,
    };

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, one.hitbox.y);
    assertEquals(27, two.hitbox.y);
    assertEquals(57, three.hitbox.y);

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.DOWN).compact().finish();

    assertEquals(0, one.hitbox.y);
    assertEquals(27, two.hitbox.y);
    assertEquals(57, three.hitbox.y);

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.UP).compact().finish();

    assertEquals(0, one.hitbox.y);
    assertEquals(27, two.hitbox.y);
    assertEquals(57, three.hitbox.y);
  });

  // "Two" is "center node". Node "one" is supposed to be blocked by "two", while "three" can move freely.
  it('testHorizontalSpacingDuringVerticalCompaction', () => {
    const graph = newGraph();

    const one = node(graph, 16, 150, 20, 20);
    const two = node(graph, 40, 0, 20, 20);
    const three = node(graph, 76, 150, 20, 20);

    const spacingHandler: ISpacingsHandler = {
      getVerticalSpacing: () => 0,
      getHorizontalSpacing: (cNode1, cNode2) => {
        // order realizes a "max" function
        if (cNode1 === three || cNode2 === three) return 15;
        if (cNode1 === two || cNode2 === two) return 10;
        if (cNode1 === one || cNode2 === one) return 5;
        return 0;
      },
    };

    compacter(graph).setSpacingsHandler(spacingHandler).changeDirection(Direction.UP).compact().finish();

    assertEquals(20, one.hitbox.y);
    assertEquals(0, two.hitbox.y);
    assertEquals(0, three.hitbox.y);
  });
});
