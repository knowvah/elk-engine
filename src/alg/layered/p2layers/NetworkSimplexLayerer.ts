// SPDX-License-Identifier: EPL-2.0
import { NEdge } from '../../common/networksimplex/NEdge.js';
import { NGraph } from '../../common/networksimplex/NGraph.js';
import { NNode } from '../../common/networksimplex/NNode.js';
import { NetworkSimplex } from '../../common/networksimplex/NetworkSimplex.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** One suspended `connectedComponentsDFS` call (B8): the node, its port iterator and the current port's edges. */
interface Frame {
  readonly node: LNode;
  readonly ports: Iterator<LPort>;
  port: LPort | null;
  edges: Iterator<LEdge> | null;
}

/**
 * The main class of the network simplex layerer component. It offers an algorithm to determine an optimal layering of
 * all nodes in the graph concerning a minimal length of all edges using the network simplex algorithm described in
 * <ul>
 * <li>Emden R. Gansner, Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo, A technique for drawing directed
 * graphs. <i>Software Engineering</i> 19(3), pp. 214-230, 1993.</li>
 * </ul>
 *
 * <dl>
 * <dt>Precondition:</dt>
 * <dd>the graph has no cycles</dd>
 * <dt>Postcondition:</dt>
 * <dd>all nodes have been assigned a layer such that edges connect only nodes from layers with
 * increasing indices</dd>
 * </dl>
 *
 * B8: the recursion of `connectedComponentsDFS` (Java `:153`) is an explicit-stack loop with the same visit,
 * side-effect and accumulation order. AD-10: the Java `nodeMap` (`Maps.newHashMap()`, `:184`) is only read by `get`,
 * never iterated; it is a `Map`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/NetworkSimplexLayerer.java
 */
export class NetworkSimplexLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #BASELINE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get BASELINE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (NetworkSimplexLayerer.#BASELINE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR));
  }

  // ================================== Attributes ==============================================

  /** The layered graph all methods in this class operate on. */
  private layeredGraph: LGraph | null = null;

  /**
   * A list containing all nodes of the currently identified connected component by `connectedComponents()`.
   *
   * @see connectedComponents
   */
  private componentNodes: LNode[] | null = null;

  /**
   * A flag indicating whether a specified node has been visited during DFS-traversal. This array has to be filled with
   * `false` each time, before a DFS-based method is invoked.
   */
  private nodeVisited: boolean[] | null = null;

  // =============================== Initialization Methods =====================================

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return NetworkSimplexLayerer.BASELINE_PROCESSING_CONFIGURATION;
  }

  /**
   * Helper method for the network simplex layerer. It determines all connected components of the graph given by a
   * collection containing all nodes of the graph.
   *
   * @param theNodes a collection containing all nodes of the graph to determine the connected components
   * @return a list of lists containing all nodes of every connected component
   *
   * @see connectedComponentsDFS
   */
  private connectedComponents(theNodes: LNode[]): LNode[][] {
    // initialize required attributes
    if (this.nodeVisited === null || this.nodeVisited.length < theNodes.length) {
      this.nodeVisited = new Array<boolean>(theNodes.length).fill(false);
    } else {
      this.nodeVisited.fill(false);
    }
    this.componentNodes = [];

    // re-index nodes
    let counter = 0;
    for (const node of theNodes) {
      node.id = counter++;
    }
    // determine connected components
    const components: LNode[][] = [];
    for (const node of theNodes) {
      if (!this.nodeVisited[node.id]!) {
        this.connectedComponentsDFS(node);
        // connected component with the most nodes should be layered first to guarantee
        // reusability of attribute instances
        if (components.length === 0 || components[0]!.length < this.componentNodes.length) {
          components.unshift(this.componentNodes);
        } else {
          components.push(this.componentNodes);
        }
        this.componentNodes = [];
      }
    }
    return components;
  }

  /**
   * Helper method for the connected components determination. It determines all nodes, that are connected with the
   * input node (i.e. all nodes of that connected component the input node is part of) and adds them to
   * `componentNodes`.
   *
   * @param node the root of the DFS-subtree
   *
   * @see connectedComponents
   * @see componentNodes
   */
  private connectedComponentsDFS(node: LNode): void {
    const stack: Frame[] = [this.enter(node)];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const opposite = this.nextUnvisited(frame);
      if (opposite === null) {
        stack.pop();
      } else {
        stack.push(this.enter(opposite));
      }
    }
  }

  /** The start of a `connectedComponentsDFS` call: mark the node visited and add it to the component. */
  private enter(node: LNode): Frame {
    this.nodeVisited![node.id] = true;

    // node is part of the current connected component
    this.componentNodes!.push(node);
    return { node, ports: node.getPorts()[Symbol.iterator](), port: null, edges: null };
  }

  /**
   * Advances a frame's `for port / for edge` loops to the next opposite node that is not visited yet; `null` once
   * the loops are exhausted.
   */
  private nextUnvisited(frame: Frame): LNode | null {
    for (;;) {
      if (frame.edges === null) {
        const next = frame.ports.next();
        if (next.done === true) {
          return null;
        }
        frame.port = next.value;
        frame.edges = next.value.getConnectedEdges()[Symbol.iterator]();
      }
      const edge = frame.edges.next();
      if (edge.done === true) {
        frame.edges = null;
      } else {
        // continue with next nodes, if not already visited
        const opposite = this.getOpposite(frame.port!, edge.value).getNode()!;
        if (!this.nodeVisited![opposite.id]!) {
          return opposite;
        }
      }
    }
  }

  /**
   * Helper method for the network simplex layerer. It instantiates all necessary attributes for the execution of the
   * network simplex layerer and initializes them with their default values. All edges in the connected component given
   * by the input argument will be determined, as well as the number of incoming and outgoing edges of each node
   * (`inDegree`, respectively `outDegree`). All sinks and source nodes in the connected component identified in this
   * step will be added to `sinks`, respectively `sources`.
   *
   * @param theNodes a collection containing all nodes of the graph
   */
  private initialize(theNodes: readonly LNode[]): NGraph {
    const nodeMap = new Map<LNode, NNode>();

    // transform nodes
    const graph = new NGraph();
    for (const lNode of theNodes) {
      const nNode = NNode.of().origin(lNode).create(graph);
      nodeMap.set(lNode, nNode);
    }

    // transform edges
    for (const lNode of theNodes) {
      for (const lEdge of lNode.getOutgoingEdges()) {
        // ignore self-loops
        if (lEdge.isSelfLoop()) {
          continue;
        }

        NEdge.of(lEdge)
          .weight(Int32.mul(1, Math.max(1, lEdge.getProperty(LayeredOptions.PRIORITY_SHORTNESS))))
          .delta(1)
          .source(nodeMap.get(lEdge.getSource()!.getNode()!)!)
          .target(nodeMap.get(lEdge.getTarget()!.getNode()!)!)
          .create();
      }
    }

    return graph;
  }

  /** Release all created resources so the GC can reap them. */
  private dispose(): void {
    this.componentNodes = null;
    this.layeredGraph = null;
    this.nodeVisited = null;
  }

  // ============================== Network-Simplex Algorithm ===================================

  /** factor by which the maximal number of iterations is multiplied. */
  private static readonly ITER_LIMIT_FACTOR = 4;

  /**
   * The main method of the network simplex layerer. It determines an optimal layering of all nodes in the graph
   * concerning a minimal length of all edges by using the network simplex algorithm described in Emden R. Gansner,
   * Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo: "A Technique for Drawing Directed Graphs", AT&T Bell
   * Laboratories. Note that the execution time of this implemented algorithm has not been proven quadratic yet.
   *
   * @param theLayeredGraph a layered graph which initially only contains layerless nodes and is then filled with layers
   * @param monitor the progress monitor
   */
  process(theLayeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Network simplex layering', 1);

    this.layeredGraph = theLayeredGraph;
    const thoroughness = Int32.mul(
      theLayeredGraph.getProperty(LayeredOptions.THOROUGHNESS),
      NetworkSimplexLayerer.ITER_LIMIT_FACTOR,
    );

    const theNodes = this.layeredGraph.getLayerlessNodes();
    if (theNodes.length < 1) {
      monitor.done();
      return;
    }

    // layer graph, each connected component separately
    const connectedComponents = this.connectedComponents(theNodes);
    let previousLayeringNodeCounts: number[] | null = null;
    for (const connComp of connectedComponents) {
      const graph = this.layerComponent(connComp, thoroughness, previousLayeringNodeCounts, monitor);

      this.assignLayers(graph);

      if (connectedComponents.length > 1) {
        previousLayeringNodeCounts = this.layerNodeCounts();
      }
    }

    // empty the list of unlayered nodes
    theNodes.length = 0;

    // release the created resources
    this.dispose();
    monitor.done();
  }

  /** The Java loop body of `process` up to the layer assignment: runs the network simplex on one component. */
  private layerComponent(
    connComp: readonly LNode[],
    thoroughness: number,
    previousLayeringNodeCounts: number[] | null,
    monitor: IElkProgressMonitor,
  ): NGraph {
    // determine a limit on the number of iterations
    const iterLimit = Int32.mul(thoroughness, d2i(Math.sqrt(connComp.length)));

    const graph = this.initialize(connComp);

    // execute the network simplex algorithm on the (sub-)graph
    const simplex = NetworkSimplex.forGraph(graph).withIterationLimit(iterLimit);
    if (previousLayeringNodeCounts !== null) {
      // the Java passes `null` on the first component, which is the state's default
      simplex.withPreviousLayering(previousLayeringNodeCounts);
    }
    simplex.withBalancing(true).execute(monitor.subTask(1)!);

    return graph;
  }

  /** The Java block of `process` that records the number of nodes in each layer. */
  private layerNodeCounts(): number[] {
    const counts = new Array<number>(this.layeredGraph!.getLayers().length);
    let layerIdx = 0;
    for (const l of this.layeredGraph!) {
      counts[layerIdx++] = l.getNodes().length;
    }
    return counts;
  }

  /** The Java loop of `process` that moves the component's nodes into the layers stored in the NNodes. */
  private assignLayers(graph: NGraph): void {
    const layeredGraph = this.layeredGraph!;
    // the layers are store in the NNode's layer field.
    const layers = layeredGraph.getLayers();
    for (const nNode of graph.nodes) {
      // add additional layers to match required number
      while (layers.length <= nNode.layer) {
        layers.push(new Layer(layeredGraph));
      }
      const lNode = nNode.origin as LNode;
      lNode.setLayer(layers[nNode.layer]!);
    }
  }

  /**
   * Helper method for the network simplex layerer. It returns the port that is connected to the opposite side of the
   * specified edge from the viewpoint of the input port.
   *
   * @param port the port to get the opposite port from
   * @param edge the edge to consider when determining the opposite port
   * @return the opposite port from the viewpoint of the given port
   *
   * @throws IllegalArgumentException if the input edge is not connected to the input port
   */
  private getOpposite(port: LPort, edge: LEdge): LPort {
    if (edge.getSource() === port) {
      return edge.getTarget()!;
    } else if (edge.getTarget() === port) {
      return edge.getSource()!;
    }
    throw new IllegalArgumentException('Input edge is not connected to the input port.');
  }
}
