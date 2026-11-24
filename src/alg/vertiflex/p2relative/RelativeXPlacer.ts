// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { EdgeRoutingStrategy } from '../EdgeRoutingStrategy.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { VertiFlexOptions } from '../options/VertiFlexOptions.js';
import {
  computeBentRootMove,
  setBendHeightsLeft,
  setBendHeightsRight,
  shiftChildrenAndSetBendHeights,
  updateBentOutlines,
} from './RelativeXPlacerBentSteps.js';
import { bundleChildren } from './RelativeXPlacerBundling.js';
import { makeSimpleOutlines } from './RelativeXPlacerOutlines.js';
import { sortSubTrees } from './RelativeXPlacerSorting.js';
import {
  computeRootMove,
  improveMoveRoot,
  updateMinMax,
  updateStraightOutlines,
} from './RelativeXPlacerStraightSteps.js';
import { castToElkNode } from './RelativeXPlacerChildren.js';

/** One suspended `recursiveStraightlinePlacement` activation with children (RelativeXPlacer.java:163-168). */
interface StraightFrame {
  readonly graph: ElkNode;
  i: number;
  readonly children: ElkNode[];
  pending: ElkNode | null;
}

/**
 * Node placer that positions nodes horizontally using coordinates that are relative to parent nodes.
 *
 * Split (file-size and function-size limits): the Java private methods `outlineDistance`, `makeSimpleOutlines`,
 * `bundleChildren`, `sortSubTrees`, `splitNodesWithModelOrder` and `splitGroup` live in the sibling modules
 * `RelativeXPlacer{Outlines,Bundling,Sorting}.ts`; blocks of the two recursive placements live in
 * `RelativeXPlacer{Straight,Bent}Steps.ts`. The straight placement runs on an explicit stack (AC6, #67); the bent
 * placement's recursion is kept verbatim (TR7).
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */
export class RelativeXPlacer implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  private spacingNodeNode: number = 0;
  private considerNodeModelOrder: boolean = false;

  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('XPlacer', 1);

    this.spacingNodeNode = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    this.considerNodeModelOrder = graph.getProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);

      switch (graph.getProperty(VertiFlexOptions.LAYOUT_STRATEGY)) {
        case EdgeRoutingStrategy.STRAIGHT:
          this.recursiveStraightlinePlacement(parent);
          break;
        case EdgeRoutingStrategy.BEND:
          this.recursiveBentlinePlacement(parent);
          break;
        default:
          break;
      }
    }

    progressMonitor.done();
  }

  /**
   * This is the recursive function that calculates the layout for one node and it's children. Children are placed such
   * that straight edges can later be drawn from their parent to each of them.
   *
   * If ConsiderModelOrder is set to false, all children are arranged in a semi-circle with the parent initially
   * positioned above the lowest child and then shifted toward the center of the children as far as possible.
   *
   * If ConsiderModelOrder is set to true, groups of children are arranged such that they maintain their inherent model
   * order. Furthermore, the reading direction is oriented left to right and top to bottom as far as possible without
   * violating the vertical position constraints and the straight edge routing requirement.
   *
   * The recursive call of RelativeXPlacer.java:166 is a frame push. AC6 (#67): explicit stack, same visit, side-effect
   * and accumulation order. A frame is one suspended Java activation with children: the node, the loop index `i`, the
   * `children` list and the child whose activation is running (`pending`). `makeSimpleOutlines` runs at activation
   * entry; when the child's activation returns it is added to `children` and `i` advances, as in the Java loop body; the
   * loop bound `getOutgoingEdges().size()` is re-read per step; the post-order block runs once `i` reaches it. The stack
   * is depth-checked after each push (`checkStackDepth` on its length, in `enterStraightlinePlacement`; a leaf's
   * activation pushes no frame and is not counted): Java's `StackOverflowError` on a recursion without end.
   *
   * @see RelativeXPlacer.java:156
   */
  private recursiveStraightlinePlacement(graph: ElkNode): void {
    const stack: StraightFrame[] = [];
    this.enterStraightlinePlacement(graph, stack);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.pending !== null) {
        frame.children.push(frame.pending);
        frame.pending = null;
        frame.i++;
      } else if (frame.i < frame.graph.getOutgoingEdges().size()) {
        const child = castToElkNode(frame.graph.getOutgoingEdges().get(frame.i).getTargets().get(0)!);
        frame.pending = child;
        this.enterStraightlinePlacement(child, stack);
      } else {
        stack.pop();
        this.placeStraightlineChildren(frame.graph, frame.children);
      }
    }
  }

  /**
   * Entry of one `recursiveStraightlinePlacement` activation (RelativeXPlacer.java:158-163): the node's simple outlines,
   * then a frame for the child loop if the node has children (a leaf's activation ends here); the push is depth-checked
   * (`checkStackDepth`: Java's `StackOverflowError` on a recursion without end).
   */
  private enterStraightlinePlacement(graph: ElkNode, stack: StraightFrame[]): void {
    makeSimpleOutlines(graph, this.spacingNodeNode);

    if (!graph.getOutgoingEdges().isEmpty()) {
      // get all children
      stack.push({ graph, i: 0, children: [], pending: null });
      checkStackDepth(stack.length);
    }
  }

  /**
   * The post-order block of one `recursiveStraightlinePlacement` activation (RelativeXPlacer.java:169-290), run once all
   * of the node's children are placed.
   */
  private placeStraightlineChildren(graph: ElkNode, children: ElkNode[]): void {
    // now the children of this node get sorted to form a semi-circle. This allows routing straight edges
    // without overlaps while keeping the layout relatively compact.
    sortSubTrees(children, this.considerNodeModelOrder);

    // now the children get stuffed together, using the outlines.
    for (let i = 0; i < children.length - 1; i++) {
      bundleChildren(children[0]!, children[i]!, children[i + 1]!);
    }

    // now we need to move the root to the middle of the nodes.
    const rootMove = computeRootMove(graph, children);
    let moveRoot = rootMove.moveRoot;

    if (!graph.getProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER)) {
      moveRoot = improveMoveRoot(graph, children, rootMove);
    }

    for (const child of children) {
      child.setX(child.getX() - moveRoot);
    }

    updateStraightOutlines(graph, children);

    // update outlineMaxY
    // update min und max for x and y
    updateMinMax(graph, children);
  }

  /**
   * Place nodes while maintaining model order and computing bendpoints for the later edges. The model order is fully
   * kept intact and bendpoints for the edges are computed so that overlap free edge routing is still possible.
   *
   * @see RelativeXPlacer.java:295
   */
  private recursiveBentlinePlacement(graph: ElkNode): void {
    // set up initial outlines for all nodes
    makeSimpleOutlines(graph, this.spacingNodeNode);

    // termination condition for the recursion, while a node has children continue
    if (!graph.getOutgoingEdges().isEmpty()) {
      // get all children
      const children: ElkNode[] = [];
      for (let i = 0; i < graph.getOutgoingEdges().size(); i++) {
        const child = castToElkNode(graph.getOutgoingEdges().get(i).getTargets().get(0)!);
        this.recursiveBentlinePlacement(child);
        children.push(child);
      }

      const childrenSize = children.length;

      // now the children get stuffed together, using the outlines.
      for (let i = 0; i < children.length - 1; i++) {
        bundleChildren(children[0]!, children[i]!, children[i + 1]!);
      }

      const moveRoot = computeBentRootMove(graph, children);
      shiftChildrenAndSetBendHeights(children, moveRoot);

      // set bendHeights for children right of the parent, then left of the parent
      const globalBendHeight = setBendHeightsRight(graph, children, childrenSize);
      setBendHeightsLeft(graph, children, childrenSize, globalBendHeight);

      updateBentOutlines(graph, children, childrenSize);

      // update outlineMaxY
      // update min und max for x and y
      updateMinMax(graph, children);
    }
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }
}
