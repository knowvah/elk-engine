// SPDX-License-Identifier: EPL-2.0
import { InsidePortLabelCellCreator } from '../../src/alg/common/nodespacing/internal/algorithm/InsidePortLabelCellCreator.js';
import { NodeLabelCellCreator } from '../../src/alg/common/nodespacing/internal/algorithm/NodeLabelCellCreator.js';
import { PortContextCreator } from '../../src/alg/common/nodespacing/internal/algorithm/PortContextCreator.js';
import type { NodeContext } from '../../src/alg/common/nodespacing/internal/NodeContext.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { NodeLabelPlacement } from '../../src/core/options/NodeLabelPlacement.js';
import { SizeConstraint } from '../../src/core/options/SizeConstraint.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import { contextOf, nodeFixture } from './node-context-fixtures.js';

/** Adds a label of the given size to a node or port, with an optional label-level node label placement. */
export function addLabel(
  parent: ElkNode | ElkPort,
  width: number,
  height: number,
  placement?: EnumSet<NodeLabelPlacement>,
): ElkLabel {
  const label = ElkGraphUtil.createLabel(parent);
  label.setDimensions(width, height);
  if (placement !== undefined) {
    label.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, placement);
  }
  return label;
}

/** Sets the node's size constraints. */
export function constrain(node: ElkNode, first: SizeConstraint, ...rest: SizeConstraint[]): void {
  node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(first, ...rest));
}

/** Sets `NODE_SIZE_CONSTRAINTS` to the empty set. */
export function constrainNone(node: ElkNode): void {
  node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.noneOf(SizeConstraint));
}

/**
 * A context for the configured node with port contexts, node label cells (inside and outside) and inside port label
 * cells created, in the order the node micro layout runs them.
 */
export function cellSystemContext(configure: (node: ElkNode, root: ElkNode) => void): NodeContext {
  const context = contextOf(nodeFixture(configure));
  PortContextCreator.createPortContexts(context, false);
  NodeLabelCellCreator.createNodeLabelCells(context, false, true);
  InsidePortLabelCellCreator.createInsidePortLabelCells(context);
  return context;
}
