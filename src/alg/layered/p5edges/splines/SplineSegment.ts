// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { Pair } from '../../../../core/util/Pair.js';
import { sub as int32Sub } from '../../../../java/lang/Int32.js';
import { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { SplineEdgeRouterDependency } from './SplineEdgeRouterDependency.js';
import { SplineEdgeRouterSideToProcess as SideToProcess } from './SplineEdgeRouterSideToProcess.js';
import { SplineSegmentEdgeInformation as EdgeInformation } from './SplineSegmentEdgeInformation.js';

/**
 * Edges whose end points differ in y by less than this are straight (`SplineEdgeRouter.MAX_VERTICAL_DIFF_FOR_STRAIGHT`,
 * `SplineEdgeRouter.java:82`, used by `isStraight` only).
 */
const MAX_VERTICAL_DIFF_FOR_STRAIGHT = 0.2;

/**
 * Checks if the two Y coordinates are resulting in a straight edge.
 *
 * `SplineEdgeRouter.isStraight` (`SplineEdgeRouter.java:937`). The segment needs it and the router imports the segment,
 * so the body lives here as a module function (the X1 pattern: a section never imports its facade) and the router's
 * static delegates to it.
 *
 * @param firstY First Y coordinate.
 * @param secondY Second Y coordinate.
 * @return True, if the two Y coordinates result in a straight edge.
 */
export function isStraight(firstY: number, secondY: number): boolean {
  return Math.abs(firstY - secondY) < MAX_VERTICAL_DIFF_FOR_STRAIGHT;
}

/**
 * Additionally to the `NodeType.NORMAL` nodes, we deem `NodeType.BIG_NODE` and `NodeType.BREAKING_POINT` to be normal
 * nodes (`BIG_NODE` is no longer a node type: the Java test is `NORMAL || BREAKING_POINT`).
 *
 * `SplineEdgeRouter.isNormalNode` (`SplineEdgeRouter.java:980`), placed here for the reason `isStraight` is.
 *
 * @param node the node to test
 * @return true if we consider {@code node} to be normal.
 */
export function isNormalNode(node: LNode): boolean {
  const nt = node.getType();
  return nt === NodeType.NORMAL || nt === NodeType.BREAKING_POINT;
}

// Hyper-Edge Constants
/**
 * Defines the fraction of the outer y position of a hyper-edge for defining the "point of overlap" of two hyper-edges.
 * 1.0 means the point lays on the outer border of the hyper-edge.
 */
const HYPEREDGE_POS_OUTER_RATE = 0.9;
/** See RELEVANT_POS_OUTER_RATE! */
const HYPEREDGE_POS_MID_RATE = 1 - HYPEREDGE_POS_OUTER_RATE;
/** Avoiding magic number problems. */
const ONE_HALF = 0.5;

/**
 * Represents a segment of a spline that is to be created. A segment represents one or more `LEdge`s between adjacent
 * layers. In the case that more than one edge is represented, the segments represent a part of a hyperedge.
 *
 * Since a segment represents `LEdge`(s) between adjacent layers, it may represent `LEdge`(s) that were introduced during
 * the splitting of long edges (see `LongEdgeSplitter`). The control points for the final spline are created by the
 * `FinalSplineBendpointsCalculator`, which runs after long edges have been joined again. Consequently, not all `LEdge`s
 * exist anymore. Any information that is required from these edges to create final control points is stored in an
 * accompanying {@link EdgeInformation} class.
 *
 * Note on Hyperedges: Splines only support 1:n directed hyperedges. Also all ports on the n-side must lay on the same
 * SideToProcess, looking from the single port. So in a left to right routing, it is not possible to create a hyperedge
 * from an edge going upwards and an edge going downwards.
 *
 * Furthermore only hyperedges are considered for vertical alignment of edges. All other edges are assumed to go
 * straight to the target port.
 *
 * Containers (AD-10, R9): `edges` is the Java `HashSet<LEdge>` iterated by `FinalSplineBendpointsCalculator`: an
 * insertion-ordered `Set` (identity-hashed elements; journaled); `leftPorts`, `rightPorts` and `edgeInformation` are only
 * probed, plain `Set`/`Map`. The two Java constructors are one overloaded constructor told apart by the first argument
 * (an `LEdge` or an `LPort`); the edge pairs of the first form are iterated twice, so they must be re-iterable (a `Set`
 * or an array, as the Java `Set`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineSegment.java
 */
export class SplineSegment {
  // For convenient usage, members are public
  /**
   * Spline segments may be part of hyperedges, in which case the `FinalSplineBendpointsCalculator` may try to handle
   * them more than once. We avoid this by flagging the segment as 'handled' as soon as it has been seen.
   */
  handled = false;

  // the following variables are used during cycle breaking and topological sorting
  /** A sets of ports, determining the ports left of the hyper-edge. */
  readonly leftPorts: Set<LPort> = new Set<LPort>();
  /** A sets of ports, determining the ports right of the hyper-edge. */
  readonly rightPorts: Set<LPort> = new Set<LPort>();
  /** Outgoing dependencies are pointing to hyper-edges that must lay right of this hyper edge. */
  readonly outgoing: SplineEdgeRouterDependency[] = [];
  /** Incoming dependencies are pointing to hyper-edges that must lay left of this hyper edge. */
  readonly incoming: SplineEdgeRouterDependency[] = [];
  /** Used to mark nodes in the cycle breaker. */
  mark = 0;
  /** Determines how many elements are depending on this. */
  inweight = 0;
  /** Determines how many elements this element is depending on. */
  outweight = 0;
  /** the rank determines the horizontal distance to the preceding layer. */
  rank = 0;

  // variables representing the characteristics of the segment
  /** A set of all LEdges that are combined in this hyper-edge. */
  readonly edges: Set<LEdge> = new Set<LEdge>();
  /** If true, the spline segment has no vertical segment, connecting two ports by a horizontal edge path. */
  readonly isStraight: boolean;
  /** An imaginary bounding box in which this spline segment should reside. */
  boundingBox: ElkRectangle = new ElkRectangle();
  /** Indicates if this segment lies west of the very first layer (e.g. the case for westwards inverted ports). */
  isWestOfInitialLayer = false;
  /**
   * An x-coordinate offset to be used when the nodeNodeSpacing exceeds the required spacing between a pair of layers,
   * in which case it looks nicer to move the vertical segments halfway between the layers.
   */
  xDelta = 0;

  /** Source port of an edge represented by this segment. */
  sourcePort: LPort | null = null;
  /** Target port of an edge represented by this segment. */
  targetPort: LPort | null = null;

  /** Flag indicating if this segment is the initial segment of a spline. */
  initialSegment = false;
  /** Flag indicating if this segment is the last segment of a spline. */
  lastSegment = false;
  /**
   * If this segment is the {@link SplineSegment.initialSegment initial segment} of a spline, this field holds the
   * source node of the spline. Otherwise it is `null`.
   */
  sourceNode: LNode | null = null;
  /**
   * If this segment is the {@link SplineSegment.lastSegment last segment} of a spline, this field holds the target node
   * of the spline. Otherwise it is `null`.
   */
  targetNode: LNode | null = null;
  /**
   * Flag indicating that the control points computed for this segment must be interpreted in inverse order. This is
   * necessary for some segments when a `WrappingStrategy` is used.
   */
  inverseOrder = false;

  // hyperedge-related variables
  /**
   * If this segment represents a hyperedge, this is the top y coordinate of the segment that is used during dependency
   * graph creation for minimize edge crossings of vertical segments.
   */
  hyperEdgeTopYPos = 0;
  /**
   * If this segment represents a hyperedge, this is the bottom y coordinate of the segment that is used during
   * dependency graph creation for minimize edge crossings of vertical segments.
   */
  hyperEdgeBottomYPos = 0;
  /** If this segment is non-straight, this is the center control point of the spline route to be created. */
  centerControlPointY = 0;

  /** Map holding for each `LEdge` information that was valid during the edge routing phase. */
  edgeInformation: Map<LEdge, EdgeInformation> = new Map<LEdge, EdgeInformation>();

  /**
   * Constructor for a 1:n hyper-edge.
   *
   * @param singlePort The one and only source port.
   * @param edges All edges that shall be part of this hyper-edge paired with the side (LEFT or RIGHT) they are laying on.
   * @param sourceSide The side of the source.
   */
  constructor(singlePort: LPort, edges: Iterable<Pair<SideToProcess, LEdge>>, sourceSide: SideToProcess);
  /**
   * Constructor for a hyper-edges consisting of a single edge. This MAY be a straight edge.
   *
   * @param edge The straight edge that shall be the one and only element of this hyper-edge.
   * @param sourceSide On witch Layer (LEFT or RIGHT) lays the source port.
   * @param targetSide On witch Layer (LEFT or RIGHT) lays the target port.
   */
  constructor(edge: LEdge, sourceSide: SideToProcess, targetSide: SideToProcess);
  constructor(
    first: LPort | LEdge,
    second: Iterable<Pair<SideToProcess, LEdge>> | SideToProcess,
    third: SideToProcess,
  ) {
    this.isStraight =
      first instanceof LEdge
        ? this.constructSingleEdge(first, second as SideToProcess, third)
        : this.constructHyperEdge(first, second as Iterable<Pair<SideToProcess, LEdge>>, third);
  }

  /** The constructor for a 1:n hyper-edge, `SplineSegment.java:155`; returns the value of `isStraight`. */
  private constructHyperEdge(
    singlePort: LPort,
    edges: Iterable<Pair<SideToProcess, LEdge>>,
    sourceSide: SideToProcess,
  ): boolean {
    if (sourceSide === SideToProcess.LEFT) {
      this.leftPorts.add(singlePort);
    } else {
      this.rightPorts.add(singlePort);
    }

    let yMinPosOfTarget = Number.POSITIVE_INFINITY;
    let yMaxPosOfTarget = Number.NEGATIVE_INFINITY;

    for (const pair of edges) {
      const yPosOfTarget = this.addTargetPort(singlePort, pair);
      yMinPosOfTarget = Math.min(yMinPosOfTarget, yPosOfTarget);
      yMaxPosOfTarget = Math.max(yMaxPosOfTarget, yPosOfTarget);
    }

    const yPosOfSingleSide = this.anchorY(singlePort);

    // set the relevant positions
    this.setRelevantPositions(yPosOfSingleSide, yMinPosOfTarget, yMaxPosOfTarget);

    for (const pair of edges) {
      this.addEdge(pair.getSecond()!);
    }
    return false;
  }

  /**
   * The body of the first loop of the 1:n constructor (`SplineSegment.java:167-184`), split off to keep the method
   * small: puts the port at the other end of the pair's edge on the pair's side and returns its anchor y.
   */
  private addTargetPort(singlePort: LPort, pair: Pair<SideToProcess, LEdge>): number {
    const side = pair.getFirst()!;
    const edge = pair.getSecond()!;

    let tgtPort = edge.getSource()!;
    if (tgtPort === singlePort) {
      tgtPort = edge.getTarget()!;
    }

    if (side === SideToProcess.LEFT) {
      this.leftPorts.add(tgtPort);
    } else {
      this.rightPorts.add(tgtPort);
    }

    return this.anchorY(tgtPort);
  }

  /** The constructor for a hyper-edge of a single edge, `SplineSegment.java:208`; returns the value of `isStraight`. */
  private constructSingleEdge(edge: LEdge, sourceSide: SideToProcess, targetSide: SideToProcess): boolean {
    // adding left and right ports
    if (sourceSide === SideToProcess.LEFT) {
      this.leftPorts.add(edge.getSource()!);
    } else {
      this.rightPorts.add(edge.getSource()!);
    }
    if (targetSide === SideToProcess.LEFT) {
      this.leftPorts.add(edge.getTarget()!);
    } else {
      this.rightPorts.add(edge.getTarget()!);
    }

    // adding the edges
    this.addEdge(edge);

    // setting relevant positions
    const sourceY = this.anchorY(edge.getSource()!);
    const targetY = this.anchorY(edge.getTarget()!);
    this.setRelevantPositions(sourceY, targetY, targetY);

    return isStraight(sourceY, targetY);
  }

  private addEdge(edge: LEdge): void {
    this.edges.add(edge);

    const ei = new EdgeInformation();
    this.edgeInformation.set(edge, ei);
    ei.startY = this.anchorY(edge.getSource()!);
    ei.endY = this.anchorY(edge.getTarget()!);
    ei.normalSourceNode = isNormalNode(edge.getSource()!.getNode()!);
    ei.normalTargetNode = isNormalNode(edge.getTarget()!.getNode()!);
    ei.invertedLeft = edge.getSource()!.getSide() === PortSide.WEST;
    ei.invertedRight = edge.getTarget()!.getSide() === PortSide.EAST;
  }

  private anchorY(p: LPort): number {
    if (PortSide.SIDES_NORTH_SOUTH.has(p.getSide())) {
      // Java unboxes the `Double` here (`SplineSegment.java:247`): a port without SPLINE_NS_PORT_Y_COORD is a
      // NullPointerException (AD-16 keeps the error condition; the `SortByInputModelProcessor` precedent).
      const y = p.getProperty(InternalProperties.SPLINE_NS_PORT_Y_COORD) as number | null;
      if (y === null) {
        throw new TypeError('Cannot unbox the spline north/south y coordinate of a port without one');
      }
      return y;
    } else {
      return p.getAbsoluteAnchor().y;
    }
  }

  /**
   * @return `true` if this spline edge represents a hyperedge, i.e. it represents multiple `LEdge`s.
   */
  isHyperEdge(): boolean {
    return this.edges.size > 1;
  }

  compareTo(other: SplineSegment): number {
    return int32Sub(this.mark, other.mark);
  }

  /**
   * Sets the {@link SplineSegment.centerControlPointY} and the top and bottom hyperedge y coordinates to appropriate
   * values.
   *
   * @param sourceY The y-value of the source point.
   * @param targetYMin The y-value of lowest target point.
   * @param targetYMax The y-value of the highest target point.
   */
  private setRelevantPositions(sourceY: number, targetYMin: number, targetYMax: number): void {
    this.boundingBox.y = Math.min(sourceY, targetYMin);
    this.boundingBox.height = Math.max(sourceY, targetYMax) - this.boundingBox.y;

    if (sourceY < targetYMin) {
      // source lays below all target ports
      this.centerControlPointY = ONE_HALF * (sourceY + targetYMin);
      this.hyperEdgeTopYPos = HYPEREDGE_POS_MID_RATE * this.centerControlPointY + HYPEREDGE_POS_OUTER_RATE * sourceY;
      this.hyperEdgeBottomYPos =
        HYPEREDGE_POS_MID_RATE * this.centerControlPointY + HYPEREDGE_POS_OUTER_RATE * targetYMin;
    } else {
      // source lays above all target ports
      this.centerControlPointY = ONE_HALF * (sourceY + targetYMax);
      this.hyperEdgeTopYPos = HYPEREDGE_POS_MID_RATE * this.centerControlPointY + HYPEREDGE_POS_OUTER_RATE * targetYMax;
      this.hyperEdgeBottomYPos = HYPEREDGE_POS_MID_RATE * this.centerControlPointY + HYPEREDGE_POS_OUTER_RATE * sourceY;
    }
  }
}
