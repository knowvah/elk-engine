// SPDX-License-Identifier: EPL-2.0
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import { BowyerWatsonTriangulation } from '../../common/BowyerWatsonTriangulation.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import type { Graph } from '../graph/Graph.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/**
 * This phase creates a Delaunay triangulation for the center vertices of the {@link Graph}.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p1structure/DelaunayTriangulationPhase.java
 */
export class DelaunayTriangulationPhase implements ILayoutPhase<SPOrEPhases, Graph> {
  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p1structure/DelaunayTriangulationPhase.java:37 */
  getLayoutProcessorConfiguration(_graph: Graph): LayoutProcessorConfiguration<SPOrEPhases, Graph> {
    return LayoutProcessorConfiguration.create<SPOrEPhases, Graph>();
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p1structure/DelaunayTriangulationPhase.java:42 */
  process(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Delaunay triangulation', 1);

    const vertices: KVector[] = Lists.newArrayList<KVector>();
    graph.vertices.forEach((v) => vertices.push(v.originalVertex));

    let debugOutput: string | null = null;
    if (graph.getProperty(InternalProperties.DEBUG_SVG)) {
      // Java concatenates `ElkUtil.debugFolderPath("spore")`, which is `null` in the browser-safe port: "null10bw"
      debugOutput = `${String(ElkUtil.debugFolderPath('spore'))}10bw`;
    }

    if (graph.tEdges === null) {
      graph.tEdges = BowyerWatsonTriangulation.triangulate(vertices, debugOutput);
    } else {
      graph.tEdges.addAll(BowyerWatsonTriangulation.triangulate(vertices, debugOutput));
    }

    progressMonitor.done();
  }
}
