// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildTree, nodeOf } from '../../../test/helpers/radial-replay-graphs.js';
import { InternalProperties } from './InternalProperties.js';

describe('InternalProperties', () => {
  // InternalProperties.java:28: ROOT_NODE = new Property<ElkNode>("root"), no default; the recorder dumps it under the name "root"
  it('ROOT_NODE is the property "root" without a default', () => {
    expect(InternalProperties.ROOT_NODE.getId()).toBe('root');
    expect(InternalProperties.ROOT_NODE.getDefault()).toBeNull();
  });

  it('stores a node on the graph and removes it again with null', () => {
    const tree = buildTree({ id: 'r' });
    const root = nodeOf(tree, 'r');
    tree.graph.setProperty(InternalProperties.ROOT_NODE, root);
    expect(tree.graph.getProperty(InternalProperties.ROOT_NODE)).toBe(root);
    tree.graph.setProperty(InternalProperties.ROOT_NODE, null);
    expect(tree.graph.hasProperty(InternalProperties.ROOT_NODE)).toBe(false);
  });
});
