// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { LGraph } from '../LGraph.js';
import type { LGraphElement } from '../LGraphElement.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import { ElkGraphLayoutTransferrer } from './ElkGraphLayoutTransferrer.js';
import { getOriginIdentifier } from './ElkGraphTransformerUtility.js';
import type { IGraphTransformer } from './IGraphTransformer.js';

/**
 * Transforms an ElkGraph into an {@link LGraph} and applies the layout back to it. The import and the layout
 * application are implemented by {@link ElkGraphImporter} and {@link ElkGraphLayoutTransferrer}; the "Utility"
 * section of the Java class lives in `ElkGraphTransformerUtility` (decision X1) and is delegated to.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphTransformer.java
 */
export class ElkGraphTransformer implements IGraphTransformer<ElkNode> {
  importGraph(graph: ElkNode): LGraph {
    return new ElkGraphImporter().importGraph(graph);
  }

  applyLayout(layeredGraph: LGraph): void {
    new ElkGraphLayoutTransferrer().applyLayout(layeredGraph);
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Utility

  /**
   * Returns an identifier string for the original ElkGraph element.
   *
   * @param element an LGraph element
   * @return the original identifier, or `null` if none is defined
   */
  static getOriginIdentifier(element: LGraphElement): string | null {
    return getOriginIdentifier(element);
  }
}
