// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` junction points: both `determineJunctionPoints` overloads and the private `getPoints` (M10 section
 * module of `ElkUtil.ts`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../graph/ElkEdgeSection.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { KVector } from '../math/KVector.js';
import { KVectorChain } from '../math/KVectorChain.js';

/**
 * Get the edge section points as an array of vectors. Unnecessary bend points are filtered out automatically.
 * Java's private `getPoints` (`:869`), needed here by `determineJunctionPoints`; T6 keeps this one.
 *
 * @param section an edge section
 * @returns an array with all needed edge section points
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function getPoints(section: ElkEdgeSection): KVector[] {
  const points: KVector[] = [];

  // Source point
  points.push(new KVector(section.getStartX(), section.getStartY()));

  // Bend points
  for (const bendPoint of section.getBendPoints()) {
    points.push(new KVector(bendPoint.getX(), bendPoint.getY()));
  }

  // Target point
  points.push(new KVector(section.getEndX(), section.getEndY()));

  // Filter unnecessary bend points from the list
  let i = 1;
  while (i < points.length - 1) {
    // Unnecessary bend points are given if three points in a row have the same x or y coordinate
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[i + 1];

    if ((p1.x === p2.x && p2.x === p3.x) || (p1.y === p2.y && p2.y === p3.y)) {
      // Found a straight segment, drop p2 and re-check with the same i
      points.splice(i, 1);
    } else {
      // Points are not a straight line, advance
      ++i;
    }
  }

  return points;
}

/** The per-call state of the private `determineJunctionPoints(edge, port, reverse)`. */
interface JunctionState {
  readonly reverse: boolean;
  readonly sectionPoints: KVector[];
  /** Points of every edge section looked at, for efficiency. */
  readonly pointsMap: Map<ElkEdgeSection, KVector[]>;
  /** The offset of the other edges. */
  readonly offsetMap: Map<ElkEdgeSection, KVector>;
}

/** The sections of the edges connected to the port, without the main edge's (fills the maps of the state). */
function collectConnectedSections(edge: ElkEdge, port: ElkPort, state: JunctionState): ElkEdgeSection[] {
  const { reverse, sectionPoints, pointsMap, offsetMap } = state;
  const allConnectedSections: ElkEdgeSection[] = [];
  for (const otherEdge of ElkGraphUtil.allIncidentEdges(port)) {
    if (edge.getSections().size() !== 1) {
      throw new IllegalArgumentException(
        `The edge needs to have exactly one edge section. Found: ${edge.getSections().size()}`,
      );
    }
    if (otherEdge !== edge) {
      const otherSection = otherEdge.getSections().get(0);
      allConnectedSections.push(otherSection);

      // Edges might have different containments leading to different coordinate systems
      // We can calculate the offset between the edges by comparing the shared port
      let otherPoints = pointsMap.get(otherSection);
      if (otherPoints === undefined) {
        otherPoints = getPoints(otherSection);
        pointsMap.set(otherSection, otherPoints);
      }

      const offset = reverse
        ? new KVector(sectionPoints[sectionPoints.length - 1]).sub(otherPoints[otherPoints.length - 1])
        : new KVector(sectionPoints[0]).sub(otherPoints[0]);

      offsetMap.set(otherSection, offset);
    }
  }
  return allConnectedSections;
}

/** The divergence branch of the junction search: where `p2` and `p3` differ, which point is a junction. */
function addJunctionPoint(i: number, p1: KVector, p2: KVector, p3: KVector, junctionPoints: KVectorChain): void {
  const dx2 = p2.x - p1.x;
  const dy2 = p2.y - p1.y;
  const dx3 = p3.x - p1.x;
  const dy3 = p3.y - p1.y;
  if (dx3 * dy2 === dy3 * dx2 && Math.sign(dx2) === Math.sign(dx3) && Math.sign(dy2) === Math.sign(dy3)) {
    // the points p1, p2, p3 form a straight line,
    // now check whether p2 is between p1 and p3
    if (Math.abs(dx2) < Math.abs(dx3) || Math.abs(dy2) < Math.abs(dy3)) {
      junctionPoints.add(p2);
    }
  } else if (i > 1) {
    // p2 and p3 have diverged, so the last common point is p1
    junctionPoints.add(p1);
  }
}

/** The reference points of one step of the junction search: the index, the previous and the next point. */
interface JunctionStep {
  readonly i: number;
  readonly p1: KVector;
  readonly p2: KVector;
}

/** Compares one other section with the edge at the step; reports whether it leaves the track (and is dropped). */
function leavesTrack(
  state: JunctionState,
  step: JunctionStep,
  otherSection: ElkEdgeSection,
  junctionPoints: KVectorChain,
): boolean {
  const { i, p1, p2 } = step;
  // filled by collectConnectedSections for every connected section
  const otherPoints = state.pointsMap.get(otherSection) as KVector[];
  if (otherPoints.length <= i) {
    return true;
  }
  // let p3 be the next bend point of the other connection
  const p3 = new KVector(otherPoints[state.reverse ? otherPoints.length - 1 - i : i]).add(
    state.offsetMap.get(otherSection) as KVector,
  );
  if (p2.x !== p3.x || p2.y !== p3.y) {
    // the next point of this and the other connection differ
    addJunctionPoint(i, p1, p2, p3, junctionPoints);
    return true;
  }
  return false;
}

/** Walks the points of the edge, dropping every other section that leaves its track (the junction search). */
function traceJunctionPoints(
  state: JunctionState,
  allConnectedSections: ElkEdgeSection[],
  junctionPoints: KVectorChain,
): void {
  const { reverse, sectionPoints } = state;
  // let p1 be the start point
  let p1 = sectionPoints[reverse ? sectionPoints.length - 1 : 0];

  // for all bend points of this connection
  for (let i = 1; i < sectionPoints.length; i++) {
    // let p2 be the next bend point on this connection
    const p2 = sectionPoints[reverse ? sectionPoints.length - 1 - i : i];

    // for all other connections that are still on the same track as this one (the Java iterator's `remove()`)
    let index = 0;
    while (index < allConnectedSections.length) {
      if (leavesTrack(state, { i, p1, p2 }, allConnectedSections[index], junctionPoints)) {
        allConnectedSections.splice(index, 1);
      } else {
        index++;
      }
    }
    // for the next iteration p2 is taken as reference point
    p1 = p2;
  }
}

/**
 * Determine the junction points of the given edge with any edge connected to the given port (Java's private
 * overload `determineJunctionPoints(ElkEdge, ElkPort, boolean)`, a distinct name here because the arity alone
 * would make the public one ambiguous). This is done by comparing the bend points of the given edge with the
 * bend points of all other edges that are connected to the given port. Note that this method requires all
 * edges to have exactly one edge section.
 *
 * @param edge an edge
 * @param port one of the ports the edge is connected to
 * @param reverse flag to indicate whether the points are traversed forward or reverse
 * @returns a list of junction points
 * @throws IllegalArgumentException if a connected edge has no or more than one edge section.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function determineJunctionPointsAtPort(edge: ElkEdge, port: ElkPort, reverse: boolean): KVectorChain {
  // Grab the edge section
  const section = edge.getSections().get(0);

  // Collection for the junction points of the current edge
  const junctionPoints = new KVectorChain();

  // Store the points of the edge in a map for efficiency
  const sectionPoints = getPoints(section);
  const pointsMap = new Map<ElkEdgeSection, KVector[]>([[section, sectionPoints]]);
  const state: JunctionState = { reverse, sectionPoints, pointsMap, offsetMap: new Map() };

  // let allConnectedEdges be the set of edge sections connected to port without the main edge
  const allConnectedSections = collectConnectedSections(edge, port, state);

  if (allConnectedSections.length > 0) {
    traceJunctionPoints(state, allConnectedSections, junctionPoints);
  }

  return junctionPoints;
}

/**
 * Determine the junction points of the given edge. This is done by comparing the bend points of the given edge
 * with the bend points of all other edges that are connected to the same source port or the same target port.
 * Note that this method requires all edges to have exactly one edge section.
 *
 * @param edge an edge
 * @returns a list of junction points
 * @throws IllegalArgumentException if the edge has no or more than one edge section.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function determineJunctionPoints(edge: ElkEdge): KVectorChain {
  if (edge.getSections().size() !== 1) {
    throw new IllegalArgumentException(
      `The edge needs to have exactly one edge section. Found: ${edge.getSections().size()}`,
    );
  }

  const junctionPoints = new KVectorChain();

  const sourcePort = ElkGraphUtil.connectableShapeToPort(edge.getSources().get(0));
  if (sourcePort !== null) {
    junctionPoints.addAll(determineJunctionPointsAtPort(edge, sourcePort, false));
  }
  const targetPort = ElkGraphUtil.connectableShapeToPort(edge.getTargets().get(0));
  if (targetPort !== null) {
    junctionPoints.addAll(determineJunctionPointsAtPort(edge, targetPort, true));
  }

  return junctionPoints;
}
