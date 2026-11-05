// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue515Test: no edge segment of the top-level graph intersects a node box. The graphs are the three
 * `515.+\.elkt` tickets (`FileNameFilter`).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue515Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { ElkMath } from '../../../core/math/ElkMath.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

defineLayoutTest({
  name: 'Issue515Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/**', filter: /515.+\.elkt/ }],
  afterLayout: {
    testNoEdgeOverlaps: (graph: ElkNode): void => {
      const allNodesAsBoxes = [...graph.getChildren()].map(
        (n) => new ElkRectangle(n.getX(), n.getY(), n.getWidth(), n.getHeight()),
      );
      const allEdgePaths = [...graph.getContainedEdges()]
        .flatMap((e) => [...e.getSections()])
        .map((s) => ElkUtil.createVectorChain(s));

      for (const path of allEdgePaths) {
        // For each edge segment (start, end), check if it intersects any box
        let start: ReturnType<typeof path.get> | null = null;
        for (const end of path) {
          if (start !== null) {
            for (const box of allNodesAsBoxes) {
              expect(!ElkMath.intersects(box, start, end), 'Edge path overlaps with node.').toBe(true);
            }
          }
          start = end;
        }
      }
    },
  },
});
