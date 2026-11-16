// SPDX-License-Identifier: EPL-2.0
import type { CGroup } from '../../../common/compaction/oned/CGroup.js';
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import type { ICompactionAlgorithm } from '../../../common/compaction/oned/ICompactionAlgorithm.js';
import type { OneDimensionalCompactor } from '../../../common/compaction/oned/OneDimensionalCompactor.js';
import { NEdge } from '../../../common/networksimplex/NEdge.js';
import { NGraph } from '../../../common/networksimplex/NGraph.js';
import { NNode } from '../../../common/networksimplex/NNode.js';
import { NetworkSimplex } from '../../../common/networksimplex/NetworkSimplex.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { LinkedHashMultimap } from '../../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../../guava/Multimap.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import { identity } from '../../../../java/util/HashStrategy.js';
import type { LEdge } from '../../graph/LEdge.js';
import { LNode } from '../../graph/LNode.js';
import { LPort } from '../../graph/LPort.js';
import { getLNodeOrNull, getVerticalSegmentOrNull, isVerticalSegmentsOfSameEdge } from './CNodeOrigins.js';
import { VerticalSegment } from './VerticalSegment.js';

const SEPARATION_WEIGHT = 1;
const EDGE_WEIGHT = 100;

/**
 * Compaction strategy for the {@link OneDimensionalCompactor} based on the network simplex algorithm. As a consequence
 * not the width is minimized but the edge length of the underlying network simplex graph. We model this graph, such
 * that the edge lengths of the original {@link org.eclipse.elk.alg.layered.graph.LGraph LGraph} are minimized.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/NetworkSimplexCompaction.java
 */
export class NetworkSimplexCompaction implements ICompactionAlgorithm {
  private compactor: OneDimensionalCompactor = null as never;
  private networkSimplexGraph: NGraph = null as never;

  private nNodes: NNode[] = [];
  private index = 0;

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/NetworkSimplexCompaction.java */
  compact(theCompactor: OneDimensionalCompactor): void {
    this.compactor = theCompactor;
    this.networkSimplexGraph = new NGraph();

    this.nNodes = new Array<NNode>(this.compactor.cGraph.cGroups.length);
    this.index = 0;

    // create a node in the network simplex graph for each group
    for (const cGroup of this.compactor.cGraph.cGroups) {
      cGroup.id = this.index;
      const nNode = NNode.of().id(this.index).origin(cGroup).create(this.networkSimplexGraph);
      this.nNodes[this.index] = nNode;

      this.index++;
    }

    // #2 transform constraint graph edges
    this.addSeparationConstraints();

    // #3 add the original graph's edges for edge length minimization
    this.addEdgeConstraints();

    // #4 network simplex does not allow disconnected graphs
    //  so we make it connected!
    this.addArtificialSourceNode();

    //        if(nNodes.length > 1)
    //        networkSimplexGraph.writeDebugGraph("d:/tmp/cc/foo.kgx");

    // #5 execute network simplex
    NetworkSimplex.forGraph(this.networkSimplexGraph).execute(new BasicProgressMonitor());

    // #6 apply positions
    for (const cNode of this.compactor.cGraph.cNodes) {
      cNode.hitbox.x = this.nNodes[(cNode.cGroup as CGroup).id]!.layer + cNode.cGroupOffset.x;
    }
  }

  /** Add constraints that guarantee proper spacing and order between all groups. */
  private addSeparationConstraints(): void {
    for (const cNode of this.compactor.cGraph.cNodes) {
      for (const incNode of cNode.constraints) {
        // no need to add edges between nodes of the same group
        if (cNode.cGroup === incNode.cGroup) {
          continue;
        }

        let spacing: number;
        if (this.compactor.direction.isHorizontal()) {
          spacing = this.compactor.spacingsHandler.getHorizontalSpacing(cNode, incNode);
        } else {
          spacing = this.compactor.spacingsHandler.getVerticalSpacing(cNode, incNode);
        }

        // the constraint edges look as follows:
        //   cNode <-- incNode
        let delta = cNode.cGroupOffset.x + cNode.hitbox.width + spacing - incNode.cGroupOffset.x;

        // network simplex requires an integer for delta
        delta = Math.ceil(delta);

        // negative values can occur with external ports
        //  it should be ok to fix this here
        delta = Math.max(0, delta);

        if (!isVerticalSegmentsOfSameEdge(cNode, incNode)) {
          this.addSeparationEdge(cNode, incNode, delta);
        } else {
          this.addVerticalSegmentEdges(cNode, incNode);
        }
      }
    }
  }

  /** The `if` branch of Java's separation loop: a single edge, i.e. constraint, for two nodes of different edges. */
  private addSeparationEdge(cNode: CNode, incNode: CNode, delta: number): void {
    // it looks nicer if the initial segment is close to the node
    let weight = SEPARATION_WEIGHT;
    if (
      (cNode.origin instanceof VerticalSegment && incNode.origin instanceof LNode) ||
      (incNode.origin instanceof VerticalSegment && cNode.origin instanceof LNode)
    ) {
      weight = 2;
    }
    // add a single edge, i.e. constraint to the network simplex graph
    NEdge.of()
      .delta(d2i(delta))
      .weight(weight) // small weight here, it only preserves separations
      .source(this.nNodes[(cNode.cGroup as CGroup).id]!)
      .target(this.nNodes[(incNode.cGroup as CGroup).id]!)
      .create();
  }

  /** The `else` branch of Java's separation loop: two vertical segments of the same edge. */
  private addVerticalSegmentEdges(cNode: CNode, incNode: CNode): void {
    // vertical segments are quite a species ...
    //  it may be necessary to change the "order" of
    //  vertical segments' groups to get a straight
    //  edge without violating any other requirements

    const helper = NNode.of().create(this.networkSimplexGraph);
    const offsetDelta = d2i(Math.ceil(incNode.cGroupOffset.x - cNode.cGroupOffset.x));

    // if ports are involved, move one of them slightly since the computed positions will be integral
    let adjust = offsetDelta - (incNode.cGroupOffset.x - cNode.cGroupOffset.x);
    let port = (getVerticalSegmentOrNull(cNode) as VerticalSegment).aPort;
    let alterOffset = cNode;
    if (port === null) {
      port = (getVerticalSegmentOrNull(incNode) as VerticalSegment).aPort;
      adjust = -adjust;
      alterOffset = incNode;
    }

    if (port !== null) {
      alterOffset.cGroupOffset.x -= adjust;
      port.getPosition().x -= adjust;
    }

    NEdge.of()
      .delta(Math.max(0, offsetDelta))
      .weight(SEPARATION_WEIGHT)
      .source(helper)
      .target(this.nNodes[(cNode.cGroup as CGroup).id]!)
      .create();

    NEdge.of()
      .delta(Math.max(0, -offsetDelta))
      .weight(SEPARATION_WEIGHT)
      .source(helper)
      .target(this.nNodes[(incNode.cGroup as CGroup).id]!)
      .create();
  }

  /**
   * Add edges to the network simplex graph that represent the original {@link LEdge}s of the graph. Give them a larger
   * weight such that they are kept short.
   *
   * There are two additional special cases:
   *  - directly connected north + south port (they are already handled by {@link addSeparationConstraints}. Note that
   *    this is only possible because the spacings handler that is specified in {@link HorizontalGraphCompactor} adds a
   *    single pixel to each of the vertical segments, thus enforcing a constraint)
   *  - inverted ports
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/NetworkSimplexCompaction.java
   */
  private addEdgeConstraints(): void {
    // collect the original edges
    // AD-10 (W6): `Maps.newHashMap()`, identity-keyed, only `get` (no iteration): a Map.
    const lNodeMap = new Map<LNode, CNode>();
    // AD-10 (W6): `HashMultimap.create()`, identity-keyed; `get(lEdge)` iterates the value set below. Under
    // -XX:hashCode=2 every identity hash is 1, so the value set iterates in insertion order: LinkedHashMultimap.
    const lEdgeMap: Multimap<LEdge, CNode> = LinkedHashMultimap.create(identity<LEdge>(), identity<CNode>());
    for (const cNode of this.compactor.cGraph.cNodes) {
      const lNode = getLNodeOrNull(cNode);
      if (lNode !== null) {
        lNodeMap.set(lNode, cNode);
      } else {
        const vs = getVerticalSegmentOrNull(cNode);
        if (vs !== null) {
          for (const e of vs.representedLEdges) {
            lEdgeMap.put(e, cNode);
          }
        }
      }
    }

    // add network simplex edges
    for (const cNode of this.compactor.cGraph.cNodes) {
      const lNode = getLNodeOrNull(cNode);
      if (lNode !== null) {
        for (const lEdge of lNode.getOutgoingEdges()) {
          this.addEdgeConstraintsOf(lEdge, cNode, lNodeMap, lEdgeMap);
        }
      }
    }
  }

  /** The body of Java's loop over the outgoing edges of one node. */
  private addEdgeConstraintsOf(
    lEdge: LEdge,
    cNode: CNode,
    lNodeMap: ReadonlyMap<LNode, CNode>,
    lEdgeMap: Multimap<LEdge, CNode>,
  ): void {
    // ignore self-loops
    if (lEdge.isSelfLoop()) {
      return;
    }

    const srcPort = lEdge.getSource() as LPort;
    const tgtPort = lEdge.getTarget() as LPort;

    // they may be connected "directly"
    // if one of them is north or south however, we still want to pull the node close
    if (PortSide.SIDES_NORTH_SOUTH.has(srcPort.getSide()) && PortSide.SIDES_NORTH_SOUTH.has(tgtPort.getSide())) {
      return;
    }

    // Port verbatim: Java throws a NullPointerException on the next statement when the target node has no CNode (a
    // comment box under EDGE_LENGTH); `target.cGroup` throws a TypeError at the same statement here.
    const target = lNodeMap.get((lEdge.getTarget() as LPort).getNode() as LNode) as CNode;

    NEdge.of()
      .delta(0)
      .weight(EDGE_WEIGHT)
      .source(this.nNodes[(cNode.cGroup as CGroup).id]!)
      .target(this.nNodes[(target.cGroup as CGroup).id]!)
      .create();

    this.addInvertedPortConstraints(lEdge, cNode, lEdgeMap);
  }

  /** The two "inverted ports" blocks at the end of Java's loop over the outgoing edges (source side, then target side). */
  private addInvertedPortConstraints(lEdge: LEdge, cNode: CNode, lEdgeMap: Multimap<LEdge, CNode>): void {
    const srcPort = lEdge.getSource() as LPort;
    const tgtPort = lEdge.getTarget() as LPort;

    // keep vertical segments close to the node if they are inverted ports
    if (srcPort.getSide() === PortSide.WEST && LPort.OUTPUT_PREDICATE(srcPort)) {
      for (const n of lEdgeMap.get(lEdge)) {
        if (n.hitbox.x < cNode.hitbox.x) {
          this.addInvertedPortEdge(n, cNode);
        }
      }
    }

    if (tgtPort.getSide() === PortSide.EAST && LPort.INPUT_PREDICATE(tgtPort)) {
      for (const n of lEdgeMap.get(lEdge)) {
        if (n.hitbox.x > cNode.hitbox.x) {
          this.addInvertedPortEdge(cNode, n);
        }
      }
    }
  }

  /** The duplicated innermost block of Java's two inverted-port loops: the `src`/`tgt` pair and its edge. */
  private addInvertedPortEdge(srcNode: CNode, tgtNode: CNode): void {
    const src = this.nNodes[(srcNode.cGroup as CGroup).id]!;
    const tgt = this.nNodes[(tgtNode.cGroup as CGroup).id]!;
    if (src === tgt) {
      return;
    }
    NEdge.of().delta(1).weight(EDGE_WEIGHT).source(src).target(tgt).create();
  }

  /** Creates an new node in the network simplex graph and adds an edge to every (so far) source node. */
  private addArtificialSourceNode(): void {
    const sources: NNode[] = [];
    for (const n of this.networkSimplexGraph.nodes) {
      if (n.getIncomingEdges().isEmpty()) {
        sources.push(n);
      }
    }

    if (sources.length > 1) {
      const dummySource = NNode.of().id(this.index++).create(this.networkSimplexGraph);

      for (const src of sources) {
        NEdge.of().delta(1).weight(0).source(dummySource).target(src).create();
      }
    }
  }
}
