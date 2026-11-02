// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { Spacings } from '../options/Spacings.js';
import type { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './LinearSegmentsNodePlacerLinearSegment.js';

/*
 * The "Post Processing for Correction" section of `LinearSegmentsNodePlacer` (`:809-886`), as functions over the sorted
 * segment array and the spacings (the Java instance fields). `postProcess` is split at its Java comment groups for the
 * complexity limits, in Java order. AD-10: arrays only.
 */

/** The `minRoomAbove` and `minRoomBelow` locals of `postProcess`' segment loop. */
interface Rooms {
  minRoomAbove: number;
  minRoomBelow: number;
}

/** The `minDisplacement` and `foundPlace` locals of `postProcess`' segment loop. */
class Displacement {
  minDisplacement: number = JavaInteger.MAX_VALUE;
  foundPlace = false;

  /** The shared test of both displacement loops: keeps `d` if it is smaller than the best and fits in the room. */
  offer(d: number, rooms: Rooms): void {
    if (
      Math.abs(d) < Math.abs(this.minDisplacement) &&
      Math.abs(d) < (d < 0 ? rooms.minRoomAbove : rooms.minRoomBelow)
    ) {
      this.minDisplacement = d;
      this.foundPlace = true;
    }
  }
}

/**
 * Post-process the balanced placement by moving linear segments where obvious improvements can be made.
 *
 * @param layeredGraph the layered graph
 * @see LinearSegmentsNodePlacer.java:817
 */
export function postProcess(_layeredGraph: LGraph, linearSegments: LinearSegment[], spacings: Spacings): void {
  // process each linear segment independently
  for (const segment of linearSegments) {
    const rooms = computeRooms(segment, spacings);

    const displacement = new Displacement();
    offerIncomingDisplacements(segment, rooms, displacement);
    offerOutgoingDisplacements(segment, rooms, displacement);

    // if such a displacement could be found, apply it to the whole linear segment
    if (displacement.foundPlace && displacement.minDisplacement !== 0) {
      for (const node of segment.nodes) {
        node.getPosition().y += displacement.minDisplacement;
      }
    }
  }
}

/** The first loop of `postProcess`' segment loop: the room above and below the segment. */
function computeRooms(segment: LinearSegment, spacings: Spacings): Rooms {
  let minRoomAbove: number = JavaInteger.MAX_VALUE;
  let minRoomBelow: number = JavaInteger.MAX_VALUE;

  for (const node of segment.nodes) {
    const index = node.getIndex();
    minRoomAbove = Math.min(roomAbove(node, index, spacings), minRoomAbove);
    minRoomBelow = Math.min(roomBelow(node, index, spacings), minRoomBelow);
  }
  return { minRoomAbove, minRoomBelow };
}

/** Determine the amount by which the linear segment can be moved up without overlap. */
function roomAbove(node: LNode, index: number, spacings: Spacings): number {
  if (index > 0) {
    const neighbor = node.getLayer()!.getNodes()[index - 1]!;
    const spacing = spacings.getVerticalSpacing(node, neighbor);
    return (
      node.getPosition().y -
      node.getMargin().top -
      (neighbor.getPosition().y + neighbor.getSize().y + neighbor.getMargin().bottom + spacing)
    );
  } else {
    return node.getPosition().y - node.getMargin().top;
  }
}

/** Determine the amount by which the linear segment can be moved down without overlap. */
function roomBelow(node: LNode, index: number, spacings: Spacings): number {
  if (index < node.getLayer()!.getNodes().length - 1) {
    const neighbor = node.getLayer()!.getNodes()[index + 1]!;
    const spacing = spacings.getVerticalSpacing(node, neighbor);
    return (
      neighbor.getPosition().y -
      neighbor.getMargin().top -
      (node.getPosition().y + node.getSize().y + node.getMargin().bottom + spacing)
    );
  } else {
    return 2 * node.getPosition().y;
  }
}

/** Determine the minimal displacement that would make one incoming edge straight. */
function offerIncomingDisplacements(segment: LinearSegment, rooms: Rooms, displacement: Displacement): void {
  const firstNode = segment.nodes[0]!;
  for (const target of firstNode.getPorts()) {
    const pos = firstNode.getPosition().y + target.getPosition().y + target.getAnchor().y;
    for (const edge of target.getIncomingEdges()) {
      const source = edge.getSource()!;
      const d = source.getNode()!.getPosition().y + source.getPosition().y + source.getAnchor().y - pos;
      displacement.offer(d, rooms);
    }
  }
}

/** Determine the minimal displacement that would make one outgoing edge straight. */
function offerOutgoingDisplacements(segment: LinearSegment, rooms: Rooms, displacement: Displacement): void {
  const lastNode = segment.nodes[segment.nodes.length - 1]!;
  for (const source of lastNode.getPorts()) {
    const pos = lastNode.getPosition().y + source.getPosition().y + source.getAnchor().y;
    for (const edge of source.getOutgoingEdges()) {
      const target = edge.getTarget()!;
      const d = target.getNode()!.getPosition().y + target.getPosition().y + target.getAnchor().y - pos;
      displacement.offer(d, rooms);
    }
  }
}
