// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../../core/util/Pair.js';
import * as Iterables from '../../../guava/Iterables.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { MAX_VALUE as INTEGER_MAX_VALUE } from '../../../java/lang/JavaInteger.js';
import type { ListIterator } from '../../../java/util/ListIterator.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { HighDegreeNodeLayeringProcessorHighDegreeNodeInformation as HighDegreeNodeInformation } from './HighDegreeNodeLayeringProcessorHighDegreeNodeInformation.js';

/** Java `Function<LNode, Iterable<LEdge>>`. */
type EdgeSelector = (node: LNode) => Iterable<LEdge>;

/** The result of a tree root test that does not need a frame: Java `return -1` / `return 1`. */
const NOT_A_TREE = -1;

/** One active call of Java's recursive `isTreeRoot` (B8): the edges still to visit and the running height. */
interface TreeRootFrame {
  readonly root: LNode;
  readonly edges: Iterator<LEdge>;
  currentHeight: number;
}

/**
 * Tries to improve the legibility of graphs that contain nodes of a very high degree. With such node it can happen
 * that high degree nodes end up in layers with many leaf nodes of other high degree nodes resulting in a very tall
 * drawing. This processor tackles this by identifying high degree nodes and trees connected to the high degree node.
 * Trees that to not exceed a certain height are moved to newly introduced layers next to the layer with a high degree
 * node. If a layer contains multiple high degree nodes the newly introduced layers are shared amongst the high degree
 * nodes which remain in their original layer.
 *
 * Note that leafs of paths of nodes are special kinds of trees and thus treated as well.
 *
 * Precondition: a properly layered graph. Postcondition: a properly layered graph with additional layers for trees
 * connected to high degree nodes. Slots: after phase 2. Same-slot dependencies: should most likey run before any other
 * intermediate processor in this slot since it is still some kind of layering algorithm.
 *
 * B8: the Java recursions that depend on the input (`moveTree`, `isTreeRoot`) are explicit-stack loops here. B8 names
 * `degree` (`:268`), which is only an overload chain (`degree(node)` calls `degree(node, selector)`), not a recursion;
 * the recursive methods of this class are those two.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.java
 */
export class HighDegreeNodeLayeringProcessor implements ILayoutProcessor<LGraph> {
  private static readonly INCOMING_EDGES: EdgeSelector = (n) => n.getIncomingEdges();
  private static readonly OUTGOING_EDGES: EdgeSelector = (n) => n.getOutgoingEdges();

  private layeredGraph!: LGraph;

  /** Minimum degree for a node to be considered 'high degree'. */
  private degreeThreshold = 0;
  /** The maximum height of a tree to be considered. Trees with larger height are neglected. */
  private treeHeightThreshold = 0;

  /** @see HighDegreeNodeLayeringProcessor.java:69 */
  process(graph: LGraph, _progressMonitor: IElkProgressMonitor): void {
    this.layeredGraph = graph;

    // retrieve some properties
    this.degreeThreshold = graph.getProperty(LayeredOptions.HIGH_DEGREE_NODES_THRESHOLD);
    this.treeHeightThreshold = graph.getProperty(LayeredOptions.HIGH_DEGREE_NODES_TREE_HEIGHT);
    // translate 0 to 'arbitrary height'
    if (this.treeHeightThreshold === 0) {
      this.treeHeightThreshold = INTEGER_MAX_VALUE;
    }

    // now iterate through all layer
    const layerIt = new ArrayListIterator(graph.getLayers());
    while (layerIt.hasNext()) {
      const lay = layerIt.next();
      this.processLayer(lay, layerIt);
    }

    // -----------------------------------------------------------------------
    //  #2 it can happen that layers became empty
    //     after the previous processing, remove them
    // -----------------------------------------------------------------------
    const layerIt2 = new ArrayListIterator(graph.getLayers());
    while (layerIt2.hasNext()) {
      const l = layerIt2.next();
      if (l.getNodes().length === 0) {
        layerIt2.remove();
      }
    }
  }

  /**
   * The body of the Java layer loop (`:84`-`:138`), at its three section comments.
   *
   * @see HighDegreeNodeLayeringProcessor.java:86
   */
  private processLayer(lay: Layer, layerIt: ListIterator<Layer>): void {
    // -----------------------------------------------------------------------
    //  #1 find high degree nodes and find their incoming and outgoing trees
    // -----------------------------------------------------------------------
    const highDegreeNodes: Pair<LNode, HighDegreeNodeInformation>[] = [];
    let incMax = -1;
    let outMax = -1;
    for (const n of lay.getNodes()) {
      if (this.isHighDegreeNode(n)) {
        const hdni = this.calculateInformation(n);
        incMax = Math.max(incMax, hdni.incTreesMaxHeight);
        outMax = Math.max(outMax, hdni.outTreesMaxHeight);
        highDegreeNodes.push(Pair.of(n, hdni));
      }
    }

    this.moveIncomingTrees(highDegreeNodes, incMax, layerIt);
    this.moveOutgoingTrees(highDegreeNodes, outMax, layerIt);
  }

  /**
   * Section `#2 insert layers before the current layer and move the trees`.
   *
   * @see HighDegreeNodeLayeringProcessor.java:101
   */
  private moveIncomingTrees(
    highDegreeNodes: readonly Pair<LNode, HighDegreeNodeInformation>[],
    incMax: number,
    layerIt: ListIterator<Layer>,
  ): void {
    const preLayers: Layer[] = [];
    for (let i = 0; i < incMax; ++i) {
      preLayers.unshift(this.prependLayer(layerIt));
    }
    for (const highDegreeNode of highDegreeNodes) {
      const incRoots = highDegreeNode.getSecond()!.incTreeRoots;

      if (incRoots === null) {
        continue;
      }

      for (const incRoot of incRoots) {
        this.moveTree(incRoot, HighDegreeNodeLayeringProcessor.INCOMING_EDGES, preLayers);
      }
    }
  }

  /**
   * Section `#2 insert layers after the current layer and move the trees`.
   *
   * @see HighDegreeNodeLayeringProcessor.java:120
   */
  private moveOutgoingTrees(
    highDegreeNodes: readonly Pair<LNode, HighDegreeNodeInformation>[],
    outMax: number,
    layerIt: ListIterator<Layer>,
  ): void {
    const afterLayers: Layer[] = [];
    for (let i = 0; i < outMax; ++i) {
      afterLayers.push(this.appendLayer(layerIt));
    }
    for (const highDegreeNode of highDegreeNodes) {
      const outRoots = highDegreeNode.getSecond()!.outTreeRoots;

      if (outRoots === null) {
        continue;
      }

      for (const outRoot of outRoots) {
        this.moveTree(outRoot, HighDegreeNodeLayeringProcessor.OUTGOING_EDGES, afterLayers);
      }
    }
  }

  /** @see HighDegreeNodeLayeringProcessor.java:154 */
  private isHighDegreeNode(node: LNode): boolean {
    return HighDegreeNodeLayeringProcessor.degree(node) >= this.degreeThreshold;
  }

  /**
   * @returns the calculated trees for the passed node. That is a list of incoming trees and a list of outgoing trees
   *   and the maximum height of both of them.
   * @see HighDegreeNodeLayeringProcessor.java:162
   */
  private calculateInformation(hdn: LNode): HighDegreeNodeInformation {
    const hdni = new HighDegreeNodeInformation();
    this.calculateIncomingTrees(hdn, hdni);
    this.calculateOutgoingTrees(hdn, hdni);
    return hdni;
  }

  /** The loop `check for incoming trees` of `calculateInformation`. @see HighDegreeNodeLayeringProcessor.java:166 */
  private calculateIncomingTrees(hdn: LNode, hdni: HighDegreeNodeInformation): void {
    for (const incEdge of hdn.getIncomingEdges()) {
      if (incEdge.isSelfLoop()) {
        continue;
      }

      const src = incEdge.getSource()!.getNode()!;
      if (this.hasSingleConnection(src, HighDegreeNodeLayeringProcessor.OUTGOING_EDGES)) {
        const treeHeight = this.isTreeRoot(
          src,
          HighDegreeNodeLayeringProcessor.OUTGOING_EDGES,
          HighDegreeNodeLayeringProcessor.INCOMING_EDGES,
        );
        if (treeHeight === NOT_A_TREE) {
          continue;
        }

        // update the maximum tree height
        hdni.incTreesMaxHeight = Math.max(hdni.incTreesMaxHeight, treeHeight);

        // remember the tree root for later processing
        if (hdni.incTreeRoots === null) {
          hdni.incTreeRoots = [];
        }
        hdni.incTreeRoots.push(src);
      }
    }
  }

  /** The loop `outgoing trees` of `calculateInformation`. @see HighDegreeNodeLayeringProcessor.java:194 */
  private calculateOutgoingTrees(hdn: LNode, hdni: HighDegreeNodeInformation): void {
    for (const outEdge of hdn.getOutgoingEdges()) {
      if (outEdge.isSelfLoop()) {
        continue;
      }

      const tgt = outEdge.getTarget()!.getNode()!;
      if (this.hasSingleConnection(tgt, HighDegreeNodeLayeringProcessor.INCOMING_EDGES)) {
        const treeHeight = this.isTreeRoot(
          tgt,
          HighDegreeNodeLayeringProcessor.INCOMING_EDGES,
          HighDegreeNodeLayeringProcessor.OUTGOING_EDGES,
        );

        if (treeHeight === NOT_A_TREE) {
          continue;
        }
        hdni.outTreesMaxHeight = Math.max(hdni.outTreesMaxHeight, treeHeight);

        if (hdni.outTreeRoots === null) {
          hdni.outTreeRoots = [];
        }
        hdni.outTreeRoots.push(tgt);
      }
    }
  }

  /**
   * @returns The newly added layer. The iterator itself is left where it was before.
   * @see HighDegreeNodeLayeringProcessor.java:225
   */
  private prependLayer(layerIt: ListIterator<Layer>): Layer {
    layerIt.previous();

    const l = new Layer(this.layeredGraph);
    layerIt.add(l);
    layerIt.next();

    return l;
  }

  /**
   * @returns The newly added layer. The iterator is left where it was before.
   * @see HighDegreeNodeLayeringProcessor.java:239
   */
  private appendLayer(layerIt: ListIterator<Layer>): Layer {
    const l = new Layer(this.layeredGraph);
    layerIt.add(l);

    return l;
  }

  /**
   * Moves the tree defined by `root` and `edgesFun` to the `layers`. The layers should be ordered according to
   * edgesFun. In other words, if the tree expands to the left and the tree's root should be inserted into l_i, the list
   * of layers should be [l_i, l_i-1, l_i-2, ...].
   *
   * B8: the Java recursion passes `layers.subList(1, size)` down, so a node at recursion depth `d` goes to
   * `layers[d]`; the explicit stack carries that depth. Java's `subList(...).get(0)` on an exhausted list throws.
   *
   * @see HighDegreeNodeLayeringProcessor.java:252
   */
  private moveTree(root: LNode, edgesFun: EdgeSelector, layers: readonly Layer[]): void {
    const stack: { node: LNode; depth: number }[] = [{ node: root, depth: 0 }];
    while (stack.length > 0) {
      const { node, depth } = stack.pop()!;
      if (depth >= layers.length) {
        throw new IndexOutOfBoundsException(`Index 0 out of bounds for length 0`);
      }
      node.setLayer(layers[depth]!);

      // Java visits the edges in order, recursing before it takes the next one; pushing them reversed pops them in
      // that order, and every subtree is finished before its right sibling starts.
      const children = [...edgesFun(node)].map((e) => this.other(e, node));
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i]!, depth: depth + 1 });
      }
    }
  }

  /** @see HighDegreeNodeLayeringProcessor.java:268 (an overload chain, not a recursion; see the class comment) */
  private static degree(node: LNode): number;
  /** @see HighDegreeNodeLayeringProcessor.java:272 */
  private static degree(node: LNode, edgeSelector: EdgeSelector): number;
  private static degree(node: LNode, ...rest: [] | [EdgeSelector]): number {
    const edgeSelector: EdgeSelector = rest.length === 0 ? (n) => n.getConnectedEdges() : rest[0];
    return Iterables.size(edgeSelector(node));
  }

  /**
   * @param edgeSelector the edges to check
   * @returns whether the passed edges connect node to a single other node, other than checking for degree(node) == 1,
   *   this allows for multiple edges between the two involved nodes.
   * @see HighDegreeNodeLayeringProcessor.java:282
   */
  private hasSingleConnection(node: LNode, edgeSelector: EdgeSelector): boolean {
    let connection: LNode | null = null;

    for (const e of edgeSelector(node)) {
      if (connection === null) {
        connection = this.other(e, node);
      } else if (this.other(e, node) !== connection) {
        return false;
      }
    }

    return true;
  }

  /**
   * @returns for an edge (u, v) returns u if node == v and v if node == u.
   * @see HighDegreeNodeLayeringProcessor.java:303
   */
  private other(edge: LEdge, node: LNode): LNode {
    if (edge.getSource()!.getNode() === node) {
      return edge.getTarget()!.getNode()!;
    }
    return edge.getSource()!.getNode()!;
  }

  /**
   * Checks whether `root` is the root node of a subtree with height at most `treeHeightThreshold`. This is the case
   * if: (1) root is connected to at most one node, i.e. it can be detached from a larger graph by removing exactly one
   * edge, (2) root is either a leaf, or all of the connected nodes are subtrees again.
   *
   * Note that the directions of `ancestorEdges` and `descendantEdges` are not related to the actual directions in the
   * layered graph. They refer to the conceptual direction when imagining a graph with its ancestors and descendants.
   *
   * B8: an explicit stack of `TreeRootFrame`s replaces the Java recursion; `returned` holds the value the most recent
   * call returned to its caller.
   *
   * @returns either the height of the subtree of which `root` is the root, or -1 if it's not part of a tree.
   * @see HighDegreeNodeLayeringProcessor.java:330
   */
  private isTreeRoot(root: LNode, ancestorEdges: EdgeSelector, descendantEdges: EdgeSelector): number {
    const stack: TreeRootFrame[] = [];
    let returned = this.enterTreeRoot(root, ancestorEdges, descendantEdges, stack);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (returned !== null) {
        const finished = this.foldTreeRootHeight(frame, returned);
        if (finished !== null) {
          stack.pop();
          returned = finished;
          continue;
        }
      }
      const next = frame.edges.next();
      if (next.done === true) {
        stack.pop();
        returned = frame.currentHeight + 1;
      } else {
        returned = this.enterTreeRoot(this.other(next.value, frame.root), ancestorEdges, descendantEdges, stack);
      }
    }
    return returned!;
  }

  /**
   * The part of Java's `isTreeRoot` before its loop: the early returns, or a new frame pushed on `stack` (then `null`).
   *
   * @see HighDegreeNodeLayeringProcessor.java:336
   */
  private enterTreeRoot(
    root: LNode,
    ancestorEdges: EdgeSelector,
    descendantEdges: EdgeSelector,
    stack: TreeRootFrame[],
  ): number | null {
    // exclude the high degree nodes themselves from the 'tree moving' process,
    //  i.e. leave them where they are
    if (this.isHighDegreeNode(root)) {
      return NOT_A_TREE;
    }

    // is it a proper (sub-)root, i.e. does the node have exactly
    // one parent?
    if (!this.hasSingleConnection(root, ancestorEdges)) {
      return NOT_A_TREE;
    }

    // is it a leaf?
    if (Iterables.isEmpty(descendantEdges(root))) {
      return 1;
    }

    // recursively check subtrees
    stack.push({ root, edges: descendantEdges(root)[Symbol.iterator](), currentHeight: 0 });
    return null;
  }

  /**
   * The part of Java's `isTreeRoot` loop after the recursive call: folds the callee's `height` into the frame.
   *
   * @returns the value the frame returns when the loop ends here, `null` to go on with the next edge
   * @see HighDegreeNodeLayeringProcessor.java:358
   */
  private foldTreeRootHeight(frame: TreeRootFrame, height: number): number | null {
    // other is not the root of a subtree
    if (height === NOT_A_TREE) {
      return NOT_A_TREE;
    }

    frame.currentHeight = Math.max(frame.currentHeight, height);

    // if we hit the threshold ... stop
    if (frame.currentHeight > Int32.sub(this.treeHeightThreshold, 1)) {
      return NOT_A_TREE;
    }
    return null;
  }
}
