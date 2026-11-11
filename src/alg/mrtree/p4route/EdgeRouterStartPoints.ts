// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../core/options/Direction.js';
import { compare as compareDoubles } from '../../../java/lang/DoubleCompare.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { TreeUtil } from '../TreeUtil.js';
import { labelEquals, ONE_HALF, SUPER_ROOT_LABEL } from './EdgeRouterShared.js';

/** The label of the debugging probe at `EdgeRouter.java:411` (its body is a no-op `getClass()`). */
const DEBUG_PROBE_LABEL = 'n11';

/**
 * Handles the start points for AvoidOverlap edge routing.
 *
 * @param tGraph the graph to work on
 * @param d the current layout direction
 * @param nodeBendpointPadding the Node BendPoint Padding
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:389
 */
export function avoidOverlapSetStartPoints(tGraph: TGraph, d: Direction, nodeBendpointPadding: number): void {
  for (const n of tGraph.getNodes()) {
    if (labelEquals(n, SUPER_ROOT_LABEL)) {
      continue;
    }

    // Get a list of all outgoing edges from n
    // I specifically do not use n.getOutgoingEdges() here because that list does not contain all outgoing
    // edges in certain scenarios. For example if a node has two parents who are also both root nodes
    const outs = TreeUtil.getAllOutgoingEdges(n, tGraph);
    if (d.isHorizontal()) {
      outs.sort((x, y) => compareDoubles(TreeUtil.getFirstPoint(x).y, TreeUtil.getFirstPoint(y).y));
    } else {
      outs.sort((x, y) => compareDoubles(TreeUtil.getFirstPoint(x).x, TreeUtil.getFirstPoint(y).x));
    }

    // Set the bendPoints for all outs
    const num = outs.length;
    for (let i = 0; i < num; i++) {
      const out = outs[i]!;
      // The Java compares the label with "n11" and calls getClass() (a debugging leftover): only the dereference of
      // the label (a null label throws) is observable.
      labelEquals(out.getTarget()!, DEBUG_PROBE_LABEL);
      if (n.getProperty(InternalProperties.COMPACT_LEVEL_ASCENSION) && !TreeUtil.isCycleInducing(out, tGraph)) {
        continue;
      }

      const interpolation = num === 1 ? ONE_HALF : (i + 1) / (num + 1);
      setStartPoint(d, n, out, interpolation, nodeBendpointPadding);
    }
  }
}

/**
 * The direction chain of the inner loop: prepends the two start bend points of `out`.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:420
 */
function setStartPoint(d: Direction, n: TNode, out: TEdge, interpolation: number, pad: number): void {
  if (d === Direction.LEFT) {
    const levelEndCoord = n.getProperty(InternalProperties.LEVELMIN);
    const y = n.getPosition().y + n.getSize().y * interpolation;
    out.getBendPoints().addFirst(Math.min(levelEndCoord, n.getPosition().x - pad), y);
    out.getBendPoints().addFirst(n.getPosition().x, y);
  } else if (d === Direction.RIGHT) {
    const levelEndCoord = n.getProperty(InternalProperties.LEVELMAX) + pad;
    const y = n.getPosition().y + n.getSize().y * interpolation;
    out.getBendPoints().addFirst(levelEndCoord, y);
    out.getBendPoints().addFirst(n.getPosition().x + n.getSize().x, y);
  } else if (d === Direction.UP) {
    const levelEndCoord = n.getProperty(InternalProperties.LEVELMIN);
    const x = n.getPosition().x + n.getSize().x * interpolation;
    out.getBendPoints().addFirst(x, Math.min(n.getPosition().y - pad, levelEndCoord));
    out.getBendPoints().addFirst(x, n.getPosition().y);
  } else {
    const levelEndCoord = n.getProperty(InternalProperties.LEVELMAX) + pad;
    const x = n.getPosition().x + n.getSize().x * interpolation;
    out.getBendPoints().addFirst(x, levelEndCoord);
    out.getBendPoints().addFirst(x, n.getPosition().y + n.getSize().y);
  }
}
