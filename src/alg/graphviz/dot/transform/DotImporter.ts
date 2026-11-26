// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import type { Pair } from '../../../../core/util/Pair.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { MapPropertyHolder } from '../../../../graph/properties/MapPropertyHolder.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { hashable } from '../../../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../../../java/util/JavaHashMap.js';
import type { Graph } from '../dot/Graph.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { applyLayout } from './DotImporterLayout.js';
import { NODE_ID_MAP, PORT_ID_MAP, PROP_GRAPH } from './DotImporterProperties.js';
import { transformStatements } from './DotImporterTransform.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

/**
 * A transformer for Graphviz Dot.
 *
 * The class is the public face of the port; its private methods live in the `DotImporter*.ts` files beside it
 * (split for the 500-line limit along the Java method boundaries): `DotImporterProperties` (the property constants),
 * `DotImporterAttributes` (`transformAttribute`, `trimValue`), `DotImporterElements` (nodes, ports, edges),
 * `DotImporterTransform` (the statement switch) and `DotImporterLayout` (the layout transfer).
 *
 * @author msp
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export class DotImporter {
  /**
   * Transform the GraphViz model into a KGraph.
   *
   * @param transData the transformation data instance that holds the source graph and is enriched with the new
   *            target graphs
   * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
   */
  transform(transData: IDotTransformationData<GraphvizModel, ElkNode>): void {
    for (const graph of (transData.getSourceGraph() as GraphvizModel).getGraphs()) {
      const parent = ElkGraphUtil.createGraph();
      const nodeIdMap = new Map<string | null, ElkNode>();
      transData.setProperty(NODE_ID_MAP, nodeIdMap);
      const portIdMap = new JavaHashMap<Pair<ElkNode, string | null>, ElkPort>(hashable());
      transData.setProperty(PORT_ID_MAP, portIdMap);
      transformStatements(graph.getStatements(), parent, transData, new MapPropertyHolder(), new MapPropertyHolder());
      transData.getTargetGraphs().push(parent);
      parent.setProperty(PROP_GRAPH, graph);
    }
  }

  /**
   * Apply the layout of the target KGraphs to the original GraphViz model. This may only be used on target graphs
   * that were created by the same transformation class.
   *
   * @param transData the transformation data instance
   * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
   */
  transferLayout(transData: IDotTransformationData<GraphvizModel, ElkNode>): void {
    for (const layoutNode of transData.getTargetGraphs()) {
      applyLayout(layoutNode, new KVector(), layoutNode.getProperty(PROP_GRAPH) as Graph);
    }
  }
}
