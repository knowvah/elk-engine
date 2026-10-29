// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import { GroupModelOrderCalculator } from './GroupModelOrderCalculator.js';

/**
 * A cycle breaker that reverses all edges that go against the model order or group model order, i.e. edges from high
 * model order to low model order.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>no self loops</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>the graph has no cycles</dd>
 * </dl>
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/ModelOrderCycleBreaker.java
 */
export class ModelOrderCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (ModelOrderCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER));
  }

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return ModelOrderCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Model order cycle breaking', 1);

    // gather edges that point to the wrong direction
    const revEdges: LEdge[] = [];
    this.gatherBackwardEdges(layeredGraph, revEdges);

    // reverse the gathered edges
    for (const edge of revEdges) {
      edge.reverse(layeredGraph, true);
      layeredGraph.setProperty(InternalProperties.CYCLIC, true);
    }
    revEdges.length = 0;
    monitor.done();
  }

  /** `:65-91`: the edges that go from a high model order to a low one. */
  private gatherBackwardEdges(layeredGraph: LGraph, revEdges: LEdge[]): void {
    // One needs an offset to make sure that the model order of nodes with port constraints is
    // always lower/higher than that of other nodes.
    // E.g. A node with the LAST constraint needs to have a model order m = modelOrder + offset
    // such that m > m(n) with m(n) being the model order of a normal node n (without constraints).
    // Such that the highest model order has to be used as an offset
    const offset = Math.max(
      layeredGraph.getLayerlessNodes().length,
      layeredGraph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
    );
    const bigOffset = Int32.mul(offset, layeredGraph.getProperty(InternalProperties.CB_NUM_MODEL_ORDER_GROUPS));
    const enforceGroupModelOrder =
      layeredGraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
      GroupOrderStrategy.ENFORCED;
    for (const source of layeredGraph.getLayerlessNodes()) {
      const calculator = new GroupModelOrderCalculator();
      const modelOrderSource = enforceGroupModelOrder
        ? calculator.computeConstraintGroupModelOrder(source, bigOffset, offset)
        : calculator.computeConstraintModelOrder(source, offset);

      for (const port of source.getPorts(PortType.OUTPUT)) {
        for (const edge of port.getOutgoingEdges()) {
          const target = edge.getTarget()!.getNode()!;
          const modelOrderTarget = enforceGroupModelOrder
            ? calculator.computeConstraintGroupModelOrder(target, bigOffset, offset)
            : calculator.computeConstraintModelOrder(target, offset);
          if (modelOrderTarget < modelOrderSource) {
            revEdges.push(edge);
          }
        }
      }
    }
  }
}
