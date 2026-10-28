// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { PortType } from '../options/PortType.js';
import type { Layer } from './Layer.js';
import type { LEdge } from './LEdge.js';
import type { LGraph } from './LGraph.js';
import * as Arrays from './LGraphUtilArrays.js';
import * as ExternalPorts from './LGraphUtilExternalPorts.js';
import type { ExternalPortDummyArgs } from './LGraphUtilExternalPorts.js';
import * as GraphPropertiesSection from './LGraphUtilGraphProperties.js';
import * as Layers from './LGraphUtilLayers.js';
import * as Other from './LGraphUtilOther.js';
import * as Ports from './LGraphUtilPorts.js';
import type { LNode } from './LNode.js';
import type { LPort } from './LPort.js';

/** The float ratios and differences `resizeNode` computes, shared with its port loop. */
interface ResizeDeltas {
  readonly widthRatio: number;
  readonly heightRatio: number;
  readonly widthDiff: number;
  readonly heightDiff: number;
}

/**
 * Utility class for layered graphs.
 *
 * Facade over section modules split at the Java section comments (P1; sections never import the facade):
 * `LGraphUtilArrays` (`:56-78`), "Layer Things" `LGraphUtilLayers`, "Graph Properties" `LGraphUtilGraphProperties`,
 * "Handling of Ports" `LGraphUtilPorts`, "External Ports" `LGraphUtilExternalPorts` and "Other Stuff"
 * `LGraphUtilOther`. "Node Resizing", "Graph Offsetting" and "Compound Graphs" stay here. `resizeNode`'s port and label
 * loops are the private helpers {@link movePorts} (with {@link movePort} for its side switch) and {@link moveLabels}
 * (complexity limits).
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */
export class LGraphUtil {
  /** Hidden default constructor to prevent instantiation. */
  private constructor() {}

  /** @see LGraphUtilArrays.toNodeArray */
  static toNodeArray(nodes: Iterable<LNode>): LNode[] {
    return Arrays.toNodeArray(nodes);
  }

  /** @see LGraphUtilArrays.toEdgeArray */
  static toEdgeArray(edges: Iterable<LEdge>): LEdge[] {
    return Arrays.toEdgeArray(edges);
  }

  /** @see LGraphUtilArrays.toPortArray */
  static toPortArray(ports: Iterable<LPort>): LPort[] {
    return Arrays.toPortArray(ports);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Node Resizing

  /**
   * Resize a node to the given width and height, adjusting port and label positions if needed.
   *
   * @param node a node
   * @param newSize the new size for the node
   * @param movePorts whether port positions should be adjusted
   * @param moveLabels whether label positions should be adjusted
   */
  static resizeNode(node: LNode, newSize: KVector, movePorts: boolean, moveLabels: boolean): void {
    const oldSize = new KVector(node.getSize());

    // Java casts each to float
    const widthRatio = Math.fround(newSize.x / oldSize.x);
    const heightRatio = Math.fround(newSize.y / oldSize.y);
    const widthDiff = Math.fround(newSize.x - oldSize.x);
    const heightDiff = Math.fround(newSize.y - oldSize.y);

    // Update port positions
    if (movePorts) {
      LGraphUtil.movePorts(node, { widthRatio, heightRatio, widthDiff, heightDiff });
    }

    // Update label positions
    if (moveLabels) {
      LGraphUtil.moveLabels(node, oldSize, widthDiff, heightDiff);
    }

    // Set the new node size
    node.getSize().x = newSize.x;
    node.getSize().y = newSize.y;

    // Set fixed size option for the node: now the size is assumed to stay as determined here
    node.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());
  }

  /** The `if (movePorts)` block of {@link resizeNode}. */
  private static movePorts(node: LNode, deltas: ResizeDeltas): void {
    const fixedPorts = node.getProperty(LayeredOptions.PORT_CONSTRAINTS) === PortConstraints.FIXED_POS;

    for (const port of node.getPorts()) {
      LGraphUtil.movePort(port, fixedPorts, deltas);
    }
  }

  /** The `switch (port.getSide())` in the loop of {@link movePorts}. */
  private static movePort(port: LPort, fixedPorts: boolean, d: ResizeDeltas): void {
    switch (port.getSide()) {
      case PortSide.NORTH:
        if (!fixedPorts) {
          port.getPosition().x *= d.widthRatio;
        }
        break;
      case PortSide.EAST:
        port.getPosition().x += d.widthDiff;
        if (!fixedPorts) {
          port.getPosition().y *= d.heightRatio;
        }
        break;
      case PortSide.SOUTH:
        if (!fixedPorts) {
          port.getPosition().x *= d.widthRatio;
        }
        port.getPosition().y += d.heightDiff;
        break;
      case PortSide.WEST:
        if (!fixedPorts) {
          port.getPosition().y *= d.heightRatio;
        }
        break;
    }
  }

  /** The `if (moveLabels)` block of {@link resizeNode}. */
  private static moveLabels(node: LNode, oldSize: KVector, widthDiff: number, heightDiff: number): void {
    for (const label of node.getLabels()) {
      const midx = label.getPosition().x + label.getSize().x / 2;
      const midy = label.getPosition().y + label.getSize().y / 2;
      const widthPercent = midx / oldSize.x;
      const heightPercent = midy / oldSize.y;

      if (widthPercent + heightPercent >= 1) {
        if (widthPercent - heightPercent > 0 && midy >= 0) {
          // label is on the right
          label.getPosition().x += widthDiff;
          label.getPosition().y += heightDiff * heightPercent;
        } else if (widthPercent - heightPercent < 0 && midx >= 0) {
          // label is on the bottom
          label.getPosition().x += widthDiff * widthPercent;
          label.getPosition().y += heightDiff;
        }
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Graph Offsetting

  /**
   * Offsets the given graphs by a given offset without moving their nodes to another graph. The order of the graphs in
   * the collection must not depend on their hash values. Otherwise, subsequent layout calls will most likely produce
   * different results.
   *
   * @param graphs the graph to offset.
   * @param offsetx x coordinate offset.
   * @param offsety y coordinate offset.
   */
  static offsetGraphs(graphs: Iterable<LGraph>, offsetx: number, offsety: number): void {
    for (const graph of graphs) {
      LGraphUtil.offsetGraph(graph, offsetx, offsety);
    }
  }

  /**
   * Offsets the given graph by a given offset without moving its nodes to another graph. This method can be called as
   * many times as required on a given graph: it does not take the graph's offset into account.
   *
   * @param graph the graph to offset.
   * @param offsetx x coordinate offset.
   * @param offsety y coordinate offset.
   */
  static offsetGraph(graph: LGraph, offsetx: number, offsety: number): void {
    const graphOffset = new KVector(offsetx, offsety);

    for (const node of graph.getLayerlessNodes()) {
      node.getPosition().add(graphOffset);
      for (const port of node.getPorts()) {
        for (const edge of port.getOutgoingEdges()) {
          edge.getBendPoints().offset(graphOffset);
          const junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
          if (junctionPoints !== null) {
            junctionPoints.offset(graphOffset);
          }
          for (const label of edge.getLabels()) {
            label.getPosition().add(graphOffset);
          }
        }
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Layer Things

  /** @see LGraphUtilLayers.placeNodesHorizontally */
  static placeNodesHorizontally(layer: Layer, xoffset: number): void {
    Layers.placeNodesHorizontally(layer, xoffset);
  }

  /** @see LGraphUtilLayers.findMaxNonDummyNodeWidth */
  static findMaxNonDummyNodeWidth(layer: Layer, respectNodeMargins: boolean): number {
    return Layers.findMaxNonDummyNodeWidth(layer, respectNodeMargins);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Graph Properties

  /** @see LGraphUtilGraphProperties.computeGraphProperties */
  static computeGraphProperties(layeredGraph: LGraph): void {
    GraphPropertiesSection.computeGraphProperties(layeredGraph);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Handling of Ports

  /** @see LGraphUtilPorts.createPort */
  static createPort(node: LNode, endPoint: KVector | null, type: PortType, layeredGraph: LGraph): LPort {
    return Ports.createPort(node, endPoint, type, layeredGraph);
  }

  /** Package-private in Java. @see LGraphUtilPorts.calcPortSide */
  static calcPortSide(port: LPort, direction: Direction): PortSide {
    return Ports.calcPortSide(port, direction);
  }

  /** Package-private in Java. @see LGraphUtilPorts.calcPortOffset */
  static calcPortOffset(port: LPort, side: PortSide): number {
    return Ports.calcPortOffset(port, side);
  }

  /** Package-private in Java. @see LGraphUtilPorts.centerPoint */
  static centerPoint(point: KVector, boundary: KVector, side: PortSide): void {
    Ports.centerPoint(point, boundary, side);
  }

  /** @see LGraphUtilPorts.provideCollectorPort */
  static provideCollectorPort(layeredGraph: LGraph, node: LNode, type: PortType, side: PortSide): LPort | null {
    return Ports.provideCollectorPort(layeredGraph, node, type, side);
  }

  /** @see LGraphUtilPorts.initializePort */
  static initializePort(
    port: LPort,
    portConstraints: PortConstraints,
    direction: Direction,
    anchorPos: KVector | null,
  ): void {
    Ports.initializePort(port, portConstraints, direction, anchorPos);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // External Ports  (Ports on the boundary of the parent node)

  /** Java's nine parameters arrive as one object. @see LGraphUtilExternalPorts.createExternalPortDummy */
  static createExternalPortDummy(args: ExternalPortDummyArgs): LNode {
    return ExternalPorts.createExternalPortDummy(args);
  }

  /** @see LGraphUtilExternalPorts.getExternalPortPosition */
  static getExternalPortPosition(graph: LGraph, portDummy: LNode, portWidth: number, portHeight: number): KVector {
    return ExternalPorts.getExternalPortPosition(graph, portDummy, portWidth, portHeight);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Compound Graphs

  /**
   * Determines whether the given child node is a descendant of the parent node.
   *
   * @param child a child node
   * @param parent a parent node
   * @return true if `child` is a direct or indirect child of `parent`
   */
  static isDescendant(child: LNode, parent: LNode): boolean {
    let current = child;
    let next = current.getGraph()!.getParentNode();
    while (next !== null) {
      current = next;
      if (current === parent) {
        return true;
      }
      next = current.getGraph()!.getParentNode();
    }
    return false;
  }

  /**
   * Converts the given point from the coordinate system of `oldGraph` to that of `newGraph`. Padding and graph offset
   * are included in the calculation. If the old and new graph are identical, no calculations are made.
   *
   * @param point a relative point
   * @param oldGraph the graph to which the point is relative to
   * @param newGraph the graph to which the point is made relative to after applying this method
   */
  static changeCoordSystem(point: KVector, oldGraph: LGraph, newGraph: LGraph): void {
    if (oldGraph === newGraph) {
      // nothing has to be done
      return;
    }

    // transform to absolute coordinates
    let graph = oldGraph;
    let node: LNode | null;
    do {
      point.add(graph.getOffset());
      node = graph.getParentNode();
      if (node !== null) {
        const padding = graph.getPadding();
        point.add(padding.left, padding.top);
        point.add(node.getPosition());
        graph = node.getGraph()!;
      }
    } while (node !== null);

    // transform to relative coordinates (to newGraph)
    graph = newGraph;
    do {
      point.sub(graph.getOffset());
      node = graph.getParentNode();
      if (node !== null) {
        const padding = graph.getPadding();
        point.sub(padding.left, padding.top);
        point.sub(node.getPosition());
        graph = node.getGraph()!;
      }
    } while (node !== null);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Other Stuff

  /** @see LGraphUtilOther.getIndividualOrInherited */
  static getIndividualOrInherited<T>(node: LNode, property: IProperty<T>): T | null {
    return Other.getIndividualOrInherited(node, property);
  }

  /** @see LGraphUtilOther.getDirection */
  static getDirection(graph: LGraph): Direction {
    return Other.getDirection(graph);
  }

  /** @see LGraphUtilOther.getMinimalModelOrder */
  static getMinimalModelOrder(graph: LGraph): number {
    return Other.getMinimalModelOrder(graph);
  }
}
