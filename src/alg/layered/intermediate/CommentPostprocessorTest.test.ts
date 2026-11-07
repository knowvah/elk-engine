// SPDX-License-Identifier: EPL-2.0
/*
 * Port of CommentPostprocessorTest (mission 7f2, T13b): the spacings of comment boxes around the node they are attached to.
 * `@GraphResourceProvider` (`tests/layered/comment_boxes/**`), `@Algorithm(layered)` and `@DefaultConfiguration` go through
 * the layout test runner; the one `@Test`, `testSpacings`, runs once per graph (3 oracle runs, `java-baseline.md`).
 * The three comment-box models are vendored under `test/golden/inputs/labels/` (T1), `$ELK_MODELS_DIR` itself under
 * `PIPELINE_SUITES_FULL=1`. The `(non-vacuity)` case lays the same graphs out again and counts comment boxes with an edge.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/CommentPostprocessorTest.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { defineLayoutTest, FULL_SUITES_ENV } from '../../../../test/helpers/layout-test-runner.js';
import { compare } from '../../../java/lang/DoubleCompare.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const TOLERANCE = 0.1;
/** The T1-vendored copy of the comment-box models lives under `labels/`; the full models root has none. */
const GRAPHS_PATH = (process.env[FULL_SUITES_ENV] === '1' ? '' : 'labels/') + 'tests/layered/comment_boxes/**';

/** `node.getIncomingEdges().stream().map(inEdge -> inEdge.getSources().get(0))...` and the outgoing counterpart. */
function gatherConnectedCommentsSortedByX(node: ElkNode): ElkNode[] {
  const comments: ElkNode[] = [];

  for (const inEdge of node.getIncomingEdges()) {
    const comment = ElkGraphUtil.connectableShapeToNode(inEdge.getSources().get(0)) as ElkNode;
    if (comment.getProperty(LayeredOptions.COMMENT_BOX)) {
      comments.push(comment);
    }
  }
  for (const outEdge of node.getOutgoingEdges()) {
    const comment = ElkGraphUtil.connectableShapeToNode(outEdge.getTargets().get(0)) as ElkNode;
    if (comment.getProperty(LayeredOptions.COMMENT_BOX)) {
      comments.push(comment);
    }
  }

  comments.sort((n1, n2) => compare(n1.getX(), n2.getX()));
  return comments;
}

/** The comment boxes of a graph's non-comment nodes that are connected to one (what the Java's loop visits). */
function connectedCommentCount(graph: ElkNode): number {
  return [...graph.getChildren()]
    .filter((node) => !node.getProperty(LayeredOptions.COMMENT_BOX))
    .reduce((sum, node) => sum + gatherConnectedCommentsSortedByX(node).length, 0);
}

/** The running state of the Java's per-node loop: where the next top and bottom comment is expected, and their widths. */
interface Placement {
  nextTopX: number;
  nextBottomX: number;
  topCommentsWidth: number;
  bottomCommentsWidth: number;
}

function checkTopComment(node: ElkNode, comment: ElkNode, state: Placement, spacings: readonly [number, number]): void {
  const [commentCommentSpacing, commentNodeSpacing] = spacings;
  // Top comment; check y coordinate
  assertEqualsWithin(
    `Comment node spacing ${commentNodeSpacing} violated by comment ${comment.getIdentifier()}`,
    node.getY() - commentNodeSpacing - comment.getHeight(),
    comment.getY(),
    TOLERANCE,
  );

  // Check x coordinate
  if (!Number.isNaN(state.nextTopX)) {
    assertEqualsWithin(
      `Comment comment spacing ${commentCommentSpacing} violated by comment ${comment.getIdentifier()}`,
      state.nextTopX,
      comment.getX(),
      TOLERANCE,
    );
  }

  state.nextTopX = comment.getX() + comment.getWidth() + commentCommentSpacing;
  state.topCommentsWidth += comment.getWidth() + commentCommentSpacing;
}

function checkBottomComment(
  node: ElkNode,
  comment: ElkNode,
  state: Placement,
  spacings: readonly [number, number],
): void {
  const [commentCommentSpacing, commentNodeSpacing] = spacings;
  // Bottom comment; check y coordinate
  assertEqualsWithin(
    `Comment node spacing ${commentNodeSpacing} violated by comment ${comment.getIdentifier()}`,
    node.getY() + node.getHeight() + commentNodeSpacing,
    comment.getY(),
    TOLERANCE,
  );

  // Check x coordinate
  if (!Number.isNaN(state.nextBottomX)) {
    assertEqualsWithin(
      `Comment comment spacing ${commentCommentSpacing} violated by comment ${comment.getIdentifier()}`,
      state.nextBottomX,
      comment.getX(),
      TOLERANCE,
    );
  }

  state.nextBottomX = comment.getX() + comment.getWidth() + commentCommentSpacing;
  state.bottomCommentsWidth += comment.getWidth() + commentCommentSpacing;
}

/** The body of the Java's loop over the non-comment nodes. */
function checkNode(graph: ElkNode, node: ElkNode): void {
  // Retrieve applicable spacings
  const commentCommentSpacing = graph.getProperty(LayeredOptions.SPACING_COMMENT_COMMENT);
  const commentNodeSpacing = graph.getProperty(LayeredOptions.SPACING_COMMENT_NODE);
  const spacings = [commentCommentSpacing, commentNodeSpacing] as const;

  // We go through the top and bottom comments from left to right and keep track where we expect the
  // next comment's x coordinate to be (separately for top and bottom comments)
  // We'll also keep track of the width required to place top and bottom comments to check whether they are
  // centred above or below the node
  const state: Placement = { nextTopX: NaN, nextBottomX: NaN, topCommentsWidth: 0, bottomCommentsWidth: 0 };

  for (const comment of gatherConnectedCommentsSortedByX(node)) {
    if (comment.getY() < node.getY()) {
      checkTopComment(node, comment, state, spacings);
    } else {
      checkBottomComment(node, comment, state, spacings);
    }
  }

  // Check if comments are centred
  if (state.topCommentsWidth > 0) {
    state.topCommentsWidth -= commentCommentSpacing;
    assertEqualsWithin(
      `Top comments not centred above node ${node.getIdentifier()}`,
      node.getX() + node.getWidth() / 2,
      state.nextTopX - commentCommentSpacing - state.topCommentsWidth / 2,
      TOLERANCE,
    );
  }

  if (state.bottomCommentsWidth > 0) {
    state.bottomCommentsWidth -= commentCommentSpacing;
    assertEqualsWithin(
      `Bottom comments not centred below node ${node.getIdentifier()}`,
      node.getX() + node.getWidth() / 2,
      state.nextBottomX - commentCommentSpacing - state.bottomCommentsWidth / 2,
      TOLERANCE,
    );
  }
}

const SUITE = {
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: GRAPHS_PATH }],
} as const;

defineLayoutTest({
  ...SUITE,
  name: 'CommentPostprocessorTest',
  afterLayout: {
    testSpacings: (graph: ElkNode): void => {
      // Run our test on all non-comment nodes
      for (const node of graph.getChildren()) {
        // Ignore comment boxes
        if (node.getProperty(LayeredOptions.COMMENT_BOX)) {
          continue;
        }
        checkNode(graph, node);
      }
    },
  },
});

let observedComments = 0;
let observedGraphs = 0;
defineLayoutTest({
  ...SUITE,
  name: 'CommentPostprocessorTest (non-vacuity graphs)',
  afterLayout: {
    countComments: (graph: ElkNode): void => {
      observedGraphs += 1;
      observedComments += connectedCommentCount(graph);
    },
  },
});

describe('CommentPostprocessorTest (non-vacuity)', () => {
  it('(non-vacuity)', () => {
    expect(observedGraphs).toBe(3);
    // the three models hold comment boxes attached by an edge; the spacing checks above visit every one of them
    expect(observedComments).toBeGreaterThan(0);
  });
});
