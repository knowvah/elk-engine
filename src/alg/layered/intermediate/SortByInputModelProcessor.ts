// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { MAX_VALUE } from '../../../java/lang/JavaInteger.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { ModelOrderNodeComparator } from './preserveorder/ModelOrderNodeComparator.js';
import { ModelOrderPortComparator } from './preserveorder/ModelOrderPortComparator.js';

/** Java `AbstractCollection.toString()` of the logged lists: `[a, b]`. */
function listToString(list: readonly unknown[]): string {
  return `[${list.map((element) => String(element)).join(', ')}]`;
}

/**
 * Sorts all child nodes and their edges of the given graph by their `InternalProperties.MODEL_ORDER`, which represents
 * the order in input graph. Outgoing ports are sorted by the order of their edges, incoming ports are sorted by the
 * order of their nodes in the previous layer.
 *
 * Precondition: a proper layered graph; nodes have fixed port sides. Postcondition: nodes and ports (edges) are sorted
 * to respect the order in the input graph. Slots: before phase 3. Same-slot dependencies: since this processor assumes
 * a proper layered graph it has to be executed after the `LongEdgeSplitter`; since the `NorthSouthPortPreprocessor`
 * introduces same layer edges it has to be executed after this processor.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/SortByInputModelProcessor.java
 */
export class SortByInputModelProcessor implements ILayoutProcessor<LGraph> {
  /** @see SortByInputModelProcessor.java:59 */
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin(
      `Sort By Input Model ${String(graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY))}`,
      1,
    );
    let layerIndex = 0;
    for (const layer of graph) {
      // The layer.id is necessary to check whether nodes really connect to the previous layer.
      // Feedback long edge dummies do might have a long-edge dummy in the same layer.
      layer.id = layerIndex;
      const previousLayerIndex = layerIndex === 0 ? 0 : layerIndex - 1;
      const previousLayer = graph.getLayers()[previousLayerIndex]!;
      // Sort nodes before port sorting to have sorted nodes for in-layer feedback edge dummies.
      let comparator = SortByInputModelProcessor.#nodeComparator(graph, previousLayer, true);
      SortByInputModelProcessor.insertionSort(layer.getNodes(), comparator);
      SortByInputModelProcessor.#sortPorts(graph, layer, previousLayer, progressMonitor);
      // Sort nodes after port sorting to also sort dummy feedback nodes from the current layer correctly.
      comparator = SortByInputModelProcessor.#nodeComparator(graph, previousLayer, false);
      SortByInputModelProcessor.insertionSort(layer.getNodes(), comparator);

      progressMonitor.log(`Layer ${layerIndex}: ${String(layer)}`);
      layerIndex++;
    }
    progressMonitor.done();
  }

  /** The `new ModelOrderNodeComparator(...)` expression of `process` (`:65`, `:89`). */
  static #nodeComparator(graph: LGraph, previousLayer: Layer, beforePorts: boolean): ModelOrderNodeComparator {
    return new ModelOrderNodeComparator(
      graph,
      previousLayer,
      graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY),
      graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_LONG_EDGE_STRATEGY),
      {
        groupOrderStrategy: graph.getProperty(
          LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY,
        ),
        beforePorts,
      },
    );
  }

  /** The port sorting loop of `process` (`:69-86`), one layer. */
  static #sortPorts(graph: LGraph, layer: Layer, previousLayer: Layer, progressMonitor: IElkProgressMonitor): void {
    for (const node of layer.getNodes()) {
      if (
        node.getProperty(LayeredOptions.PORT_CONSTRAINTS) !== PortConstraints.FIXED_ORDER &&
        node.getProperty(LayeredOptions.PORT_CONSTRAINTS) !== PortConstraints.FIXED_POS
      ) {
        // Special case:
        // If two edges (of the same node) have the same target node they should be next to each other.
        // Therefore all ports that connect to the same node should have the same
        // (their minimal) model order.
        // Get minimal model order for target node
        const portComparator = new ModelOrderPortComparator(
          graph,
          previousLayer,
          graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY),
          SortByInputModelProcessor.longEdgeTargetNodePreprocessing(node),
          graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER),
        );
        // `Collections.sort` is stable, as is `Array.prototype.sort` (translation-rules 2).
        node.getPorts().sort((p1, p2) => portComparator.compare(p1, p2));
        progressMonitor.log(`Node ${String(node)} ports: ${listToString(node.getPorts())}`);
      }
    }
  }

  /**
   * Calculate long edge target of port and saves it and adds a map of all long edge targets to the node.
   *
   * The map is a Java `HashMap` keyed by `LNode` (identity hash) that is only read through `containsKey`/`get`/`put`
   * here, so insertion order is unobservable (AD-10).
   *
   * @param node the node
   * @returns A map of all long edge targets of a node
   * @see SortByInputModelProcessor.java:109
   */
  static longEdgeTargetNodePreprocessing(node: LNode): Map<LNode, number> {
    const targetNodeModelOrder = new Map<LNode, number>();
    if (node.hasProperty(InternalProperties.TARGET_NODE_MODEL_ORDER)) {
      return node.getProperty(InternalProperties.TARGET_NODE_MODEL_ORDER);
    }
    for (const p of node.getPorts().filter((port) => port.getOutgoingEdges().length !== 0)) {
      const targetNode = SortByInputModelProcessor.getTargetNode(p);
      p.setProperty(InternalProperties.LONG_EDGE_TARGET_NODE, targetNode);
      if (targetNode !== null) {
        let previousOrder = MAX_VALUE;
        if (targetNodeModelOrder.has(targetNode)) {
          previousOrder = targetNodeModelOrder.get(targetNode)!;
        }
        const edge = p.getOutgoingEdges()[0]!;
        if (!edge.getProperty(InternalProperties.REVERSED)) {
          // Java unboxes the `Integer` here: a missing model order is a NullPointerException.
          const modelOrder = edge.getProperty(InternalProperties.MODEL_ORDER) as number | null;
          if (modelOrder === null) {
            throw new TypeError('Cannot unbox the model order of an edge without one');
          }
          targetNodeModelOrder.set(targetNode, Math.min(modelOrder, previousOrder));
        }
      }
    }
    node.setProperty(InternalProperties.TARGET_NODE_MODEL_ORDER, targetNodeModelOrder);
    return targetNodeModelOrder;
  }

  /**
   * Returns the target node of a port considering long edges.
   *
   * @param port The port
   * @returns the target node of the long edge connecting to the port or null if none exist.
   * @see SortByInputModelProcessor.java:139
   */
  static getTargetNode(port: LPort): LNode | null {
    let node: LNode | null = null;
    let edge = port.getOutgoingEdges()[0]!;
    do {
      node = edge.getTarget()!.getNode()!;
      // If the dummy node has a target return it.
      if (node.hasProperty(InternalProperties.LONG_EDGE_TARGET)) {
        return node.getProperty(InternalProperties.LONG_EDGE_TARGET).getNode();
      }
      // It not the current node might be the target node or one has to iterate manually through to it.
      const next = node.getOutgoingEdges()[Symbol.iterator]().next();
      if (node.getType() !== NodeType.NORMAL && next.done !== true) {
        edge = next.value;
      } else if (node.getType() !== NodeType.NORMAL) {
        return null;
      }
    } while (node.getType() !== NodeType.NORMAL);
    return node;
  }

  /** @see SortByInputModelProcessor.java:158 */
  static insertionSort(layer: LNode[], comparator: ModelOrderNodeComparator): void {
    let temp: LNode;
    for (let i = 1; i < layer.length; i++) {
      temp = layer[i]!;
      let j = i;
      while (j > 0 && comparator.compare(layer[j - 1]!, temp) > 0) {
        layer[j] = layer[j - 1]!;
        j--;
      }
      layer[j] = temp;
    }
    comparator.clearTransitiveOrdering();
  }

  /** @see SortByInputModelProcessor.java:173 */
  static insertionSortPort(layer: LPort[], comparator: ModelOrderPortComparator): void {
    let temp: LPort;
    for (let i = 1; i < layer.length; i++) {
      temp = layer[i]!;
      let j = i;
      while (j > 0 && comparator.compare(layer[j - 1]!, temp) > 0) {
        layer[j] = layer[j - 1]!;
        j--;
      }
      layer[j] = temp;
    }
    comparator.clearTransitiveOrdering();
  }
}
