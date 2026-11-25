// SPDX-License-Identifier: EPL-2.0
// The deterministic fake layout of tools/vectors/DotImportVectors.java (Recorder.fakeLayout), applied to the target
// graphs of DotImporter.transform before transferLayout.
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { Tree } from './dot-import-dump.js';

/**
 * One counter k = 0, 1, 2, ... over the target graphs in order; per graph, every node in pre-order gets location
 * (10k + 0.5, 5k + 0.25) and size (20 + k, 10 + 0.5k); then every edge in EDGE order gets, for an even k, a section
 * from (k, k + 1) to (k + 2.5, k + 3) with one bend point (k + 1.5, k + 0.75); then each of its labels gets location
 * (k + 0.125, k + 0.5) and size (8, 4), one k step per node, edge and edge label.
 */
export function fakeLayout(roots: readonly ElkNode[]): void {
  let k = 0;
  for (const root of roots) {
    const tree = new Tree(root);
    for (const node of tree.nodes) {
      node.setLocation(10.0 * k + 0.5, 5.0 * k + 0.25);
      node.setDimensions(20.0 + k, 10.0 + 0.5 * k);
      k++;
    }
    for (const edge of tree.edges) {
      if (k % 2 === 0) {
        const section = ElkGraphUtil.createEdgeSection(edge);
        section.setStartLocation(k, k + 1.0);
        section.setEndLocation(k + 2.5, k + 3.0);
        ElkGraphUtil.createBendPoint(section, k + 1.5, k + 0.75);
      }
      k++;
      for (const label of edge.getLabels()) {
        label.setLocation(k + 0.125, k + 0.5);
        label.setDimensions(8, 4);
        k++;
      }
    }
  }
}
