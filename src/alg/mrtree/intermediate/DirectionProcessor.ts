// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { TGraph } from '../graph/TGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';

/**
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/DirectionProcessor.java
 */
export class DirectionProcessor implements ILayoutProcessor<TGraph> {
  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Process directions', 1);
    const d = tGraph.getProperty(MrTreeOptions.DIRECTION);

    /**
     * Swap coordinates for Direction option. Because this modifies the coordinate values it has to be used between
     * Phase 3 and the NodePositionProcessor to work. Modifying those values is easier here because they are at the
     * center of where the nodes will be and we want to rotate the nodes around their centers
     */
    if (d !== Direction.DOWN) {
      for (const n of tGraph.getNodes()) {
        let x = n.getProperty(InternalProperties.XCOOR);
        let y = n.getProperty(InternalProperties.YCOOR);

        switch (d) {
          case Direction.UP:
            y = Int32.mul(y, -1);
            break;
          case Direction.RIGHT: {
            const tmp = x;
            x = y;
            y = tmp;
            break;
          }
          case Direction.LEFT: {
            const tmp2 = x;
            x = Int32.neg(y);
            y = tmp2;
            break;
          }
        }

        n.setProperty(InternalProperties.XCOOR, x);
        n.setProperty(InternalProperties.YCOOR, y);
      }
    }

    progressMonitor.done();
  }
}
