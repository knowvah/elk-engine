// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { PortType } from '../options/PortType.js';

/** Utility class for marking horizontal regions that are already covered by some nodes. */
class LayerSpan {
  start = 0;
  end = 0;
  nodes: LNode[] = [];
}

/**
 * A node layerer that allows user interaction by respecting previous node positions. These positions could be
 * contrary to edge directions, so the resulting layering must be checked for consistency.
 *
 * <dl>
 *   <dt>Precondition:</dt><dd>the graph has no cycles</dd>
 *   <dt>Postcondition:</dt><dd>all nodes have been assigned a layer such that
 *     edges connect only nodes from layers with increasing indices</dd>
 * </dl>
 *
 * AD-10: the `LinkedHashSet` of shifted nodes is insertion-ordered in Java and a `Set` here; the Java `ListIterator`s
 * are `ArrayListIterator`s. `process` is split at its Java section comments for the complexity limits.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/InteractiveLayerer.java
 */
export class InteractiveLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return LayoutProcessorConfiguration.create<LayeredPhases, LGraph>()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.INTERACTIVE_EXTERNAL_PORT_POSITIONER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR);
  }

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Interactive node layering', 1);

    // create layers with a start and an end position, merging when they overlap with others
    const currentSpans: LayerSpan[] = [];
    for (const node of layeredGraph.getLayerlessNodes()) {
      InteractiveLayerer.insertIntoSpans(node, currentSpans);
    }

    const layers = layeredGraph.getLayers();
    this.createLayers(layeredGraph, currentSpans);
    this.correctLayering(layeredGraph);

    // remove empty layers, which can happen when the layering has to be corrected
    const layerIterator = new ArrayListIterator<Layer>(layers);
    while (layerIterator.hasNext()) {
      if (layerIterator.next().getNodes().length === 0) {
        layerIterator.remove();
      }
    }

    // clear the list of nodes that have no layer, since now they all have one
    layeredGraph.getLayerlessNodes().length = 0;
    monitor.done();
  }

  /** The Java section "create real layers from the layer spans". */
  private createLayers(layeredGraph: LGraph, currentSpans: readonly LayerSpan[]): void {
    const layers = layeredGraph.getLayers();
    let nextIndex = 0;
    for (const span of currentSpans) {
      const layer = new Layer(layeredGraph);
      layer.id = nextIndex++;
      layers.push(layer);
      for (const node of span.nodes) {
        node.setLayer(layer);
        node.id = 0;
      }
    }
  }

  /** The Java section "correct the layering respecting the graph topology, so edges point from left to right". */
  private correctLayering(layeredGraph: LGraph): void {
    for (const node of layeredGraph.getLayerlessNodes()) {
      if (node.id === 0) {
        const shiftedNodes = this.checkNode(node, layeredGraph);
        // Since shiftedNodes might require other nodes to be shifted, do it again until all shiftedNodes
        // do no longer require another shift.
        while (shiftedNodes.size > 0) {
          const nodeToCheck: LNode = shiftedNodes.values().next().value!;
          shiftedNodes.delete(nodeToCheck);
          for (const shifted of this.checkNode(nodeToCheck, layeredGraph)) {
            shiftedNodes.add(shifted);
          }
        }
      }
    }
  }

  /** The body of `process`' first loop: puts the node into the sorted list of spans, merging overlapping spans. */
  private static insertIntoSpans(node: LNode, currentSpans: LayerSpan[]): void {
    const minx = node.getPosition().x;
    let maxx = minx + node.getSize().x;
    // for the following code we have to guarantee that every node has a width,
    // which, for instance, might not be the case for external dummy nodes
    maxx = Math.max(minx + 1, maxx);
    // look for a position in the sorted list where the node can be inserted
    const spanIter = new ArrayListIterator<LayerSpan>(currentSpans);
    let foundSpan: LayerSpan | null = null;
    while (spanIter.hasNext()) {
      const span = spanIter.next();
      if (span.start >= maxx) {
        // the next layer span is further right, so insert the node here
        spanIter.previous();
        break;
      } else if (span.end > minx) {
        // the layer span has an intersection with the node
        if (foundSpan === null) {
          // add the node to the current layer span
          span.nodes.push(node);
          span.start = Math.min(span.start, minx);
          span.end = Math.max(span.end, maxx);
          foundSpan = span;
        } else {
          // merge the previously found layer span with the current one
          foundSpan.nodes.push(...span.nodes);
          foundSpan.end = Math.max(foundSpan.end, span.end);
          spanIter.remove();
        }
      }
    }
    if (foundSpan === null) {
      InteractiveLayerer.addNewSpan(spanIter, node, minx, maxx);
    }
  }

  /** The Java `if (foundSpan == null)` block: no intersecting span was found, so create a new one. */
  private static addNewSpan(spanIter: ArrayListIterator<LayerSpan>, node: LNode, minx: number, maxx: number): void {
    const foundSpan = new LayerSpan();
    foundSpan.start = minx;
    foundSpan.end = maxx;
    spanIter.add(foundSpan);
    foundSpan.nodes.push(node);
  }

  /**
   * Check the layering of the given node by comparing the layer index of all successors.
   *
   * @param node1 a node
   * @param graph the layered graph
   */
  private checkNode(node1: LNode, graph: LGraph): Set<LNode> {
    node1.id = 1;
    const layer1 = node1.getLayer()!;
    const shiftNodes = new Set<LNode>();
    for (const port of node1.getPorts(PortType.OUTPUT)) {
      for (const edge of port.getOutgoingEdges()) {
        const node2 = edge.getTarget()!.getNode()!;
        if (node1 !== node2) {
          const layer2 = node2.getLayer()!;
          if (layer2.id <= layer1.id) {
            // a violation was detected - move the target node to the next layer
            const newIndex = Int32.add(layer1.id, 1);
            if (newIndex === graph.getLayers().length) {
              const newLayer = new Layer(graph);
              newLayer.id = newIndex;
              graph.getLayers().push(newLayer);
              node2.setLayer(newLayer);
            } else {
              const newLayer = graph.getLayers()[newIndex]!;
              node2.setLayer(newLayer);
            }
            shiftNodes.add(node2);
          }
        }
      }
    }
    return shiftNodes;
  }
}
