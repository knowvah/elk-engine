// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { RadialOptions } from '../options/RadialOptions.js';
import type { RadialLayoutPhases } from '../RadialLayoutPhases.js';
import { RadialUtil } from '../RadialUtil.js';
import type { IRadialSorter } from '../sorting/IRadialSorter.js';
import type { IAnnulusWedgeCriteria } from './wedge/IAnnulusWedgeCriteria.js';
import type { IEvaluation } from '../intermediate/optimization/IEvaluation.js';

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
   */
  private positionNodes(
    node: ElkNode,
    currentRadius: number,
    minAlpha: number,
    maxAlpha: number,
    optimalOffset: number,
  ): void {
    const radOffest = optimalOffset;

    const alphaPoint = (minAlpha + maxAlpha) / 2 + radOffest;

    // x=r*sinθ, y=r*cosθ
    const xPos = currentRadius * Math.cos(alphaPoint);
    const yPos = currentRadius * Math.sin(alphaPoint);

    // shift the nodes, such that the center of each node is on the circle
    RadialUtil.centerNodesOnRadi(node, xPos, yPos);

    const numberOfLeafs = this.annulusWedgeCriteria.calculateWedgeSpace(node);
    const [s, alpha0] = this.wedgeStart(currentRadius, minAlpha, maxAlpha, numberOfLeafs);
    let alpha = alpha0;
    const successors = RadialUtil.getSuccessors(node);
    if (this.sorter !== null) {
      this.sorter.initialize(this.root);
      this.sorter.sort(successors);
    }
    for (const child of successors) {
      const numberOfChildLeafs = this.annulusWedgeCriteria.calculateWedgeSpace(child);
      this.positionNodes(child, currentRadius + this.radius, alpha, alpha + s * numberOfChildLeafs, optimalOffset);
      alpha += s * numberOfChildLeafs;
    }
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
