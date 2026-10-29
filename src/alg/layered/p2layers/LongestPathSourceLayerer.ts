// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';

/** One suspended `visit` call (B8): the node, its port and edge iterators and the running `maxHeight`. */
interface Frame {
  readonly node: LNode;
  readonly ports: Iterator<LPort>;
  edges: Iterator<LEdge> | null;
  maxHeight: number;
}

/**
 * The most basic layering algorithm, which assign layers according to the
 * longest path to a source.
 *
 * <dl>
 *   <dt>Precondition:</dt><dd>the graph has no cycles</dd>
 *   <dt>Postcondition:</dt><dd>all nodes have been assigned a layer such that
 *     edges connect only nodes from layers with increasing indices</dd>
 * </dl>
 *
 * B8: the recursion of `visit` (Java `::102`) is an explicit-stack loop with the same visit, side-effect and
 * accumulation order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/LongestPathSourceLayerer.java
 */
export class LongestPathSourceLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #BASELINE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get BASELINE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (LongestPathSourceLayerer.#BASELINE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR));
  }

  /** the layered graph to which layers are added. */
  private layeredGraph: LGraph | null = null;
  /** map of nodes to their height in the layering. */
  private nodeHeights: number[] | null = null;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return LongestPathSourceLayerer.BASELINE_PROCESSING_CONFIGURATION;
  }

  process(thelayeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Longest path to source layering', 1);

    this.layeredGraph = thelayeredGraph;
    const nodes = this.layeredGraph.getLayerlessNodes();

    // initialize values required for the computation
    const heights = new Array<number>(nodes.length);
    this.nodeHeights = heights;
    let index = 0;
    for (const node of nodes) {
      // the node id is used as index for the nodeHeights array
      node.id = index;
      heights[index] = -1;
      index++;
    }

    // process all nodes
    for (const node of nodes) {
      this.visit(node);
    }

    // empty the list of unlayered nodes
    nodes.length = 0;

    // release the created resources
    this.layeredGraph = null;
    this.nodeHeights = null;

    monitor.done();
  }

  /**
   * Visit a node: if not already visited, find the longest path to a source.
   *
   * @param node node to visit
   * @return height of the given node in the layered graph
   */
  private visit(node: LNode): number {
    const heights = this.nodeHeights!;
    const height = heights[node.id]!;
    if (height >= 0) {
      // the node was already visited (the case height == 0 should never occur)
      return height;
    }
    const stack: Frame[] = [LongestPathSourceLayerer.openFrame(node)];
    let returned = 0;
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = LongestPathSourceLayerer.nextNode(frame);
      if (next === null) {
        this.putNode(frame.node, frame.maxHeight);
        returned = frame.maxHeight;
        stack.pop();
        // the return into the parent's `maxHeight = Math.max(maxHeight, height + 1)`
        const parent = stack[stack.length - 1];
        if (parent !== undefined) {
          parent.maxHeight = Math.max(parent.maxHeight, Int32.add(returned, 1));
        }
      } else if (heights[next.id]! >= 0) {
        frame.maxHeight = Math.max(frame.maxHeight, Int32.add(heights[next.id]!, 1));
      } else {
        stack.push(LongestPathSourceLayerer.openFrame(next));
      }
    }
    return returned;
  }

  private static openFrame(node: LNode): Frame {
    return { node, ports: node.getPorts()[Symbol.iterator](), edges: null, maxHeight: 1 };
  }

  /** The next source node of a frame's `for port / for edge` loops that is not the frame's node (self-loops skipped). */
  private static nextNode(frame: Frame): LNode | null {
    for (;;) {
      if (frame.edges === null) {
        const port = frame.ports.next();
        if (port.done === true) {
          return null;
        }
        frame.edges = port.value.getIncomingEdges()[Symbol.iterator]();
      }
      const edge = frame.edges.next();
      if (edge.done === true) {
        frame.edges = null;
      } else {
        const other = edge.value.getSource()!.getNode()!;
        // ignore self-loops
        if (frame.node !== other) {
          return other;
        }
      }
    }
  }

  /**
   * Puts the given node into the layered graph, adding new layers as necessary.
   *
   * @param node a node
   * @param height height of the layer where the node shall be added
   *          (height = number of layers - layer index)
   */
  private putNode(node: LNode, height: number): void {
    const layeredGraph = this.layeredGraph!;
    const layers = layeredGraph.getLayers();

    // add layers so as to guarantee that number of layers >= height
    for (let i = layers.length; i < height; i++) {
      layers.push(new Layer(layeredGraph));
    }

    // layer index = number of layers - height
    node.setLayer(layers[height - 1]!);
    this.nodeHeights![node.id] = height;
  }
}
