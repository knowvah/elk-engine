// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import { LoggedGraphType } from '../../../../core/util/LoggedGraph.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import type { CGraph } from './CGraph.js';

const d = doubleToString;

/**
 * Section of {@link OneDimensionalCompactor}: the debugging output `drawHitboxes` (between the Java
 * markers `elkjs-exclude-start/end`). Sections never import the facade.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/OneDimensionalCompactor.java
 */

/** The viewBox corners of the Java `drawHitboxes`, split off for the complexity limits. */
function determineViewBox(cGraph: CGraph): [KVector, KVector] {
  const topLeft = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const bottomRight = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  for (const cNode of cGraph.cNodes) {
    topLeft.x = Math.min(topLeft.x, cNode.hitbox.x);
    topLeft.y = Math.min(topLeft.y, cNode.hitbox.y);
    bottomRight.x = Math.max(bottomRight.x, cNode.hitbox.x + cNode.hitbox.width);
    bottomRight.y = Math.max(bottomRight.y, cNode.hitbox.y + cNode.hitbox.height);
  }
  return [topLeft, bottomRight];
}

/**
 * For debugging. Writes hitboxes to svg.
 *
 * @param cGraph the graph
 * @param monitor the monitor that logs the svg
 * @param name filename
 */
export function drawHitboxes(cGraph: CGraph, monitor: IElkProgressMonitor, name: string): void {
  //determine viewBox
  const [topLeft, bottomRight] = determineViewBox(cGraph);

  const size = bottomRight.clone().sub(topLeft);

  // drawing hitboxes to svg
  let out = '';

  out += '<?xml version="1.0" encoding="UTF-8"?>\n';
  out +=
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"' +
    `  viewBox="${d(topLeft.x)} ${d(topLeft.y)} ${d(size.x)} ${d(size.y)}">\n`;

  out +=
    '<defs><marker id="markerArrow" markerWidth="13" ' +
    'markerHeight="13" refX="2" refY="6" ' +
    'orient="auto">' +
    '  <path d="M2,2 L2,11 L10,6 L2,2" style="fill: #000000;" />' +
    '</marker></defs>\n';

  for (const cNode of cGraph.cNodes) {
    // the node's representation
    out += cNode.getDebugSVG() + '\n';

    // the constraints
    for (const inc of cNode.constraints) {
      out +=
        `<line x1="${d(cNode.hitbox.x + cNode.hitbox.width / 2)}" y1="${d(cNode.hitbox.y + cNode.hitbox.height / 2)}" ` +
        `x2="${d(inc.hitbox.x + inc.hitbox.width / 2)}" y2="${d(inc.hitbox.y + inc.hitbox.height / 2)}" ` +
        'stroke="grey" opacity="0.2"' +
        ' style="marker-start: url(#markerArrow);" />\n';
    }
  }

  out += '</svg>';

  monitor.logGraph(out, name, LoggedGraphType.SVG);
}
