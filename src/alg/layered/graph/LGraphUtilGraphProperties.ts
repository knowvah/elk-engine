// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../core/options/Direction.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { EnumSet } from '../../../java/util/EnumSet.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LGraph } from './LGraph.js';
import { getDirection } from './LGraphUtilOther.js';
import type { LLabel } from './LLabel.js';
import type { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';
import type { LPort } from './LPort.js';

/**
 * The "Graph Properties" section of `LGraphUtil` (`:335-413`) as module functions behind the facade. The per-port
 * loop body and the edge label switch are the private helpers {@link portGraphProperties} and
 * {@link edgeGraphProperties} (complexity limits); order of the `props.add` calls is unchanged.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */

/**
 * Compute the graph properties of the given layered graph. These properties are important to determine which
 * intermediate processors are included in the layout run. Ideally the properties are computed during the import of
 * the source format into {@link LGraph}, e.g. as done in `KGraphImporter`. This method is offered only for
 * convenience.
 *
 * The nodes are expected to be in the {@link LGraph.getLayerlessNodes} list.
 *
 * @param layeredGraph a layered graph
 */
export function computeGraphProperties(layeredGraph: LGraph): void {
  const props = layeredGraph.getProperty(InternalProperties.GRAPH_PROPERTIES);
  if (!props.isEmpty()) {
    props.clear();
  }

  const direction = getDirection(layeredGraph);
  for (const node of layeredGraph.getLayerlessNodes()) {
    if (node.getProperty(LayeredOptions.COMMENT_BOX)) {
      props.add(GraphProperties.COMMENTS);
    } else if (node.getProperty(LayeredOptions.HYPERNODE)) {
      props.add(GraphProperties.HYPERNODES);
      props.add(GraphProperties.HYPEREDGES);
    } else if (node.getType() === NodeType.EXTERNAL_PORT) {
      props.add(GraphProperties.EXTERNAL_PORTS);
    }

    const portConstraints = node.getProperty(LayeredOptions.PORT_CONSTRAINTS);
    if (portConstraints === PortConstraints.UNDEFINED) {
      // correct the port constraints value
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
    } else if (portConstraints !== PortConstraints.FREE) {
      props.add(GraphProperties.NON_FREE_PORTS);
    }

    for (const port of node.getPorts()) {
      portGraphProperties(props, port, node, direction);
    }
  }
}

/** The body of the `for (LPort port : node.getPorts())` loop of {@link computeGraphProperties}. */
function portGraphProperties(props: EnumSet<GraphProperties>, port: LPort, node: LNode, direction: Direction): void {
  if (port.getIncomingEdges().length + port.getOutgoingEdges().length > 1) {
    props.add(GraphProperties.HYPEREDGES);
  }

  const portSide = port.getSide();
  switch (direction) {
    case Direction.UP:
    case Direction.DOWN:
      if (portSide === PortSide.EAST || portSide === PortSide.WEST) {
        props.add(GraphProperties.NORTH_SOUTH_PORTS);
      }
      break;
    default:
      if (portSide === PortSide.NORTH || portSide === PortSide.SOUTH) {
        props.add(GraphProperties.NORTH_SOUTH_PORTS);
      }
  }

  for (const edge of port.getOutgoingEdges()) {
    if (edge.getTarget()!.getNode() === node) {
      props.add(GraphProperties.SELF_LOOPS);
    }

    edgeGraphProperties(props, edge.getLabels());
  }
}

/** The `for (LLabel label : edge.getLabels())` switch of {@link computeGraphProperties}. */
function edgeGraphProperties(props: EnumSet<GraphProperties>, labels: readonly LLabel[]): void {
  for (const label of labels) {
    switch (label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT)) {
      case EdgeLabelPlacement.CENTER:
        props.add(GraphProperties.CENTER_LABELS);
        break;
      case EdgeLabelPlacement.HEAD:
      case EdgeLabelPlacement.TAIL:
        props.add(GraphProperties.END_LABELS);
        break;
    }
  }
}
