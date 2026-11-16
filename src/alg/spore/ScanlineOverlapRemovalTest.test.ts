// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CompareFuzzy } from '../common/compaction/oned/CompareFuzzy.js';
import { SporeMetaDataProvider } from './options/SporeMetaDataProvider.js';
import { SporeOverlapRemovalOptions } from './options/SporeOverlapRemovalOptions.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkMath } from '../../core/math/ElkMath.js';
import { ElkRectangle } from '../../core/math/ElkRectangle.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { copyGraph } from '../../graph/util/ElkGraphCopy.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';

/** @see org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test/ScanlineOverlapRemovalTest.java */
describe('ScanlineOverlapRemovalTest', () => {
  /**
   * Test whether the ScanlineOverlapCheck supports the overlap removal to find all overlaps in a special case.
   *
   * @see ScanlineOverlapRemovalTest.java:45 scanlineTest
   */
  it('scanlineTest', () => {
    // build test graphs
    const graph1 = ElkGraphUtil.createGraph();
    const n0 = ElkGraphUtil.createNode(graph1);
    const n1 = ElkGraphUtil.createNode(graph1);
    const n2 = ElkGraphUtil.createNode(graph1);
    const n3 = ElkGraphUtil.createNode(graph1);
    n0.setDimensions(160, 20);
    n1.setDimensions(160, 20);
    n2.setDimensions(20, 20);
    n3.setDimensions(20, 20);
    n0.setLocation(0, 30);
    n1.setLocation(150, 40);
    n2.setLocation(150, 0);
    n3.setLocation(150, 70);
    graph1.setProperty(CoreOptions.ALGORITHM, SporeOverlapRemovalOptions.ALGORITHM_ID);
    const graph2 = copyGraph(graph1);
    graph2.setProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false);

    // execute overlap removal with and without ScanlineOverlapCheck
    const lService = LayoutMetaDataService.getInstance();
    lService.registerLayoutMetaDataProviders(new SporeMetaDataProvider());
    const lEngine = new RecursiveGraphLayoutEngine();
    lEngine.layout(graph1, new BasicProgressMonitor());
    lEngine.layout(graph2, new BasicProgressMonitor());

    // test
    expect(hasOverlaps(graph1)).toBe(false);
    expect(hasOverlaps(graph2)).toBe(true);
  });

  /** @see ScanlineOverlapRemovalTest.java:77 hasOverlaps */
  function hasOverlaps(graph: ElkNode): boolean {
    for (const na of graph.getChildren()) {
      for (const nb of graph.getChildren()) {
        if (na !== nb) {
          const r1 = new ElkRectangle(na.getX(), na.getY(), na.getWidth(), na.getHeight());
          const r2 = new ElkRectangle(nb.getX(), nb.getY(), nb.getWidth(), nb.getHeight());
          if (CompareFuzzy.lt(ElkMath.shortestDistance(r1, r2), 0)) {
            return true;
          }
        }
      }
    }

    return false;
  }
});
