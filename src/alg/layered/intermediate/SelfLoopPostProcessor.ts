// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { SelfLoopEdge } from './loops/SelfLoopEdge.js';

/**
 * Finds regular nodes with self loops and postprocesses those loops.
 *
 * Preconditions: a layered graph; self loops are routed; node coordinates are set. Postconditions: all self loops are
 * restored and routed. Slot: after phase 5. Same-slot dependencies: none.
 *
 * AD-10 (W6): `processNode` iterates `SelfHyperLoop.getSLEdges()` (`:62`), the insertion-ordered `Set` that holds the
 * Java `HashSet` (identity-hashed keys); `restoreEdge` of one edge does not read another's state.
 *
 * Deviations: the stream pipelines are loops (the nested loop of `SelfLoopPortRestorer.ts`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/SelfLoopPostProcessor.java
 */
export class SelfLoopPostProcessor implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Self-Loop post-processing', 1);

    for (const layer of graph.getLayers()) {
      for (const lNode of layer.getNodes()) {
        if (lNode.getType() === NodeType.NORMAL && lNode.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
          this.processNode(lNode);
        }
      }
    }

    progressMonitor.done();
  }

  private processNode(lNode: LNode): void {
    const slHolder = lNode.getProperty(InternalProperties.SELF_LOOP_HOLDER)!;

    for (const slLoop of slHolder.getSLHyperLoops()) {
      for (const slEdge of slLoop.getSLEdges()) {
        this.restoreEdge(lNode, slEdge);
      }
    }

    for (const slLoop of slHolder.getSLHyperLoops()) {
      const slLabels = slLoop.getSLLabels();
      if (slLabels !== null) {
        slLabels.applyPlacement(lNode.getPosition());
      }
    }
  }

  private restoreEdge(lNode: LNode, slEdge: SelfLoopEdge): void {
    const lEdge = slEdge.getLEdge();
    lEdge.setSource(slEdge.getSLSource().getLPort());
    lEdge.setTarget(slEdge.getSLTarget().getLPort());

    lEdge.getBendPoints().offset(lNode.getPosition());
  }
}
