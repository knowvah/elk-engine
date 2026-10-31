// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { reverse } from '../../../../guava/Lists.js';
import type { ReverseList } from '../../../../guava/Lists.js';
import * as Iterables from '../../../../guava/Iterables.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import type { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { CrossingsCounterState } from './CrossingsCounterState.js';

/** Java `Integer.compare`. */
export const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Java `List<LPort>` as the counter uses it: the live side view or Guava's reversed view of it.
 *
 * @see CrossingsCounter.java:577
 */
export type PortList = LPort[] | ReverseList<LPort>;

/** Java `List.size()` over {@link PortList}. */
export function portListSize(list: PortList): number {
  return Array.isArray(list) ? list.length : list.size();
}

/** @see CrossingsCounter.java:577 */
export function getPorts(node: LNode, side: PortSide, topDown: boolean): PortList {
  if (side === PortSide.EAST) {
    if (topDown) {
      return node.getPortSideView(side);
    } else {
      return reverse(node.getPortSideView(side));
    }
  } else if (topDown) {
    return reverse(node.getPortSideView(side));
  } else {
    return node.getPortSideView(side);
  }
}

/** @see CrossingsCounter.java:591 */
export function getNorthSouthPortsWithIncidentEdges(node: LNode, side: PortSide): Iterable<LPort> {
  return Iterables.filter(node.getPortSideView(side), (p) => p.hasProperty(InternalProperties.PORT_DUMMY));
}

/** @see CrossingsCounter.java:595 */
export function start(nodes: LNode[], topDown: boolean): number {
  return topDown ? 0 : nodes.length - 1;
}

/** @see CrossingsCounter.java:599 */
export function end(i: number, topDown: boolean, nodes: LNode[]): boolean {
  return topDown ? i < nodes.length : i >= 0;
}

/** @see CrossingsCounter.java:603 */
export function step(topDown: boolean): number {
  return topDown ? 1 : -1;
}

/** @see CrossingsCounter.java:607 */
export function isInLayer(edge: LEdge): boolean {
  const sourceLayer: Layer | null = edge.getSource()!.getNode()!.getLayer();
  const targetLayer: Layer | null = edge.getTarget()!.getNode()!.getLayer();
  return sourceLayer === targetLayer;
}

/** @see CrossingsCounter.java:613 */
export function positionOf(s: CrossingsCounterState, port: LPort): number {
  return s.portPositions[port.id]!;
}

/** @see CrossingsCounter.java:617 */
export function otherEndOf(edge: LEdge, fromPort: LPort): LPort {
  return fromPort === edge.getSource() ? edge.getTarget()! : edge.getSource()!;
}

/** @see CrossingsCounter.java:621 */
export function isPortSelfLoop(edge: LEdge): boolean {
  return edge.getSource() === edge.getTarget();
}

/** @see CrossingsCounter.java:625 */
export function isLayoutUnitChanged(lastUnit: LNode | null, node: LNode): boolean {
  if (lastUnit === null || lastUnit === node || !node.hasProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)) {
    return false;
  }
  const unit = node.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);
  return unit !== lastUnit;
}
