// SPDX-License-Identifier: EPL-2.0
// The rule of issue #127 for `EndLabelPreprocessor.java:377` (`assert labelCellRect.height > 0 &&
// labelCellRect.width > 0`): an end label without a size has an empty label cell, so a JVM under `-ea` rejects the
// model, while the recorded rows pin what a JVM without `-ea` lays out. A replay runs such a model with assertions
// off and every other model with the suite's setting.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { isPropertyValueProxy } from '../../src/graph/properties/IPropertyValueProxy.js';
import { withAssertions } from './with-assertions.js';

/**
 * The label's `EDGE_LABELS_PLACEMENT` is `HEAD` or `TAIL`: what the layered importer treats as an end label
 * (`ElkGraphImporterEdges.ts`, `transformEdgeLabels`). Read from the property map, not through `getProperty`, which
 * would store the resolved value of a proxy on the label.
 */
function isEndLabel(label: ElkLabel): boolean {
  const stored: unknown = label.getProperties().get(CoreOptions.EDGE_LABELS_PLACEMENT);
  const placement = isPropertyValueProxy(stored) ? stored.resolveValue(CoreOptions.EDGE_LABELS_PLACEMENT) : stored;
  return placement === EdgeLabelPlacement.HEAD || placement === EdgeLabelPlacement.TAIL;
}

/** The negation of the Java assert's shape, so a `NaN` size counts as unsized. */
const isUnsized = (label: ElkLabel): boolean => !(label.getWidth() > 0 && label.getHeight() > 0);

/**
 * Whether some label of an edge anywhere in the graph (the edges `root` contains and those every descendant node
 * contains) is an end label without a size. Evaluate it on the root a runner is about to lay out, after the row's
 * options are applied: the placement is a property of the label, and a row's options can set it.
 */
export function hasUnsizedEndLabel(root: ElkNode): boolean {
  const ownEdges = [...root.getContainedEdges()];
  return (
    ownEdges.some((edge) => [...edge.getLabels()].some((label) => isEndLabel(label) && isUnsized(label))) ||
    [...root.getChildren()].some(hasUnsizedEndLabel)
  );
}

/** Runs `body` with assertions off when `root` has an unsized end label, and unchanged otherwise. */
export function withEndLabelRule<T>(root: ElkNode, body: () => T): T {
  return hasUnsizedEndLabel(root) ? withAssertions(false, body) : body();
}
