// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { Pair } from '../../../../core/util/Pair.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { getNorthSouthPortsWithIncidentEdges, isLayoutUnitChanged, positionOf } from './CrossingsCounterConvenience.js';
import type { CrossingsCounterState } from './CrossingsCounterState.js';
import * as Int32 from '../../../../java/lang/Int32.js';

/*
 * The north/south section of Java's `CrossingsCounter`: counting crossings caused by north/south port dummies and long
 * edges, and the position initialisation it needs.
 */

/** @see CrossingsCounter.java:487 */
const INDEXING_SIDE: PortSide = PortSide.WEST;
/** @see CrossingsCounter.java:488 */
const STACK_SIDE: PortSide = PortSide.EAST;

/** @see CrossingsCounter.java:413 */
export function countNorthSouthCrossingsOnPorts(s: CrossingsCounterState, ports: Iterable<LPort>): number {
  let crossings = 0;
  const targetsAndDegrees: Pair<LPort, number>[] = [];

  for (const port of ports) {
    s.indexTree.removeAll(positionOf(s, port));
    targetsAndDegrees.length = 0;

    // collect the edges that are incident to the port,
    //  which is a bit tedious since north/south ports have no physical edge within the graph at this point
    collectTargetsAndDegrees(port, targetsAndDegrees);

    // First get crossings for all edges.
    for (const targetAndDegree of targetsAndDegrees) {
      const endPosition = positionOf(s, targetAndDegree.getFirst()!);
      if (endPosition > positionOf(s, port)) {
        crossings = Int32.add(crossings, Int32.mul(s.indexTree.rank(endPosition), targetAndDegree.getSecond()!));
        s.ends.push(endPosition);
      }
    }

    // Then add end points.
    while (s.ends.length > 0) {
      s.indexTree.add(s.ends.pop()!);
    }
  }

  return crossings;
}

/** The `switch (port.getNode().getType())` of `countNorthSouthCrossingsOnPorts`, one helper per arm. */
function collectTargetsAndDegrees(port: LPort, targetsAndDegrees: Pair<LPort, number>[]): void {
  switch (port.getNode()!.getType()) {
    case NodeType.NORMAL:
      collectNormal(port, targetsAndDegrees);
      break;

    case NodeType.LONG_EDGE:
      collectLongEdge(port, targetsAndDegrees);
      break;

    case NodeType.NORTH_SOUTH_PORT:
      collectNorthSouthPort(port, targetsAndDegrees);
      break;
  }
}

/** @see CrossingsCounter.java:424 */
function collectNormal(port: LPort, targetsAndDegrees: Pair<LPort, number>[]): void {
  const dummy = port.getProperty(InternalProperties.PORT_DUMMY);
  // assert dummy != null: guarded in #initPositionsForNorthSouthCounting(...); the JVM runs without -ea
  for (const p of dummy!.getPorts()) {
    targetsAndDegrees.push(Pair.of(p, p.getDegree())); // western and eastern
  }
}

/** @see CrossingsCounter.java:430 */
function collectLongEdge(port: LPort, targetsAndDegrees: Pair<LPort, number>[]): void {
  // add an edge to the dummy's other port (stream().filter(p -> p != port).findFirst().ifPresent(...))
  const p = port
    .getNode()!
    .getPorts()
    .find((candidate) => candidate !== port);
  if (p !== undefined) {
    targetsAndDegrees.push(Pair.of(p, p.getDegree()));
  }
}

/** @see CrossingsCounter.java:436 */
function collectNorthSouthPort(port: LPort, targetsAndDegrees: Pair<LPort, number>[]): void {
  const dummyPort = port.getProperty(InternalProperties.ORIGIN) as LPort;
  targetsAndDegrees.push(Pair.of(dummyPort, port.getDegree()));
}

/** @see CrossingsCounter.java:490 */
export function initPositionsForNorthSouthCounting(s: CrossingsCounterState, nodes: LNode[]): LPort[] {
  const ports: LPort[] = [];
  const stack: LNode[] = [];

  let lastLayoutUnit: LNode | null = null;
  let index = 0;
  for (let i = 0; i < nodes.length; ++i) {
    const current = nodes[i]!;

    if (isLayoutUnitChanged(lastLayoutUnit, current)) {
      // work the stack (filled with southern dummies)
      index = emptyStack(s, stack, ports, STACK_SIDE, index);
    }
    if (current.hasProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)) {
      lastLayoutUnit = current.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);
    }

    index = indexByType(s, current, ports, stack, index);
  }

  // are there any southern dummy nodes left on the stack?
  emptyStack(s, stack, ports, STACK_SIDE, index);

  return ports;
}

/** The `switch (current.getType())` of `initPositionsForNorthSouthCounting`; returns the new running index. */
function indexByType(s: CrossingsCounterState, current: LNode, ports: LPort[], stack: LNode[], index: number): number {
  switch (current.getType()) {
    // what we consider normal
    case NodeType.NORMAL:
      return indexNormal(s, current, ports, stack, index);

    case NodeType.NORTH_SOUTH_PORT:
      return indexNorthSouthPort(s, current, ports, stack, index);

    case NodeType.LONG_EDGE:
      return indexLongEdge(s, current, ports, stack, index);

    default: // nothing to do here
      return index;
  }
}

/** @see CrossingsCounter.java:509 */
function indexNormal(s: CrossingsCounterState, current: LNode, ports: LPort[], stack: LNode[], start: number): number {
  let index = start;
  // index the northern ports west-to-east
  for (const p of getNorthSouthPortsWithIncidentEdges(current, PortSide.NORTH)) {
    s.portPositions[p.id] = index++;
    ports.push(p);
  }

  // work the stack (filled with northern dummies)
  index = emptyStack(s, stack, ports, STACK_SIDE, index);

  // index the southern ports in regular clock-wise order
  for (const p of getNorthSouthPortsWithIncidentEdges(current, PortSide.SOUTH)) {
    s.portPositions[p.id] = index++;
    ports.push(p);
  }
  return index;
}

/** @see CrossingsCounter.java:526 */
function indexNorthSouthPort(
  s: CrossingsCounterState,
  current: LNode,
  ports: LPort[],
  stack: LNode[],
  start: number,
): number {
  let index = start;
  if (current.getPortSideView(INDEXING_SIDE).length !== 0) {
    // should be only one
    const p = current.getPortSideView(INDEXING_SIDE)[0]!;
    s.portPositions[p.id] = index++;
    ports.push(p);
  }
  if (current.getPortSideView(STACK_SIDE).length !== 0) {
    stack.push(current);
  }
  return index;
}

/** @see CrossingsCounter.java:538 */
function indexLongEdge(
  s: CrossingsCounterState,
  current: LNode,
  ports: LPort[],
  stack: LNode[],
  start: number,
): number {
  let index = start;
  for (const p of current.getPortSideView(PortSide.WEST)) {
    s.portPositions[p.id] = index++;
    ports.push(p);
  }
  for (const _p of current.getPortSideView(PortSide.EAST)) {
    stack.push(current);
  }
  return index;
}

/** @see CrossingsCounter.java:557 */
function emptyStack(
  s: CrossingsCounterState,
  stack: LNode[],
  ports: LPort[],
  side: PortSide,
  startIndex: number,
): number {
  let index = startIndex;
  while (stack.length > 0) {
    const dummy = stack.pop()!;
    // dummy is either a north/south port dummy or a long edge dummy
    //  both of which have only a single port on the west and/or east side
    const p = dummy.getPortSideView(side)[0]!;
    s.portPositions[p.id] = index++;
    ports.push(p);
  }
  return index;
}
