// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { assertionsEnabled } from '../../src/java/lang/DevAssert.js';
import { hasUnsizedEndLabel, withEndLabelRule } from './unsized-end-labels.js';
import { withAssertions } from './with-assertions.js';

const LABEL_WIDTH = 20;
const LABEL_HEIGHT = 10;

/** A root with two nodes inside `parent` (the root itself by default) and one edge between them, with one label. */
function labelled(
  placement: EdgeLabelPlacement | null,
  width: number,
  height: number,
  nestIn?: (root: ElkNode) => ElkNode,
): { root: ElkNode; label: ElkLabel } {
  const root = ElkGraphUtil.createGraph();
  const parent = nestIn === undefined ? root : nestIn(root);
  const edge = ElkGraphUtil.createSimpleEdge(ElkGraphUtil.createNode(parent), ElkGraphUtil.createNode(parent));
  const label = ElkGraphUtil.createLabelWithText('label', edge);
  label.setDimensions(width, height);
  if (placement !== null) {
    label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, placement);
  }
  return { root, label };
}

describe('hasUnsizedEndLabel', () => {
  it('is false for a graph without labels', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createSimpleEdge(ElkGraphUtil.createNode(root), ElkGraphUtil.createNode(root));
    expect(hasUnsizedEndLabel(root)).toBe(false);
  });

  it('is false for a sized end label, HEAD or TAIL', () => {
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.HEAD, LABEL_WIDTH, LABEL_HEIGHT).root)).toBe(false);
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.TAIL, LABEL_WIDTH, LABEL_HEIGHT).root)).toBe(false);
  });

  it('is true for an end label without a width, without a height, or without both', () => {
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.TAIL, 0, LABEL_HEIGHT).root)).toBe(true);
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.TAIL, LABEL_WIDTH, 0).root)).toBe(true);
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.HEAD, 0, 0).root)).toBe(true);
  });

  it('counts a NaN or negative size as unsized (the negation of `width > 0 && height > 0`)', () => {
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.HEAD, Number.NaN, LABEL_HEIGHT).root)).toBe(true);
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.HEAD, LABEL_WIDTH, -1).root)).toBe(true);
  });

  it('is false for an unsized label that is no end label: CENTER, or no placement (the default is CENTER)', () => {
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.CENTER, 0, 0).root)).toBe(false);
    expect(hasUnsizedEndLabel(labelled(null, 0, 0).root)).toBe(false);
  });

  it('finds an unsized end label on an edge contained in a nested node', () => {
    const nested = (root: ElkNode): ElkNode => ElkGraphUtil.createNode(ElkGraphUtil.createNode(root));
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.HEAD, 0, 0, nested).root)).toBe(true);
    expect(hasUnsizedEndLabel(labelled(EdgeLabelPlacement.HEAD, LABEL_WIDTH, LABEL_HEIGHT, nested).root)).toBe(false);
  });

  it('ignores node and port labels', () => {
    const { root } = labelled(EdgeLabelPlacement.HEAD, LABEL_WIDTH, LABEL_HEIGHT);
    const node = root.getChildren().get(0);
    ElkGraphUtil.createLabelWithText('node', node).setProperty(
      CoreOptions.EDGE_LABELS_PLACEMENT,
      EdgeLabelPlacement.HEAD,
    );
    ElkGraphUtil.createLabelWithText('port', ElkGraphUtil.createPort(node)).setProperty(
      CoreOptions.EDGE_LABELS_PLACEMENT,
      EdgeLabelPlacement.TAIL,
    );
    expect(hasUnsizedEndLabel(root)).toBe(false);
  });

  it('reads a placement that is still an unresolved proxy, and leaves the proxy in place', () => {
    const { root, label } = labelled(null, 0, 0);
    const proxy = new LayoutOptionProxy('TAIL');
    label.getProperties().put(CoreOptions.EDGE_LABELS_PLACEMENT, proxy);
    expect(hasUnsizedEndLabel(root)).toBe(true);
    expect(label.getProperties().get(CoreOptions.EDGE_LABELS_PLACEMENT)).toBe(proxy);
  });
});

describe('withEndLabelRule', () => {
  it('runs the body with assertions off for a graph with an unsized end label, and restores the state', () => {
    const { root } = labelled(EdgeLabelPlacement.HEAD, 0, 0);
    withAssertions(true, () => {
      expect(withEndLabelRule(root, () => assertionsEnabled())).toBe(false);
      expect(assertionsEnabled()).toBe(true);
    });
  });

  it('leaves the switch alone for any other graph, on or off', () => {
    const { root } = labelled(EdgeLabelPlacement.HEAD, LABEL_WIDTH, LABEL_HEIGHT);
    expect(withAssertions(true, () => withEndLabelRule(root, () => assertionsEnabled()))).toBe(true);
    expect(withAssertions(false, () => withEndLabelRule(root, () => assertionsEnabled()))).toBe(false);
  });

  it('restores the state when the body throws', () => {
    const { root } = labelled(EdgeLabelPlacement.TAIL, 0, 0);
    withAssertions(true, () => {
      expect(() =>
        withEndLabelRule(root, () => {
          throw new RangeError('body');
        }),
      ).toThrow(RangeError);
      expect(assertionsEnabled()).toBe(true);
    });
  });
});
