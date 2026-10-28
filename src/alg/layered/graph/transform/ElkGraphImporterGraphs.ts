// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import { LabelManagementOptions } from '../../../../core/labels/LabelManagementOptions.js';
import { NodeLabelAndSizeCalculator } from '../../../common/nodespacing/NodeLabelAndSizeCalculator.js';
import { ElkGraphAdapters } from '../../../../core/util/adapters/ElkGraphAdapters.js';
import { EcoreUtil } from '../../../../emf/ecore/util/EcoreUtil.js';
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LGraph } from '../LGraph.js';
import { LGraphUtil } from '../LGraphUtil.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Graph Transformation

/**
 * Create an LGraph from the given node.
 *
 * @param elkgraph the parent node from which to create the LGraph
 * @return a new LGraph instance
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function createLGraph(elkgraph: ElkNode): LGraph {
  const lgraph = new LGraph();

  // Copy the properties of the KGraph to the layered graph
  lgraph.copyProperties(elkgraph);
  if (lgraph.getProperty(LayeredOptions.DIRECTION) === Direction.UNDEFINED) {
    lgraph.setProperty(LayeredOptions.DIRECTION, LGraphUtil.getDirection(lgraph));
  }

  // The root may have a label manager installed
  if (lgraph.getProperty(LabelManagementOptions.LABEL_MANAGER) === null) {
    const root = EcoreUtil.getRootContainer(elkgraph) as ElkGraphElement;
    lgraph.setProperty(LabelManagementOptions.LABEL_MANAGER, root.getProperty(LabelManagementOptions.LABEL_MANAGER));
  }

  // Remember the KGraph parent the LGraph was created from
  lgraph.setProperty(InternalProperties.ORIGIN, elkgraph);

  // Initialize the graph properties discovered during the transformations
  lgraph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));

  // Adjust the padding to respect inside labels (if the graph has a parent, we need to supply that as well
  // since size information stored there may apply to the current graph node)
  const parent = elkgraph.getParent();
  const nodeLabelpadding = NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding(
    // Java passes null for a top-level graph; the parameter is unused by the implementation
    (parent === null ? null : ElkGraphAdapters.adapt(parent)) as ReturnType<typeof ElkGraphAdapters.adapt>,
    ElkGraphAdapters.adaptSingleNode(elkgraph),
    Direction.RIGHT,
  );
  const nodePadding = lgraph.getProperty(LayeredOptions.PADDING);

  // Setup the graph's padding
  const lPadding = lgraph.getPadding();
  lPadding.add(nodePadding);
  lPadding.add(nodeLabelpadding);

  return lgraph;
}
