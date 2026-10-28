// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { connect } from './lgraph-builders.js';
import { labelAt, nodeAt, portAt } from './lgraph-site-shapes.js';

/** The S4 scenario of the oracle rows `site/lgraphutil/graphProperties/{right,down,up,left}` (recorder steps 0-112). */
export interface PropertiesScenario {
  readonly graph: LGraph;
  /** Nodes by recorder name. */
  readonly nodes: Readonly<
    Record<'cmt' | 'hyp' | 'cmtHyp' | 'ext' | 'undef' | 'free' | 'fixed' | 'hub' | 'sides' | 'loop', LNode>
  >;
}

function smallNode(graph: LGraph): LNode {
  return nodeAt(graph, 0, 0, 10, 10);
}

function flagNodes(
  graph: LGraph,
): Pick<PropertiesScenario['nodes'], 'cmt' | 'hyp' | 'cmtHyp' | 'ext' | 'undef' | 'free' | 'fixed'> {
  const cmt = smallNode(graph);
  cmt.setProperty(LayeredOptions.COMMENT_BOX, true);
  const hyp = smallNode(graph);
  hyp.setProperty(LayeredOptions.HYPERNODE, true);
  const cmtHyp = smallNode(graph);
  cmtHyp.setProperty(LayeredOptions.COMMENT_BOX, true);
  cmtHyp.setProperty(LayeredOptions.HYPERNODE, true);
  const ext = smallNode(graph);
  ext.setType(NodeType.EXTERNAL_PORT);
  const undef = smallNode(graph);
  const free = smallNode(graph);
  free.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
  const fixed = smallNode(graph);
  fixed.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
  return { cmt, hyp, cmtHyp, ext, undef, free, fixed };
}

function hubWithEdges(graph: LGraph): { hub: LNode; labelledEdge: ReturnType<typeof connect> } {
  const hub = nodeAt(graph, 0, 0, 30, 30);
  const t1 = smallNode(graph);
  const t2 = smallNode(graph);
  const out = portAt(hub, PortSide.EAST, 30, 10);
  const labelledEdge = connect(out, portAt(t1, PortSide.WEST, -4, 3));
  connect(out, portAt(t2, PortSide.WEST, -4, 3));
  return { hub, labelledEdge };
}

/** Builds the S4 scenario for `direction`. */
export function propertiesScenario(direction: Direction): PropertiesScenario {
  const graph = new LGraph();
  graph.setProperty(LayeredOptions.DIRECTION, direction);
  const flags = flagNodes(graph);
  const { hub, labelledEdge } = hubWithEdges(graph);
  const sides = nodeAt(graph, 0, 0, 30, 30);
  portAt(sides, PortSide.NORTH, 10, -4);
  portAt(sides, PortSide.EAST, 30, 10);
  portAt(sides, PortSide.SOUTH, 10, 30);
  portAt(sides, PortSide.WEST, -4, 10);
  const loop = nodeAt(graph, 0, 0, 30, 30);
  connect(portAt(loop, PortSide.EAST, 30, 10), portAt(loop, PortSide.WEST, -4, 10));
  for (const placement of [EdgeLabelPlacement.CENTER, EdgeLabelPlacement.HEAD, EdgeLabelPlacement.TAIL]) {
    const label = labelAt(placement.name(), 0, 0, 5, 5);
    label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, placement);
    labelledEdge.getLabels().push(label);
  }
  return { graph, nodes: { ...flags, hub, sides, loop } };
}

/** Every direction exercised by the S4 rows with the same expected result. */
export const PROPERTIES_DIRECTIONS: readonly Direction[] = [
  Direction.RIGHT,
  Direction.DOWN,
  Direction.UP,
  Direction.LEFT,
];
