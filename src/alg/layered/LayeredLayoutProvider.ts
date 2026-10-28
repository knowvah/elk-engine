// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { HierarchyHandling } from '../../core/options/HierarchyHandling.js';
import type { IWhiteBoxTestable } from '../../core/testing/IWhiteBoxTestable.js';
import type { TestController } from '../../core/testing/TestController.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { ElkLayered } from './ElkLayered.js';
import type { ElkLayeredTestExecutionState } from './ElkLayeredTestExecutionState.js';
import { ElkGraphTransformer } from './graph/transform/ElkGraphTransformer.js';
import { LayeredOptions } from './options/LayeredOptions.js';

/**
 * Layout provider to connect the layered layouter to the Eclipse based layout services.
 *
 * @see ElkLayered
 *
 * @author msp
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/LayeredLayoutProvider.java
 */
export class LayeredLayoutProvider extends AbstractLayoutProvider implements IWhiteBoxTestable {
  ///////////////////////////////////////////////////////////////////////////////
  // Variables

  /** the layout algorithm used for regular layout runs. */
  private readonly elkLayered: ElkLayered = new ElkLayered();

  ///////////////////////////////////////////////////////////////////////////////
  // Regular Layout

  layout(elkgraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // Import the graph (the Java declares the transformer as IGraphTransformer<ElkNode>, whose importGraph may return
    // null; the concrete ElkGraphTransformer always returns an LGraph, so its type is used here)
    const graphTransformer = new ElkGraphTransformer();
    const layeredGraph = graphTransformer.importGraph(elkgraph);

    // Check if hierarchy handling for a compound graph is requested
    if (elkgraph.getProperty(LayeredOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN) {
      // Layout for all hierarchy levels is requested
      this.elkLayered.doCompoundLayout(layeredGraph, progressMonitor);
    } else {
      // Only the top-level graph is processed
      this.elkLayered.doLayout(layeredGraph, progressMonitor);
    }

    if (!progressMonitor.isCanceled()) {
      // Apply the layout results to the original graph
      graphTransformer.applyLayout(layeredGraph);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Layout Testing

  /**
   * Import the given KGraph and return a test execution state prepared for a test run with the
   * resulting {@link LGraph}. The layout test run methods can immediately be called on the
   * returned object.
   *
   * Note: This method does not apply the layout back to the original KGraph!
   *
   * @param elkgraph the KGraph to be used for the layout test run.
   * @return an initialized test execution state
   */
  startLayoutTest(elkgraph: ElkNode): ElkLayeredTestExecutionState {
    // Import the graph (layeredGraph won't be null since the KGraphImporter always returns an
    // LGraph instance, even though the IGraphImporter interface would allow null as a return
    // value)
    const graphImporter = new ElkGraphTransformer();
    const layeredGraph = graphImporter.importGraph(elkgraph);

    // Prepare a layout test and return the test execution state
    return this.elkLayered.prepareLayoutTest(layeredGraph);
  }

  /**
   * Return the layered layout algorithm.
   *
   * @return the layout algorithm
   */
  getLayoutAlgorithm(): ElkLayered {
    return this.elkLayered;
  }

  setTestController(controller: TestController): void {
    this.elkLayered.setTestController(controller);
  }
}
