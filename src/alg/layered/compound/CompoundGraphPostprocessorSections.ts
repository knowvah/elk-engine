// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrthogonalRoutingGenerator } from '../p5edges/orthogonal/OrthogonalRoutingGenerator.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { CrossHierarchyEdgeComparator } from './CrossHierarchyEdgeComparator.js';

/**
 * Iteration order of the hashed containers of the Java class (decision H3): `java` is insertion order (the identity
 * hashed `Set<LEdge>` and the `LinkedHashMultimap` keys), `reversed` is the twin used to probe order sensitivity.
 */
export type PostprocessorOrder = 'java' | 'reversed' | PostprocessorReversal;

/**
 * Finer-grained form of the `reversed` twin (T9): names the iterations to reverse, so that an effect can be attributed to one
 * of them. `keys` is `crossHierarchyMap.keySet()` (Java `:89`), `values` each key's values before the sort (`:93`),
 * `dummyEdges` the removal loop over the dummy edges (`:86`, iterated `:191`). `'reversed'` is all three; `'java'` none.
 */
export interface PostprocessorReversal {
  readonly keys?: boolean;
  readonly values?: boolean;
  readonly dummyEdges?: boolean;
}

type PostprocessorSite = keyof PostprocessorReversal;

/** State carried across the segments of one original edge: the Java's local `lastPoint`. */
interface SegmentState {
  lastPoint: KVector | null;
}

/** What the segment loop of one original edge shares (the Java's locals of the loop body). */
interface EdgeContext {
  readonly origEdge: LEdge;
  readonly targetPort: LPort;
  readonly referenceGraph: LGraph;
  readonly junctionPoints: KVectorChain | null;
  readonly addUnnecessaryBendpoints: boolean;
  readonly dummyEdges: Set<LEdge>;
}

/**
 * A predicate that checks if a given cross hierarchy edge has junction points.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java:66
 */
function hasJunctionPoints(chEdge: CrossHierarchyEdge): boolean {
  const jps = chEdge.getEdge().getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
  return jps !== null && !jps.isEmpty();
}

/** A copy of the iteration in the Java order or, for the `reversed` twin, in the opposite one. */
function inOrder<T>(items: Iterable<T>, order: PostprocessorOrder, site: PostprocessorSite): T[] {
  const copy = [...items];
  const reversed = order === 'reversed' || (typeof order === 'object' && order[site] === true);
  return reversed ? copy.reverse() : copy;
}

/**
 * Postprocess a compound graph by restoring cross-hierarchy edges that have previously been split by the
 * `CompoundGraphPreprocessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java:75
 */
export function processCompoundGraphPostprocessor(
  graph: LGraph,
  monitor: IElkProgressMonitor,
  order: PostprocessorOrder = 'java',
): void {
  monitor.begin('Compound graph postprocessor', 1);

  // whether bend points should be added whenever crossing a hierarchy boundary
  const addUnnecessaryBendpoints = graph.getProperty(LayeredOptions.UNNECESSARY_BENDPOINTS);

  // restore the cross-hierarchy map that was built by the preprocessor
  const crossHierarchyMap = graph.getProperty(InternalProperties.CROSS_HIERARCHY_MAP);

  // remember all dummy edges we encounter; these need to be removed at the end
  const dummyEdges = new Set<LEdge>();

  // iterate over all original edges
  for (const origEdge of inOrder(crossHierarchyMap.keySet(), order, 'keys')) {
    // find all cross-hierarchy edges the original edge was split into, and sort them from source to target
    const crossHierarchyEdges = inOrder(crossHierarchyMap.get(origEdge), order, 'values');
    const comparator = new CrossHierarchyEdgeComparator(graph);
    crossHierarchyEdges.sort((a, b) => comparator.compare(a, b));

    restoreOriginalEdge(origEdge, crossHierarchyEdges, graph, addUnnecessaryBendpoints, dummyEdges);
  }

  // remove the dummy edges from the graph (dummy ports and dummy nodes are retained)
  for (const dummyEdge of inOrder(dummyEdges, order, 'dummyEdges')) {
    dummyEdge.setSource(null);
    dummyEdge.setTarget(null);
  }

  monitor.done();
}

/** Determine the reference graph for all bend points (`:99-106`). */
function referenceGraphOf(sourcePort: LPort, targetPort: LPort): LGraph {
  const referenceNode = sourcePort.getNode()!;
  if (LGraphUtil.isDescendant(targetPort.getNode()!, referenceNode)) {
    return referenceNode.getNestedGraph()!;
  }
  return referenceNode.getGraph()!;
}

/** The body of the Java's loop over the original edges (`:95-187`), after the segments have been sorted. */
function restoreOriginalEdge(
  origEdge: LEdge,
  crossHierarchyEdges: readonly CrossHierarchyEdge[],
  graph: LGraph,
  addUnnecessaryBendpoints: boolean,
  dummyEdges: Set<LEdge>,
): void {
  // find the original source and target ports for the original edge
  const sourcePort = crossHierarchyEdges[0]!.getActualSource();
  const targetPort = crossHierarchyEdges[crossHierarchyEdges.length - 1]!.getActualTarget();

  const referenceGraph = referenceGraphOf(sourcePort, targetPort);

  // check whether there are any junction points
  const junctionPoints = clearJunctionPoints(origEdge, crossHierarchyEdges);

  // reset bend points (we have computed new ones anyway)
  origEdge.getBendPoints().clear();

  // apply the computed layouts to the cross-hierarchy edge
  const context: EdgeContext = {
    origEdge,
    targetPort,
    referenceGraph,
    junctionPoints,
    addUnnecessaryBendpoints,
    dummyEdges,
  };
  const state: SegmentState = { lastPoint: null };
  for (const chEdge of crossHierarchyEdges) {
    applySegment(chEdge, context, state);
  }

  // restore the original source port and target port
  origEdge.setSource(sourcePort);
  origEdge.setTarget(targetPort);
}

/** The body of the Java's loop over the segments of one original edge (`:117-182`). */
function applySegment(chEdge: CrossHierarchyEdge, context: EdgeContext, state: SegmentState): void {
  const { origEdge, referenceGraph, junctionPoints } = context;

  // transform all coordinates from the graph of the dummy edge to the reference graph
  const offset = new KVector();
  LGraphUtil.changeCoordSystem(offset, chEdge.getGraph(), referenceGraph);

  const ledge = chEdge.getEdge();
  const bendPoints = new KVectorChain();
  bendPoints.addAllAsCopies(0, ledge.getBendPoints());
  bendPoints.offset(offset);

  // Note: if an NPE occurs here, that means ELK Layered has replaced the original edge
  const sourcePoint = new KVector(ledge.getSource()!.getAbsoluteAnchor());
  const targetPoint = new KVector(ledge.getTarget()!.getAbsoluteAnchor());
  sourcePoint.add(offset);
  targetPoint.add(offset);

  if (state.lastPoint !== null) {
    const nextPoint = bendPoints.isEmpty() ? targetPoint : bendPoints.getFirst();
    if (needsConnectingBendPoint(state.lastPoint, nextPoint, context.addUnnecessaryBendpoints)) {
      origEdge.getBendPoints().add(sourcePoint);
    }
  }

  origEdge.getBendPoints().addAll(bendPoints);

  state.lastPoint = bendPoints.isEmpty() ? sourcePoint : bendPoints.getLast();

  // copy junction points
  copyJunctionPoints(ledge, junctionPoints, offset);

  setTargetOffset(chEdge, context, offset);

  // copy labels back to the original edge
  copyLabelsBack(ledge, origEdge, referenceGraph);

  // remember the dummy edge for later removal (dummy edges may be in use by several different original edges, which
  // is why we cannot just go and remove it now)
  context.dummyEdges.add(ledge);
}

/** Add offset to target port with a special property (`:166-175`). */
function setTargetOffset(chEdge: CrossHierarchyEdge, context: EdgeContext, segmentOffset: KVector): void {
  const { origEdge, targetPort, referenceGraph } = context;
  let offset = segmentOffset;
  if (chEdge.getActualTarget() === targetPort) {
    if (targetPort.getNode()!.getGraph() !== chEdge.getGraph()) {
      // the target port is in a different coordinate system -- recompute the offset
      offset = new KVector();
      LGraphUtil.changeCoordSystem(offset, targetPort.getNode()!.getGraph()!, referenceGraph);
    }
    origEdge.setProperty(InternalProperties.TARGET_OFFSET, offset);
  }
}

/**
 * We add the source point as a bend point to properly connect the hierarchy levels either if the last point of the
 * previous hierarchy edge segment is a certain level of tolerance away or if we are required to add unnecessary bend
 * points (`:140-153`).
 */
function needsConnectingBendPoint(lastPoint: KVector, nextPoint: KVector, addUnnecessaryBendpoints: boolean): boolean {
  const xDiffEnough = Math.abs(lastPoint.x - nextPoint.x) > OrthogonalRoutingGenerator.TOLERANCE;
  const yDiffEnough = Math.abs(lastPoint.y - nextPoint.y) > OrthogonalRoutingGenerator.TOLERANCE;

  return (
    (!addUnnecessaryBendpoints && xDiffEnough && yDiffEnough) ||
    (addUnnecessaryBendpoints && (xDiffEnough || yDiffEnough))
  );
}

/**
 * Clears an original edge's list of junction points and returns them. The returned vector chain is already set on the
 * original edge, so all the calling code needs to do to update the edge's junction points is to update the returned
 * vector chain.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java:204
 */
function clearJunctionPoints(origEdge: LEdge, crossHierarchyEdges: readonly CrossHierarchyEdge[]): KVectorChain | null {
  let junctionPoints = origEdge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
  if (crossHierarchyEdges.some(hasJunctionPoints)) {
    // if so, make sure the original edge has an empty non-null junction point list
    if (junctionPoints === null) {
      junctionPoints = new KVectorChain();
      origEdge.setProperty(LayeredOptions.JUNCTION_POINTS, junctionPoints);
    } else {
      junctionPoints.clear();
    }
  } else if (junctionPoints !== null) {
    origEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
  }

  return junctionPoints;
}

/**
 * Copies the junction points of the source to the target, adding the given offset.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java:226
 */
function copyJunctionPoints(source: LEdge, target: KVectorChain | null, offset: KVector): void {
  const ledgeJPs = source.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
  if (ledgeJPs !== null) {
    const jpCopies = new KVectorChain();
    jpCopies.addAllAsCopies(0, ledgeJPs);
    jpCopies.offset(offset);

    // the Java dereferences `target` here; it is non-null whenever a segment holds junction points (`:208`)
    target!.addAll(jpCopies);
  }
}

/**
 * Copies the labels from the given hierarchy segment back to the original hierarchical edge.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java:240
 */
function copyLabelsBack(hierarchySegment: LEdge, origEdge: LEdge, referenceGraph: LGraph): void {
  const labels = hierarchySegment.getLabels();
  // `listIterator` with `remove`: walk by index and step back after a removal
  for (let i = 0; i < labels.length;) {
    const currLabel: LLabel = labels[i]!;
    if (currLabel.getProperty(InternalProperties.ORIGINAL_LABEL_EDGE) !== origEdge) {
      i++;
      continue;
    }

    LGraphUtil.changeCoordSystem(
      currLabel.getPosition(),
      hierarchySegment.getSource()!.getNode()!.getGraph()!,
      referenceGraph,
    );
    labels.splice(i, 1);
    origEdge.getLabels().push(currLabel);
  }
}
