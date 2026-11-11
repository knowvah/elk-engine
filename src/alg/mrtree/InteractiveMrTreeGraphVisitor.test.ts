// SPDX-License-Identifier: EPL-2.0
// Proof of InteractiveMrTreeGraphVisitor (mission 8a, T9). test/golden/refs/java/mrtree.json holds no row that sets `interactive` or reaches
// this visitor (the ref has no occurrence of the option), so the expectations are traced from InteractiveMrTreeGraphVisitor.java:35-50:
// `visit` acts on ElkNodes only; `setInteractiveOptions` needs a non-null algorithm id that `"org.eclipse.elk.mrtree".endsWith(...)` accepts and
// at least one child, then sets INTERACTIVE true and WEIGHTING CONSTRAINT (L4: the Java source).
import { describe, expect, it } from 'vitest';
import { registerMrTree } from '../../../test/helpers/mrtree-replay-state.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { InteractiveMrTreeGraphVisitor } from './InteractiveMrTreeGraphVisitor.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';
import { OrderWeighting } from './options/OrderWeighting.js';

const graph = (algorithm: string | null, children: number): ElkNode => {
  registerMrTree();
  const root = ElkGraphUtil.createGraph();
  if (algorithm !== null) {
    root.setProperty(CoreOptions.ALGORITHM, algorithm);
  }
  for (let i = 0; i < children; i++) {
    ElkGraphUtil.createNode(root);
  }
  return root;
};
const touched = (root: ElkNode): boolean =>
  root.hasProperty(CoreOptions.INTERACTIVE) || root.hasProperty(MrTreeOptions.WEIGHTING);

describe('InteractiveMrTreeGraphVisitor', () => {
  it.each(['org.eclipse.elk.mrtree', 'eclipse.elk.mrtree', 'mrtree', ''])(
    'sets INTERACTIVE and WEIGHTING=CONSTRAINT for the algorithm id suffix %j with children',
    (algorithm) => {
      const root = graph(algorithm, 2);
      new InteractiveMrTreeGraphVisitor().visit(root);
      expect(root.getProperty(CoreOptions.INTERACTIVE)).toBe(true);
      expect(root.getProperty(MrTreeOptions.WEIGHTING)).toBe(OrderWeighting.CONSTRAINT);
    },
  );

  it.each([null, 'org.eclipse.elk.layered', 'org.eclipse.elk.mrtree.x'])(
    'leaves the options alone for the algorithm %j',
    (algorithm) => {
      const root = graph(algorithm, 2);
      new InteractiveMrTreeGraphVisitor().visit(root);
      expect(touched(root)).toBe(false);
    },
  );

  it('leaves a graph without children alone', () => {
    const root = graph('org.eclipse.elk.mrtree', 0);
    new InteractiveMrTreeGraphVisitor().setInteractiveOptions(root);
    expect(touched(root)).toBe(false);
  });

  it('visits only ElkNodes: an edge, a port and a label are ignored', () => {
    const root = graph('org.eclipse.elk.mrtree', 2);
    const [a, b] = [...root.getChildren()];
    const edge = ElkGraphUtil.createSimpleEdge(a!, b!);
    const visitor = new InteractiveMrTreeGraphVisitor();
    visitor.visit(edge);
    visitor.visit(ElkGraphUtil.createPort(a!));
    visitor.visit(ElkGraphUtil.createLabel(a!));
    expect(touched(root)).toBe(false);
    expect(touched(a!)).toBe(false);
  });

  it('applies to a node it is given, not to its children (the caller walks the graph)', () => {
    const root = graph('org.eclipse.elk.mrtree', 1);
    const child = [...root.getChildren()][0]!;
    child.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.mrtree');
    ElkGraphUtil.createNode(child);
    new InteractiveMrTreeGraphVisitor().visit(root);
    expect(root.getProperty(CoreOptions.INTERACTIVE)).toBe(true);
    expect(touched(child)).toBe(false);
  });
});
