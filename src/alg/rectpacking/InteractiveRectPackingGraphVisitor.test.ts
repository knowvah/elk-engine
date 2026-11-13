// SPDX-License-Identifier: EPL-2.0
// Unit tests of InteractiveRectPackingGraphVisitor (mission 8c, T12). No oracle row covers it (the engine never applies the visitor,
// T1 note), so the expectations come from the Java source's own logic (InteractiveRectPackingGraphVisitor.java:34-49): INTERACTIVE is
// set to true on an ElkNode that has children and whose ALGORITHM option is non-null and a suffix of RectPackingOptions.ALGORITHM_ID
// (`ALGORITHM_ID.endsWith(algorithm)`, the reversed direction kept verbatim from the Java).
import { describe, expect, it } from 'vitest';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { InteractiveRectPackingGraphVisitor } from './InteractiveRectPackingGraphVisitor.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';

/** A root with one child; `algorithm` is stored on the root unless it is `undefined`. */
function rootWith(algorithm: string | undefined, children = 1): ElkNode {
  const root = ElkGraphUtil.createGraph();
  if (algorithm !== undefined) {
    root.setProperty(CoreOptions.ALGORITHM, algorithm);
  }
  for (let i = 0; i < children; i++) {
    ElkGraphUtil.createNode(root);
  }
  return root;
}

describe('InteractiveRectPackingGraphVisitor', () => {
  const interactiveAfter = (root: ElkNode, run: (v: InteractiveRectPackingGraphVisitor) => void): boolean | null => {
    run(new InteractiveRectPackingGraphVisitor());
    return root.hasProperty(RectPackingOptions.INTERACTIVE) ? root.getProperty(RectPackingOptions.INTERACTIVE) : null;
  };

  it.each([
    ['the full algorithm id', RectPackingOptions.ALGORITHM_ID],
    ['a suffix of the id (the reversed endsWith)', 'rectpacking'],
  ])('sets INTERACTIVE on a root with children and %s', (_name, algorithm) => {
    const root = rootWith(algorithm);
    expect(interactiveAfter(root, (v) => v.visit(root))).toBe(true);
  });

  it.each([
    ['another algorithm', 'org.eclipse.elk.layered'],
    ['an id longer than the rectpacking id (endsWith is reversed)', `x.${RectPackingOptions.ALGORITHM_ID}`],
    ['no algorithm option', undefined],
  ])('leaves INTERACTIVE unset for %s', (_name, algorithm) => {
    const root = rootWith(algorithm);
    expect(interactiveAfter(root, (v) => v.visit(root))).toBeNull();
  });

  it('leaves INTERACTIVE unset for a root without children', () => {
    const root = rootWith(RectPackingOptions.ALGORITHM_ID, 0);
    expect(interactiveAfter(root, (v) => v.visit(root))).toBeNull();
  });

  it('visit ignores an element that is not an ElkNode', () => {
    const root = rootWith(RectPackingOptions.ALGORITHM_ID);
    const label = ElkGraphUtil.createLabel(root);
    expect(interactiveAfter(root, (v) => v.visit(label))).toBeNull();
  });

  it('setInteractiveOptions applies directly to a node and does not recurse into its children', () => {
    const root = rootWith(RectPackingOptions.ALGORITHM_ID);
    const child = root.getChildren().get(0);
    ElkGraphUtil.createNode(child);
    child.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    new InteractiveRectPackingGraphVisitor().setInteractiveOptions(root);
    expect(root.getProperty(RectPackingOptions.INTERACTIVE)).toBe(true);
    expect(child.hasProperty(RectPackingOptions.INTERACTIVE)).toBe(false);
  });
});
