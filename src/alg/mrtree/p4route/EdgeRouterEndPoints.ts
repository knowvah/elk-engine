// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../core/options/Direction.js';
import { compare as compareDoubles } from '../../../java/lang/DoubleCompare.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { TreeUtil } from '../TreeUtil.js';
import {
  labelEquals,
  ONE_HALF,
  STEEP_END_EDGE_RATIO,
  STEEP_END_EDGE_SAMPLE_HEIGHT,
  STEEP_END_EDGE_THERESHOLD_DISTANCE,
  SUPER_ROOT_LABEL,
} from './EdgeRouterShared.js';

/** The parameters `avoidOverlapSetEndPoints` passes to every direction arm, bundled for the five-parameter limit. */
interface EndPointContext {
  readonly tGraph: TGraph;
  readonly nodeBendpointPadding: number;
  readonly edgeEndTexturePadding: number;
}

/**
 * Handles the end points for AvoidOverlap edge routing.
 *
 * @param tGraph the graph to work on
 * @param d the current layout direction
 * @param nodeBendpointPadding the Node BendPoint Padding
 * @param edgeEndTexturePadding the length of the texture at the end of edges set in the MrTreeOptions
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:455
 */
export function avoidOverlapSetEndPoints(
  tGraph: TGraph,
  d: Direction,
  nodeBendpointPadding: number,
  edgeEndTexturePadding: number,
): void {
  const ctx: EndPointContext = { tGraph, nodeBendpointPadding, edgeEndTexturePadding };
  for (const n of tGraph.getNodes()) {
    if (labelEquals(n, SUPER_ROOT_LABEL)) {
      continue;
    }

    // Get the incoming edges and sort them by their current bendPoints
    // Similarly to setStartPoints I do not use the n.getIncomingEdges() here for the same reasons
    const ins = TreeUtil.getAllIncomingEdges(n, tGraph);
    if (d.isHorizontal()) {
      ins.sort((x, y) => compareDoubles(TreeUtil.getLastPoint(x).y, TreeUtil.getLastPoint(y).y));
    } else {
      ins.sort((x, y) => compareDoubles(TreeUtil.getLastPoint(x).x, TreeUtil.getLastPoint(y).x));
    }

    // Set the bendPoints
    const num = ins.length;
    for (let i = 0; i < num; i++) {
      const interpolation = num === 1 ? ONE_HALF : (1 + i) / (num + 1);
      setEndPoint(ctx, d, n, ins[i]!, interpolation);
    }
  }
}

/**
 * The direction chain of the inner loop.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:478
 */
function setEndPoint(ctx: EndPointContext, d: Direction, n: TNode, edge: TEdge, interpolation: number): void {
  if (d === Direction.LEFT) {
    setEndPointLeft(ctx, n, edge, interpolation);
  } else if (d === Direction.RIGHT) {
    setEndPointRight(ctx, n, edge, interpolation);
  } else if (d === Direction.UP) {
    setEndPointUp(ctx, n, edge, interpolation);
  } else {
    setEndPointDown(ctx, n, edge, interpolation);
  }
}

/** @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:478 */
function setEndPointLeft(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const { nodeBendpointPadding, edgeEndTexturePadding } = ctx;
  const levelStartCoord = n.getProperty(InternalProperties.LEVELMAX);
  // Only add level bendPoint if the distance is great enough
  if (n.getPosition().x + n.getSize().x + edgeEndTexturePadding < levelStartCoord) {
    edge.getBendPoints().add(levelStartCoord + nodeBendpointPadding, n.getPosition().y + n.getSize().y * interpolation);
    // If the angle of the end piece is too steep, add another bendpoint
  } else if (edge.getBendPoints().size() > 0) {
    steepEndLeft(ctx, n, edge, interpolation);
  }
  edge.getBendPoints().add(n.getPosition().x + n.getSize().x, n.getPosition().y + n.getSize().y * interpolation);
}

/** The steep end piece block of the LEFT arm. @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:486 */
function steepEndLeft(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const texture = ctx.edgeEndTexturePadding;
  const lastX = edge.getBendPoints().getLast().x;
  const nextX = n.getPosition().x + n.getSize().x / 2;
  const lastY = edge.getBendPoints().getLast().y;
  const nextY = n.getPosition().y + n.getSize().y / 2;
  if (
    texture > 0 &&
    Math.abs(lastY - nextY) / (Math.abs(lastX - nextX) / STEEP_END_EDGE_SAMPLE_HEIGHT) >
      STEEP_END_EDGE_THERESHOLD_DISTANCE
  ) {
    if (nextY > lastY) {
      // Place it to the left
      edge
        .getBendPoints()
        .add(
          n.getPosition().x + n.getSize().x + texture / STEEP_END_EDGE_RATIO,
          n.getPosition().y + n.getSize().y * interpolation - texture / 2,
        );
    } else {
      // Place it to the right
      edge
        .getBendPoints()
        .add(
          n.getPosition().x + n.getSize().x + texture / STEEP_END_EDGE_RATIO,
          n.getPosition().y + n.getSize().y * interpolation + texture / 2,
        );
    }
  }
}

/** @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:507 */
function setEndPointRight(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const { nodeBendpointPadding, edgeEndTexturePadding } = ctx;
  const levelStartCoord = n.getProperty(InternalProperties.LEVELMIN);
  // Only add level bendPoint if the distance is great enough
  if (n.getPosition().x - edgeEndTexturePadding > levelStartCoord) {
    edge.getBendPoints().add(levelStartCoord - nodeBendpointPadding, n.getPosition().y + n.getSize().y * interpolation);
    // If the angle of the end piece is too steep, add another bendpoint
  } else if (edge.getBendPoints().size() > 0) {
    steepEndRight(ctx, n, edge, interpolation);
  }
  edge.getBendPoints().add(n.getPosition().x, n.getPosition().y + n.getSize().y * interpolation);
}

/** The steep end piece block of the RIGHT arm. @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:515 */
function steepEndRight(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const texture = ctx.edgeEndTexturePadding;
  const lastX = edge.getBendPoints().getLast().x;
  const nextX = n.getPosition().x + n.getSize().x / 2;
  const lastY = edge.getBendPoints().getLast().y;
  const nextY = n.getPosition().y + n.getSize().y / 2;
  if (
    texture > 0 &&
    Math.abs(lastY - nextY) / (Math.abs(lastX - nextX) / STEEP_END_EDGE_SAMPLE_HEIGHT) >
      STEEP_END_EDGE_THERESHOLD_DISTANCE
  ) {
    if (nextY > lastY) {
      edge
        .getBendPoints()
        .add(
          n.getPosition().x - texture / STEEP_END_EDGE_RATIO,
          n.getPosition().y + n.getSize().y * interpolation - texture / 2,
        );
    } else {
      edge
        .getBendPoints()
        .add(
          n.getPosition().x - texture / STEEP_END_EDGE_RATIO,
          n.getPosition().y + n.getSize().y * interpolation + texture / 2,
        );
    }
  }
}

/** @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:534 */
function setEndPointUp(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const { nodeBendpointPadding, edgeEndTexturePadding } = ctx;
  const levelStartCoord = n.getProperty(InternalProperties.LEVELMAX);
  // Only add level bendPoint if the distance is great enough
  if (n.getPosition().y + n.getSize().y + edgeEndTexturePadding < levelStartCoord) {
    edge.getBendPoints().add(n.getPosition().x + n.getSize().x * interpolation, levelStartCoord + nodeBendpointPadding);
    // If the angle of the end piece is too steep, add another bendpoint
  } else if (edge.getBendPoints().size() > 0) {
    steepEndUp(ctx, n, edge, interpolation);
  }
  edge.getBendPoints().add(n.getPosition().x + n.getSize().x * interpolation, n.getPosition().y + n.getSize().y);
}

/** The steep end piece block of the UP arm. @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:542 */
function steepEndUp(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const texture = ctx.edgeEndTexturePadding;
  const lastX = edge.getBendPoints().getLast().x;
  const nextX = n.getPosition().x + n.getSize().x / 2;
  const lastY = edge.getBendPoints().getLast().y;
  const nextY = n.getPosition().y + n.getSize().y / 2;
  if (
    texture > 0 &&
    Math.abs(lastX - nextX) / (Math.abs(lastY - nextY) / STEEP_END_EDGE_SAMPLE_HEIGHT) >
      STEEP_END_EDGE_THERESHOLD_DISTANCE
  ) {
    if (nextX > lastX) {
      edge
        .getBendPoints()
        .add(
          n.getPosition().x + n.getSize().x * interpolation - texture / 2,
          n.getPosition().y + texture / STEEP_END_EDGE_RATIO + n.getSize().y,
        );
    } else {
      edge
        .getBendPoints()
        .add(
          n.getPosition().x + n.getSize().x * interpolation + texture / 2,
          n.getPosition().y + texture / STEEP_END_EDGE_RATIO + n.getSize().y,
        );
    }
  }
}

/** The final `else` (DOWN, and UNDEFINED). @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:561 */
function setEndPointDown(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const { nodeBendpointPadding, edgeEndTexturePadding } = ctx;
  const levelStartCoord = n.getProperty(InternalProperties.LEVELMIN);
  // For cycle inducing edges add the end piece
  if (TreeUtil.isCycleInducing(edge, ctx.tGraph)) {
    edge.getBendPoints().add(n.getPosition().x + n.getSize().x * interpolation, edge.getBendPoints().getLast().y);
    // Only add level bendPoint if the distance is great enough
  } else if (n.getPosition().y - edgeEndTexturePadding > levelStartCoord) {
    edge.getBendPoints().add(n.getPosition().x + n.getSize().x * interpolation, levelStartCoord - nodeBendpointPadding);
    // If the angle of the end piece is too steep, add another bend point
  } else if (edge.getBendPoints().size() > 0) {
    steepEndDown(ctx, n, edge, interpolation);
  }

  edge.getBendPoints().add(n.getPosition().x + n.getSize().x * interpolation, n.getPosition().y);
}

/** The steep end piece block of the final arm. @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:573 */
function steepEndDown(ctx: EndPointContext, n: TNode, edge: TEdge, interpolation: number): void {
  const texture = ctx.edgeEndTexturePadding;
  const lastX = edge.getBendPoints().getLast().x;
  const nextX = n.getPosition().x + n.getSize().x / 2;
  const lastY = edge.getBendPoints().getLast().y;
  const nextY = n.getPosition().y + n.getSize().y / 2;
  if (
    texture > 0 &&
    Math.abs(lastX - nextX) / (Math.abs(lastY - nextY) / STEEP_END_EDGE_SAMPLE_HEIGHT) >
      STEEP_END_EDGE_THERESHOLD_DISTANCE
  ) {
    if (nextX > lastX) {
      edge
        .getBendPoints()
        .add(
          n.getPosition().x + n.getSize().x * interpolation - texture / 2,
          n.getPosition().y - texture / STEEP_END_EDGE_RATIO,
        );
    } else {
      edge
        .getBendPoints()
        .add(
          n.getPosition().x + n.getSize().x * interpolation + texture / 2,
          n.getPosition().y - texture / STEEP_END_EDGE_RATIO,
        );
    }
  }
}
