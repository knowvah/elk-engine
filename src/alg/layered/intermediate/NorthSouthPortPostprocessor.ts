// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** `iterator().next()` of a Java `Iterable<LPort>`: the first port; Java throws `NoSuchElementException` when empty. */
function firstPort(ports: Iterable<LPort>): LPort {
  const next = ports[Symbol.iterator]().next();
  if (next.done === true) {
    throw new NoSuchElementException();
  }
  return next.value;
}

/**
 * Removes dummy nodes created by `NorthSouthPortPreprocessor` and routes the edges properly.
 *
 * Precondition: a layered graph, nodes are placed, edges are routed, port positions are fixed. Postcondition: north
 * south port dummy nodes are removed, their edges properly reconnected and routed. Slots: after phase 5. Same-slot
 * dependencies: must run before `FinalSplineBendpointsCalculator`.
 *
 * `process` is split along the Java branches: `processSplineDummy`, `processSelfLoop` (the Java method) and
 * `processOrdinaryDummy` with `hasSameOriginPort` (the inline origin test), for the complexity limits (mission 7e,
 * T5). R8: every loop is a plain loop over the node's ports or an array copy, not a recursion.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NorthSouthPortPostprocessor.java
 */
export class NorthSouthPortPostprocessor implements ILayoutProcessor<LGraph> {
  /** @see NorthSouthPortPostprocessor.java:55 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Odd port side processing', 1);

    // Spline edge routing manages bend points in the edge router. Differentiate behaviour
    // depending on edge router.
    const routing = layeredGraph.getProperty(LayeredOptions.EDGE_ROUTING);

    // Iterate through the layers
    for (const layer of layeredGraph) {
      // Iterate through the nodes (use an array to avoid concurrent modification exceptions)
      const nodeArray = LGraphUtil.toNodeArray(layer.getNodes());
      for (const node of nodeArray) {
        // We only care for North/South Port dummy nodes
        if (node.getType() !== NodeType.NORTH_SOUTH_PORT) {
          continue;
        }

        if (routing === EdgeRouting.SPLINES) {
          this.processSplineDummy(node);
        } else if (node.getProperty(InternalProperties.ORIGIN) instanceof LEdge) {
          // It's a self-loop
          this.processSelfLoop(node);
        } else {
          this.processOrdinaryDummy(node);
        }

        // Remove the node
        node.setLayer(null);
      }
    }

    monitor.done();
  }

  /**
   * The `EdgeRouting.SPLINES` branch of `process`.
   *
   * @see NorthSouthPortPostprocessor.java:80-90
   */
  private processSplineDummy(node: LNode): void {
    // Iterate through ports
    for (const port of node.getPorts()) {
      if (port.getIncomingEdges().length !== 0) {
        this.processSplineInputPort(port);
      }
      if (port.getOutgoingEdges().length !== 0) {
        this.processSplineOutputPort(port);
      }
    }
  }

  /**
   * The final `else` branch of `process`: the dummy of an ordinary north/south port.
   *
   * @see NorthSouthPortPostprocessor.java:95-134
   */
  private processOrdinaryDummy(node: LNode): void {
    // Check if all ports were created for the same origin port
    const sameOriginPort = NorthSouthPortPostprocessor.hasSameOriginPort(node);

    // Iterate through the ports
    for (const port of node.getPorts()) {
      if (port.getIncomingEdges().length !== 0) {
        this.processInputPort(port, sameOriginPort);
      }

      if (port.getOutgoingEdges().length !== 0) {
        this.processOutputPort(port, sameOriginPort);
      }
    }
  }

  /**
   * Whether the dummy has at least two ports and all of them were created for the same origin port. `LPort.equals` is
   * identity, as `===` here.
   *
   * @see NorthSouthPortPostprocessor.java:97-118
   */
  private static hasSameOriginPort(node: LNode): boolean {
    if (node.getPorts().length < 2) {
      return false;
    }

    // Iterate over the dummy's ports to find out whether the origin is always the same
    let sameOriginPort = true;

    const portIterator = new ArrayListIterator<LPort>(node.getPorts());
    let currentPort = portIterator.next();
    let previousPort: LPort | null = null;

    while (portIterator.hasNext()) {
      previousPort = currentPort;
      currentPort = portIterator.next();

      if (previousPort.getProperty(InternalProperties.ORIGIN) !== currentPort.getProperty(InternalProperties.ORIGIN)) {
        // The two ports don't have the same origin
        sameOriginPort = false;
        break;
      }
    }
    return sameOriginPort;
  }

  /**
   * Reroutes the edges connected to the given input port back to the port it was created for.
   *
   * @param inputPort the input port whose edges to restore.
   * @param addJunctionPoints if `true`, adds a junction point to the edge that equals the bend point computed for the
   *   edge. This should be `true` for ports belonging to north south port dummies that only have ports created for the
   *   same port.
   * @see NorthSouthPortPostprocessor.java:146
   */
  private processInputPort(inputPort: LPort, addJunctionPoints: boolean): void {
    // Retrieve the port the dummy node was created from
    const originPort = inputPort.getProperty(InternalProperties.ORIGIN) as LPort;

    // Calculate the bend point
    const x = originPort.getAbsoluteAnchor().x;
    const y = inputPort.getNode()!.getPosition().y;

    // Reroute the edges, inserting a new bend point at the position of the dummy node
    const edgeArray = LGraphUtil.toEdgeArray(inputPort.getIncomingEdges());
    for (const inEdge of edgeArray) {
      inEdge.setTarget(originPort);
      inEdge.getBendPoints().addLast(x, y);

      // Check if a junction point should be added
      if (addJunctionPoints) {
        NorthSouthPortPostprocessor.addJunctionPoint(inEdge, x, y);
      }
    }
  }

  /**
   * Reroutes the edges connected to the given output port back to the port it was created for.
   *
   * @param outputPort the output port whose edges to restore.
   * @param addJunctionPoints if `true`, adds a junction point to the edge that equals the bend point computed for the
   *   edge. This should be `true` for ports belonging to north south port dummies that only have ports created for the
   *   same port.
   * @see NorthSouthPortPostprocessor.java:182
   */
  private processOutputPort(outputPort: LPort, addJunctionPoints: boolean): void {
    // Retrieve the port the dummy node was created from
    const originPort = outputPort.getProperty(InternalProperties.ORIGIN) as LPort;

    // Calculate the bend point
    const x = originPort.getAbsoluteAnchor().x;
    const y = outputPort.getNode()!.getPosition().y;

    // Reroute the edges, inserting a new bend point at the position of the dummy node
    const edgeArray = LGraphUtil.toEdgeArray(outputPort.getOutgoingEdges());
    for (const outEdge of edgeArray) {
      outEdge.setSource(originPort);
      outEdge.getBendPoints().addFirst(x, y);

      // Check if a junction point should be added
      if (addJunctionPoints) {
        NorthSouthPortPostprocessor.addJunctionPoint(outEdge, x, y);
      }
    }
  }

  /**
   * The junction point block shared by `processInputPort` and `processOutputPort` (the Java repeats it inline).
   *
   * @see NorthSouthPortPostprocessor.java:166-173
   */
  private static addJunctionPoint(edge: LEdge, x: number, y: number): void {
    let junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    if (junctionPoints === null) {
      junctionPoints = new KVectorChain();
      edge.setProperty(LayeredOptions.JUNCTION_POINTS, junctionPoints);
    }
    junctionPoints.add(new KVector(x, y));
  }

  /**
   * Reroutes and reconnects the self-loop edge represented by the given dummy.
   *
   * @param dummy the dummy representing the self-loop edge.
   * @see NorthSouthPortPostprocessor.java:213
   */
  private processSelfLoop(dummy: LNode): void {
    // Get the edge and the ports it was originally connected to
    const selfLoop = dummy.getProperty(InternalProperties.ORIGIN) as LEdge;
    const inputPort = firstPort(dummy.getPorts(PortSide.WEST));
    const outputPort = firstPort(dummy.getPorts(PortSide.EAST));
    const originInputPort = inputPort.getProperty(InternalProperties.ORIGIN) as LPort;
    const originOutputPort = outputPort.getProperty(InternalProperties.ORIGIN) as LPort;

    // Reconnect the edge
    selfLoop.setSource(originOutputPort);
    selfLoop.setTarget(originInputPort);

    // Add two bend points
    let bendPoint = new KVector(outputPort.getNode()!.getPosition());
    bendPoint.x = originOutputPort.getAbsoluteAnchor().x;
    selfLoop.getBendPoints().add(bendPoint);

    bendPoint = new KVector(inputPort.getNode()!.getPosition());
    bendPoint.x = originInputPort.getAbsoluteAnchor().x;
    selfLoop.getBendPoints().add(bendPoint);
  }

  /**
   * Reroutes the edges connected to the given input port back to the port it was created for.
   *
   * @param inputPort the input port whose edges to restore.
   * @see NorthSouthPortPostprocessor.java:241
   */
  private processSplineInputPort(inputPort: LPort): void {
    // Retrieve the port the dummy node was created from
    const originPort = inputPort.getProperty(InternalProperties.ORIGIN) as LPort;
    originPort.setProperty(InternalProperties.SPLINE_NS_PORT_Y_COORD, inputPort.getNode()!.getPosition().y);

    // Reroute the edges
    const edgeArray = LGraphUtil.toEdgeArray(inputPort.getIncomingEdges());
    for (const inEdge of edgeArray) {
      inEdge.setTarget(originPort);
    }
  }

  /**
   * Reroutes the edges connected to the given output port back to the port it was created for.
   *
   * @param outputPort the output port whose edges to restore.
   * @see NorthSouthPortPostprocessor.java:259
   */
  private processSplineOutputPort(outputPort: LPort): void {
    // Retrieve the port the dummy node was created from
    const originPort = outputPort.getProperty(InternalProperties.ORIGIN) as LPort;
    originPort.setProperty(InternalProperties.SPLINE_NS_PORT_Y_COORD, outputPort.getNode()!.getPosition().y);

    // Reroute the edges
    const edgeArray = LGraphUtil.toEdgeArray(outputPort.getOutgoingEdges());
    for (const outEdge of edgeArray) {
      outEdge.setSource(originPort);
    }
  }
}
