// SPDX-License-Identifier: EPL-2.0
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import { CompareFuzzy } from '../../../common/compaction/oned/CompareFuzzy.js';
import { KVector } from '../../../../core/math/KVector.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { VerticalSegment } from './VerticalSegment.js';

// Java's `LGraphToCGraphTransformer.collectVerticalSegmentsOrthogonal` (:~220-330), moved out of the class (file size
// limit) and split along its comments: the per-edge bodies are the helpers below. `nodesMap` is the transformer's map.

/**
 * Sets the ignored sides of a segment next to a node (or edge end): the first segment of an outgoing edge against its
 * source node, the last one against its target node. Java writes the same three-way test twice (with `bend2` and the
 * source CNode, then `bend1` and the target CNode).
 */
function ignoreSpacingAgainst(segment: VerticalSegment, y: number, cNode: CNode | null): void {
  const hitbox = cNode!.hitbox;
  if (y < hitbox.y) {
    segment.ignoreSpacing.down = true;
  } else if (y > hitbox.y + hitbox.height) {
    segment.ignoreSpacing.up = true;
  } else {
    // completely surrounded
    segment.ignoreSpacing.up = true;
    segment.ignoreSpacing.down = true;
  }
}

/**
 * The segment of a north/south port: from `bend1` to the node border. Java writes this twice (the source port of an
 * outgoing edge, the target port of an incoming edge) with identical bodies.
 */
function addPortSegments(
  port: LPort,
  bend1: KVector,
  cNode: CNode | null,
  edge: LEdge,
  verticalSegments: VerticalSegment[],
): void {
  if (port.getSide() === PortSide.NORTH) {
    const vs = new VerticalSegment(bend1, new KVector(bend1.x, cNode!.hitbox.y), cNode, edge);
    vs.ignoreSpacing.down = true;
    vs.aPort = port;
    verticalSegments.push(vs);
  }
  if (port.getSide() === PortSide.SOUTH) {
    const vs = new VerticalSegment(bend1, new KVector(bend1.x, cNode!.hitbox.y + cNode!.hitbox.height), cNode, edge);
    vs.ignoreSpacing.up = true;
    vs.aPort = port;
    verticalSegments.push(vs);
  }
}

/** `nodesMap.get(edge.getTarget().getNode())` (null for a node without CNode, e.g. a comment box). */
function targetCNodeOf(edge: LEdge, nodesMap: ReadonlyMap<LNode, CNode>): CNode | null {
  return nodesMap.get((edge.getTarget() as LPort).getNode() as LNode) ?? null;
}

/** The edge, source CNode and result list `addRegularSegment` works on. */
interface SegmentSink {
  readonly edge: LEdge;
  readonly cNode: CNode | null;
  readonly verticalSegments: VerticalSegment[];
}

/**
 * A regular segment between two bends. The first vertical segment of an outgoing edge (`first`; Java clears its flag
 * inside this branch, the caller clears it after every segment, which is the same) gets the ignored sides.
 */
function addRegularSegment(sink: SegmentSink, bend1: KVector, bend2: KVector, first: boolean): VerticalSegment {
  const lastSegment = new VerticalSegment(bend1, bend2, null, sink.edge);
  sink.verticalSegments.push(lastSegment);

  // the first vertical segment of an outgoing edge
  if (first) {
    // make sure that "invalid" spacing that sometimes is required
    // to route the edges away from the nodes, does not become an issue
    ignoreSpacingAgainst(lastSegment, bend2.y, sink.cNode);
  }
  return lastSegment;
}

/** The body of Java's loop over the outgoing edges of a node. */
function collectOutgoing(
  edge: LEdge,
  cNode: CNode | null,
  nodesMap: ReadonlyMap<LNode, CNode>,
  verticalSegments: VerticalSegment[],
): void {
  // Java's Iterator<KVector> over the bend points, as an array and a position (`hasNext` is `pos < bends.length`)
  const bends = edge.getBendPoints().toArray();
  let pos = 0;

  let first = true;
  let lastSegment: VerticalSegment | null = null;
  // infer vertical segments from positions of bendpoints
  if (pos < bends.length) {
    let bend1 = bends[pos++]!;

    // get segment of source n/s port of outgoing segment
    addPortSegments(edge.getSource() as LPort, bend1, cNode, edge, verticalSegments);

    // get regular segments
    while (pos < bends.length) {
      const bend2 = bends[pos++]!; // Java declares `bend2` outside the loop; it is not read after it
      if (!CompareFuzzy.eq(bend1.y, bend2.y)) {
        lastSegment = addRegularSegment({ edge, cNode, verticalSegments }, bend1, bend2, first);
        first = false;
      }

      if (pos < bends.length) {
        bend1 = bend2;
      }
    }

    // handle last vertical segment
    if (lastSegment !== null) {
      ignoreSpacingAgainst(lastSegment, bend1.y, targetCNodeOf(edge, nodesMap));
    }
  }
}

/** @returns the vertical segments of all edges of the graph (orthogonal edge routing). */
export function collectVerticalSegmentsOrthogonal(
  layeredGraph: LGraph,
  nodesMap: ReadonlyMap<LNode, CNode>,
): VerticalSegment[] {
  const verticalSegments: VerticalSegment[] = [];

  for (const layer of layeredGraph) {
    for (const node of layer) {
      const cNode = nodesMap.get(node) ?? null;

      // add vertical edge segments
      for (const edge of node.getOutgoingEdges()) {
        collectOutgoing(edge, cNode, nodesMap, verticalSegments);
      }

      // same for incoming edges to get north/south segments on target side
      for (const edge of node.getIncomingEdges()) {
        if (!edge.getBendPoints().isEmpty()) {
          // get segment of target n/s port
          const bend1 = edge.getBendPoints().getLast();
          addPortSegments(edge.getTarget() as LPort, bend1, cNode, edge, verticalSegments);
        }
      }
    }
  }

  return verticalSegments;
}
