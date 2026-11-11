// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../../graph/ElkGraphElement.js';
import { type ElkLabel, isElkLabel } from '../../../graph/ElkLabel.js';
import { type ElkNode, isElkNode } from '../../../graph/ElkNode.js';
import { type ElkPort, isElkPort } from '../../../graph/ElkPort.js';
import type { ElkShape } from '../../../graph/ElkShape.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { DCDirection } from '../graph/DCDirection.js';
import { DCElement } from '../graph/DCElement.js';
import { DCExtension } from '../graph/DCExtension.js';
import { DCGraph } from '../graph/DCGraph.js';
import { DisCoOptions } from '../options/DisCoOptions.js';
import { ElkGraphComponentsProcessor } from './ElkGraphComponentsProcessor.js';
import {
  adjustFirstSegment,
  computeIntersection,
  getContour,
  getOrthogonalPoints,
  nearestSide,
  newPoint,
} from './ElkGraphTransformerGeometry.js';
import {
  adjustIncomingExtensions,
  adjustOutgoingExtensions,
  adjustRelatedPort,
  resizeParent,
} from './ElkGraphTransformerApply.js';
import type { IGraphTransformer } from './IGraphTransformer.js';
import { OffsetApplier } from './OffsetApplier.js';

/**
 * Class for transforming any graph structure into a {@link DCGraph}, in order to use layout algorithms provided by
 * DisCo for compacting disconnected components of the given graph.
 *
 * Deviations forced by the complexity limits (statement order unchanged): the geometry methods (`getContour`,
 * `getOrthogonalPoints`, `computeIntersection`, `newPoint`, `nearestSide`, `adjustFirstSegment`) delegate to
 * `ElkGraphTransformerGeometry.ts`; `adjustRelatedPort` and the parts of `applyLayout` (`resizeParent`,
 * `adjustIncomingExtensions`, `adjustOutgoingExtensions`) are in `ElkGraphTransformerApply.ts`; `OffsetApplier` (the
 * private inner class) is its own file; `importGraph` is cut into `importComponent` and `importNodeShapes`,
 * `importExtension` into
 * `createExtensionShape` and `addExtension`; the identical label loops of `importElkEdge` and `importExtension` are
 * `importEdgeLabels`. The two Java constructors are one with `componentSpacing = 0.0`. AD-10 (FD4): `elementMapping`
 * is a `Map` (entries independent), the two extension mappings are `Map`s in insertion order (order-observable at
 * `adjustedPorts`), `edgeSet` a `Set`.
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export class ElkGraphTransformer implements IGraphTransformer<ElkNode> {
  // /////////////////////////////////////////////////////////////////////////////
  // Variables

  /** the graph represented by its hierarchical parent {@link ElkNode}. */
  private parent!: ElkNode;
  /**
   * Maps Elements of original graph to DCGraph elements, (but only if their coordinates have to be changed, when
   * components move. This doesn't concern ElkPorts (their coordinates are relative their ElkNode) and ElkLabels of
   * ElkNodes and ElkPorts).
   */
  private elementMapping: Map<ElkGraphElement, DCElement> = new Map<ElkGraphElement, DCElement>();

  private incomingExtensionsMapping: Map<ElkEdge, DCExtension> = new Map<ElkEdge, DCExtension>();
  private outgoingExtensionsMapping: Map<ElkEdge, DCExtension> = new Map<ElkEdge, DCExtension>();

  /** the graph after transformation into the simpler {@link DCGraph} used for layout out connected components. */
  private transformedGraph!: DCGraph;

  private componentSpacing: number = 0.0;

  // /////////////////////////////////////////////////////////////////////////////
  // Constructor

  /**
   * Creates a new graph transformer with a minimum given spacing between each two components (0 when omitted).
   *
   * @param componentSpacing minimum space among components
   */
  constructor(componentSpacing?: number) {
    if (componentSpacing !== undefined) {
      this.componentSpacing = componentSpacing;
    }
  }

  // /////////////////////////////////////////////////////////////////////////////
  // Implementation of interface methods

  importGraph(graph: ElkNode): DCGraph {
    this.parent = graph;
    // Split graph into components
    const components = ElkGraphComponentsProcessor.split(graph);
    // This list of lists is used to construct the DCGraph from its smallest units, so called DCElements.
    const result: DCElement[][] = [];

    for (const component of components) {
      this.importComponent(component, result);
    }
    // Finally create the DCGraph
    this.transformedGraph = new DCGraph(result, this.componentSpacing / 2);

    // Don't forget to copy properties of parent ElkNode to the DCGraph
    this.transformedGraph.copyProperties(graph);

    return this.transformedGraph;
  }

  /**
   * The body of the `for (List<ElkNode> component : components)` loop of `importGraph`.
   *
   * @param component the nodes of one connected component
   * @param result the list of components of DCElements to add this component's elements to
   */
  private importComponent(component: ElkNode[], result: DCElement[][]): void {
    // Each of the subResult lists will represent a connected component in the DCGraph.
    const subResult: DCElement[] = [];
    result.push(subResult);
    const edgeSet = new Set<ElkEdge>();
    for (const node of component) {
      // "true" indicates - we need to consider the position of ElkNodes when applying the new layout of the
      // DCGraph back to the KGraph.
      const componentNode = this.importElkShape(node, true, 0.0, 0.0);
      subResult.push(componentNode);

      // Compute offset for labels (used for computing absolute position)
      const nodeX = node.getX();
      const nodeY = node.getY();

      // For use in the Debugview only
      componentNode.setParentCoords(new KVector(nodeX, nodeY));

      this.importNodeShapes(node, nodeX, nodeY, subResult);

      for (const edge of new Set<ElkEdge>(ElkGraphUtil.allIncidentEdges(node))) {
        edgeSet.add(edge);
      }
    }
    this.importElkEdges(edgeSet, subResult);
  }

  /**
   * The labels and ports (with their labels) of a node, from the body of the node loop of `importGraph`.
   *
   * @param node the node
   * @param nodeX the node's x coordinate
   * @param nodeY the node's y coordinate
   * @param subResult the component's elements to add to
   */
  private importNodeShapes(node: ElkNode, nodeX: number, nodeY: number, subResult: DCElement[]): void {
    // next look at all labels of this ElkNode ...
    let labels: ElkLabel[] = [...node.getLabels()];
    for (const label of labels) {
      // "false" indicates - ElkLabels belonging to nodes have coordinates relative to their ElkNode. So don't
      // adjust their position when applying the layout of the DCGraph back to the KGraph.
      const componentLabel = this.importElkShape(label, false, nodeX, nodeY);
      subResult.push(componentLabel);
    }

    // ... then the ports of the ElkNode
    const ports: ElkPort[] = [...node.getPorts()];
    for (const port of ports) {
      // "false" - ElkPorts have coordinates relative to their ElkNode
      const componentPort = this.importElkShape(port, false, nodeX, nodeY);
      subResult.push(componentPort);

      // ElkPorts can have labels, too!
      // Compute offset for labels of ElkPorts
      const portX = port.getX() + nodeX;
      const portY = port.getY() + nodeY;

      labels = [...port.getLabels()];
      for (const label of labels) {
        // false - ElkLabels have coordinates relative to their ElkPort
        const componentLabel = this.importElkShape(label, false, portX, portY);
        subResult.push(componentLabel);
      }
    }
  }

  applyLayout(): void {
    const graphDimensions = this.transformedGraph.getDimensions()!;
    resizeParent(this.parent, graphDimensions);

    // Apply offsets, whenever necessary.
    const offsetApplier = new OffsetApplier();
    this.elementMapping.forEach((poly, elem) => {
      offsetApplier.accept(elem, poly);
    });

    const adjustedPorts: ElkPort[] = [];

    adjustIncomingExtensions(this.incomingExtensionsMapping, adjustedPorts);
    adjustOutgoingExtensions(this.outgoingExtensionsMapping, adjustedPorts);
  }

  // /////////////////////////////////////////////////////////////////////////////
  // Private helper methods

  /**
   * Transforms a {@link ElkNode}, {@link ElkLabel} or {@link ElkPort} into a {@link DCElement} without destroying it.
   * An offset may be applied, as some of these elements may have coordinates relative to another element, but the
   * {@link DCGraph} only works with absolute coordinates.
   *
   * @param element Elemment to be transformed
   * @param considerWhenApplyingOffset true - a key-value pair consisting of the original element and its
   *     {@link DCElement} representation will be saved and used later by `applyLayout` to set the original element to
   *     its new position after the layouting process has finished. false - the original element has coordinates
   *     relative to another element already moved and doesn't need new coordinates after layouting.
   * @param offsetX X-Coordinate of the offset needed to make the given element's coordinates absolute
   * @param offsetY Y-Coordinate of the offset needed to make the given element's coordinates absolute
   * @returns result of transformation
   * @throws IllegalArgumentException A graph element other than node, label or port has been given as an argument.
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
   */
  private importElkShape<E extends ElkShape>(
    element: E,
    considerWhenApplyingOffset: boolean,
    offsetX: number,
    offsetY: number,
  ): DCElement {
    if (!(isElkNode(element) || isElkLabel(element) || isElkPort(element))) {
      throw new IllegalArgumentException('Method only works for ElkNode-, ElkLabel and ElkPort-objects.');
    }

    const halfComponentSpacing = this.componentSpacing / 2;
    const x0 = element.getX() + offsetX - halfComponentSpacing;
    const y0 = element.getY() + offsetY - halfComponentSpacing;
    const x1 = x0 + element.getWidth() + this.componentSpacing;
    const y1 = y0 + element.getHeight() + this.componentSpacing;

    const coords = new KVectorChain();
    coords.add(this.newPoint(x0, y0));
    coords.add(this.newPoint(x0, y1));
    coords.add(this.newPoint(x1, y1));
    coords.add(this.newPoint(x1, y0));

    const shape = new DCElement(coords);
    // copy all properties of original layout
    shape.copyProperties(element);

    if (considerWhenApplyingOffset) {
      this.elementMapping.set(element, shape);
    }

    return shape;
  }

  /**
   * Transforms a {@link ElkEdge} into a {@link DCElement} without destroying it. Edges can have their own
   * {@link ElkLabel ElkLabels}, so they will be transformed, too.
   *
   * @param edge Edge to be transformed into a {@link DCElement}
   * @param newComponent Collection representing the component the edge and its associated labels (if any) belong to.
   *     Newly generated {@link DCElement DCElements} will be added to it
   * @returns {@link DCElement} resulting from the transformation
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
   */
  private importElkEdge(edge: ElkEdge, newComponent: DCElement[]): DCElement {
    const edgeSection = ElkGraphUtil.firstEdgeSection(edge, false, false);
    const points = ElkUtil.createVectorChain(edgeSection);

    const thickness = edge.getProperty(DisCoOptions.EDGE_THICKNESS);
    const contour = this.getContour(points.toArray(), thickness + this.componentSpacing);

    const shape = new DCElement(contour);
    shape.copyProperties(edge);
    this.elementMapping.set(edge, shape);
    newComponent.push(shape);

    this.importEdgeLabels(edge, newComponent);

    return shape;
  }

  /**
   * The label loop shared by `importElkEdge` and `importExtension`: ElkEdges can have labels, too! "true" - ElkLabels
   * belonging to an ElkEdge have absolute coordinates and have to be considered when applying changes to the DCGraph
   * back to the original graph.
   *
   * @param edge the edge whose labels to transform
   * @param newComponent the component to add the label elements to
   */
  private importEdgeLabels(edge: ElkEdge, newComponent: DCElement[]): void {
    const labels = edge.getLabels();
    for (const label of labels) {
      const componentLabel = this.importElkShape(label, true, 0.0, 0.0);
      newComponent.push(componentLabel);
    }
  }

  /**
   * Transforms a short hierarchical {@link ElkEdge} into a {@link DCExtension} without destroying it. Edges can have
   * their own {@link ElkLabel ElkLabels}, so they will be transformed, too.
   *
   * @param edge Edge to be transformed into a {@link DCExtension}
   * @param newComponent component the extension will belong to
   * @param outgoingExtension true, if the edge should be handled as an outgoing extension; false, otherwise
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
   */
  private importExtension(edge: ElkEdge, newComponent: DCElement[], outgoingExtension: boolean): void {
    const edgeSection = ElkGraphUtil.firstEdgeSection(edge, false, false);
    let points = ElkUtil.createVectorChain(edgeSection);

    if (outgoingExtension) {
      points = KVectorChain.reverse(points);
    }

    const thickness = edge.getProperty(DisCoOptions.EDGE_THICKNESS);

    // Is going to hold the extension
    const shape = this.createExtensionShape(edge, newComponent, outgoingExtension, points, thickness);

    this.addExtension(edge, shape, outgoingExtension, points, thickness);
    this.elementMapping.set(edge, shape);

    // ElkEdges can have labels, too!
    this.importEdgeLabels(edge, newComponent);
  }

  /**
   * The first branch of `importExtension`: an extension edge with more than two points gets a shape of its own, a
   * two-point one hangs on the element of the node it is attached to.
   *
   * @param edge the extension edge
   * @param newComponent the component to add a new shape to
   * @param outgoingExtension whether the edge is an outgoing extension
   * @param points the (for an outgoing extension reversed) points of the edge
   * @param thickness the edge's thickness
   * @returns the shape the extension belongs to
   */
  private createExtensionShape(
    edge: ElkEdge,
    newComponent: DCElement[],
    outgoingExtension: boolean,
    points: KVectorChain,
    thickness: number,
  ): DCElement {
    let shape: DCElement;
    if (points.size() > 2) {
      const fixedEdgePoints: KVector[] = [];
      fixedEdgePoints.push(...points.toArray(1));

      const contour = this.getContour(fixedEdgePoints, thickness + this.componentSpacing);
      shape = new DCElement(contour);
      shape.copyProperties(edge);
      newComponent.push(shape);
    } else if (outgoingExtension) {
      shape = this.elementMapping.get(ElkGraphUtil.getSourceNode(edge)!)!;
    } else {
      shape = this.elementMapping.get(ElkGraphUtil.getTargetNode(edge)!)!;
    }
    return shape;
  }

  /**
   * The second part of `importExtension`: constructs the extension and adds it to its mapping.
   *
   * @param edge the extension edge
   * @param shape the shape the extension belongs to
   * @param outgoingExtension whether the edge is an outgoing extension
   * @param points the (for an outgoing extension reversed) points of the edge: its first is the outer point, its second the inner point
   * @param thickness the edge's thickness
   */
  private addExtension(
    edge: ElkEdge,
    shape: DCElement,
    outgoingExtension: boolean,
    points: KVectorChain,
    thickness: number,
  ): void {
    const outerPoint = points.getFirst();
    const innerPoint = points.get(1);

    // Construct the extension and add to mapping
    let extParent = ElkGraphUtil.getSourceNode(edge)!;
    if (outgoingExtension) {
      extParent = ElkGraphUtil.getTargetNode(edge)!;
    }
    const dir = this.nearestSide(outerPoint, extParent);
    let extensionWidth = thickness + this.componentSpacing;
    let middlePos: KVector;

    if (dir.isHorizontal()) {
      // West or east extension
      extensionWidth += Math.abs(outerPoint.y - innerPoint.y);
      middlePos = new KVector(innerPoint.x, (innerPoint.y + outerPoint.y) / 2);
    } else {
      extensionWidth += Math.abs(outerPoint.x - innerPoint.x);
      middlePos = new KVector((innerPoint.x + outerPoint.x) / 2, innerPoint.y);
    }

    if (outgoingExtension) {
      this.outgoingExtensionsMapping.set(edge, new DCExtension(shape, dir, middlePos, extensionWidth));
    } else {
      this.incomingExtensionsMapping.set(edge, new DCExtension(shape, dir, middlePos, extensionWidth));
    }
  }

  /** @see ElkGraphTransformerApply.ts */
  private adjustRelatedPort(port: ElkPort, edgePoint: KVector, dir: DCDirection): void {
    adjustRelatedPort(port, edgePoint, dir);
  }

  /** @see ElkGraphTransformerGeometry.ts */
  private nearestSide(point: KVector, node: ElkNode): DCDirection {
    return nearestSide(point, node);
  }

  /**
   * Transforms multiple {@link ElkEdge ElkEdges} (and their labels) into {@link DCElement DCElements} and adds them
   * to a given collection, which is representing a connected component in the final {@link DCGraph}.
   *
   * @param edges Edges to be transformed, all from the same connected component
   * @param newComponent Collection representing one connected component of the graph
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
   */
  private importElkEdges(edges: Iterable<ElkEdge>, newComponent: DCElement[]): void {
    for (const edge of edges) {
      // For Edges, you always have to check, if the corresponding DCElement already exists.
      const componentEdge = this.elementMapping.get(edge);
      if (componentEdge === undefined) {
        if (ElkGraphUtil.getSourceNode(edge)!.getParent() === ElkGraphUtil.getTargetNode(edge)!.getParent()) {
          this.importElkEdge(edge, newComponent);
        } else if (ElkGraphUtil.getSourceNode(edge) === ElkGraphUtil.getTargetNode(edge)!.getParent()) {
          // otherwise the extension has already been taken care of
          if (
            !this.incomingExtensionsMapping.has(edge) &&
            this.elementMapping.get(ElkGraphUtil.getTargetNode(edge)!) !== undefined
          ) {
            this.importExtension(edge, newComponent, false);
          }
        } else if (
          // outGoingExtensions; otherwise the extension has already been taken care of
          !this.outgoingExtensionsMapping.has(edge) &&
          this.elementMapping.get(ElkGraphUtil.getSourceNode(edge)!) !== undefined
        ) {
          this.importExtension(edge, newComponent, true);
        }
      }
    }
  }

  /** @see ElkGraphTransformerGeometry.ts */
  private getContour(edgePoints: readonly KVector[], thickness: number): KVectorChain {
    return getContour(edgePoints, thickness);
  }

  /** @see ElkGraphTransformerGeometry.ts */
  private getOrthogonalPoints(curX: number, curY: number, nxtX: number, nxtY: number, radius: number): KVector[] {
    return getOrthogonalPoints(curX, curY, nxtX, nxtY, radius);
  }

  /** @see ElkGraphTransformerGeometry.ts */
  private computeIntersection(p1: KVector, p2: KVector, p3: KVector, p4: KVector): KVector {
    return computeIntersection(p1, p2, p3, p4);
  }

  /** @see ElkGraphTransformerGeometry.ts */
  private newPoint(x: number, y: number): KVector {
    return newPoint(x, y);
  }

  /** @see ElkGraphTransformerGeometry.ts */
  private adjustFirstSegment(source: ElkNode, chain: KVectorChain, dir: DCDirection): KVectorChain {
    return adjustFirstSegment(source, chain, dir);
  }
}
