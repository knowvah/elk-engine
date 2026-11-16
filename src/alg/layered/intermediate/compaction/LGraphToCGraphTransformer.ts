// SPDX-License-Identifier: EPL-2.0
import { CGraph } from '../../../common/compaction/oned/CGraph.js';
import { CGroup } from '../../../common/compaction/oned/CGroup.js';
import { CNode } from '../../../common/compaction/oned/CNode.js';
import { Quadruplet } from '../../../common/compaction/oned/Quadruplet.js';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { KVector } from '../../../../core/math/KVector.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { Pair } from '../../../../core/util/Pair.js';
import * as Iterables from '../../../../guava/Iterables.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { SplineSegment } from '../../p5edges/splines/SplineSegment.js';
import { getLNodeOrNull } from './CNodeOrigins.js';
import { collectVerticalSegmentsOrthogonal } from './LGraphToCGraphTransformerOrthogonal.js';
import { adjustSplineControlPoints, collectVerticalSegmentsSplines } from './LGraphToCGraphTransformerSplines.js';
import { VerticalSegment } from './VerticalSegment.js';

/** @see the Java `NODE_TO_STRING_DELEGATE` (debugging only) */
const NODE_TO_STRING_DELEGATE = (n: CNode): string =>
  String((n.origin as LNode).getProperty(InternalProperties.ORIGIN));
/** @see the Java `VS_TO_STRING_DELEGATE` (debugging only) */
const VS_TO_STRING_DELEGATE = (n: CNode): string => (n.origin as VerticalSegment).toString();

/**
 * Manages the transformation of {@link LNode}s and {@link LEdge}s from an {@link LGraph} into compactable
 * {@link CNode}s and {@link CGroup}s.
 *
 * The Java file is 673 lines; the orthogonal and spline vertical-segment collection and the spline control point
 * adjustment live in `LGraphToCGraphTransformerOrthogonal.ts` and `LGraphToCGraphTransformerSplines.ts` (file size
 * limit).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/LGraphToCGraphTransformer.java
 */
export class LGraphToCGraphTransformer {
  /** the output CGraph. */
  private cGraph: CGraph = null as never;
  /** the layered graph. */
  private layeredGraph: LGraph = null as never;
  /** Current style of edge routing. */
  private edgeRouting: EdgeRouting = null as never;
  /**
   * remember comment boxes as we neglect them during compaction and offset them afterwards.
   * AD-10 (W6): `Maps.newHashMap()`, identity-keyed, iterated by `applyCommentPositions`: insertion-ordered Map.
   */
  private commentOffsets = new Map<LNode, Pair<LNode, KVector>>();

  /* ------------------ Internal Mappings ------------------ */
  /** AD-10 (W6): identity-keyed; key set iterated by `applyLayout` (twice): insertion-ordered Map. */
  private nodesMap = new Map<LNode, CNode>();
  /** AD-10 (W6): identity-keyed; key set iterated by `transformEdges`: insertion-ordered Map. */
  private verticalSegmentsMap = new Map<VerticalSegment, CNode>();
  /** AD-10 (W6): identity-keyed; `get` and `clear` only (`getLockMap` hands it out): Map. */
  private lockMap = new Map<CNode, Quadruplet>();

  /**
   * @returns the input graph transformed into a corresponding constraint graph.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/LGraphToCGraphTransformer.java
   */
  transform(inputGraph: LGraph): CGraph {
    this.layeredGraph = inputGraph;
    this.edgeRouting = this.layeredGraph.getProperty(LayeredOptions.EDGE_ROUTING);

    this.init();
    this.transformNodes();
    this.transformEdges();

    return this.cGraph;
  }

  /**
   * @returns the lockMap
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/LGraphToCGraphTransformer.java
   */
  getLockMap(): Map<CNode, Quadruplet> {
    return this.lockMap;
  }

  private init(): void {
    // checking if the graph has edges and possibly prohibiting vertical compaction
    let hasEdges = false;

    let index = 0;
    for (const l of this.layeredGraph) {
      l.id = index++;
      for (const n of l) {
        // avoid calling Iterables.isEmpty unnecessarily
        if (!hasEdges && !Iterables.isEmpty(n.getConnectedEdges())) {
          hasEdges = true;
        }
      }
    }

    const supportedDirections = EnumSet.of(Direction.UNDEFINED, Direction.LEFT, Direction.RIGHT);
    if (!hasEdges) {
      supportedDirections.add(Direction.UP);
      supportedDirections.add(Direction.DOWN);
    }

    // initializing members
    this.cGraph = new CGraph(supportedDirections);
    this.nodesMap.clear();
    this.commentOffsets.clear();
    this.lockMap.clear();
    this.verticalSegmentsMap.clear();
  }

  private transformNodes(): void {
    for (const layer of this.layeredGraph) {
      for (const node of layer) {
        if (this.rememberCommentBox(node)) {
          continue;
        }

        const hitbox = new ElkRectangle(
          node.getPosition().x - node.getMargin().left,
          node.getPosition().y - node.getMargin().top,
          node.getSize().x + node.getMargin().left + node.getMargin().right,
          node.getSize().y + node.getMargin().top + node.getMargin().bottom,
        );

        // create the node in the compaction graph
        const cNode = CNode.of()
          .origin(node)
          .hitbox(hitbox)
          .toStringDelegate(NODE_TO_STRING_DELEGATE)
          .create(this.cGraph);
        // the node lives in its own group
        CGroup.of().nodes(cNode).master(cNode).create(this.cGraph);

        const nodeLock = this.createNodeLock(node);
        this.lockMap.set(cNode, nodeLock);

        this.nodesMap.set(node, cNode);
      }
    }
  }

  /**
   * The comment box check of Java's `transformNodes` loop: comment boxes are part of a node's margins, hence we can
   * neglect them here without the risk of other nodes overlapping them after compaction.
   *
   * @returns whether the node was remembered as a comment box (Java: `continue`)
   */
  private rememberCommentBox(node: LNode): boolean {
    if (node.getProperty(LayeredOptions.COMMENT_BOX)) {
      if (!Iterables.isEmpty(node.getConnectedEdges())) {
        const e = Iterables.get(node.getConnectedEdges(), 0);
        let other = (e.getSource() as LPort).getNode() as LNode;
        if (other === node) {
          other = (e.getTarget() as LPort).getNode() as LNode;
        }
        const p = Pair.of(other, node.getPosition().clone().sub(other.getPosition()));
        this.commentOffsets.set(node, p);
        return true;
      }
    }
    return false;
  }

  /** The lock of a node's CNode (the `Quadruplet nodeLock` part of Java's `transformNodes` loop). */
  private createNodeLock(node: LNode): Quadruplet {
    const nodeLock = new Quadruplet();

    // locking the node for directions that fewer edges are connected in
    // (only used if LEFT_RIGHT_CONNECTION_LOCKING is used)
    const difference = Iterables.size(node.getIncomingEdges()) - Iterables.size(node.getOutgoingEdges());
    if (difference < 0) {
      nodeLock.set(true, Direction.LEFT);
    } else if (difference > 0) {
      nodeLock.set(true, Direction.RIGHT);
    }

    // excluding external port dummies
    if (node.getType() === NodeType.EXTERNAL_PORT) {
      nodeLock.set(false, false, false, false);
    }
    return nodeLock;
  }

  private transformEdges(): void {
    const style = this.layeredGraph.getProperty(LayeredOptions.EDGE_ROUTING);
    let verticalSegments: VerticalSegment[];
    switch (style) {
      case EdgeRouting.ORTHOGONAL:
        verticalSegments = collectVerticalSegmentsOrthogonal(this.layeredGraph, this.nodesMap);
        break;
      case EdgeRouting.SPLINES:
        verticalSegments = collectVerticalSegmentsSplines(this.layeredGraph);
        break;
      default:
        throw new IllegalStateException('Compaction not supported for ' + style.toString() + ' edges.');
    }

    // merge them
    this.mergeVerticalSegments(verticalSegments);

    // create precomputed constraints
    for (const vs of this.verticalSegmentsMap.keys()) {
      const vsNode = this.verticalSegmentsMap.get(vs) as CNode;
      for (const other of vs.constraints) {
        const otherNode = this.verticalSegmentsMap.get(other) as CNode;
        this.cGraph.predefinedHorizontalConstraints.push(Pair.of(vsNode, otherNode));
      }
    }
  }

  private mergeVerticalSegments(verticalSegments: VerticalSegment[]): void {
    if (verticalSegments.length === 0) {
      return;
    }

    // sort the segments such that segments with the same
    //  x coordinate are consecutive within the list,
    //  for equal x coordinates, sort with ascending y coordinate
    verticalSegments.sort((a, b) => a.compareTo(b));

    // merge segments that intersect
    let pos = 0;
    let survivor = verticalSegments[pos++]!;

    while (pos < verticalSegments.length) {
      const next = verticalSegments[pos++]!;

      if (survivor.intersects(next)) {
        survivor = survivor.joinWith(next);
      } else {
        this.verticalSegmentToCNode(survivor);
        // start with a new segment
        survivor = next;
      }
    }

    // transform the last segment as well
    this.verticalSegmentToCNode(survivor);
  }

  private verticalSegmentToCNode(verticalSegment: VerticalSegment): void {
    // create CNode representation for the last segment
    const cNode = CNode.of()
      .origin(verticalSegment)
      .type('vs')
      .hitbox(new ElkRectangle(verticalSegment.hitbox))
      .toStringDelegate(VS_TO_STRING_DELEGATE)
      .create(this.cGraph);

    // group the node if requested, currently this is only the case for north/south segments of orthogonal edges
    // assumption: during creation of LNode representing CNodes, these CNodes have been fitted with their own group
    if (verticalSegment.potentialGroupParents.length !== 0) {
      (verticalSegment.potentialGroupParents[0]!.cGroup as CGroup).addCNode(cNode);
    }

    const vsLock = new Quadruplet();
    this.lockMap.set(cNode, vsLock);

    // segments belonging to multiple edges should be locked
    // in the direction that fewer different ports are connected in
    // (only used if LEFT_RIGHT_CONNECTION_LOCKING is active)
    // AD-10 (W6): `Sets.newHashSet()`, identity-keyed, read by `size()` only: Set.
    const inc = new Set<LPort | null>();
    const out = new Set<LPort | null>();
    for (const e of verticalSegment.representedLEdges) {
      inc.add(e.getSource());
      out.add(e.getTarget());
    }
    const difference = inc.size - out.size;
    if (difference < 0) {
      vsLock.set(true, Direction.LEFT);
      vsLock.set(false, Direction.RIGHT);
    } else if (difference > 0) {
      vsLock.set(false, Direction.LEFT);
      vsLock.set(true, Direction.RIGHT);
    }

    verticalSegment.joined.forEach((other) => {
      this.verticalSegmentsMap.set(other, cNode);
    });
    this.verticalSegmentsMap.set(verticalSegment, cNode);
  }

  /**
   * Apply the layout from the internal constraint graph back to the original lgraph.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/LGraphToCGraphTransformer.java
   */
  applyLayout(): void {
    // apply the compacted positions to nodes
    this.cGraph.cNodes
      .filter((cNode) => cNode.origin instanceof LNode)
      .forEach((cNode) => {
        const lNode = cNode.origin as LNode;
        lNode.getPosition().x = cNode.hitbox.x + lNode.getMargin().left;
      });

    // adjust comment boxes
    this.applyCommentPositions();

    // apply new positions to vertical segments
    this.applyVerticalSegmentPositions();

    // special treatment of spline edge routes
    //  1) self loops have already been routed and are not part of the compaction graph,
    //     their positions have to be adjusted
    //  2) control points of straight parts of a spline have to be offset to
    //     be properly located in between non-straight parts
    if (this.edgeRouting === EdgeRouting.SPLINES) {
      this.applySplineOffsets();
    }

    // offset selfloop labels
    this.offsetSelfLoopLabels();

    // calculating new graph size and offset
    const topLeft = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const bottomRight = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    for (const cNode of this.cGraph.cNodes) {
      topLeft.x = Math.min(topLeft.x, cNode.hitbox.x);
      topLeft.y = Math.min(topLeft.y, cNode.hitbox.y);
      bottomRight.x = Math.max(bottomRight.x, cNode.hitbox.x + cNode.hitbox.width);
      bottomRight.y = Math.max(bottomRight.y, cNode.hitbox.y + cNode.hitbox.height);
    }
    this.layeredGraph.getOffset().reset().add(topLeft.clone().negate());
    this.layeredGraph.getSize().reset().add(bottomRight.clone().sub(topLeft));

    // external port dummies may have been moved ... put them back
    this.applyExternalPortPositions(topLeft, bottomRight);

    this.cleanup();
  }

  /** The "apply new positions to vertical segments" stream of Java's `applyLayout`. */
  private applyVerticalSegmentPositions(): void {
    this.cGraph.cNodes
      .filter((cNode) => cNode.origin instanceof VerticalSegment)
      .forEach((cNode) => {
        const deltaX = cNode.hitbox.x - cNode.hitboxPreCompaction.x;
        const vs = cNode.origin as VerticalSegment;
        vs.affectedBends.forEach((b) => {
          b.x += deltaX;
        });
        vs.affectedBoundingBoxes.forEach((bb) => {
          bb.x += deltaX;
        });
        for (const jp of vs.junctionPoints) {
          jp.x += deltaX;
        }
      });
  }

  /** The spline block of Java's `applyLayout` (`if (edgeRouting == EdgeRouting.SPLINES)`). */
  private applySplineOffsets(): void {
    // offset selfloops of splines
    for (const n of this.nodesMap.keys()) {
      for (const sl of n.getOutgoingEdges()) {
        if (sl.isSelfLoop()) {
          const lNode = (sl.getSource() as LPort).getNode() as LNode;
          const cNode = this.nodesMap.get(lNode) as CNode;
          const deltaX = cNode.hitbox.x - cNode.hitboxPreCompaction.x;
          sl.getBendPoints().offset(deltaX, 0);
        }
      }
    }

    // offset straight segments
    for (const l of this.layeredGraph.getLayers()) {
      for (const n of l.getNodes()) {
        for (const e of n.getOutgoingEdges()) {
          const chain = e.getProperty(InternalProperties.SPLINE_ROUTE_START) as SplineSegment[] | null;
          if (chain !== null && chain.length !== 0) {
            adjustSplineControlPoints(chain, this.nodesMap);
          }
        }
      }
    }
  }

  /** The "offset selfloop labels" stream of Java's `applyLayout`. */
  private offsetSelfLoopLabels(): void {
    for (const n of this.nodesMap.keys()) {
      for (const sl of n.getOutgoingEdges()) {
        if (sl.isSelfLoop()) {
          const lNode = (sl.getSource() as LPort).getNode() as LNode;
          const cNode = this.nodesMap.get(lNode) as CNode;
          const deltaX = cNode.hitbox.x - cNode.hitboxPreCompaction.x;
          sl.getLabels().forEach((l) => {
            l.getPosition().x += deltaX;
          });
        }
      }
    }
  }

  private applyCommentPositions(): void {
    for (const [comment, pair] of this.commentOffsets.entries()) {
      const other = pair.getFirst() as LNode;
      const offset = pair.getSecond() as KVector;
      comment.getPosition().reset().add(other.getPosition().clone().add(offset));
    }
  }

  private applyExternalPortPositions(topLeft: KVector, bottomRight: KVector): void {
    for (const cNode of this.cGraph.cNodes) {
      const lNode = getLNodeOrNull(cNode);
      if (lNode !== null) {
        if (lNode.getType() === NodeType.EXTERNAL_PORT) {
          switch (lNode.getProperty(InternalProperties.EXT_PORT_SIDE)) {
            case PortSide.WEST:
              lNode.getPosition().x = topLeft.x;
              break;
            case PortSide.EAST:
              lNode.getPosition().x = bottomRight.x - (lNode.getSize().x + lNode.getMargin().right);
              break;
            case PortSide.NORTH:
              lNode.getPosition().y = topLeft.y;
              break;
            case PortSide.SOUTH:
              lNode.getPosition().y = bottomRight.y - (lNode.getSize().y + lNode.getMargin().bottom);
              break;
            default:
              break;
          }
        }
      }
    }
  }

  private cleanup(): void {
    this.nodesMap.clear();
    this.commentOffsets.clear();
    this.verticalSegmentsMap.clear();
    this.lockMap.clear();
    this.cGraph.cGroups.length = 0;
    this.cGraph.cNodes.length = 0;
    this.cGraph = null as never;
    this.layeredGraph = null as never;
  }
}
