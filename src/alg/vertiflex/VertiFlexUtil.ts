// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';

/**
 * Utility methods of the VertiFlex algorithm. The Java private constructor has no TypeScript counterpart (the
 * functions are module-level).
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/VertiFlexUtil.java
 */

/**
 * Computes the root node of a graph.
 *
 * @param graph the graph
 * @returns Root node of graph.
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/VertiFlexUtil.java
 */
export function findRoot(graph: ElkNode): ElkNode | null {
  for (const child of graph.getChildren()) {
    const incomingEdges = ElkGraphUtil.allIncomingEdges(child);
    if (incomingEdges[Symbol.iterator]().next().done === true) {
      return child;
    }
  }
  return null;
}
