// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { Direction } from '../../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import type { ICompactionAlgorithm } from '../../../common/compaction/oned/ICompactionAlgorithm.js';
import type { ISpacingsHandler } from '../../../common/compaction/oned/ISpacingsHandler.js';
import { OneDimensionalCompactor } from '../../../common/compaction/oned/OneDimensionalCompactor.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { ConstraintCalculationStrategy } from '../../options/ConstraintCalculationStrategy.js';
import { GraphCompactionStrategy } from '../../options/GraphCompactionStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { Spacings } from '../../options/Spacings.js';
import {
  getLNodeOrNull as getLNodeOrNullImpl,
  getVerticalSegmentOrNull as getVerticalSegmentOrNullImpl,
  isVerticalSegmentsOfSameEdge as isVerticalSegmentsOfSameEdgeImpl,
} from './CNodeOrigins.js';
import { EdgeAwareScanlineConstraintCalculation } from './EdgeAwareScanlineConstraintCalculation.js';
import { LGraphToCGraphTransformer } from './LGraphToCGraphTransformer.js';
import { NetworkSimplexCompaction } from './NetworkSimplexCompaction.js';
import type { VerticalSegment } from './VerticalSegment.js';

/**
 * This processor applies additional compaction to an already routed graph and can be executed after
 * {@link org.eclipse.elk.alg.layered.p5edges.OrthogonalEdgeRouter OrthogonalEdgeRouter}.
 * Therefore nodes and vertical segments of edges are repositioned in the specified direction where
 * the position is minimal considering the desired spacing between elements.
 *
 * Since the used locking functionality relies on the direction of incoming and outgoing edges, this processor is
 * required to be executed before the {@link org.eclipse.elk.alg.layered.intermediate.ReversedEdgeRestorer}.
 *
 * Splines: The processor is able to cope with edges that are routed using spline segments. North/south ports have not
 * been tested in this scenario, however, and are likely to yield undesired results.
 *
 * Precondition: The edges have been routed. Postcondition: Nodes and edges are positioned compact without colliding.
 * Slots: After phase 5. Same-slot dependencies: Before LabelDummyRemover (otherwise labels would be ignored during
 * compaction); before ReversedEdgeRestorer.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
 */
export class HorizontalGraphCompactor implements ILayoutProcessor<LGraph> {
  /**
   * Compaction algorithm based on the network simplex algorithm presented by Gansner et al. in the context of layering.
   * Held in a lazily filled static (not read when this module is evaluated): the algorithm class reaches the
   * enum-valued helpers of this package, and Java's static initializer order has no TypeScript counterpart.
   */
  static #networkSimplexCompaction: ICompactionAlgorithm | undefined;

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java */
  static get NETWORK_SIMPLEX_COMPACTION(): ICompactionAlgorithm {
    return (HorizontalGraphCompactor.#networkSimplexCompaction ??= new NetworkSimplexCompaction());
  }

  private lGraph: LGraph = null as never;

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java */
  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    const strategy = layeredGraph.getProperty(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY);
    if (strategy === GraphCompactionStrategy.NONE) {
      return;
    }
    progressMonitor.begin('Horizontal Compaction', 1);

    this.lGraph = layeredGraph;

    // the layered graph is transformed into a CGraph that is passed to OneDimensionalCompactor
    const transformer = new LGraphToCGraphTransformer();
    const odc = new OneDimensionalCompactor(transformer.transform(layeredGraph));

    // consider special spacing requirements of the lgraph's nodes and edges
    odc.setSpacingsHandler(this.specialSpacingsHandler);

    // ---
    // select constraint algorithm
    // -
    switch (layeredGraph.getProperty(LayeredOptions.COMPACTION_POST_COMPACTION_CONSTRAINTS)) {
      case ConstraintCalculationStrategy.SCANLINE:
        odc.setConstraintAlgorithm(new EdgeAwareScanlineConstraintCalculation(this.lGraph));
        break;
      default:
        odc.setConstraintAlgorithm(OneDimensionalCompactor.QUADRATIC_CONSTRAINTS);
    }

    // ---
    // select compaction strategy
    // -
    this.compactWith(strategy, odc, transformer);

    // since changeDirection may transform hitboxes, the final direction has to be LEFT again
    odc.finish();

    // applying the compacted positions to the LGraph and updating its size and offset
    transformer.applyLayout();

    progressMonitor.done();
  }

  /** The `switch (strategy)` of Java's `process`, split out for the complexity limit. */
  private compactWith(
    strategy: GraphCompactionStrategy,
    odc: OneDimensionalCompactor,
    transformer: LGraphToCGraphTransformer,
  ): void {
    switch (strategy) {
      case GraphCompactionStrategy.LEFT:
        odc.compact();
        break;

      case GraphCompactionStrategy.RIGHT:
        odc.changeDirection(Direction.RIGHT).compact();
        break;

      case GraphCompactionStrategy.LEFT_RIGHT_CONSTRAINT_LOCKING:
        this.compactLeftRightConstraintLocking(odc);
        break;

      case GraphCompactionStrategy.LEFT_RIGHT_CONNECTION_LOCKING:
        this.compactLeftRightConnectionLocking(odc, transformer);
        break;

      case GraphCompactionStrategy.EDGE_LENGTH:
        odc.setCompactionAlgorithm(HorizontalGraphCompactor.NETWORK_SIMPLEX_COMPACTION).compact();
        break;

      default:
        // nobody should get here
        break;
    }
  }

  /** `case LEFT_RIGHT_CONSTRAINT_LOCKING` of Java's `switch (strategy)`. */
  private compactLeftRightConstraintLocking(odc: OneDimensionalCompactor): void {
    // lock CNodes if they are not constrained
    odc
      .compact()
      .changeDirection(Direction.RIGHT)
      .setLockFunction({ isLocked: (node) => node.cGroup!.outDegreeReal === 0 })
      .compact();
  }

  /** `case LEFT_RIGHT_CONNECTION_LOCKING` of Java's `switch (strategy)`. */
  private compactLeftRightConnectionLocking(
    odc: OneDimensionalCompactor,
    transformer: LGraphToCGraphTransformer,
  ): void {
    // compacting left, locking all CNodes that have fewer connections to the right,
    // then compacting right to shorten unnecessary long edges
    odc
      .compact()
      .changeDirection(Direction.RIGHT)
      .setLockFunction({ isLocked: (node, dir) => transformer.getLockMap().get(node)!.get(dir) })
      .compact();
  }

  /**
   * @returns true if both passed nodes originate from the same (set) of {@link org.eclipse.elk.alg.layered.graph.LEdge}.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
   */
  static isVerticalSegmentsOfSameEdge(cNode1: CNode, cNode2: CNode): boolean {
    return isVerticalSegmentsOfSameEdgeImpl(cNode1, cNode2);
  }

  /**
   * @returns the represented {@link LNode} (if set as {@link CNode.origin}), or `null`.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
   */
  static getLNodeOrNull(cNode: CNode): LNode | null {
    return getLNodeOrNullImpl(cNode);
  }

  /**
   * @returns the represented {@link VerticalSegment} (if set as {@link CNode.origin}), or `null`.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
   */
  static getVerticalSegmentOrNull(cNode: CNode): VerticalSegment | null {
    return getVerticalSegmentOrNullImpl(cNode);
  }

  /**
   * An implementation of a {@link ISpacingsHandler} that is able to cope with the special requirements of
   * {@link LGraph}s. For instance, there are special cases for the spacing between LEdges as opposed to LNodes.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
   */
  private readonly specialSpacingsHandler: ISpacingsHandler = {
    getHorizontalSpacing: (cNode1: CNode, cNode2: CNode): number => {
      // joining north/south segments that belong to the same edge
      // by setting their spacing to 0
      if (isVerticalSegmentsOfSameEdgeImpl(cNode1, cNode2)) {
        return 0;
      }

      // get the underlying LNodes
      const node1 = getLNodeOrNullImpl(cNode1);
      const node2 = getLNodeOrNullImpl(cNode2);

      // if either of the two involved nodes represents an external port,
      //  it's ok to move the port as close as possible since it will be
      //  positioned correctly by another processor later on
      if (
        (node1 !== null && node1.getType() === NodeType.EXTERNAL_PORT) ||
        (node2 !== null && node2.getType() === NodeType.EXTERNAL_PORT)
      ) {
        return 0;
      }

      // default behavior, query the Spacings object
      const spacings: Spacings = this.lGraph.getProperty(InternalProperties.SPACINGS);

      // either get the spacing for the node's type or if there is no
      //  corresponding element in the original graph, we use the
      //  long edge dummy spacing.
      return spacings.getHorizontalSpacing(
        node1 !== null ? node1.getType() : NodeType.LONG_EDGE,
        node2 !== null ? node2.getType() : NodeType.LONG_EDGE,
      );
    },

    getVerticalSpacing: (cNode1: CNode, cNode2: CNode): number => {
      // Note that this method is only called when the quadratic constraint calculation is used
      //  (not if the edge aware scanline procedure is used).

      // joining north/south segments that belong to the same edge
      // by setting their vertical spacing to 1,
      // i.e. they overlap in the y dimension which results in a constraint
      if (isVerticalSegmentsOfSameEdgeImpl(cNode1, cNode2)) {
        return 1;
      }

      // get the underlying LNodes
      const node1 = getLNodeOrNullImpl(cNode1);
      const node2 = getLNodeOrNullImpl(cNode2);

      // default behavior, query the Spacings object
      const spacings: Spacings = this.lGraph.getProperty(InternalProperties.SPACINGS);

      return spacings.getVerticalSpacing(
        node1 !== null ? node1.getType() : NodeType.LONG_EDGE,
        node2 !== null ? node2.getType() : NodeType.LONG_EDGE,
      );
    },
  };
}
