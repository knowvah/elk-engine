// SPDX-License-Identifier: EPL-2.0
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import * as Strings from '../../../../guava/Strings.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { LGraph } from '../LGraph.js';
import { LNode } from '../LNode.js';
import { needsModelOrder } from './ElkGraphImporterModelOrder.js';
import { transformLabel } from './ElkGraphImporterLabels.js';
import type { NodeAndPortMap } from './ElkGraphImporterMap.js';
import { transformPort, type PortTransformContext } from './ElkGraphImporterPorts.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Node Transformation

/** The "port constraints and sides cannot be undefined" step of `transformNode`; returns the node's constraints. */
function normalizePortConstraints(lnode: LNode, graphProperties: EnumSet<GraphProperties>): PortConstraints {
  const portConstraints = lnode.getProperty(LayeredOptions.PORT_CONSTRAINTS);
  if (portConstraints === PortConstraints.UNDEFINED) {
    lnode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
  } else if (portConstraints !== PortConstraints.FREE) {
    // if the port constraints are not free, set the appropriate graph property
    graphProperties.add(GraphProperties.NON_FREE_PORTS);
  }
  return portConstraints;
}

/**
 * Transforms the given node and its contained ports.
 *
 * @param map the importer's map between ElkGraph elements and the LGraph elements created for them
 * @param elknode the node to transform
 * @param lgraph the layered graph into which the transformed node is put
 * @return the transformed node
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function transformNode(map: NodeAndPortMap, elknode: ElkNode, lgraph: LGraph): LNode {
  // add a new node to the layered graph, copying its position
  const lnode = new LNode(lgraph);
  lnode.copyProperties(elknode);
  lnode.setProperty(InternalProperties.ORIGIN, elknode);

  lnode.getSize().x = elknode.getWidth();
  lnode.getSize().y = elknode.getHeight();
  lnode.getPosition().x = elknode.getX();
  lnode.getPosition().y = elknode.getY();

  lgraph.getLayerlessNodes().push(lnode);
  map.set(elknode, lnode);

  // check if the node is a compound node in the original graph
  if (!elknode.getChildren().isEmpty() || elknode.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE)) {
    lnode.setProperty(InternalProperties.COMPOUND_NODE, true);
  }

  const graphProperties = lgraph.getProperty(InternalProperties.GRAPH_PROPERTIES);

  // port constraints and sides cannot be undefined
  const portConstraints = normalizePortConstraints(lnode, graphProperties);

  // transform the ports
  const layoutDirection = lgraph.getProperty(LayeredOptions.DIRECTION);
  transformNodePorts(map, elknode, lnode, { graphProperties, layoutDirection, portConstraints });

  // add the node's labels
  for (const elklabel of elknode.getLabels()) {
    if (!elklabel.getProperty(LayeredOptions.NO_LAYOUT) && !Strings.isNullOrEmpty(elklabel.getText())) {
      lnode.getLabels().push(transformLabel(elklabel));
    }
  }

  markCommentsAndHypernodes(lnode, graphProperties);

  return lnode;
}

/** The "transform the ports" loop of `transformNode`. */
function transformNodePorts(map: NodeAndPortMap, elknode: ElkNode, lnode: LNode, context: PortTransformContext): void {
  let portModelOrder = 0;
  for (const elkport of elknode.getPorts()) {
    if (needsModelOrder(elknode)) {
      elkport.setProperty(InternalProperties.MODEL_ORDER, portModelOrder++);
    }
    if (!elkport.getProperty(LayeredOptions.NO_LAYOUT)) {
      transformPort(map, elkport, lnode, context);
    }
  }
}

/** The comment box and hypernode steps at the end of `transformNode`. */
function markCommentsAndHypernodes(lnode: LNode, graphProperties: EnumSet<GraphProperties>): void {
  if (lnode.getProperty(LayeredOptions.COMMENT_BOX)) {
    graphProperties.add(GraphProperties.COMMENTS);
  }

  // if we have a hypernode without ports, create a default input and output port
  if (lnode.getProperty(LayeredOptions.HYPERNODE)) {
    graphProperties.add(GraphProperties.HYPERNODES);
    graphProperties.add(GraphProperties.HYPEREDGES);
    lnode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
  }
}
