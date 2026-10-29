// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Float32 from '../../../java/lang/Float32.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * This class implements the StretchWidth layering algorithm described in In Search for Efficient Heuristics for
 * Minimum-Width Graph Layering with Consideration of Dummy Nodes written by Nikolas S. Nikolov, Alexandre Tarassov, and
 * Jürgen Branke It is designed to create a layering as small as possible.
 *
 * Precondition: the graph has no cycles, but may contain self-loops Postcondition: all nodes have been assigned to a
 * layer such that edges connect only nodes from one layer to another layer
 *
 * AD-10: the Java `HashSet<LNode>`s (`:66`, `:68`, `:319`, `:328`) are `Set`s in insertion order. None is iterated
 * observably: `alreadyPlacedNodes` and `alreadyPlacedInOtherLayers` only see `add`, `clear`, `isEmpty` and
 * `addAll(alreadyPlacedNodes)` into a set that is never read, and `successors` is built and never read.
 * `process` is split after its set-up section for the complexity limits. A zero-height NORMAL node never terminates
 * (the Java divides by the height before clamping it, `:149` before `:151`): faithful, not fixed.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/StretchWidthLayerer.java
 */
export class StretchWidthLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  /** Indicates the width of the currently built layer. */
  private widthCurrent = 0;
  /** Estimated width of the next layer. */
  private widthUp = 0;
  /**
   * Indicates the width of the layering.
   *
   * Will be dynamically increased if the layering fails for lower values. The pseudo code says initialize with 0 but I
   * think you can start with 1 or maybe higher/average out-degree. I choose,later, the widest normalized node, as the
   * algorithm fails until it can be placed
   */
  private maxWidth = 0;
  /** The graph the layering is done for. */
  private currentGraph!: LGraph;
  /** Factor which determines the bounding of the incoming edges with widthUp and maxWidth. */
  private upperLayerInfluence = 0;
  /** Sorted list of layerless nodes. */
  private sortedLayerlessNodes: LNode[] = [];
  /** Set of nodes placed in the current layer. */
  private readonly alreadyPlacedNodes = new Set<LNode>();
  /** Set of nodes in all layers except the current. */
  private readonly alreadyPlacedInOtherLayers = new Set<LNode>();
  /** List of layerless nodes to be used in one layering approach, will be sorted after initialization. */
  private tempLayerlessNodes: LNode[] = [];
  /** List of sets of successors for every node, can be accessed with successors.get(node.id). */
  private successors: Set<LNode>[] = [];
  /** Array of out-degrees for every node, access with outDegree[node.id]. */
  private outDegree: number[] = [];
  /** Initialized as a copy of {@link outDegree}, used to determine if all successors of a node are already placed. */
  private remainingOutGoing: number[] = [];
  /** Array of in-degrees for every node, access with inDegree[node.id]. */
  private inDegree: number[] = [];
  /** Selected node to be placed. */
  private selectedNode: LNode | null = null;
  /** Minimum node size to normalize the other sizes. */
  private minimumNodeSize = 0;
  /** Maximum node size to normalize the other sizes. */
  private maximumNodeSize = 0;
  /** Normalized Size of every node, access with normSize[node.id]. */
  private normSize: number[] = [];
  /** the size of the dummy nodes, that should be considered. */
  private dummySize = 0;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return LayoutProcessorConfiguration.create<LayeredPhases, LGraph>()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR);
  }

  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('StretchWidth layering', 1);

    // if no nodes need to be placed we can stop right here
    if (layeredGraph.getLayerlessNodes().length === 0) {
      progressMonitor.done();
      return;
    }

    let currentLayer = this.initialize(layeredGraph);

    while (this.tempLayerlessNodes.length > 0) {
      // Select a node to be placed
      this.selectedNode = this.selectNode();
      // The pseudo code computes the difference of the to sets as:
      // alreadyPlacedNodes\alreadyPlacedInOtherLayers
      // but since alreadyPlacedNodes will be cleared here, it's enough to check if
      // alreadyPlacedNodes is empty
      // if it is empty it would indicate an empty layer
      if (this.selectedNode === null || (this.conditionGoUp() && this.alreadyPlacedNodes.size > 0)) {
        currentLayer = this.goToNextLayer(currentLayer);
      } else if (this.conditionGoUp()) {
        currentLayer = this.resetLayering();
      } else {
        this.placeSelectedNode(currentLayer);
      }
    }

    // Layering done, delete original layerlessNodes
    layeredGraph.getLayerlessNodes().length = 0;
    // Algorithm is Bottom-Up -> reverse Layers
    layeredGraph.getLayers().reverse();

    progressMonitor.done();
  }

  /** The Java branch "go to the next layer" of the main loop; returns the new current layer. */
  private goToNextLayer(finished: Layer): Layer {
    // go to the next layer //
    // update the remaining successors of the node
    this.updateOutGoing(finished);
    const currentLayer = new Layer(this.currentGraph);
    this.currentGraph.getLayers().push(currentLayer);
    // union of alreadyPlacedInOtherLayers and alreadyPlacedNodes
    for (const placed of this.alreadyPlacedNodes) {
      this.alreadyPlacedInOtherLayers.add(placed);
    }
    this.alreadyPlacedNodes.clear();
    // change width
    this.widthCurrent = this.widthUp;
    this.widthUp = 0;
    return currentLayer;
  }

  /** The Java branch "reset layering" of the main loop; returns the new first layer. */
  private resetLayering(): Layer {
    // reset layering //
    // reset layering //
    // clear the placed layers
    this.currentGraph.getLayers().length = 0;
    // create the new first layer;
    const currentLayer = new Layer(this.currentGraph);
    this.currentGraph.getLayers().push(currentLayer);
    // reset variables
    this.widthCurrent = 0;
    this.widthUp = 0;
    this.alreadyPlacedNodes.clear();
    this.alreadyPlacedInOtherLayers.clear();
    // increase maxWidth
    this.maxWidth++;
    // reset layerless nodes
    this.tempLayerlessNodes = [...this.sortedLayerlessNodes];
    // reset successors
    this.remainingOutGoing = [...this.outDegree];
    return currentLayer;
  }

  /** The set-up section of `process`, up to the first layer; returns that layer. */
  private initialize(layeredGraph: LGraph): Layer {
    // set graph
    this.currentGraph = layeredGraph;
    // reset variables
    this.widthCurrent = 0;
    this.widthUp = 0;
    // initialize min and max node sizes to 1,
    // since 0 or negative values to not make sense
    this.minimumNodeSize = Number.POSITIVE_INFINITY;
    this.maximumNodeSize = Number.NEGATIVE_INFINITY;

    // initialize the dummy size with the spacing properties
    this.dummySize = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);
    // Sort the nodes at beginning, since the rank will not change.
    // The list is sorted in descending order by the rank.
    // It has to be computed first
    this.computeSortedNodes();
    // Compute a list with the successors of every node
    // Can't be swapped with the computation of the out- and in-degrees
    this.computeSuccessors();
    // Compute two arrays of out- and in-degree for every node
    this.computeDegrees();
    // Compute minimum node size
    this.minMaxNodeSize();
    // Compute normalized size of every node
    this.computeNormalizedSize();
    // make sure the values are reasonable
    this.minimumNodeSize = Math.max(1, this.minimumNodeSize);
    this.maximumNodeSize = Math.max(1, this.maximumNodeSize);

    // normalize dummy size
    this.dummySize = this.dummySize / this.minimumNodeSize;
    this.maxWidth = this.maximumNodeSize / this.minimumNodeSize;
    // To combine dummy nodes and real node size, you could also add the average normalized node
    // size
    // to this criterion and adjust the condition go up at widthUp
    this.upperLayerInfluence = this.getAverageOutDegree();
    // Layer currently worked on
    const currentLayer = new Layer(this.currentGraph);
    // add first layer to the graph
    this.currentGraph.getLayers().push(currentLayer);
    // Copy the sorted layerless nodes so we don't overwrite it in the reset case
    this.tempLayerlessNodes = [...this.sortedLayerlessNodes];
    // Copy the outDegree Array
    this.remainingOutGoing = [...this.outDegree];
    return currentLayer;
  }

  /** The Java `else` branch "add node to current layer" of the main loop. */
  private placeSelectedNode(currentLayer: Layer): void {
    const selected = this.selectedNode!;
    // add node to current layer //
    selected.setLayer(currentLayer);
    // `List.remove(Object)`: the first occurrence
    this.tempLayerlessNodes.splice(this.tempLayerlessNodes.indexOf(selected), 1);
    this.alreadyPlacedNodes.add(selected);
    // compute new widthCurrent and widthUp
    this.widthCurrent = this.widthCurrent - this.outDegree[selected.id]! * this.dummySize + this.normSize[selected.id]!;
    this.widthUp += this.inDegree[selected.id]! * this.dummySize;
  }

  /**
   * Checks the effects of the hypothetical placement of the selected node and whether the algorithm should rather go
   * up than placing the node.
   *
   * @return true, if the algorithm should go to the next layer, false otherwise
   */
  private conditionGoUp(): boolean {
    const id = this.selectedNode!.id;
    const a = this.widthCurrent - this.outDegree[id]! * this.dummySize + this.normSize[id]! > this.maxWidth;
    const b =
      this.widthUp + this.inDegree[id]! * this.dummySize > this.maxWidth * this.upperLayerInfluence * this.dummySize;
    return a || b;
  }

  /**
   * Selects a node from the sorted list of layerless nodes. The selection is done according to the rank of the node and
   * only if all of its successors are already in the {@link alreadyPlacedInOtherLayers} set.
   *
   * @return node to be placed in the current layer, or null if no appropriate node was found
   */
  private selectNode(): LNode | null {
    for (const node of this.tempLayerlessNodes) {
      // If all successors of node are in the alreadyPlacedInOtherLayers set, choose this
      // node, since the list is sorted by rank
      if (this.remainingOutGoing[node.id]! <= 0) {
        return node;
      }
    }
    // If no candidate was found return null
    return null;
  }

  /**
   * Sorts a list of nodes by its rank. The rank is defined as max(d⁺(v),max(d⁺(u):(u,v)∈ E)), where d⁺(v) is the
   * number of outgoing edges of a node v. Since the id-field is reused later on, this function should be executed first
   */
  private computeSortedNodes(): void {
    const unsortedNodes = this.currentGraph.getLayerlessNodes();
    this.sortedLayerlessNodes = [...unsortedNodes];
    // the id-field is reused later on, be careful
    for (const node of unsortedNodes) {
      node.id = this.getRank(node);
    }
    // sorting the list by the node-id /rank
    this.sortedLayerlessNodes.sort((o1, o2) => {
      // descending sort
      if (o1.id < o2.id) {
        return 1;
      } else if (o1.id > o2.id) {
        return -1;
      }
      return 0;
    });
  }

  /**
   * Computes the rank of a node. The rank is defined as max(d⁺(v),max(d⁺(u):(u,v)∈ E)), where d⁺(v) is the number of
   * outgoing edges of a node v.
   *
   * @param node to compute the rank for
   * @return rank of the node
   */
  private getRank(node: LNode): number {
    let max = Iterables.size(node.getOutgoingEdges());

    // compute max of predecessors out-degree and out-degree of the current node
    for (const preEdge of node.getIncomingEdges()) {
      const pre = preEdge.getSource()!.getNode()!;
      const temp = Iterables.size(pre.getOutgoingEdges());
      max = Math.max(max, temp);
    }

    return max;
  }

  /**
   * Computes the successors of every node and saves them in a list of sets of nodes. This list is used in selectNode.
   * Needs to be executed after {@link computeSortedNodes}.
   */
  private computeSuccessors(): void {
    let i = 0;
    this.successors = [];
    const currSucc = new Set<LNode>();

    for (const node of this.sortedLayerlessNodes) {
      node.id = i;
      for (const edge of node.getOutgoingEdges()) {
        currSucc.add(edge.getTarget()!.getNode()!);
      }
      // remove current node from accSucc to deal with self-loops
      currSucc.delete(node);
      this.successors.push(new Set(currSucc));
      currSucc.clear();
      i++;
    }
  }

  /**
   * Computes the in- and out-degree of every node. the values are used to determine widthUp and widthCurrent. Needs to
   * be executed after {@link computeSuccessors}.
   */
  private computeDegrees(): void {
    this.inDegree = new Array<number>(this.sortedLayerlessNodes.length).fill(0);
    this.outDegree = new Array<number>(this.sortedLayerlessNodes.length).fill(0);

    for (const node of this.sortedLayerlessNodes) {
      this.inDegree[node.id] = Iterables.size(node.getIncomingEdges());
      this.outDegree[node.id] = Iterables.size(node.getOutgoingEdges());
    }
  }

  /** Computes the minimum and the maximum node size. Needs to be computed after {@link computeSuccessors}. */
  private minMaxNodeSize(): void {
    // since in ELK all things are layered, left to right
    // a preprocessor also transposes the width and height and
    // we don't need to consider the layering direction and can take the
    // the y-size
    for (const node of this.sortedLayerlessNodes) {
      if (node.getType() !== NodeType.NORMAL) {
        continue;
      }
      const size = node.getSize().y;
      this.minimumNodeSize = Math.min(this.minimumNodeSize, size);
      this.maximumNodeSize = Math.max(this.maximumNodeSize, size);
    }
  }

  /**
   * Computes the average normalized node size. Unused in the Java too (`@SuppressWarnings("unused")`); kept because
   * the Java is the specification.
   *
   * @return average normalized node size
   */
  protected avereageNodeSize(): number {
    let sum = 0;
    for (const node of this.sortedLayerlessNodes) {
      sum = sum + this.normSize[node.id]!;
    }
    return sum / this.sortedLayerlessNodes.length;
  }

  /**
   * Computes the size of every node according to the layering direction and normalizes it by the minimum node size.
   * Needs to be computed after {@link computeSuccessors} and `minimumNodeSize()`.
   */
  private computeNormalizedSize(): void {
    this.normSize = new Array<number>(this.sortedLayerlessNodes.length).fill(0);
    for (const node of this.sortedLayerlessNodes) {
      this.normSize[node.id] = node.getSize().y / this.minimumNodeSize;
    }
  }

  /**
   * Computes the average out-degree of the graph. Should be computed before changing the layerlessNodes list.
   *
   * @return average out-degree of the Graph
   */
  private getAverageOutDegree(): number {
    // Java `float`: every operation rounds to single precision
    let allOut = 0;
    for (const node of this.currentGraph.getLayerlessNodes()) {
      allOut = Float32.add(allOut, Iterables.size(node.getOutgoingEdges()));
    }
    return Float32.div(allOut, this.currentGraph.getLayerlessNodes().length);
  }

  /**
   * Updates the information of the nodes, telling which has successors that are not placed. Is used when one layer is
   * finished, to eliminate edges in the same layer.
   *
   * @param currentLayer which is about to be finished
   */
  private updateOutGoing(currentLayer: Layer): void {
    for (const node of currentLayer.getNodes()) {
      for (const edge of node.getIncomingEdges()) {
        const pos = edge.getSource()!.getNode()!.id;
        this.remainingOutGoing[pos] = Int32.sub(this.remainingOutGoing[pos]!, 1);
      }
    }
  }
}
