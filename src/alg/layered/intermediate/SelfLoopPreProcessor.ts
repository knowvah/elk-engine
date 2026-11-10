// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { SelfLoopHolder } from './loops/SelfLoopHolder.js';

/**
 * Finds regular nodes with self loops and preprocesses those loops.
 *
 * Precondition: a layered graph. Postcondition: each node with self loops has a {@link SelfLoopHolder} created for it
 * and stored under the {@link InternalProperties.SELF_LOOP_HOLDER} property; all self loop edges are removed from their
 * ports to not confuse subsequent phases; unless port orders are fixed, all ports with only self loop edges connected
 * to them are removed from their nodes in order to not confuse subsequent phases. Slot: before phase 2. Same-slot
 * dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/SelfLoopPreProcessor.java
 */
export class SelfLoopPreProcessor implements ILayoutProcessor<LGraph> {
  /** @see SelfLoopPreProcessor.java:56 */
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Self-Loop pre-processing', 1);

    for (const lnode of graph.getLayerlessNodes()) {
      if (SelfLoopHolder.needsSelfLoopProcessing(lnode)) {
        const slHolder = SelfLoopHolder.install(lnode);
        this.hideSelfLoops(slHolder);
        this.hidePorts(slHolder);
      }
    }

    progressMonitor.done();
  }

  /**
   * Hides all self loop edges. These would confuse subsequent phases and are thus simply removed from the graph, to be
   * restored once edge routing has finished. The Java stream pipeline (`flatMap`, `map`, `forEach`) is a nested loop.
   *
   * @see SelfLoopPreProcessor.java:70
   */
  private hideSelfLoops(slHolder: SelfLoopHolder): void {
    for (const slLoop of slHolder.getSLHyperLoops()) {
      for (const slEdge of slLoop.getSLEdges()) {
        this.hideSelfLoop(slEdge.getLEdge());
      }
    }
  }

  /** Hides the given edge by removing it from its ports. */
  private hideSelfLoop(lEdge: LEdge): void {
    lEdge.setSource(null);
    lEdge.setTarget(null);
  }

  /**
   * Possibly hides all ports whose only incident edges are self loops. This is only done if port constraints are not at
   * least `PortConstraints.FIXED_ORDER`.
   *
   * @see SelfLoopPreProcessor.java:90
   */
  private hidePorts(slHolder: SelfLoopHolder): void {
    const lNode = slHolder.getLNode();
    const nestedGraph = lNode.getNestedGraph();

    /* There are two cases in which we want to refrain from hiding ports:
     * 1. The port order is already fixed. Then the code that would compute a proper port order won't be confused by
     *    the self-loop ports, so there's no need to hide them.
     * 2. The self loop holder has another graph inside of it which contains external ports. In that case, the
     *    crossing minimization will compute proper port orders. The self loop holder will have the port order
     *    applied and its port constraints set to FIXED_POS, so this is basically the first case with extra steps.
     */
    const orderFixed = lNode.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed();
    const hierarchyMode =
      nestedGraph !== null &&
      nestedGraph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS);

    if (orderFixed || hierarchyMode) {
      // No need to hide any ports
      return;
    }

    for (const slPort of slHolder.getSLPortMap().values()) {
      if (slPort.hadOnlySelfLoops()) {
        // Hide the port
        const lPort = slPort.getLPort();
        lPort.setNode(null);

        // Remember that we actually did so
        slPort.setHidden(true);
        slHolder.setPortsHidden(true);

        // Originally, we removed external port dummy this port belongs to, if any (#352). Now, we should never run into
        // this case. (Java `assert lPort.getProperty(InternalProperties.PORT_DUMMY) == null` omitted: assertions are
        // off.)
      }
    }
  }
}
