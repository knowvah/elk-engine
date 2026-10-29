// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Used to keep track of which kinds of hidden nodes a given node had connections to. (Java: private nested enum.)
 */
class HiddenNodeConnections {
  /** No connections to hidden nodes found yet. */
  static readonly NONE: HiddenNodeConnections = new HiddenNodeConnections('NONE', 0);
  /** Only connections to `LayerConstraint.FIRST_SEPARATE` nodes found so far. */
  static readonly FIRST_SEPARATE: HiddenNodeConnections = new HiddenNodeConnections('FIRST_SEPARATE', 1);
  /** Only connections to `LayerConstraint.LAST_SEPARATE` nodes found so far. */
  static readonly LAST_SEPARATE: HiddenNodeConnections = new HiddenNodeConnections('LAST_SEPARATE', 2);
  /** Connections to both kinds of hidden nodes found. */
  static readonly BOTH: HiddenNodeConnections = new HiddenNodeConnections('BOTH', 3);

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** Java `Enum.name()`; the replay's property encoder recognises an enum constant by `name()` and `ordinal()`. */
  name(): string {
    return this.#name;
  }

  /** Java `Enum.ordinal()`. */
  ordinal(): number {
    return this.#ordinal;
  }

  toString(): string {
    return this.#name;
  }

  combine(layerConstraint: LayerConstraint): HiddenNodeConnections {
    switch (this) {
      case HiddenNodeConnections.NONE:
        return layerConstraint === LayerConstraint.FIRST_SEPARATE
          ? HiddenNodeConnections.FIRST_SEPARATE
          : HiddenNodeConnections.LAST_SEPARATE;

      case HiddenNodeConnections.FIRST_SEPARATE:
        return layerConstraint === LayerConstraint.FIRST_SEPARATE
          ? HiddenNodeConnections.FIRST_SEPARATE
          : HiddenNodeConnections.BOTH;

      case HiddenNodeConnections.LAST_SEPARATE:
        return layerConstraint === LayerConstraint.FIRST_SEPARATE
          ? HiddenNodeConnections.BOTH
          : HiddenNodeConnections.LAST_SEPARATE;

      default:
        return HiddenNodeConnections.BOTH;
    }
  }
}

/** We'll use this property to keep track of each node's connections to hidden nodes. */
const HIDDEN_NODE_CONNECTIONS: IProperty<HiddenNodeConnections> = new Property<HiddenNodeConnections>(
  'separateLayerConnections',
  HiddenNodeConnections.NONE,
);

/**
 * Hides nodes with `LayerConstraint.FIRST_SEPARATE` and `LayerConstraint.LAST_SEPARATE` from the graph. These nodes
 * would influence the layering and would cause strange results once they are moved into separate layers, so we simply
 * hide them for the time being and restore them once layering has finished.
 *
 * Precondition: an unlayered graph; nodes with `FIRST_SEPARATE` have only outgoing edges; nodes with `LAST_SEPARATE`
 * have only incoming edges. Postcondition: those nodes are hidden from the graph and saved in the graph through
 * `InternalProperties.HIDDEN_NODES`. Slots: before phase 2. Same-slot dependencies: `LabelDummyInserter`.
 *
 * `hide(LNode)` is NOT recursive in the Java (it loops once over the node's connected edges and calls the two-argument
 * `hide`, which never calls back), so B8's explicit-stack rewrite has nothing to rewrite here; see the decision journal.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LayerConstraintPreprocessor.java
 */
export class LayerConstraintPreprocessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Layer constraint preprocessing', 1);

    const hiddenNodes: LNode[] = [];

    // Java: ListIterator over the layerless list, remove() after next(): index-based walk with splice
    const layerless = layeredGraph.getLayerlessNodes();
    let index = 0;
    while (index < layerless.length) {
      const lNode = layerless[index++] as LNode;

      if (this.isRelevantNode(lNode)) {
        this.hide(lNode);
        hiddenNodes.push(lNode);
        layerless.splice(--index, 1);
      }
    }

    if (hiddenNodes.length > 0) {
      layeredGraph.setProperty(InternalProperties.HIDDEN_NODES, hiddenNodes);
    }

    monitor.done();
  }

  /** Checks if the given node has one of the layer constraints set that we're interested in here. */
  private isRelevantNode(lNode: LNode): boolean {
    switch (lNode.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
      case LayerConstraint.FIRST_SEPARATE:
      case LayerConstraint.LAST_SEPARATE:
        return true;

      default:
        return false;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Node Hiding

  /** Disconnects the node from its adjacent nodes. */
  private hide(lNode: LNode): void {
    this.ensureNoInacceptableEdges(lNode);

    for (const lEdge of lNode.getConnectedEdges()) {
      this.hideEdge(lNode, lEdge);
    }
  }

  /** Hides the edge of the given node (Java overload `hide(LNode, LEdge)`). The node is the one being hidden. */
  private hideEdge(lNode: LNode, lEdge: LEdge): void {
    const isOutgoing = lEdge.getSource()!.getNode() === lNode;
    const oppositePort = (isOutgoing ? lEdge.getTarget() : lEdge.getSource())!;

    // Hide the edge and remember its original target or source
    if (isOutgoing) {
      lEdge.setTarget(null);
    } else {
      lEdge.setSource(null);
    }

    lEdge.setProperty(InternalProperties.ORIGINAL_OPPOSITE_PORT, oppositePort);

    // We may want to control where the other node will end up in the layering...
    this.updateOppositeNodeLayerConstraints(lNode, oppositePort.getNode()!);
  }

  /**
   * Possibly sets additional layer constraints on the opposite node if it doesn't have any yet. If the opposite node
   * only had the hidden node as a connection, the layering may end up not being nice. For instance, if the hidden node
   * is `FIRST_SEPARATE` and is the only node the opposite node is connected to, then the opposite node will now be all
   * alone. This may mean that it will end up in the last layer, far away from the hidden node. We would thus set
   * `FIRST` on the opposite node to keep that from happening.
   *
   * We only do this, however, if the opposite node had connections only to `FIRST_SEPARATE` or only to `LAST_SEPARATE`
   * nodes. If it had connections to both, we don't do anything.
   */
  private updateOppositeNodeLayerConstraints(hiddenNode: LNode, oppositeNode: LNode): void {
    // If the node already has a layer constraint, don't bother
    if (oppositeNode.hasProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
      return;
    }

    // Update which kinds of hidden nodes the opposite node is connected to
    const connections = oppositeNode
      .getProperty(HIDDEN_NODE_CONNECTIONS)
      .combine(hiddenNode.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT));
    oppositeNode.setProperty(HIDDEN_NODE_CONNECTIONS, connections);

    // If the node is still connected to things, don't bother
    if (!Iterables.isEmpty(oppositeNode.getConnectedEdges())) {
      return;
    }

    // Our hidden node is the last node the opposite node was connected to. Check if we should add a constraint
    switch (connections) {
      case HiddenNodeConnections.FIRST_SEPARATE:
        oppositeNode.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST);
        break;

      case HiddenNodeConnections.LAST_SEPARATE:
        oppositeNode.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST);
        break;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Checks

  /** Ensures that the given node does not have incident edges that it must not have. */
  private ensureNoInacceptableEdges(lNode: LNode): void {
    const layerConstraint = lNode.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);

    // Ensure the node only has acceptable incident edges
    if (layerConstraint === LayerConstraint.FIRST_SEPARATE) {
      for (const inEdge of lNode.getIncomingEdges()) {
        if (!this.isAcceptableIncidentEdge(inEdge)) {
          throw new UnsupportedConfigurationException(
            `Node '${String(lNode.getDesignation())}' has its layer constraint set to FIRST_SEPARATE, but has at least one incoming edge. ` +
              'FIRST_SEPARATE nodes must not have incoming edges.',
          );
        }
      }
    } else if (layerConstraint === LayerConstraint.LAST_SEPARATE) {
      for (const outEdge of lNode.getOutgoingEdges()) {
        if (!this.isAcceptableIncidentEdge(outEdge)) {
          throw new UnsupportedConfigurationException(
            `Node '${String(lNode.getDesignation())}' has its layer constraint set to LAST_SEPARATE, but has at least one outgoing edge. ` +
              'LAST_SEPARATE nodes must not have outgoing edges.',
          );
        }
      }
    }
  }

  /** Checks whether the given edge is allowed. */
  private isAcceptableIncidentEdge(edge: LEdge): boolean {
    const sourceNode = edge.getSource()!.getNode()!;
    const targetNode = edge.getTarget()!.getNode()!;

    // If both nodes are external port dummies, that's fine
    return sourceNode.getType() === NodeType.EXTERNAL_PORT && targetNode.getType() === NodeType.EXTERNAL_PORT;
  }
}
