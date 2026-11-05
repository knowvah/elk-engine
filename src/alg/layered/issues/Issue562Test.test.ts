// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue562Test: a node with two ports and an inside self loop lays out without an
 * `UnsupportedConfigurationException`. Configuration is applied through a `LayoutConfigurator` and the
 * `LayoutAlgorithmResolver`, as the `DiagramLayoutEngine` does.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue562Test.java
 */
import { describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { LayoutConfigurator } from '../../../core/LayoutConfigurator.js';
import { LayoutAlgorithmResolver } from '../../../core/data/LayoutAlgorithmResolver.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../../core/RecursiveGraphLayoutEngine.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';

describe('Issue562Test', () => {
  it('test', () => {
    registerLayered();

    // Create the basic graph structure
    const graph = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(graph);
    const p1 = ElkGraphUtil.createPort(n1);
    const p2 = ElkGraphUtil.createPort(n1);
    const e = ElkGraphUtil.createSimpleEdge(p1, p2);

    // Create a layout configurator to apply options, just as it would happen in the DiagramLayoutEngine
    const config = new LayoutConfigurator();

    config.configure(n1).setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, true);
    config.configure(e).setProperty(CoreOptions.INSIDE_SELF_LOOPS_YO, true);

    // Apply the configurator and a layout algorithm resolver, just like the DiagramLayoutEngine does
    ElkUtil.applyVisitors(graph, config, new LayoutAlgorithmResolver());

    // Apply layout. We don't want an UnsupportedConfigurationException to be thrown
    try {
      new RecursiveGraphLayoutEngine().layout(graph, new NullElkProgressMonitor());
    } catch (ex) {
      if (ex instanceof UnsupportedConfigurationException) {
        expect.fail(ex.toString());
      }
      throw ex;
    }
  });
});
