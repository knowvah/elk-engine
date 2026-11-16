// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../../graph/ElkConnectableShape.js';
import { type ElkNode, isElkNode } from '../../../graph/ElkNode.js';
import { checkCast } from '../../../java/lang/JavaCast.js';

const ELK_NODE = 'org.eclipse.elk.graph.ElkNode';

/**
 * The Java cast `(ElkNode) edge.getTargets().get(0)` of both recursive placements: a target that is a port throws a
 * `ClassCastException`, as the oracle's `ClassCastException` rows record.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */
export function castToElkNode(target: ElkConnectableShape): ElkNode {
  return checkCast(target, isElkNode, ELK_NODE)!;
}
