// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { HierarchicalPortConstraintProcessorNodeComparator } from './HierarchicalPortConstraintProcessorNodeComparator.js';

/**
 * The dummy nodes created per layer for the original external port dummies, kept for one layer of the north / south
 * pass: the map is the Java `Map<Object, LNode>` (identity-hashed `ORIGIN` keys, only `get`/`put`: a `Map`, AD-10) and
 * the list keeps the creation order the Java list exists for.
 */
interface DummyNodes {
  readonly extPortToDummyNodesMap: Map<unknown, LNode>;
  readonly newDummyNodes: LNode[];
}

/**
 * Processes constraints imposed on hierarchical node dummies.
 *
 * Eastern and western ports cannot be ordered arbitrarily by the crossing minimizer if the port order is fixed. Thus,
 * this processor inserts appropriate in-layer successor constraints to restrict the node ordering.
 *
 * Northern and southern external ports can sadly not be processed in the usual way with port constraints at least at
 * `FIXED_ORDER`. Instead, we need to replace them by new external port dummies. For each node connected to a northern or
 * southern hierarchical port dummy, we need to place a new dummy in the next layer, rerouting the edges appropriately.
 * The original dummies are removed, to be reinserted later by `HierarchicalPortOrthogonalEdgeRouter`. For
 * simplification, this is also done in all other port constraint cases. This saves us the trouble of having to
 * differentiate between the different port constraints later on.
 *
 * Precondition: a layered graph; long edge dummies have not yet been inserted; layer constraints have not yet been
 * applied. Postcondition: hierarchical port dummies for northern and southern ports are replaced by multiple dummies if
 * the port constraints are at least `FIXED_ORDER`. Slots: before phase 3. Same-slot dependencies:
 * `LayerConstraintProcessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HierarchicalPortConstraintProcessor.java
 */
export class HierarchicalPortConstraintProcessor implements ILayoutProcessor<LGraph> {
  // CONSTANTS
  /** Index of the input port in the list of ports of newly created north / south port dummy nodes. */
  static readonly #DUMMY_INPUT_PORT = 0;

  /** Index of the output port in the list of ports of newly created north / south port dummy nodes. */
  static readonly #DUMMY_OUTPUT_PORT = 1;

  /** @see HierarchicalPortConstraintProcessor.java:121 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Hierarchical port constraint processing', 1);

    this.#processEasternAndWesternPortDummies(layeredGraph);
    this.#processNorthernAndSouthernPortDummies(layeredGraph);

    monitor.done();
  }

  // East / West Hierarchical Port Dummies

  /**
   * Process eastern and western hierarchical port dummies (Java: the private overload taking the graph; it calls the
   * overload taking a `Layer`, a different method, not a recursion).
   *
   * @param layeredGraph the layered graph
   */
  #processEasternAndWesternPortDummies(layeredGraph: LGraph): void;
  /**
   * Process the eastern and western hierarchical port dummies present in the given layer.
   *
   * @param layer the layer.
   */
  #processEasternAndWesternPortDummies(layer: Layer): void;
  #processEasternAndWesternPortDummies(graphOrLayer: LGraph | Layer): void {
    if (graphOrLayer instanceof Layer) {
      this.#processEasternAndWesternPortDummiesOfLayer(graphOrLayer);
      return;
    }
    const layeredGraph = graphOrLayer;
    // If the port constraints are not at least FIXED_ORDER, there's nothing to be done here
    if (!layeredGraph.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed()) {
      return;
    }

    const layers = layeredGraph.getLayers();

    // This affects the first and last layer
    this.#processEasternAndWesternPortDummies(layers[0]!);
    this.#processEasternAndWesternPortDummies(layers[layers.length - 1]!);
  }

  /** The body of the Java overload taking a `Layer` (`:157`). */
  #processEasternAndWesternPortDummiesOfLayer(layer: Layer): void {
    // Put the nodes into an array
    const nodes = LGraphUtil.toNodeArray(layer.getNodes());

    // Sort the array; hierarchical port dummies are at the top, sorted by
    // position or ratio in ascending order
    const nodeComparator = new HierarchicalPortConstraintProcessorNodeComparator();
    nodes.sort((node1, node2) => nodeComparator.compare(node1, node2));

    // Insert in-layer successor constraints where appropriate
    let lastHierarchicalDummy: LNode | null = null;

    for (const node of nodes) {
      if (node.getType() !== NodeType.EXTERNAL_PORT) {
        // No hierarchical port dummy nodes any more
        break;
      }

      // Only process dummies created for eastern or western external ports
      const externalPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
      if (externalPortSide !== PortSide.WEST && externalPortSide !== PortSide.EAST) {
        continue;
      }

      if (lastHierarchicalDummy !== null) {
        lastHierarchicalDummy.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS).push(node);
      }

      lastHierarchicalDummy = node;
    }
  }

  // North / South Hierarchical Port Dummies

  /**
   * Process northern and southern hierarchical port dummies.
   *
   * @param layeredGraph the layered graph.
   * @see HierarchicalPortConstraintProcessor.java:197
   */
  #processNorthernAndSouthernPortDummies(layeredGraph: LGraph): void {
    // If the port constraints are not at least FIXED_SIDE, there's nothing to do here
    const portConstraints = layeredGraph.getProperty(LayeredOptions.PORT_CONSTRAINTS);
    if (!portConstraints.isSideFixed()) {
      return;
    }

    const layers = layeredGraph.getLayers();
    const layerCount = layers.length;

    // For each layer, we keep a map of dummy nodes created for a given original external port
    // dummy. This lets us remember which new dummy node was created for which original external
    // port dummy in which layer. We also keep a list of dummy nodes to be added to each layer
    // since iterating over the new dummy nodes in the map may mess up their order since we don't
    // have hashCode() implemented. Once we do, this code can be reworked to just use the maps
    // again.
    // We keep enough space to hold layerCount + 2 instances of each data structure because we
    // might have to add a new first and last layer, even though that shouldn't normally happen
    const extPortToDummyNodeMap: Map<unknown, LNode>[] = Lists.newArrayListWithExpectedSize(layerCount + 2);
    const newDummyNodes: LNode[][] = Lists.newArrayListWithExpectedSize(layerCount + 2);

    // Add maps and lists for a new first layer that might have to be created as well as for the
    // current first layer. A map for the next layer is added on each iteration of the for loop
    extPortToDummyNodeMap.push(new Map<unknown, LNode>());
    extPortToDummyNodeMap.push(new Map<unknown, LNode>());
    newDummyNodes.push([]);
    newDummyNodes.push([]);

    // We remember each original external port dummy we encounter (they must be removed from the layers later)
    const originalExternalPortDummies: LNode[] = Lists.newArrayList();

    this.#processLayers(layeredGraph, [extPortToDummyNodeMap, newDummyNodes], originalExternalPortDummies);

    this.#addNewDummyNodes(layeredGraph, newDummyNodes, extPortToDummyNodeMap.length);

    // Iterate through the hierarchical port dummies and remove them
    for (const originalDummy of originalExternalPortDummies) {
      // Remove the original dummy; new dummy nodes have already been created for it
      originalDummy.setLayer(null);
    }

    // Remember the original external port dummies in the graph
    layeredGraph.setProperty(InternalProperties.EXT_PORT_REPLACED_DUMMIES, originalExternalPortDummies);
  }

  /** The layer loop of `#processNorthernAndSouthernPortDummies` (`:227-285`). */
  #processLayers(
    layeredGraph: LGraph,
    [extPortToDummyNodeMap, newDummyNodes]: readonly [Map<unknown, LNode>[], LNode[][]],
    originalExternalPortDummies: LNode[],
  ): void {
    const layers = layeredGraph.getLayers();
    const layerCount = layers.length;
    // Iterate through each layer
    for (let currLayerIdx = 0; currLayerIdx < layerCount; currLayerIdx++) {
      const currentLayer = layers[currLayerIdx]!;

      // Dummy node maps and lists for the next and previous layer
      const prev: DummyNodes = {
        extPortToDummyNodesMap: extPortToDummyNodeMap[currLayerIdx]!,
        newDummyNodes: newDummyNodes[currLayerIdx]!,
      };
      const next: DummyNodes = {
        extPortToDummyNodesMap: new Map<unknown, LNode>(),
        newDummyNodes: Lists.newArrayList(),
      };
      extPortToDummyNodeMap.push(next.extPortToDummyNodesMap);
      newDummyNodes.push(next.newDummyNodes);

      this.#processLayer(layeredGraph, currentLayer, prev, next, originalExternalPortDummies);
    }
  }

  /**
   * The body of the layer loop (`:221-285`): iterate through the layer's nodes, looking for normal nodes connected to
   * northern / southern hierarchical port dummies.
   */
  #processLayer(
    layeredGraph: LGraph,
    currentLayer: Layer,
    prev: DummyNodes,
    next: DummyNodes,
    originalExternalPortDummies: LNode[],
  ): void {
    for (const currentNode of currentLayer) {
      if (this.#isNorthernOrSouthernDummy(currentNode)) {
        // It's a northern or southern external port dummy. Schedule for removal and move on to next node
        originalExternalPortDummies.push(currentNode);
        continue;
      }

      // Iterate over the node's incoming edges
      for (const edge of currentNode.getIncomingEdges()) {
        this.#rerouteIncomingEdge(layeredGraph, edge, prev);
      }

      // Iterate over the node's outgoing edges
      for (const edge of currentNode.getOutgoingEdges()) {
        this.#rerouteOutgoingEdge(layeredGraph, edge, next);
      }
    }
  }

  /** The incoming edge loop body of `#processLayer` (`:231-253`). */
  #rerouteIncomingEdge(layeredGraph: LGraph, edge: LEdge, prev: DummyNodes): void {
    const sourceNode = edge.getSource()!.getNode()!;

    // Check if it's a northern / southern dummy node
    if (!this.#isNorthernOrSouthernDummy(sourceNode)) {
      return;
    }

    // See if a dummy has already been created for the previous layer
    let prevLayerDummy = prev.extPortToDummyNodesMap.get(sourceNode.getProperty(InternalProperties.ORIGIN)) ?? null;

    if (prevLayerDummy === null) {
      // No. Create one.
      prevLayerDummy = this.#createDummy(layeredGraph, sourceNode);
      prev.extPortToDummyNodesMap.set(sourceNode.getProperty(InternalProperties.ORIGIN), prevLayerDummy);
      prev.newDummyNodes.push(prevLayerDummy);
    }

    // Reroute the edge
    edge.setSource(prevLayerDummy.getPorts()[HierarchicalPortConstraintProcessor.#DUMMY_OUTPUT_PORT]!);
  }

  /** The outgoing edge loop body of `#processLayer` (`:256-278`). */
  #rerouteOutgoingEdge(layeredGraph: LGraph, edge: LEdge, next: DummyNodes): void {
    const targetNode = edge.getTarget()!.getNode()!;

    // Check if it's a northern / southern dummy node
    if (!this.#isNorthernOrSouthernDummy(targetNode)) {
      return;
    }

    // See if a dummy has already been created for the next layer
    let nextLayerDummy = next.extPortToDummyNodesMap.get(targetNode.getProperty(InternalProperties.ORIGIN)) ?? null;

    if (nextLayerDummy === null) {
      // No. Create one.
      nextLayerDummy = this.#createDummy(layeredGraph, targetNode);
      next.extPortToDummyNodesMap.set(targetNode.getProperty(InternalProperties.ORIGIN), nextLayerDummy);
      next.newDummyNodes.push(nextLayerDummy);
    }

    // Reroute the edge
    edge.setTarget(nextLayerDummy.getPorts()[HierarchicalPortConstraintProcessor.#DUMMY_INPUT_PORT]!);
  }

  /**
   * Add the newly created dummy nodes (`:287-313`). `mapCount` is the size of `extPortToDummyNodeMap`.
   */
  #addNewDummyNodes(layeredGraph: LGraph, newDummyNodes: readonly LNode[][], mapCount: number): void {
    const layers = layeredGraph.getLayers();
    for (let i = 0; i < newDummyNodes.length; i++) {
      const nodeList = newDummyNodes[i]!;
      if (nodeList.length === 0) {
        // No dummy nodes, so just move on
        continue;
      }

      // Find the layer the dummy nodes should be added to
      let layer: Layer | null = null;
      if (i === 0) {
        // A new first layer must be created
        layer = new Layer(layeredGraph);
        layers.unshift(layer);
      } else if (i === mapCount - 1) {
        // A new layer layer must be created
        layer = new Layer(layeredGraph);
        layers.push(layer);
      } else {
        layer = layers[i - 1]!;
      }

      for (const dummy of nodeList) {
        dummy.setLayer(layer);
      }
    }
  }

  /**
   * Checks if the node represents a northern or southern external port.
   *
   * @param node the node to check.
   * @returns `true` if the node represents a northern or southern external port, `false` otherwise.
   * @see HierarchicalPortConstraintProcessor.java:346
   */
  #isNorthernOrSouthernDummy(node: LNode): boolean {
    const nodeType = node.getType();

    if (nodeType === NodeType.EXTERNAL_PORT) {
      const portSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);

      return portSide === PortSide.NORTH || portSide === PortSide.SOUTH;
    }

    return false;
  }

  /**
   * Creates a dummy for the given original dummy. The dummy's `ORIGIN` property will point to the original dummy. This
   * way, the original dummy can later be restored, and the newly created dummy can be told apart from the original.
   *
   * @param layeredGraph the layered graph.
   * @param originalDummy the original dummy.
   * @returns the newly created dummy node.
   * @see HierarchicalPortConstraintProcessor.java:367
   */
  #createDummy(layeredGraph: LGraph, originalDummy: LNode): LNode {
    const newDummy = new LNode(layeredGraph);
    newDummy.copyProperties(originalDummy);
    newDummy.setProperty(InternalProperties.EXT_PORT_REPLACED_DUMMY, originalDummy);
    newDummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    newDummy.setProperty(LayeredOptions.ALIGNMENT, Alignment.CENTER);
    newDummy.setType(NodeType.EXTERNAL_PORT);

    const inputPort = new LPort();
    inputPort.setNode(newDummy);
    inputPort.setSide(PortSide.WEST);

    const outputPort = new LPort();
    outputPort.setNode(newDummy);
    outputPort.setSide(PortSide.EAST);

    return newDummy;
  }
}
