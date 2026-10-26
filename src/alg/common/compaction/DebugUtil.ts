// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import type { CGraph } from './oned/CGraph.js';
import type { CNode } from './oned/CNode.js';

const d = doubleToString;

/**
 * Debug utilities for the compaction algorithms. A static-only class in Java.
 *
 * Decision AC4: the logic is kept; the file write is a no-op. `DebugUtil.java:53-55` opens a
 * `PrintWriter` on a `FileWriter(fileName)` and `:85` closes it; there is no file system in a browser
 * build, so the lines are built (including the `getDebugSVG()` calls) and then dropped, and
 * `fileName` is never touched. The `catch (IOException)` at `:86` cannot be reached.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/DebugUtil.java
 */
export class DebugUtil {
  private constructor() {}

  /** The Java `PrintWriter.println` target: lines are collected and discarded (AC4). */
  private static collect(lines: string[], line: string): void {
    lines.push(line);
  }

  /**
   * For debugging. Writes hitboxes to svg (AC4: builds the document, writes nothing).
   *
   * @param cGraph the graph
   * @param _fileName filename; never opened.
   */
  static drawHitboxes(cGraph: CGraph, _fileName: string): void {
    // determine viewBox
    const [topLeft, bottomRight] = DebugUtil.determineViewBox(cGraph);

    const size = bottomRight.clone().sub(topLeft);

    // drawing hitboxes to svg
    const out: string[] = []; // DebugUtil.java:53-55: new PrintWriter(new FileWriter(fileName)) -- no-op (AC4)

    DebugUtil.collect(out, '<?xml version="1.0" encoding="UTF-8"?>');
    DebugUtil.collect(
      out,
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"' +
        `  viewBox="${d(topLeft.x)} ${d(topLeft.y)} ${d(size.x)} ${d(size.y)}">`,
    );

    DebugUtil.collect(
      out,
      '<defs><marker id="markerArrow" markerWidth="10" ' +
        'markerHeight="10" refX="0" refY="3" orient="auto">' +
        '  <path d="M0,0 L0,6 L9,3 z" style="fill: #000000;" />' +
        '</marker></defs>',
    );

    for (const cNode of cGraph.cNodes) {
      // the node's representation
      DebugUtil.collect(out, cNode.getDebugSVG());

      // the constraints
      for (const inc of cNode.constraints) {
        DebugUtil.collect(out, DebugUtil.constraintLine(cNode, inc));
      }
    }

    DebugUtil.collect(out, '</svg>');

    // DebugUtil.java:85 out.close() -- no-op (AC4): `out` is dropped, nothing is written.
  }

  /** The first block of the Java method (`// determine viewBox`), split off for the complexity limits. */
  private static determineViewBox(cGraph: CGraph): [KVector, KVector] {
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

  private static constraintLine(cNode: CNode, inc: CNode): string {
    return (
      `<line x1="${d(inc.hitbox.x)}" y1="${d(inc.hitbox.y + inc.hitbox.height / 2)}" x2="` +
      `${d(cNode.hitbox.x + cNode.hitbox.width)}" y2="${d(cNode.hitbox.y + cNode.hitbox.height / 2)}` +
      '" stroke="black" opacity="0.4"' +
      ' style="marker-end: url(#markerArrow);" />'
    );
  }
}
