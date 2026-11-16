// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { TNode } from '../graph/TNode.js';
import type { TGraph } from '../graph/TGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * A processor connect all roots of a given graph to a super root which then is the new root of the graph.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/RootProcessor.java
 */
export class RootProcessor implements ILayoutProcessor<TGraph> {
  private roots: TNode[] = [];

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Find roots', 1);

    /** clear list of roots if processor is reused */
    this.roots.length = 0;

    /** find all roots in the graph */
    for (const node of tGraph.getNodes()) {
      if (node.getIncomingEdges().isEmpty()) {
        node.setProperty(InternalProperties.ROOT, true);
        this.roots.push(node);
      }
    }
    /** if there are more than one root add a super root and set the current roots as its children */
    switch (this.roots.length) {
      case 0:
        this.addDummyRoot(tGraph);
        break;

      case 1:
        // perfect, we already have only one root
        break;

      default:
        this.addSuperRoot(tGraph);
        break;
    }

    progressMonitor.done();
  }

  // Split out of `process` at its switch (the complexity gate: NLOC 30); the statements and their order are the Java's.

  /** Java `case 0:` of the switch in `process`. */
  private addDummyRoot(tGraph: TGraph): void {
    // Java: assert tGraph.getNodes().isEmpty(); (assertions are disabled: dev-only, no helper in this port)
    const root = new TNode(0, tGraph, 'DUMMY_ROOT');
    root.setProperty(InternalProperties.ROOT, true);
    root.setProperty(InternalProperties.DUMMY, true);
    tGraph.getNodes().add(root);
  }

  /** Java `default:` of the switch in `process`. */
  private addSuperRoot(tGraph: TGraph): void {
    const superRoot = new TNode(0, tGraph, 'SUPER_ROOT');

    for (const tRoot of this.roots) {
      superRoot.addChild(tRoot);
      tRoot.setProperty(InternalProperties.ROOT, false);
    }
    superRoot.setProperty(InternalProperties.ROOT, true);
    superRoot.setProperty(InternalProperties.DUMMY, true);
    tGraph.getNodes().add(superRoot);
  }
}
