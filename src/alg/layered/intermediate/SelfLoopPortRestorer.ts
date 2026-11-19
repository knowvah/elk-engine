// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { devAssert } from '../../../java/lang/DevAssert.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { SelfLoopHolder } from './loops/SelfLoopHolder.js';
import { PortRestorer } from './loops/ordering/PortRestorer.js';
import { PortSideAssigner } from './loops/ordering/PortSideAssigner.js';

/**
 * Restores self loop ports and computes self loop types. Does not restore the self loops themselves.
 *
 * Preconditions: a layered graph whose self-loop nodes have been preprocessed by `SelfLoopPreProcessor`. Postconditions:
 * all ports previously removed are restored. Slot: before phase 4. Same-slot dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/SelfLoopPortRestorer.java
 */
export class SelfLoopPortRestorer implements ILayoutProcessor<LGraph> {
  /** This thing will assign hidden ports to port sides if port constraints were initially free. */
  private readonly portSideAssigner = new PortSideAssigner();
  /** Port restorer we'll use for fixed side port constraints. */
  private readonly portRestorer = new PortRestorer();

  /** @see SelfLoopPortRestorer.java:48 */
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Self-Loop ordering', 1);

    // Process every node that actually has self loops (the Java stream `flatMap`/`filter`/`map`/`forEach` is a nested
    // loop; `getProperty` of a present property is never null here, as `hasProperty` was just checked)
    for (const layer of graph.getLayers()) {
      for (const lNode of layer.getNodes()) {
        if (lNode.getType() === NodeType.NORMAL && lNode.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
          this.processNode(lNode.getProperty(InternalProperties.SELF_LOOP_HOLDER)!, progressMonitor);
        }
      }
    }

    progressMonitor.done();
  }

  /** @see SelfLoopPortRestorer.java:62 */
  private processNode(slHolder: SelfLoopHolder, monitor: IElkProgressMonitor): void {
    // Restore and order pure self loop ports if they were previously hidden
    if (slHolder.arePortsHidden()) {
      const constraints = slHolder.getLNode().getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS);
      // The Java `switch` falls through from UNDEFINED/FREE into FIXED_SIDE; its `default` arm is the final `else`.
      if (
        constraints === PortConstraints.UNDEFINED ||
        constraints === PortConstraints.FREE ||
        constraints === PortConstraints.FIXED_SIDE
      ) {
        if (constraints !== PortConstraints.FIXED_SIDE) {
          // We need to assign port sides first and then fall through to restore ports
          this.portSideAssigner.assignPortSides(slHolder);
        }

        // Restore ports (which by now have port sides assigned to them). After this call, arePortsHidden() will
        // report false
        this.computeSelfLoopTypes(slHolder);
        this.portRestorer.restorePorts(slHolder, monitor);
      } else {
        // This should not happen. If ports were hidden this must have been because their order was not fixed
        devAssert(() => false);
      }
    } else {
      // Ensure that self loops types are computed
      this.computeSelfLoopTypes(slHolder);
    }
  }

  /** @see SelfLoopPortRestorer.java:89 */
  private computeSelfLoopTypes(slHolder: SelfLoopHolder): void {
    for (const slLoop of slHolder.getSLHyperLoops()) {
      slLoop.computePortsPerSide();
    }
  }
}
