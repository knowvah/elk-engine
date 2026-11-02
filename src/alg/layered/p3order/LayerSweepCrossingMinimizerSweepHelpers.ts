// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';

/*
 * The small private predicates and index helpers of `LayerSweepCrossingMinimizer` (`:557-607`), as functions: the
 * sweep, hierarchical and counting sections all use them.
 */

/** @see LayerSweepCrossingMinimizer.java:557 */
export function firstIndex(isForwardSweep: boolean, length: number): number {
  return isForwardSweep ? 0 : length - 1;
}

/** @see LayerSweepCrossingMinimizer.java:561 */
export function endIndex(isForwardSweep: boolean, length: number): number {
  return isForwardSweep ? length - 1 : 0;
}

/** @see LayerSweepCrossingMinimizer.java:565 */
export function firstFree(isForwardSweep: boolean, length: number): number {
  return isForwardSweep ? 1 : length - 2;
}

/** @see LayerSweepCrossingMinimizer.java:569 */
export function next(isForwardSweep: boolean): number {
  return isForwardSweep ? 1 : -1;
}

/** @see LayerSweepCrossingMinimizer.java:573 */
export function isNotEnd(length: number, freeLayerIndex: number, isForwardSweep: boolean): boolean {
  return isForwardSweep ? freeLayerIndex < length : freeLayerIndex >= 0;
}

/** @see LayerSweepCrossingMinimizer.java:578 */
export function hasNestedGraph(node: LNode): boolean {
  return node.getNestedGraph() !== null;
}

/** @see LayerSweepCrossingMinimizer.java:582 */
export function sideOpposedSweepDirection(isForwardSweep: boolean): PortSide {
  return isForwardSweep ? PortSide.WEST : PortSide.EAST;
}

/** @see LayerSweepCrossingMinimizer.java:586 */
export function isExternalPortDummy(firstNode: LNode): boolean {
  return firstNode.getType() === NodeType.EXTERNAL_PORT;
}

/** @see LayerSweepCrossingMinimizer.java:590 */
export function originPort(node: LNode): LPort {
  return node.getProperty(InternalProperties.ORIGIN) as LPort;
}

/** @see LayerSweepCrossingMinimizer.java:594 */
export function isHierarchical(port: LPort): boolean {
  return port.getProperty(InternalProperties.INSIDE_CONNECTIONS);
}

/** @see LayerSweepCrossingMinimizer.java:598 */
export function dummyNodeFor(port: LPort): LNode {
  return port.getProperty(InternalProperties.PORT_DUMMY);
}

/** @see LayerSweepCrossingMinimizer.java:602 */
export function isOnEndOfSweepSide(port: LPort, isForwardSweep: boolean): boolean {
  return isForwardSweep ? port.getSide() === PortSide.EAST : port.getSide() === PortSide.WEST;
}
