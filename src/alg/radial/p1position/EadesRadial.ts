// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { InternalProperties } from '../InternalProperties.js';
import { RadialOptions } from '../options/RadialOptions.js';
import type { RadialLayoutPhases } from '../RadialLayoutPhases.js';
import { RadialUtil } from '../RadialUtil.js';
import type { IRadialSorter } from '../sorting/IRadialSorter.js';
import type { IAnnulusWedgeCriteria } from './wedge/IAnnulusWedgeCriteria.js';
import type { IEvaluation } from '../intermediate/optimization/IEvaluation.js';

/**
 * One suspended activation of the Java `positionNodes`: its sorted successors, its radius, the angle per leaf, the running
 * start angle, the loop position and the current child's wedge space (needed for the `alpha` update after the child).
 */
interface PositionFrame {
  readonly successors: readonly ElkNode[];
  readonly currentRadius: number;
  readonly s: number;
  alpha: number;
  next: number;
  numberOfChildLeafs: number;
}

/**
 * Layout phase that positions the nodes on circles around the root, as described by Eades.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/EadesRadial.java
 */
export class EadesRadial implements ILayoutPhase<RadialLayoutPhases, ElkNode> {
  private static readonly CIRCLE_DEGREES = 360;
  private static readonly DEGREE_TO_RAD = Math.PI / 180;
  private radius = 0;
  private sorter: IRadialSorter | null = null;
  private annulusWedgeCriteria!: IAnnulusWedgeCriteria;
  private optimizer: IEvaluation | null = null;
  private root!: ElkNode;

  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Eades radial', 1);
    progressMonitor.logGraph(graph, 'After');
    this.root = graph.getProperty(InternalProperties.ROOT_NODE) as ElkNode;
    this.radius = graph.getProperty(RadialOptions.RADIUS);
    this.sorter = graph.getProperty(RadialOptions.SORTER).create();
    this.annulusWedgeCriteria = graph.getProperty(RadialOptions.WEDGE_CRITERIA).create();
    this.optimizer = graph.getProperty(RadialOptions.OPTIMIZATION_CRITERIA).create();
    this.translate(graph);
    progressMonitor.logGraph(graph, 'After');
  }

  /**
   * Search for the best layout translation by looking at each degree.
   *
   * @param graph The graph to lay out (unused, as in the Java).
   */
  private translate(_graph: ElkNode): void {
    let optimalOffset = 0;
    let optimalValue = Number.MAX_VALUE;

    if (this.optimizer !== null) {
      for (let i = 0; i < EadesRadial.CIRCLE_DEGREES; i++) {
        const offset = i * EadesRadial.DEGREE_TO_RAD;
        this.positionNodes(this.root, 0, 0, 2 * Math.PI, offset);
        const translatedValue = this.optimizer.evaluate(this.root);
        // Take the first occurence of the minimum
        if (translatedValue < optimalValue) {
          optimalOffset = offset;
          optimalValue = translatedValue;
        }
      }
    }
    this.positionNodes(this.root, 0, 0, 2 * Math.PI, optimalOffset);
  }

  /**
   * Place a node in the center of a wedge and calculate the wedge for the next child.
   *
   * The recursive call of `EadesRadial.java:126` (`positionNodes(child, currentRadius + radius, alpha, ...)`) runs on a frame
   * stack. AC6 (#67): explicit stack, same visit, side-effect and accumulation order: a child's activation starts right after
   * its `calculateWedgeSpace`, with the Java arguments, and its parent's `alpha += s * numberOfChildLeafs` runs after the
   * child's whole subtree, before the next child. The stack is depth-checked (`checkStackDepth`: Java's
   * `StackOverflowError` on a recursion without end).
   */
  private positionNodes(
    node: ElkNode,
    currentRadius: number,
    minAlpha: number,
    maxAlpha: number,
    optimalOffset: number,
  ): void {
    const stack: PositionFrame[] = [this.enterPositionNodes(node, currentRadius, minAlpha, maxAlpha, optimalOffset)];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.successors.length) {
        stack.push(this.enterChild(frame, optimalOffset));
        checkStackDepth(stack.length);
      } else {
        stack.pop();
        if (stack.length > 0) {
          const parent = stack[stack.length - 1]!;
          parent.alpha += parent.s * parent.numberOfChildLeafs;
        }
      }
    }
  }

  /**
   * One iteration of the Java loop of `positionNodes` (`EadesRadial.java:124-126`) up to the recursive call: the next child's
   * wedge space, kept for the `alpha` update after the child, and the child's activation with the Java arguments.
   */
  private enterChild(frame: PositionFrame, optimalOffset: number): PositionFrame {
    const child = frame.successors[frame.next++]!;
    frame.numberOfChildLeafs = this.annulusWedgeCriteria.calculateWedgeSpace(child);
    return this.enterPositionNodes(
      child,
      frame.currentRadius + this.radius,
      frame.alpha,
      frame.alpha + frame.s * frame.numberOfChildLeafs,
      optimalOffset,
    );
  }

  /**
   * The prologue of one Java activation of `positionNodes` (`EadesRadial.java:94-123`): places the node and returns its frame.
   * `RadialUtil.getSuccessors` returns a fresh list per call and the sorters sort it in place without keeping it, so holding
   * it in the frame is equivalent to the Java's for-each over it.
   */
  private enterPositionNodes(
    node: ElkNode,
    currentRadius: number,
    minAlpha: number,
    maxAlpha: number,
    optimalOffset: number,
  ): PositionFrame {
    const radOffest = optimalOffset;

    const alphaPoint = (minAlpha + maxAlpha) / 2 + radOffest;

    // x=r*sinθ, y=r*cosθ
    const xPos = currentRadius * Math.cos(alphaPoint);
    const yPos = currentRadius * Math.sin(alphaPoint);

    // shift the nodes, such that the center of each node is on the circle
    RadialUtil.centerNodesOnRadi(node, xPos, yPos);

    const numberOfLeafs = this.annulusWedgeCriteria.calculateWedgeSpace(node);
    const [s, alpha] = this.wedgeStart(currentRadius, minAlpha, maxAlpha, numberOfLeafs);
    const successors = RadialUtil.getSuccessors(node);
    if (this.sorter !== null) {
      this.sorter.initialize(this.root);
      this.sorter.sort(successors);
    }
    return { successors, currentRadius, s, alpha, next: 0, numberOfChildLeafs: 0 };
  }

  /**
   * The `tau` block of `positionNodes` (split off for the complexity limits): the angle per leaf `s` and the start angle `alpha`.
   */
  private wedgeStart(
    currentRadius: number,
    minAlpha: number,
    maxAlpha: number,
    numberOfLeafs: number,
  ): [number, number] {
    // upstream precedence quirk kept verbatim: currentRadius / currentRadius + radius (EadesRadial.java:108)
    const tau = 2 * Math.acos(currentRadius / currentRadius + this.radius);
    if (tau < maxAlpha - minAlpha) {
      return [tau / numberOfLeafs, (minAlpha + maxAlpha - tau) / 2];
    }
    return [(maxAlpha - minAlpha) / numberOfLeafs, minAlpha];
  }

  getLayoutProcessorConfiguration(_graph: ElkNode): LayoutProcessorConfiguration<RadialLayoutPhases, ElkNode> | null {
    return null;
  }
}
