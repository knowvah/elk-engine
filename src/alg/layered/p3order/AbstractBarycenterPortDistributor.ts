// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import * as Float32 from '../../../java/lang/Float32.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { IInitializable } from './counting/IInitializable.js';
import type { ISweepPortDistributor } from './ISweepPortDistributor.js';

/**
 * Calculates port ranks and distributes ports. The _rank_ of a port is a floating point number that represents its
 * position inside the containing layer. This depends on the node order of that layer and on the port constraints of
 * the nodes. Port ranks are used by `ICrossingMinimizationHeuristic`s for calculating barycenter or median values for
 * nodes. Furthermore, they are used in this class for distributing the ports of nodes where the order of ports is not
 * fixed, which has to be done as the last step of each crossing minimization processor. There are different ways to
 * determine port ranks, therefore that is done in concrete subclasses.
 *
 * Must be initialized using `IInitializable.init`.
 *
 * Java `float` values are held as `number`s rounded to binary32 through `Float32` (`float[]` is `Float32Array`). The
 * Java overloads are `calculatePortRanks(LNode[], PortType)` (public, final) with the abstract
 * `calculatePortRanksForNode(LNode, float, PortType)` (the subclass hook), and `distributePorts(LNode, PortSide)` with
 * `distributePortsOfPorts(LNode, Iterable<LPort>)` (translation-rules 6.5); none is recursive: each calls the next
 * with other arguments.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/AbstractBarycenterPortDistributor.java
 */
export abstract class AbstractBarycenterPortDistributor implements ISweepPortDistributor, IInitializable {
  /** port ranks array in which the results of ranks calculation are stored. */
  private portRanks!: Float32Array;
  private minBarycenter = 0;
  private maxBarycenter = 0;
  private nodePositions: Int32Array[];
  private portBarycenter!: Float32Array;
  private inLayerPorts: LPort[];
  private nPorts = 0;

  /**
   * Constructs a port distributor for the given array of port ranks. All ports are required to be assigned ids in the
   * range of the given array.
   *
   * @param numLayers the number of layers in the graph.
   * @see AbstractBarycenterPortDistributor.java:64
   */
  constructor(numLayers: number) {
    this.inLayerPorts = [];
    this.nodePositions = new Array<Int32Array>(numLayers);
  }

  /**
   * Returns the array of port ranks.
   *
   * @returns the array of port ranks
   * @see AbstractBarycenterPortDistributor.java:74
   */
  getPortRanks(): Float32Array {
    return this.portRanks;
  }

  // /////////////////////////////////////////////////////////////////////////////
  // Port Rank Assignment

  /** @see AbstractBarycenterPortDistributor.java:83 */
  distributePortsWhileSweeping(nodeOrder: LNode[][], currentIndex: number, isForwardSweep: boolean): boolean {
    this.updateNodePositions(nodeOrder, currentIndex);
    const freeLayer = nodeOrder[currentIndex]!;
    const side = isForwardSweep ? PortSide.WEST : PortSide.EAST;
    if (this.isNotFirstLayer(nodeOrder.length, currentIndex, isForwardSweep)) {
      const fixedLayer = nodeOrder[isForwardSweep ? currentIndex - 1 : currentIndex + 1]!;
      this.calculatePortRanks(fixedLayer, this.portTypeFor(isForwardSweep));
      for (const node of freeLayer) {
        this.distributePorts(node, side);
      }

      this.calculatePortRanks(freeLayer, this.portTypeFor(!isForwardSweep));
      for (const node of fixedLayer) {
        if (!this.hasNestedGraph(node)) {
          this.distributePorts(node, side.opposed());
        }
      }
    } else {
      for (const node of freeLayer) {
        this.distributePorts(node, side);
      }
    }
    // Barycenter port distributor can not be used with always improving crossing minimization heuristics
    // which do not need to count.
    return false;
  }

  /**
   * Determine ranks for all ports of specific type in the given layer. The ranks are written to the
   * {@link getPortRanks} array.
   *
   * @param layer a layer as node array
   * @param portType the port type to consider
   * @see AbstractBarycenterPortDistributor.java:123
   */
  calculatePortRanks(layer: LNode[], portType: PortType): void {
    let consumedRank = 0;
    for (let nodeIx = 0; nodeIx < layer.length; nodeIx++) {
      consumedRank = Float32.add(consumedRank, this.calculatePortRanksForNode(layer[nodeIx]!, consumedRank, portType));
    }
  }

  /**
   * Assign port ranks for the input or output ports of the given node. If the node's port constraints imply a fixed
   * order, the ports are assumed to be pre-ordered in the usual way, i.e. in clockwise order north - east - south -
   * west. The ranks are written to the {@link getPortRanks} array. Java overload
   * `calculatePortRanks(LNode, float, PortType)`.
   *
   * @param node a node
   * @param rankSum the sum of ranks of preceding nodes in the same layer
   * @param type the port type to consider
   * @returns the rank consumed by the given node; the following node's ranks start at `rankSum + consumedRank`
   * @see AbstractBarycenterPortDistributor.java:146
   */
  protected abstract calculatePortRanksForNode(node: LNode, rankSum: number, type: PortType): number;

  // /////////////////////////////////////////////////////////////////////////////
  // Port Distribution

  /** @see AbstractBarycenterPortDistributor.java:152 */
  private distributePorts(node: LNode, side: PortSide): void {
    if (!node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed()) {
      // distribute ports in sweep direction and on north south side of node.
      this.distributePortsOfPorts(node, node.getPorts(side));
      this.distributePortsOfPorts(node, node.getPorts(PortSide.SOUTH));
      this.distributePortsOfPorts(node, node.getPorts(PortSide.NORTH));
      // sort the ports by considering the side, type, and barycenter values
      this.sortPorts(node);
    }
  }

  /**
   * Distribute the ports of the given node by their sides, connected ports, and input or output type. Java overload
   * `distributePorts(LNode, Iterable<LPort>)`.
   *
   * @param node node whose ports shall be sorted
   * @see AbstractBarycenterPortDistributor.java:170
   */
  private distributePortsOfPorts(node: LNode, ports: Iterable<LPort>): void {
    this.inLayerPorts.length = 0;
    this.iteratePortsAndCollectInLayerPorts(node, ports);

    if (this.inLayerPorts.length > 0) {
      this.calculateInLayerPortsBarycenterValues(node);
    }
  }

  /** @see AbstractBarycenterPortDistributor.java:179 */
  private iteratePortsAndCollectInLayerPorts(node: LNode, ports: Iterable<LPort>): void {
    this.minBarycenter = 0.0;
    this.maxBarycenter = 0.0;

    // a float value large enough to ensure that barycenters of south ports work fine
    const absurdlyLargeFloat = Float32.fromDouble(Int32.add(Int32.mul(2, node.getLayer()!.getNodes().length), 1));
    // calculate barycenter values for the ports of the node
    for (const port of ports) {
      const northSouthPort = port.getSide() === PortSide.NORTH || port.getSide() === PortSide.SOUTH;
      let sum = 0;

      if (northSouthPort) {
        // Find the dummy node created for the port
        const portDummy: LNode | null = port.getProperty(InternalProperties.PORT_DUMMY);
        if (portDummy === null) {
          continue;
        }

        sum = Float32.add(sum, this.dealWithNorthSouthPorts(absurdlyLargeFloat, port, portDummy));
      } else {
        const connectedSum = this.sumConnectedPortRanks(node, port);
        if (connectedSum === null) {
          // the Java `continue PortIteration`: the port was added to the in-layer ports
          continue;
        }
        sum = connectedSum;
      }

      if (port.getDegree() > 0) {
        this.portBarycenter[port.id] = Float32.div(sum, port.getDegree());
        this.minBarycenter = Math.min(this.minBarycenter, this.portBarycenter[port.id]!);
        this.maxBarycenter = Math.max(this.maxBarycenter, this.portBarycenter[port.id]!);
      } else if (northSouthPort) {
        // For northern and southern ports, the sum directly corresponds to the
        // barycenter value to be used.
        this.portBarycenter[port.id] = sum;
      }
    }
  }

  /**
   * The `else` branch of the port loop of `iteratePortsAndCollectInLayerPorts` (`AbstractBarycenterPortDistributor.java:
   * 196-216`): adds up all ranks of connected ports. Answers the sum, or `null` where Java continues `PortIteration`
   * after adding the port to the in-layer ports.
   */
  private sumConnectedPortRanks(node: LNode, port: LPort): number | null {
    let sum = 0;
    // add up all ranks of connected ports
    for (const outgoingEdge of port.getOutgoingEdges()) {
      const connectedPort = outgoingEdge.getTarget()!;
      if (connectedPort.getNode()!.getLayer() === node.getLayer()) {
        this.inLayerPorts.push(port);
        return null;
      } else {
        // outgoing edges go to the subsequent layer and are seen clockwise
        sum = Float32.add(sum, this.portRanks[connectedPort.id]!);
      }
    }
    for (const incomingEdge of port.getIncomingEdges()) {
      const connectedPort = incomingEdge.getSource()!;
      if (connectedPort.getNode()!.getLayer() === node.getLayer()) {
        this.inLayerPorts.push(port);
        return null;
      } else {
        // incoming edges go to the preceding layer and are seen
        // counter-clockwise
        sum = Float32.sub(sum, this.portRanks[connectedPort.id]!);
      }
    }
    return sum;
  }

  /** @see AbstractBarycenterPortDistributor.java:238 */
  private calculateInLayerPortsBarycenterValues(node: LNode): void {
    // go through the list of in-layer ports and calculate their barycenter values
    const nodeIndexInLayer = this.positionOf(node) + 1;
    const layerSize = node.getLayer()!.getNodes().length + 1;
    for (const inLayerPort of this.inLayerPorts) {
      // add the indices of all connected in-layer ports
      let sum = 0;
      let inLayerConnections = 0;

      for (const connectedPort of inLayerPort.getConnectedPorts()) {
        if (connectedPort.getNode()!.getLayer() === node.getLayer()) {
          sum = Int32.add(sum, this.positionOf(connectedPort.getNode()!) + 1);
          inLayerConnections++;
        }
      }
      // The port's barycenter value is the mean index of connected nodes. If that
      // value is lower than the node's index, most in-layer edges point upwards, so we want
      // the port to be placed at the top of the side. If the value is higher than the
      // nodes's index, most in-layer edges point downwards, so we want the port to be
      // placed at the bottom of the side.
      const barycenter = Float32.div(Float32.fromDouble(sum), inLayerConnections);

      this.setInLayerPortBarycenter(inLayerPort, barycenter, nodeIndexInLayer, layerSize);
    }
  }

  /** The side distinction of the in-layer loop (`AbstractBarycenterPortDistributor.java:261-277`). */
  private setInLayerPortBarycenter(
    inLayerPort: LPort,
    barycenter: number,
    nodeIndexInLayer: number,
    layerSize: number,
  ): void {
    const portSide = inLayerPort.getSide();

    if (portSide === PortSide.EAST) {
      if (barycenter < nodeIndexInLayer) {
        // take a low value in order to have the port above
        this.portBarycenter[inLayerPort.id] = Float32.sub(this.minBarycenter, barycenter);
      } else {
        // take a high value in order to have the port below
        this.portBarycenter[inLayerPort.id] = Float32.add(this.maxBarycenter, Float32.sub(layerSize, barycenter));
      }
    } else if (portSide === PortSide.WEST) {
      if (barycenter < nodeIndexInLayer) {
        // take a high value in order to have the port above
        this.portBarycenter[inLayerPort.id] = Float32.add(this.maxBarycenter, barycenter);
      } else {
        // take a low value in order to have the port below
        this.portBarycenter[inLayerPort.id] = Float32.sub(this.minBarycenter, Float32.sub(layerSize, barycenter));
      }
    }
  }

  /** @see AbstractBarycenterPortDistributor.java:282 */
  private dealWithNorthSouthPorts(absurdlyLargeFloat: number, port: LPort, portDummy: LNode): number {
    // Find out if it's an input port, an output port, or both
    const { input, output } = this.findInputAndOutput(port, portDummy);
    let sum = 0;
    // `input ^ output` is the logical exclusive or of two booleans
    if (input && input !== output) {
      // It's an input port; the index of its dummy node is its inverted sortkey
      // (for southern input ports, the key must be larger than the ones
      // assigned to output ports or input&&output ports)
      sum =
        port.getSide() === PortSide.NORTH
          ? Int32.neg(this.positionOf(portDummy))
          : Float32.sub(absurdlyLargeFloat, this.positionOf(portDummy));
    } else if (output && input !== output) {
      // It's an output port; the index of its dummy node is its sort key
      // (for northern output ports, the key must be larger than the ones assigned
      // to input ports or input&&output ports, which are negative and 0,
      // respectively)
      sum = Float32.add(this.positionOf(portDummy), 1.0);
    } else if (input && output) {
      // It's both, an input and an output port; it must sit between input and
      // output ports
      // North: input ports < 0.0, output ports > 0.0
      // South: input ports > FLOAT_MAX / 2, output ports near zero
      sum = port.getSide() === PortSide.NORTH ? 0.0 : Float32.div(absurdlyLargeFloat, 2.0);
    }
    return sum;
  }

  /** The first loop of `dealWithNorthSouthPorts` (`AbstractBarycenterPortDistributor.java:285-295`). */
  private findInputAndOutput(port: LPort, portDummy: LNode): { input: boolean; output: boolean } {
    let input = false;
    let output = false;
    for (const portDummyPort of portDummy.getPorts()) {
      if (portDummyPort.getProperty(InternalProperties.ORIGIN) === port) {
        if (portDummyPort.getOutgoingEdges().length > 0) {
          output = true;
        } else if (portDummyPort.getIncomingEdges().length > 0) {
          input = true;
        }
      }
    }
    return { input, output };
  }

  /** @see AbstractBarycenterPortDistributor.java:319 */
  private positionOf(node: LNode): number {
    return this.nodePositions[node.getLayer()!.id]![node.id]!;
  }

  /** @see AbstractBarycenterPortDistributor.java:323 */
  private updateNodePositions(nodeOrder: LNode[][], currentIndex: number): void {
    const layer = nodeOrder[currentIndex]!;
    for (let i = 0; i < layer.length; i++) {
      const node = layer[i]!;
      this.nodePositions[node.getLayer()!.id]![node.id] = i;
    }
  }

  /** @see AbstractBarycenterPortDistributor.java:331 */
  private hasNestedGraph(node: LNode): boolean {
    return node.getNestedGraph() !== null;
  }

  /** @see AbstractBarycenterPortDistributor.java:335 */
  private isNotFirstLayer(length: number, currentIndex: number, isForwardSweep: boolean): boolean {
    return isForwardSweep ? currentIndex !== 0 : currentIndex !== length - 1;
  }

  /** @see AbstractBarycenterPortDistributor.java:340 */
  private portTypeFor(isForwardSweep: boolean): PortType {
    return isForwardSweep ? PortType.OUTPUT : PortType.INPUT;
  }

  /**
   * Sort the ports of a node using the given relative position values. These values are interpreted as a hint for the
   * clockwise order of ports.
   *
   * @param node a node
   * @see AbstractBarycenterPortDistributor.java:351
   */
  private sortPorts(node: LNode): void {
    node.getPorts().sort((port1, port2) => {
      const side1 = port1.getSide();
      const side2 = port2.getSide();

      if (side1 !== side2) {
        // sort according to the node side
        return side1.ordinal() - side2.ordinal();
      } else {
        const port1Bary = this.portBarycenter[port1.id]!;
        const port2Bary = this.portBarycenter[port2.id]!;
        if (port1Bary === 0 && port2Bary === 0) {
          return 0;
        } else if (port1Bary === 0) {
          return -1;
        } else if (port2Bary === 0) {
          return 1;
        } else {
          // sort according to the position value (`Float.compare` of the widened floats is `Double.compare`)
          return doubleCompare(port1Bary, port2Bary);
        }
      }
    });
  }

  /** @see AbstractBarycenterPortDistributor.java:379 */
  initAtLayerLevel(l: number, nodeOrder: LNode[][]): void {
    this.nodePositions[l] = new Int32Array(nodeOrder[l]!.length);
  }

  /** @see AbstractBarycenterPortDistributor.java:384 */
  initAtNodeLevel(l: number, n: number, nodeOrder: LNode[][]): void {
    const node = nodeOrder[l]![n]!;
    node.id = n;
    this.nodePositions[l]![n] = n;
  }

  /** @see AbstractBarycenterPortDistributor.java:391 */
  initAtPortLevel(l: number, n: number, p: number, nodeOrder: LNode[][]): void {
    nodeOrder[l]![n]!.getPorts()[p]!.id = this.nPorts++;
  }

  /** @see AbstractBarycenterPortDistributor.java:396 */
  initAfterTraversal(): void {
    this.portRanks = new Float32Array(this.nPorts);
    this.portBarycenter = new Float32Array(this.nPorts);
  }
}
