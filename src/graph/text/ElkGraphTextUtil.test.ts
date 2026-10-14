// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { LayoutAlgorithmData } from '../../core/data/LayoutAlgorithmData.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IFactory } from '../../core/util/IFactory.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphTextUtil } from './ElkGraphTextUtil.js';

const OUTER_ID = 'test.outer';
const INNER_ID = 'test.inner';
const STUB_FACTORY: IFactory<AbstractLayoutProvider> = {
  create: () => ({}) as AbstractLayoutProvider,
  destroy: () => undefined,
};

function algorithmNamed(id: string): LayoutAlgorithmData {
  return new LayoutAlgorithmData.Builder().id(id).name(id).providerFactory(STUB_FACTORY).create();
}

function withAlgorithm(node: ElkNode, id: string): ElkNode {
  node.setProperty(CoreOptions.ALGORITHM, id);
  return node;
}

let outer: LayoutAlgorithmData;
let inner: LayoutAlgorithmData;

beforeEach(() => {
  LayoutMetaDataService.unload();
  outer = algorithmNamed(OUTER_ID);
  inner = algorithmNamed(INNER_ID);
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders({
    apply: (registry) => {
      registry.register(outer);
      registry.register(inner);
    },
  });
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

/** root (outer) > child (inner) > grandchild, with a port on child. */
function hierarchy() {
  const root = withAlgorithm(ElkGraphUtil.createGraph(), OUTER_ID);
  const child = withAlgorithm(ElkGraphUtil.createNode(root), INNER_ID);
  const grandchild = ElkGraphUtil.createNode(child);
  const port = ElkGraphUtil.createPort(child);
  return { root, child, grandchild, port };
}

describe('ElkGraphTextUtil.getAlgorithm', () => {
  it('uses the node itself for a node', () => {
    const { child } = hierarchy();
    expect(ElkGraphTextUtil.getAlgorithm(child)).toBe(inner);
  });

  it('uses the container of the owning node for a port, or the owning node at the root', () => {
    const { child, port, root } = hierarchy();
    expect(ElkGraphTextUtil.getAlgorithm(port)).toBe(outer);
    const rootPort = ElkGraphUtil.createPort(root);
    expect(ElkGraphTextUtil.getAlgorithm(rootPort)).toBe(outer);
    expect(child.getParent()).toBe(root);
  });

  it('gives null for a port without a node', () => {
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createPort(null))).toBeNull();
  });

  it('uses the containing node for an edge and null for an uncontained one', () => {
    const { child, grandchild } = hierarchy();
    const edge = ElkGraphUtil.createSimpleEdge(grandchild, grandchild);
    expect(edge.getContainingNode()).toBe(child);
    expect(ElkGraphTextUtil.getAlgorithm(edge)).toBe(inner);
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createEdge(null))).toBeNull();
  });

  it('resolves a label through its node, port or edge, one level up for nodes and ports', () => {
    const { child, grandchild, port, root } = hierarchy();
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(grandchild))).toBe(inner);
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(root))).toBe(outer);
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(port))).toBe(outer);
    const edge = ElkGraphUtil.createSimpleEdge(grandchild, grandchild);
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(edge))).toBe(inner);
    expect(child.getLabels().isEmpty()).toBe(true);
  });

  it('climbs nested labels before choosing the owner', () => {
    const { grandchild, port } = hierarchy();
    const nested = ElkGraphUtil.createLabel(ElkGraphUtil.createLabel(ElkGraphUtil.createLabel(grandchild)));
    expect(ElkGraphTextUtil.getAlgorithm(nested)).toBe(inner);
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(ElkGraphUtil.createLabel(port)))).toBe(outer);
  });

  it('gives null for labels without an owner, a port without a node, and a null element', () => {
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(null))).toBeNull();
    expect(ElkGraphTextUtil.getAlgorithm(ElkGraphUtil.createLabel(ElkGraphUtil.createPort(null)))).toBeNull();
    expect(ElkGraphTextUtil.getAlgorithm(null)).toBeNull();
  });

  it('gives null without an algorithm property, with an empty one, or an unknown one', () => {
    const root = ElkGraphUtil.createGraph();
    expect(ElkGraphTextUtil.getAlgorithm(root)).toBeNull();
    expect(ElkGraphTextUtil.getAlgorithm(withAlgorithm(root, ''))).toBeNull();
    expect(ElkGraphTextUtil.getAlgorithm(withAlgorithm(root, 'nosuch'))).toBeNull();
  });

  it('looks the id up by suffix', () => {
    const root = withAlgorithm(ElkGraphUtil.createGraph(), 'outer');
    expect(ElkGraphTextUtil.getAlgorithm(root)).toBe(outer);
  });
});
