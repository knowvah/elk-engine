// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { Pair } from '../../../../core/util/Pair.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import type { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { SplineEdgeRouterDependency } from './SplineEdgeRouterDependency.js';
import { SplineEdgeRouterSideToProcess as SideToProcess } from './SplineEdgeRouterSideToProcess.js';
import { SplineSegment, isNormalNode, isStraight } from './SplineSegment.js';
import { SplinesMath } from './SplinesMath.js';

/**
 * The mapping and segment creation steps of the router (`SplineEdgeRouter.java:361-710`). A section of the facade
 * `SplineEdgeRouter` (P1: a section never imports its facade).
 *
 * The Java methods are private instance methods that receive some of the router's own fields as arguments
 * (`leftPortsLayer`, `rightPortsLayer`, `edgesRemainingLayer`, `splineSegmentsLayer`) and read others
 * (`edgeToSegmentMap`, `successingEdge`, `startEdges`, `selfLoopsLayer`). The fields live in a
 * {@link SplineRouterState} the facade owns and every function here takes first; the arguments that are fields are
 * read from it (the same objects the Java passes).
 *
 * Containers (AD-10, R9): `leftPortsLayer`, `rightPortsLayer` and `selfLoopsLayer` are `LinkedHashSet`s (insertion
 * ordered `Set`s of identity-hashed ports and edges, iterated); `edgeToSegmentMap` and `successingEdge` are
 * `HashMap<LEdge, …>` that are only probed (plain `Map`). `upEdges` and `downEdges` are `HashSet<Pair<SideToProcess,
 * LEdge>>` whose iteration order the `SplineSegment` constructor sees (`SplineSegment.java:161`); `Pair.hashCode` mixes
 * identity hashes, so the JVM order is neither insertion nor sortable. The port keeps insertion order in a plain `Set`
 * (decision R9; the hyperedge spline rows are the proof). A `HashSet` also drops a pair equal to one it holds; two
 * equal pairs would need the same edge twice in `getConnectedEdges`, which only a self loop at the port gives, and that
 * edge is skipped as straight before it is added.
 */

/**
 * The router fields the segment creation reads and writes. `edgeToSegmentMap` is never cleared between layer pairs and
 * `startEdges` and `allSplineSegments` only between runs, as in the Java.
 */
export interface SplineRouterState {
  /** current edges of the layers in a current iteration. */
  readonly edgesRemainingLayer: LEdge[];
  /** current spline segments of the layers in a current iteration. */
  readonly splineSegmentsLayer: SplineSegment[];
  /** current ports on the left layer involved in a current iteration. */
  readonly leftPortsLayer: Set<LPort>;
  /** current ports on the right layer involved in a current iteration. */
  readonly rightPortsLayer: Set<LPort>;
  /** current self loops of the layers in a current iteration. */
  readonly selfLoopsLayer: Set<LEdge>;
  /** a collection of all edges that have a normal node as their source. */
  readonly startEdges: LEdge[];
  /** all created spline segments. */
  readonly allSplineSegments: SplineSegment[];
  /** Maps `LEdge` to their representing segments. */
  readonly edgeToSegmentMap: Map<LEdge, SplineSegment>;
  /**
   * A mapping pointing from an edge to it's succeeding edge, together with their connected friends, they form a
   * long-edge.
   */
  readonly successingEdge: Map<LEdge, LEdge>;
}

/** The empty router fields (the Java field initialisers, `SplineEdgeRouter.java:136-162`). */
export function createSplineRouterState(): SplineRouterState {
  return {
    edgesRemainingLayer: [],
    splineSegmentsLayer: [],
    leftPortsLayer: new Set<LPort>(),
    rightPortsLayer: new Set<LPort>(),
    selfLoopsLayer: new Set<LEdge>(),
    startEdges: [],
    allSplineSegments: [],
    edgeToSegmentMap: new Map<LEdge, SplineSegment>(),
    successingEdge: new Map<LEdge, LEdge>(),
  };
}

/**
 * A node {@code n} qualifies as 'starting node' for a 'starting edge' if it is not a long edge dummy or label dummy.
 * That is, any edge connected to {@code n} can potentially be the first segment of a chain of edges (i.e. long edge).
 *
 * `SplineEdgeRouter.isQualifiedAsStartingNode` (`SplineEdgeRouter.java:995`); the segment creation needs it and the
 * facade imports this section, so the body lives here and the facade's static delegates to it (the X1 pattern).
 *
 * @param node the node to test
 * @return true if {@code node} qualifies as starting node.
 */
export function isQualifiedAsStartingNode(node: LNode): boolean {
  const nt = node.getType();
  return (
    nt === NodeType.NORMAL ||
    nt === NodeType.NORTH_SOUTH_PORT ||
    nt === NodeType.EXTERNAL_PORT ||
    nt === NodeType.BREAKING_POINT
  );
}

/** Removes the first occurrence of an element (Java's `List.remove(Object)`, identity-equal elements here). */
function removeFirstOccurrence<T>(list: T[], element: T): void {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/**
 * The body of the inner loop over `sourcePort.getOutgoingEdges()`, which the Java repeats verbatim for the east ports of
 * the left layer (`:392-422`) and the west ports of the right layer (`:451-481`).
 */
function addOutgoingEdges(
  state: SplineRouterState,
  sourcePort: LPort,
  leftLayer: Layer | null,
  rightLayer: Layer | null,
): void {
  for (const edge of sourcePort.getOutgoingEdges()) {
    // Self-loops are handled in the right-layer section.
    if (edge.isSelfLoop()) {
      continue;
    }

    // Add edge to set of all edges and find it's successor
    state.edgesRemainingLayer.push(edge);
    findAndAddSuccessor(state, edge);

    // Check if edge is a startingEdge
    if (isQualifiedAsStartingNode(edge.getSource()!.getNode()!)) {
      state.startEdges.push(edge);
    }

    // Check port-side of target port
    const targetPort = edge.getTarget()!;
    const targetLayer = targetPort.getNode()!.getLayer();
    if (targetLayer === rightLayer) {
      state.rightPortsLayer.add(targetPort);
    } else if (targetLayer === leftLayer) {
      state.leftPortsLayer.add(targetPort);
    } else {
      // Unhandled situation. Probably there are incoming and outgoing edges on the same port. This is not supported.
      removeFirstOccurrence(state.edgesRemainingLayer, edge);
    }
  }
}

/** The left-layer half of `clearThenFillMappings` (`:383-424`): iterate over all outgoing edges on the left layer. */
function fillFromLeftLayer(state: SplineRouterState, leftLayer: Layer, rightLayer: Layer | null): void {
  for (const node of leftLayer.getNodes()) {
    for (const sourcePort of node.getPorts(PortSide.EAST)) {
      state.leftPortsLayer.add(sourcePort);
      addOutgoingEdges(state, sourcePort, leftLayer, rightLayer);
    }
  }
}

/** The right-layer half of `clearThenFillMappings` (`:426-483`): the self loops, then the outgoing edges. */
function fillFromRightLayer(state: SplineRouterState, leftLayer: Layer | null, rightLayer: Layer): void {
  for (const node of rightLayer.getNodes()) {
    // handle all self-loops, no matter on witch port-side they are.
    for (const port of node.getPorts()) {
      for (const edge of port.getOutgoingEdges()) {
        if (edge.isSelfLoop()) {
          state.selfLoopsLayer.add(edge);
        }
      }
    }

    // iterate over all outgoing edges on the right layer
    for (const sourcePort of node.getPorts(PortSide.WEST)) {
      state.rightPortsLayer.add(sourcePort);
      addOutgoingEdges(state, sourcePort, leftLayer, rightLayer);
    }
  }
}

/**
 * Initially fills the mappings, collection and sets for a pair of layers.
 *
 * @param state the router fields
 * @param leftLayer The current left layer.
 * @param rightLayer The current right layer.
 * @see SplineEdgeRouter.java:361
 */
export function clearThenFillMappings(
  state: SplineRouterState,
  leftLayer: Layer | null,
  rightLayer: Layer | null,
): void {
  // clear the mappings
  state.leftPortsLayer.clear();
  state.rightPortsLayer.clear();
  state.edgesRemainingLayer.length = 0;
  state.splineSegmentsLayer.length = 0;
  state.selfLoopsLayer.clear();

  // iterate over all outgoing edges on the left layer.
  if (leftLayer !== null) {
    fillFromLeftLayer(state, leftLayer, rightLayer);
  }

  if (rightLayer !== null) {
    fillFromRightLayer(state, leftLayer, rightLayer);
  }
}

/**
 * Finds the predecessor `LEdge` of given edge. It is assumed that the source node of an edge with a predecessor only
 * has one incoming edge. Otherwise the first incoming edge of the source node is added as the predecessor. (The Java
 * name and comment say predecessor; the method stores the first outgoing edge of the target node, the successor.)
 *
 * @param state the router fields
 * @param edge The `LEdge` those predecessor to find.
 * @see SplineEdgeRouter.java:493
 */
export function findAndAddSuccessor(state: SplineRouterState, edge: LEdge): void {
  const targetNode = edge.getTarget()!.getNode()!;

  // if target node is a normal node there is no successor
  if (isNormalNode(targetNode)) {
    return;
  }

  // otherwise take the first outgoing edge of target node
  const iter = targetNode.getOutgoingEdges()[Symbol.iterator]();
  const first = iter.next();
  if (first.done !== true) {
    state.successingEdge.set(edge, first.value);
  }
}

/**
 * Creates a "one-edge" hyper-edge for each edges in the collection. The hyper-edges are added to the hyperEdges
 * collection (`splineSegmentsLayer`).
 *
 * @param state the router fields; the edges to process are `edgesRemainingLayer`, the left and right ports of the
 *   current situation `leftPortsLayer` and `rightPortsLayer`
 * @see SplineEdgeRouter.java:521
 */
export function createSplineSegments(state: SplineRouterState): void {
  for (const edge of state.edgesRemainingLayer) {
    const sourcePort = edge.getSource()!;
    let sourceSide: SideToProcess;

    if (state.leftPortsLayer.has(sourcePort)) {
      sourceSide = SideToProcess.LEFT;
    } else if (state.rightPortsLayer.has(sourcePort)) {
      sourceSide = SideToProcess.RIGHT;
    } else {
      throw new IllegalArgumentException('Source port must be in one of the port sets.');
    }

    let targetSide: SideToProcess;
    const targetPort = edge.getTarget()!;

    if (state.leftPortsLayer.has(targetPort)) {
      targetSide = SideToProcess.LEFT;
    } else if (state.rightPortsLayer.has(targetPort)) {
      targetSide = SideToProcess.RIGHT;
    } else {
      throw new IllegalArgumentException('Target port must be in one of the port sets.');
    }

    const seg = new SplineSegment(edge, sourceSide, targetSide);
    state.edgeToSegmentMap.set(edge, seg);
    state.splineSegmentsLayer.push(seg);
  }
}

/** The edges leaving the single port of a hyperedge candidate upwards and downwards (the Java `upEdges`/`downEdges`). */
interface HyperEdgeCandidates {
  readonly upEdges: Set<Pair<SideToProcess, LEdge>>;
  readonly downEdges: Set<Pair<SideToProcess, LEdge>>;
}

/**
 * The part of the loop over `singlePort.getConnectedEdges()` that follows the two filters (`:603-632`): finds the
 * target port, drops straight edges and adds the edge to the up or the down set with the side its target lies on.
 */
function classifyEdge(
  candidates: HyperEdgeCandidates,
  leftPorts: Set<LPort>,
  singlePort: LPort,
  singlePortPosition: number,
  edge: LEdge,
): void {
  // find the target port
  let targetPort: LPort;
  if (edge.getTarget() === singlePort) {
    targetPort = edge.getSource()!;
  } else {
    targetPort = edge.getTarget()!;
  }

  // check if this edge should get drawn as a straight edge
  const targetPortPosition = targetPort.getAbsoluteAnchor().y;
  if (isStraight(targetPortPosition, singlePortPosition)) {
    return;
  }

  // add the edge to the correct set of up/down-edges
  const side = leftPorts.has(targetPort) ? SideToProcess.LEFT : SideToProcess.RIGHT;
  if (targetPortPosition < singlePortPosition) {
    candidates.upEdges.add(Pair.of(side, edge));
  } else {
    candidates.downEdges.add(Pair.of(side, edge));
  }
}

/**
 * The body of the two `size() > 1` blocks (`:636-651`), identical but for the set: creates the hyperedge segment,
 * registers it for every edge, adds it to the segments of the layer pair and takes its edges off the remaining ones.
 */
function addHyperEdge(
  state: SplineRouterState,
  singlePort: LPort,
  edges: Set<Pair<SideToProcess, LEdge>>,
  sideToProcess: SideToProcess,
): void {
  const seg = new SplineSegment(singlePort, edges, sideToProcess);
  edges.forEach((e) => state.edgeToSegmentMap.set(e.getSecond()!, seg));
  state.splineSegmentsLayer.push(seg);
  for (const pair of edges) {
    removeFirstOccurrence(state.edgesRemainingLayer, pair.getSecond()!);
  }
}

/**
 * Creates hyperEdges. The created hyperEdges all have one port on their source side (if reversed is {@code false}) or
 * on their target side (if reversed is {@code true}). Also only hyperEdges starting in one of the leftPorts (if
 * sideToProcess is {@code LEFT}) or one of the right ports (if SideToProcess is {@code RIGHT}) will be created.
 *
 * The Java arguments `leftPorts`, `rightPorts`, `edgesRemaining` and `hyperEdges` are always the router's
 * `leftPortsLayer`, `rightPortsLayer`, `edgesRemainingLayer` and `splineSegmentsLayer` and are read from the state.
 *
 * @param state the router fields
 * @param sideToProcess Either {@code LEFT} or {@code RIGHT}.
 * @param reversed {@code true}, if hyperEdges for reversed edges shall be created.
 * @see SplineEdgeRouter.java:568
 */
export function createSplineSegmentsForHyperEdges(
  state: SplineRouterState,
  sideToProcess: SideToProcess,
  reversed: boolean,
): void {
  // The Java `else` arm (`assert false : "sideToProcess must be either LEFT or RIGHT."`, `:582`) is omitted: the enum
  // has the two constants only.
  const portsToProcess = sideToProcess === SideToProcess.LEFT ? state.leftPortsLayer : state.rightPortsLayer;

  // Iterate through all ports on the side to process.
  for (const singlePort of portsToProcess) {
    const singlePortPosition = singlePort.getAbsoluteAnchor().y;
    const candidates: HyperEdgeCandidates = {
      upEdges: new Set<Pair<SideToProcess, LEdge>>(),
      downEdges: new Set<Pair<SideToProcess, LEdge>>(),
    };

    // Find edges we could construct a hyper-edge from. If the edge is in the edgesRemaining set, there is no
    // hyper-edge that represents this edge.
    for (const edge of singlePort.getConnectedEdges()) {
      if (edge.getProperty(InternalProperties.REVERSED) !== reversed) {
        continue;
      }
      if (state.edgesRemainingLayer.includes(edge)) {
        classifyEdge(candidates, state.leftPortsLayer, singlePort, singlePortPosition, edge);
      }
    }

    // Create some hyper edges.
    // We are creating only hyper-edges that have more than one real edge.
    if (candidates.upEdges.size > 1) {
      addHyperEdge(state, singlePort, candidates.upEdges, sideToProcess);
    }
    if (candidates.downEdges.size > 1) {
      addHyperEdge(state, singlePort, candidates.downEdges, sideToProcess);
    }
  }
}

/** The number of the ports whose anchor y lies between the two bounds (the four counting loops of `createDependency`). */
function countPortsBetween(ports: Set<LPort>, top: number, bottom: number): number {
  let count = 0;
  for (const port of ports) {
    if (SplinesMath.isBetweenDouble(port.getAbsoluteAnchor().y, top, bottom)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate the "must lay left of" dependency for two SplineHyperEdges.
 *
 * @param edge0 First hyper-edge to compare.
 * @param edge1 Second hyper-edge to compare.
 * @see SplineEdgeRouter.java:655
 */
export function createDependency(edge0: SplineSegment, edge1: SplineSegment): void {
  if (edge0.hyperEdgeTopYPos > edge1.hyperEdgeBottomYPos || edge1.hyperEdgeTopYPos > edge0.hyperEdgeBottomYPos) {
    // the two hyper-edges do not share a vertical segment
    return;
  }

  // the two loops over the right ports count up, the two over the left ports down (the Java increments and decrements)
  const edge0Counter =
    countPortsBetween(edge0.rightPorts, edge1.hyperEdgeTopYPos, edge1.hyperEdgeBottomYPos) -
    countPortsBetween(edge0.leftPorts, edge1.hyperEdgeTopYPos, edge1.hyperEdgeBottomYPos);
  const edge1Counter =
    countPortsBetween(edge1.rightPorts, edge0.hyperEdgeTopYPos, edge0.hyperEdgeBottomYPos) -
    countPortsBetween(edge1.leftPorts, edge0.hyperEdgeTopYPos, edge0.hyperEdgeBottomYPos);

  if (edge0Counter < edge1Counter) {
    // edge0 should lay left of edge1
    new SplineEdgeRouterDependency(edge0, edge1, edge1Counter - edge0Counter);
  } else if (edge1Counter < edge0Counter) {
    // edge0 should lay right of edge1
    new SplineEdgeRouterDependency(edge1, edge0, edge0Counter - edge1Counter);
  } else {
    // in either ordering there would be the same number of crossings
    new SplineEdgeRouterDependency(edge1, edge0, 0);
    new SplineEdgeRouterDependency(edge0, edge1, 0);
  }
}
