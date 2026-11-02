// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * As opposed to the fully interactive `InteractiveCrossingMinimizer`, this processor inserts ordering constraints
 * between pairs of regular nodes (`NodeType.NORMAL`) of the same layer. Apart from this it relies on a crossing
 * minimizer that supports such kind of ordering constraints, e.g. our `LayerSweepCrossingMinimizer`. The processor must
 * be run after the layering phase.
 *
 * As opposed to the interactive crossing minimizer this processor relies on the `LayeredOptions.POSITION` property's
 * y-coordinates to derive the desired order. A user may only want to specify the relative order of certain pairs of
 * nodes. This is supported by only enforcing an order between nodes with the `LayeredOptions.POSITION` option set.
 *
 * Note that the `GreedySwitchHeuristic` is not compatible with this processor and may break the user-defined order.
 *
 * Precondition: a layered graph. Postcondition: inserted in-layer constraints to preserve regular nodes' order. Slots:
 * before phase 3. Same-slot dependencies: any layer-altering processor, such as `NodePromotion`, must be executed prior
 * to this processor.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/SemiInteractiveCrossMinProcessor.java
 */
export class SemiInteractiveCrossMinProcessor implements ILayoutProcessor<LGraph> {
  /** @see SemiInteractiveCrossMinProcessor.java:55 */
  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Semi-Interactive Crossing Minimization Processor', 1);

    let addedConstraints = false;

    for (const l of layeredGraph) {
      // #1 extract relevant nodes
      // #2 sort them with ascending y coordinate (Java: a stable `Stream.sorted`; `Array.prototype.sort` is stable)
      // #3 introduce pair-wise in-layer constraints (Java: `reduce`, present iff the stream is not empty)
      const sorted: LNode[] = l
        .getNodes()
        .filter((n) => n.getType() === NodeType.NORMAL)
        .filter((n) => n.getAllProperties().containsKey(LayeredOptions.POSITION))
        .sort((n1, n2) => {
          const origPos1 = n1.getProperty(LayeredOptions.POSITION);
          const origPos2 = n2.getProperty(LayeredOptions.POSITION);
          return doubleCompare(origPos1.y, origPos2.y);
        });
      let reduced: LNode | null = null;
      for (const cur of sorted) {
        if (reduced !== null) {
          reduced.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS).push(cur);
        }
        reduced = cur;
      }
      addedConstraints = reduced !== null || addedConstraints;
    }

    // If we added in-layer successor constraints, make subsequent phases aware
    if (addedConstraints) {
      layeredGraph.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES, true);
    }

    progressMonitor.done();
  }
}
