// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LNode } from '../LNode.js';
import { getOriginIdentifier } from './ElkGraphTransformerUtility.js';

function nodeWithOrigin(origin: unknown): LNode {
  const node = new LNode(null);
  node.setProperty(InternalProperties.ORIGIN, origin);
  return node;
}

describe('ElkGraphTransformerUtility.getOriginIdentifier', () => {
  it('is null without an origin and for a non-ElkGraph origin', () => {
    expect(getOriginIdentifier(new LNode(null))).toBeNull();
    expect(getOriginIdentifier(nodeWithOrigin(42))).toBeNull();
  });

  it('is the identifier of a top-level element', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('root');
    expect(getOriginIdentifier(nodeWithOrigin(root))).toBe('root');
  });

  it('prefixes the identifiers of the containing elements, dot separated', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('root');
    const child = ElkGraphUtil.createNode(root);
    child.setIdentifier('child');
    const port = ElkGraphUtil.createPort(child);
    port.setIdentifier('p');
    expect(getOriginIdentifier(nodeWithOrigin(port))).toBe('root.child.p');
  });

  it('skips a container without identifier', () => {
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    child.setIdentifier('child');
    expect(getOriginIdentifier(nodeWithOrigin(child))).toBe('child');
  });

  it('is null for an element with an empty or missing identifier', () => {
    const root = ElkGraphUtil.createGraph();
    expect(getOriginIdentifier(nodeWithOrigin(root))).toBeNull();
    root.setIdentifier('');
    expect(getOriginIdentifier(nodeWithOrigin(root))).toBeNull();
  });
});
