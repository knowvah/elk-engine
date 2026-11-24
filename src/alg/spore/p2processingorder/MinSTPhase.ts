// SPDX-License-Identifier: EPL-2.0
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Maps from '../../../guava/Maps.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { hashable } from '../../../java/util/HashStrategy.js';
import type { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { NaiveMinST } from '../../common/NaiveMinST.js';
import { Tree } from '../../common/Tree.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import type { Node } from '../../common/spore/Node.js';
import type { Graph } from '../graph/Graph.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/** Key protocol of the `KVector`-keyed `nodeMap`: `KVector.hashCode` and `KVector.equals` (as in `NaiveMinST`). */
const KVECTOR_STRATEGY = hashable<KVector>();

/** One suspended activation of {@link MinSTPhase.addNode}: the two trees and the next child of the vector tree. */
interface AddNodeFrame {
  readonly s: Tree<Node>;
  readonly t: Tree<KVector>;
  next: number;
}

/**
 * This phase finds a minimum spanning tree for the edges of the {@link Graph} with the
 * specified root {@link Graph.preferredRoot}.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MinSTPhase.java
 */
export class MinSTPhase implements ILayoutPhase<SPOrEPhases, Graph> {
  /** Value-hashed (`KVector`): a `JavaHashMap`. Entries with equal centres collapse as in the Java `HashMap`. */
  private readonly nodeMap: JavaHashMap<KVector, Node> = Maps.newHashMap<KVector, Node>(KVECTOR_STRATEGY);

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MinSTPhase.java:42 */
  getLayoutProcessorConfiguration(_graph: Graph): LayoutProcessorConfiguration<SPOrEPhases, Graph> {
    return LayoutProcessorConfiguration.create<SPOrEPhases, Graph>();
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MinSTPhase.java:47 */
  process(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Minimum spanning tree construction', 1);

    let root: KVector;
    if (graph.preferredRoot !== null) {
      root = graph.preferredRoot.originalVertex;
    } else {
      root = graph.vertices[0]!.originalVertex;
    }

    // `graph.tEdges` is set by the structure phase (the Java would throw a NullPointerException otherwise)
    const tEdges = graph.tEdges!;
    let tTree: Tree<KVector>;
    if (graph.getProperty(InternalProperties.DEBUG_SVG)) {
      tTree = NaiveMinST.createSpanningTree(
        tEdges,
        root,
        graph.costFunction,
        `${String(ElkUtil.debugFolderPath('spore'))}20minst`,
      );
    } else {
      tTree = NaiveMinST.createSpanningTree(tEdges, root, graph.costFunction);
    }

    // convert result to a Tree that can be used in the execution phase
    this.convert(tTree, graph);

    progressMonitor.done();
  }

  /**
   * Converts a {@link Tree} of {@link KVector}s to a {@link Tree} of {@link Node}s.
   * <p>Can be used in extending class.</p>
   *
   * @param tTree a tree of vectors
   * @param graph the {@link Graph} that contains the {@link Tree} of {@link Node}s
   * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MinSTPhase.java:77
   */
  protected convert(tTree: Tree<KVector>, graph: Graph): void {
    this.nodeMap.clear();
    graph.vertices.forEach((n) => this.nodeMap.put(n.originalVertex, n));
    const root = new Tree<Node>(this.nodeMap.get(tTree.node)!);
    this.addNode(root, tTree);
    graph.tree = root;
  }

  /**
   * Recursive function to find the node related to a vertex and add it to an existing tree.
   *
   * AC6 (#76): explicit stack, same visit and side-effect order. The Java recurses (`addNode(child, tTree)` at
   * MinSTPhase.java:94, inside the loop of :91-95); a frame is one suspended Java activation: the two trees and the
   * next child of `t`. When a frame advances to a child, the child's `Tree` is created and appended to `s.children`,
   * then the child's frame opens; children in list order. The tree of vectors is not modified while it is converted,
   * so iterating its `children` by index is safe. The stack is depth-checked after each push (`checkStackDepth` on
   * its length): Java's `StackOverflowError`. The verbatim recursive form is the reference of
   * `MinSTPhase.explicit-stack.test.ts`.
   *
   * @param s the tree of nodes
   * @param t the tree of vectors
   * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MinSTPhase.java:90
   */
  private addNode(s: Tree<Node>, t: Tree<KVector>): void {
    const stack: AddNodeFrame[] = [{ s, t, next: 0 }];
    checkStackDepth(stack.length);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.t.children.length) {
        const tTree = frame.t.children[frame.next++]!;
        const child = new Tree<Node>(this.nodeMap.get(tTree.node)!);
        frame.s.children.push(child);
        stack.push({ s: child, t: tTree, next: 0 });
        checkStackDepth(stack.length);
      } else {
        stack.pop();
      }
    }
  }
}
