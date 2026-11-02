// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import type { Layer } from '../graph/Layer.js';
import { PortSide } from '../../../core/options/PortSide.js';
import * as Lists from '../../../guava/Lists.js';
import { JUNCTION, OTHER, VISITED } from './NetworkSimplexPlacerConstants.js';
import { Path } from './NetworkSimplexPlacerPath.js';
import type { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';
import { isHandledEdge } from './NetworkSimplexPlacerWeights.js';

// ------------------------------------------------------------------------------------------------
//                                      Path identification
// ------------------------------------------------------------------------------------------------

/** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java */
export function identifyPaths(s: NetworkSimplexPlacerState): Path[] {
  const paths: Path[] = [];
  s.lGraph!.getLayers()
    .flatMap((l) => l.getNodes())
    .filter((n) => s.nodeState![n.id] === JUNCTION)
    .forEach((junction) => {
      for (const e of junction.getConnectedEdges()) {
        if (!isHandledEdge(e)) {
          continue;
        }
        const path = follow(s, e, junction, new Path());
        if (path.size() > 1) {
          paths.push(path);
        }
      }
    });
  return paths;
}

/**
 * N6: the Java `follow` (`:1248`) recurses only as `return follow(...)` in the tail position of its loop, so the
 * depth equals the number of layers a path of long-edge dummies spans. This loop assigns the three parameters and
 * repeats the body; the statement order and effects are those of the recursive call.
 */
export function follow(s: NetworkSimplexPlacerState, edge: LEdge, current: LNode, path: Path): Path {
  for (;;) {
    const other = edge.getOther(current)!;
    path.add(edge);

    // stop criteria
    if (s.nodeState![other.id] === VISITED || s.nodeState![other.id] === JUNCTION || s.crossing![edge.id]) {
      return path;
    }

    // recurse
    s.nodeState![other.id] = VISITED;
    let next: LEdge | null = null;
    for (const incident of other.getConnectedEdges()) {
      if (!isHandledEdge(incident) || incident === edge) {
        continue;
      }
      next = incident;
      break;
    }
    if (next === null) {
      return path;
    }
    edge = next;
    current = other;
  }
}

export function getNodeState(node: LNode): number {
  let inco = 0;
  let ouco = 0;
  for (const p of node.getPorts()) {
    inco += p.getIncomingEdges().filter((e) => !e.isSelfLoop()).length;
    ouco += p.getOutgoingEdges().filter((e) => !e.isSelfLoop()).length;
    if (inco > 1 || ouco > 1) {
      return JUNCTION;
    }
  }
  if (inco + ouco === 1) {
    return JUNCTION;
  }
  return OTHER;
}

// ------------------------------------------------------------------------------------------------
//                                      Mark Crossings
// ------------------------------------------------------------------------------------------------

/**
 * Mark all edges that are involved in edge crossings, which is stored in the `crossing` array.
 */
export function markEdgeCrossings(s: NetworkSimplexPlacerState): void {
  s.crossing = new Array<boolean>(s.edgeCount).fill(false);
  // the Java `layers.stream().reduce((left, right) -> { markCrossingEdges(left, right); return right; })`
  const layers = s.lGraph!.getLayers();
  for (let i = 1; i < layers.length; i++) {
    markCrossingEdges(s, layers[i - 1]!, layers[i]!);
  }
}

/** Collects the edges leaving `left` towards `right`, in the order they occur in the left layer. */
function collectOpenEdges(left: Layer, right: Layer): LEdge[] {
  const openEdges: LEdge[] = [];

  // add all edges in the order they occur in the left layer
  for (const node of left) {
    for (const port of node.getPortSideView(PortSide.EAST)) {
      for (const edge of port.getOutgoingEdges()) {
        if (edge.isInLayerEdge() || edge.isSelfLoop() || edge.getTarget()!.getNode()!.getLayer() !== right) {
          continue;
        }
        openEdges.push(edge);
      }
    }
  }
  return openEdges;
}

/**
 * Marks the crossings of edges between the two passed layers.
 */
export function markCrossingEdges(s: NetworkSimplexPlacerState, left: Layer, right: Layer): void {
  const openEdges = collectOpenEdges(left, right);

  // close the edges one after another, recording edge crossings
  for (const node of Lists.reverse(right.getNodes())) {
    for (const port of node.getPortSideView(PortSide.WEST)) {
      // don't reverse, bottom up is correct
      for (const edge of port.getIncomingEdges()) {
        if (edge.isInLayerEdge() || edge.isSelfLoop() || edge.getSource()!.getNode()!.getLayer() !== left) {
          continue;
        }
        closeEdge(s, openEdges, edge);
      }
    }
  }
}

/**
 * The `if (!openEdges.isEmpty())` block of `markCrossingEdges`. The Java `ListIterator` is a cursor `at` the end of
 * the list; `previous()` moves it down and returns that element, `remove()` deletes the element last returned by
 * `previous()` (kept as `lastReturned`), which also leaves the cursor there.
 */
function closeEdge(s: NetworkSimplexPlacerState, openEdges: LEdge[], edge: LEdge): void {
  if (openEdges.length === 0) {
    return;
  }
  let cursor = openEdges.length; // start at the end
  cursor--;
  let last = openEdges[cursor]!;
  while (last !== edge && cursor > 0) {
    // mark both edges as being part of an edge crossing
    s.crossing![last.id] = true;
    s.crossing![edge.id] = true;
    cursor--;
    last = openEdges[cursor]!;
  }
  if (cursor > 0) {
    openEdges.splice(cursor, 1);
  }
}
