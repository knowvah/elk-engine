// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { fuzzyEquals } from '../../../guava/DoubleMath.js';
import { LinkedHashMultimap } from '../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../guava/Multimap.js';
import { devAssert } from '../../../java/lang/DevAssert.js';
import { identity } from '../../../java/util/HashStrategy.js';
import type { IComponent } from '../compaction/components/IComponent.js';
import type { IConnectedComponents } from '../compaction/components/IConnectedComponents.js';
import type { IExternalExtension } from '../compaction/components/IExternalExtension.js';
import { OneDimensionalComponentsCompaction } from '../compaction/components/OneDimensionalComponentsCompaction.js';
import { Point } from '../compaction/recthull/Point.js';
import { RectilinearConvexHull } from '../compaction/recthull/RectilinearConvexHull.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LMargin } from '../graph/LMargin.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { ComponentsCompactorEdgeTransformer } from './ComponentsCompactorEdgeTransformer.js';
import { ComponentsCompactorHullpoints } from './ComponentsCompactorHullpoints.js';
import { ComponentsCompactorInternalComponent } from './ComponentsCompactorInternalComponent.js';
import { ComponentsCompactorInternalConnectedComponents } from './ComponentsCompactorInternalConnectedComponents.js';
import { ComponentsCompactorInternalUnionExternalExtension } from './ComponentsCompactorInternalUnionExternalExtension.js';
import { ComponentsCompactorOuterSegments } from './ComponentsCompactorOuterSegments.js';
import { portSideToDirection } from './ComponentsCompactorPortSides.js';

/** Epsilon for double comparisons. */
const EPSILON = 0.0001;

/**
 * Contains implementations of the {@link IConnectedComponents} and {@link IComponent} interfaces for
 * {@link LGraph}s. As a consequence allows to compact a set of components using one dimensional compaction.
 *
 * Nested Java types live in `ComponentsCompactor<Name>.ts` (M15). `Hullpoints` composes an array instead of
 * extending `ArrayList`. `compact` and `transformLGraph` are split at their comment blocks for the
 * complexity limits (Java order kept).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java
 */
export class ComponentsCompactor {
  /** Instance of the compactor we use. */
  private compactor!: OneDimensionalComponentsCompaction<LNode, Set<LEdge>>;

  /** The offset after compaction has been applied. */
  private yetAnotherOffset!: KVector;
  /** The graph size after compaciton. */
  private compactedGraphSize!: KVector;

  private graphTopLeft!: KVector;
  private graphBottomRight!: KVector;
  /** Java's external-edge methods (`transformLEdge` …), built once the frame is known. */
  private edgeTransformer!: ComponentsCompactorEdgeTransformer;

  // ------------------------------------------------------------------------------------------------
  //                                          public API
  // ------------------------------------------------------------------------------------------------

  /**
   * @param graphs the components to be compacted
   * @param _originalGraphsSize the size of the overall graph as it is currently (unused, as in Java)
   * @param spacing the desired spacing to be preserved between any pair of components
   */
  compact(graphs: readonly LGraph[], _originalGraphsSize: KVector, spacing: number): void {
    this.determineGraphFrame(graphs);
    this.edgeTransformer = new ComponentsCompactorEdgeTransformer(this.graphTopLeft, this.graphBottomRight);

    // from the lgraphs, create connected components
    const ccs: IConnectedComponents<LNode, Set<LEdge>> = new ComponentsCompactorInternalConnectedComponents();
    for (const graph of graphs) {
      const c = this.transformLGraph(graph);
      ccs.getComponents().push(c);
      (c as ComponentsCompactorInternalComponent).containsRegularNodes =
        (c as ComponentsCompactorInternalComponent).containsRegularNodes || !c.getExternalExtensionSides().isEmpty();
    }

    // for every component we create an element in the compactor
    this.compactor = OneDimensionalComponentsCompaction.init(ccs, spacing);

    // execute compaction
    this.compactor.compact(new BasicProgressMonitor());

    this.yetAnotherOffset = new KVector();
    this.compactedGraphSize = this.compactor.getGraphSize();

    this.applyPositions(ccs);
    this.includeExternalEdgesInSize(ccs);

    this.yetAnotherOffset.negate();
    this.compactedGraphSize.add(this.yetAnotherOffset);
  }

  /**
   * Determines the extreme points of the current diagram, we will reuse this 'frame' to cut external
   * extensions at appropriate lengths.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:93
   */
  private determineGraphFrame(graphs: readonly LGraph[]): void {
    this.graphTopLeft = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    this.graphBottomRight = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    for (const graph of graphs) {
      for (const node of graph.getLayerlessNodes()) {
        this.graphTopLeft.x = Math.min(this.graphTopLeft.x, node.getPosition().x - node.getMargin().left);
        this.graphTopLeft.y = Math.min(this.graphTopLeft.y, node.getPosition().y - node.getMargin().top);
        this.graphBottomRight.x = Math.max(
          this.graphBottomRight.x,
          node.getPosition().x + node.getSize().x + node.getMargin().right,
        );
        this.graphBottomRight.y = Math.max(
          this.graphBottomRight.y,
          node.getPosition().y + node.getSize().y + node.getMargin().bottom,
        );
      }
    }
  }

  /**
   * Applies the positions.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:126
   */
  private applyPositions(ccs: IConnectedComponents<LNode, Set<LEdge>>): void {
    for (const cc of ccs.getComponents()) {
      // retrieve the common offset for the currently handled connected component
      const offset = this.compactor.getOffset(cc);

      // move it
      LGraphUtil.offsetGraph((cc as ComponentsCompactorInternalComponent).graph, offset.x, offset.y);

      // adjust positions of external ports
      for (const n of (cc as ComponentsCompactorInternalComponent).getNodes()) {
        if (n.getType() === NodeType.EXTERNAL_PORT) {
          const newPos = this.getExternalPortPosition(n.getPosition(), n.getProperty(InternalProperties.EXT_PORT_SIDE));

          n.getPosition().reset().add(newPos);
        }
      }
    }
  }

  /**
   * External edges contribute to the graph's size ... however, only certain segments do.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:148
   */
  private includeExternalEdgesInSize(ccs: IConnectedComponents<LNode, Set<LEdge>>): void {
    for (const cc of ccs.getComponents()) {
      for (const e of (cc as ComponentsCompactorInternalComponent).getExternalEdges()) {
        const vc = new KVectorChain(e.getBendPoints());
        vc.addAt(0, e.getSource()!.getAbsoluteAnchor());
        vc.add(e.getTarget()!.getAbsoluteAnchor());

        let last: KVector | null = null;
        for (const v of vc) {
          if (last === null) {
            last = v;
            continue;
          }
          if (fuzzyEquals(last.x, v.x, EPSILON)) {
            this.yetAnotherOffset.x = Math.min(this.yetAnotherOffset.x, last.x);
            this.compactedGraphSize.x = Math.max(this.compactedGraphSize.x, last.x);
          } else if (fuzzyEquals(last.y, v.y, EPSILON)) {
            this.yetAnotherOffset.y = Math.min(this.yetAnotherOffset.y, last.y);
            this.compactedGraphSize.y = Math.max(this.compactedGraphSize.y, last.y);
          }
          last = v;
        }
      }
    }
  }

  /**
   * @returns the offset by which each component has to be shifted after compaction such that the
   *          top-left-most point is (0, 0).
   */
  getOffset(): KVector {
    return this.yetAnotherOffset;
  }

  /** @returns the new graph size. */
  getGraphSize(): KVector {
    return this.compactedGraphSize;
  }

  // ------------------------------------------------------------------------------------------------
  //                                          private API
  // ------------------------------------------------------------------------------------------------

  /**
   * Converts a {@link LGraph} into an component, i.e. a set of rectangles describing the space occupied by
   * the component and a set of external extensions.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:201
   */
  private transformLGraph(graph: LGraph): IComponent<LNode, Set<LEdge>> {
    const component = new ComponentsCompactorInternalComponent(graph);

    if (!component.containsRegularNodes) {
      this.createDummyNode(graph);
    }

    // #1 convert the nodes to hull points
    const hullPoints = this.componentHullPoints(graph);

    // #2 convert external edges (see `convertExternalEdges`)
    const outerSegments = new ComponentsCompactorOuterSegments();
    const externalExtensions = this.convertExternalEdges(graph, hullPoints, outerSegments);

    // #3 create the common external extensions for this component
    //    (there can be 4 per component, one in each direction)
    const extensions: ComponentsCompactorInternalUnionExternalExtension[] = [];
    for (const ps of component.getExternalExtensionSides()) {
      const rects = this.createExtensionRectangles(ps, outerSegments, hullPoints);
      // instantiate the external extension object
      if (rects !== null) {
        const iuee = new ComponentsCompactorInternalUnionExternalExtension();
        iuee.side = ps;
        iuee.extension = rects[0];
        iuee.placeholder = rects[1];
        iuee.edges = new Set(externalExtensions.get(portSideToDirection(ps)));
        extensions.push(iuee);
      }
    }

    // #4 calculate the hull for the component
    component.externalExtensions.push(...extensions);
    component.rectilinearConvexHull = RectilinearConvexHull.of(hullPoints).splitIntoRectangles();

    return component;
  }

  /**
   * Step #2 of `transformLGraph`: convert external edges, while doing this, add further hull points contributed
   * by inner segments and remember extreme points of external segments. (Java `HashMultimap`, identity-keyed
   * `Direction`/`LEdge`; the oracle's constant identity hash yields insertion order, hence `LinkedHashMultimap`;
   * W6/AD-10.)
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:212
   */
  private convertExternalEdges(
    graph: LGraph,
    hullPoints: ComponentsCompactorHullpoints,
    outerSegments: ComponentsCompactorOuterSegments,
  ): Multimap<Direction, LEdge> {
    const externalExtensions: Multimap<Direction, LEdge> = LinkedHashMultimap.create(
      identity<Direction>(),
      identity<LEdge>(),
    );

    for (const node of graph.getLayerlessNodes()) {
      for (const edge of node.getOutgoingEdges()) {
        if (this.isExternalEdge(edge)) {
          const iee = this.transformLEdge(edge, hullPoints, outerSegments);
          externalExtensions.put(iee.getDirection(), iee.getRepresentative());
        }
      }
    }
    return externalExtensions;
  }

  /**
   * The `switch (ps)` of step #3: the extension and placeholder rectangles of one side, or null for a
   * side without a case (`UNDEFINED`).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:231
   */
  private createExtensionRectangles(
    ps: PortSide,
    outerSegments: ComponentsCompactorOuterSegments,
    hullPoints: ComponentsCompactorHullpoints,
  ): [ElkRectangle, ElkRectangle] | null {
    const min = outerSegments.min[ps.ordinal()];
    const max = outerSegments.max[ps.ordinal()];
    const extent = outerSegments.extent[ps.ordinal()];

    const sideRectangles = [min, max, extent] as const;
    if (ps === PortSide.WEST) {
      return this.westRectangles(hullPoints, ...sideRectangles);
    } else if (ps === PortSide.EAST) {
      return this.eastRectangles(hullPoints, ...sideRectangles);
    } else if (ps === PortSide.NORTH) {
      return this.northRectangles(hullPoints, ...sideRectangles);
    } else if (ps === PortSide.SOUTH) {
      return this.southRectangles(hullPoints, ...sideRectangles);
    }
    return null;
  }

  /** The `case WEST` of the `switch (ps)` of step #3 (Java :238). */
  private westRectangles(
    hullPoints: ComponentsCompactorHullpoints,
    min: number,
    max: number,
    extent: number,
  ): [ElkRectangle, ElkRectangle] {
    const tl = this.graphTopLeft;
    const extension = new ElkRectangle(tl.x, min, hullPoints.topLeft.x - tl.x, max - min);
    const placeholder = new ElkRectangle(tl.x, min, extent, max - min);
    hullPoints.add(extension.getTopRight());
    hullPoints.add(extension.getBottomRight());
    return [extension, placeholder];
  }

  /** The `case EAST` of the `switch (ps)` of step #3 (Java :251). */
  private eastRectangles(
    hullPoints: ComponentsCompactorHullpoints,
    min: number,
    max: number,
    extent: number,
  ): [ElkRectangle, ElkRectangle] {
    const br = this.graphBottomRight;
    const extension = new ElkRectangle(hullPoints.bottomRight.x, min, br.x - hullPoints.bottomRight.x, max - min);
    const placeholder = new ElkRectangle(br.x - extent, min, extent, max - min);
    hullPoints.add(extension.getTopLeft());
    hullPoints.add(extension.getBottomLeft());
    return [extension, placeholder];
  }

  /** The `case NORTH` of the `switch (ps)` of step #3 (Java :264). */
  private northRectangles(
    hullPoints: ComponentsCompactorHullpoints,
    min: number,
    max: number,
    extent: number,
  ): [ElkRectangle, ElkRectangle] {
    const tl = this.graphTopLeft;
    const extension = new ElkRectangle(min, tl.y, max - min, hullPoints.topLeft.y - tl.y);
    const placeholder = new ElkRectangle(min, tl.y, max - min, extent);
    hullPoints.add(extension.getBottomLeft());
    hullPoints.add(extension.getBottomRight());
    return [extension, placeholder];
  }

  /** The `case SOUTH` of the `switch (ps)` of step #3 (Java :277). */
  private southRectangles(
    hullPoints: ComponentsCompactorHullpoints,
    min: number,
    max: number,
    extent: number,
  ): [ElkRectangle, ElkRectangle] {
    const br = this.graphBottomRight;
    const extension = new ElkRectangle(min, hullPoints.bottomRight.y, max - min, br.y - hullPoints.bottomRight.y);
    const placeholder = new ElkRectangle(min, br.y - extent, max - min, extent);
    hullPoints.add(extension.getTopLeft());
    hullPoints.add(extension.getTopRight());
    return [extension, placeholder];
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:310 */
  private createDummyNode(graph: LGraph): LNode {
    // this can only be the case if there's a single external port
    //  to handle it properly, we give it a tiny little dummy rectangle
    devAssert(() => graph.getLayerlessNodes().length === 1);

    const extPortDummy = graph.getLayerlessNodes()[0];

    // create a small dummy node for the external port dummy
    const dummy = new LNode(graph);
    graph.getLayerlessNodes().push(dummy);
    // reassemble the size of the external dummy but assure
    //  that no dimension is zero. Otherwise we may end up
    //  with dimension-less hull rectangles which causes
    //  the scanline to fail
    dummy.getSize().x = Math.max(1, extPortDummy.getSize().x);
    dummy.getSize().y = Math.max(1, extPortDummy.getSize().y);

    // set the position such that it is on the proper side
    // with respect to the dummy port
    dummy.getPosition().x = extPortDummy.getPosition().x;
    dummy.getPosition().y = extPortDummy.getPosition().y;
    const side = extPortDummy.getProperty(InternalProperties.EXT_PORT_SIDE);
    if (side === PortSide.WEST) {
      dummy.getPosition().x += 2;
    } else if (side === PortSide.NORTH) {
      dummy.getPosition().y += 2;
    } else if (side === PortSide.EAST) {
      dummy.getPosition().x -= 2;
    } else if (side === PortSide.SOUTH) {
      dummy.getPosition().y -= 2;
    }

    // give the dummy a port and create an edge for it
    const dummyPort = new LPort();
    dummyPort.setNode(dummy);
    const dummyEdge = new LEdge();
    const extPortDummyPort = extPortDummy.getPorts()[0];
    dummyEdge.setSource(extPortDummyPort);
    dummyEdge.setTarget(dummyPort);
    // position the dummy port such that the edge will be straight
    dummyPort.getPosition().reset().add(extPortDummyPort.getPosition());
    dummyPort.getAnchor().reset().add(extPortDummyPort.getAnchor());

    return dummy;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:361 */
  private componentHullPoints(graph: LGraph): ComponentsCompactorHullpoints {
    const pts = new ComponentsCompactorHullpoints();

    for (const n of graph.getLayerlessNodes()) {
      if (n.getType() === NodeType.EXTERNAL_PORT) {
        continue;
      }

      // Note that labels of nodes are already part of a node's margins
      // the same is true for ports and their labels
      this.addLGraphElementBounds(pts, n, new KVector());

      // add bend points of the edges
      for (const edge of n.getOutgoingEdges()) {
        if (this.isExternalEdge(edge)) {
          continue;
        }

        for (const bp of edge.getBendPoints()) {
          const absolute = bp;
          pts.add(new Point(absolute.x, absolute.y));
        }
      }
    }

    return pts;
  }

  /**
   * (Java accepts any `LShape`; the only caller passes an `LNode`, so the `LPort`/`LLabel` margin arms are
   * unreachable and the `LNode` arm remains.)
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:391
   */
  private addLGraphElementBounds(pts: ComponentsCompactorHullpoints, element: LNode, offset: KVector): void {
    // extract the relevant margins object.
    //  there's LayoutOptions.MARGINS as well,
    //  however, this is only used outside of elk layered.
    const margins: LMargin = element.getMargin();
    // add bounding box of the node
    pts.add(
      new Point(element.getPosition().x - margins.left + offset.x, element.getPosition().y - margins.top + offset.y),
    );
    pts.add(
      new Point(
        element.getPosition().x - margins.left + offset.x,
        element.getPosition().y + element.getSize().y + margins.bottom + offset.y,
      ),
    );
    pts.add(
      new Point(
        element.getPosition().x + element.getSize().x + margins.right + offset.x,
        element.getPosition().y - margins.top + offset.y,
      ),
    );
    pts.add(
      new Point(
        element.getPosition().x + element.getSize().x + margins.right + offset.x,
        element.getPosition().y + element.getSize().y + margins.bottom + offset.y,
      ),
    );
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:418 */
  private isExternalEdge(edge: LEdge): boolean {
    return (
      edge.getSource()!.getNode()!.getType() === NodeType.EXTERNAL_PORT ||
      edge.getTarget()!.getNode()!.getType() === NodeType.EXTERNAL_PORT
    );
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:427 */
  private transformLEdge(
    externalEdge: LEdge,
    hullPoints: ComponentsCompactorHullpoints,
    outerSegments: ComponentsCompactorOuterSegments,
  ): IExternalExtension<LEdge> {
    return this.edgeTransformer.transformLEdge(externalEdge, hullPoints, outerSegments);
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:536 */
  private getExternalPortPosition(pos: KVector, ps: PortSide): KVector {
    return this.edgeTransformer.getExternalPortPosition(pos, ps);
  }
}
