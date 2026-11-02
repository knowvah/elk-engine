// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';

/**
 * This class does nothing instead of minimizing crossing. Everything remains as it was before.
 *
 * - Precondition: The graph has a proper layering, i.e. all long edges have been splitted; all nodes have at least
 *   fixed port sides. This is, however, not checked but preceding processors or phases might depend on this.
 * - Postcondition: The order of nodes and ports remains as it was before this phase.
 * - Dependencies: It is advised to set `GreedySwitchType` to OFF. Otherwise, nodes and ports might be reordered if
 *   crossings are created.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/NoCrossingMinimizer.java
 */
export class NoCrossingMinimizer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   *
   * @see NoCrossingMinimizer.java:60
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (NoCrossingMinimizer.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LONG_EDGE_SPLITTER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.IN_LAYER_CONSTRAINT_PROCESSOR)
      .after(LayeredPhases.P5_EDGE_ROUTING)
      .add(IntermediateProcessorStrategy.LONG_EDGE_JOINER));
  }

  /** @see NoCrossingMinimizer.java:42 */
  process(_graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('No crossing minimization', 1);
    progressMonitor.done();
  }

  /** @see NoCrossingMinimizer.java:49 */
  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    const configuration = LayoutProcessorConfiguration.createFrom(
      NoCrossingMinimizer.INTERMEDIATE_PROCESSING_CONFIGURATION,
    );
    configuration.addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.PORT_LIST_SORTER);

    return configuration;
  }
}
