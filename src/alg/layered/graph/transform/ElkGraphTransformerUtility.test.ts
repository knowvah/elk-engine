// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LNode } from '../LNode.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';
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

describe('ElkGraphTransformerUtility.getOriginIdentifier (oracle site rows)', () => {
  it('prefixes the identifiers of the containing ELK elements to the origin of every imported element', () => {
    // oracle: site/strings/origin-identifiers-root-id; ElkGraphTransformer.java:58-78 (getOriginIdentifier, getIdentifier)
    const run = runSiteRow('site/strings/origin-identifiers-root-id');
    expect(run.values.get('g0.origin')).toBe('r');
    expect(run.values.get('g0/e0.origin')).toBe('r.quiet');
    expect(run.values.get('g0/e1.origin')).toBe('r.outer');
    expect(run.values.get('g0/e1/l0.origin')).toBeNull();
    expect(run.values.get('g0/n0.origin')).toBe('r.a');
    expect(run.values.get('g0/n0/l0.origin')).toBeNull();
    expect(run.values.get('g0/n0/p0.origin')).toBe('r.a.p');
    expect(run.values.get('g0/n0/p0/l0.origin')).toBe('r.a.p.pl');
    expect(run.values.get('g0/n0/p1.origin')).toBeNull();
    expect(run.values.get('g0/n1.origin')).toBe('r.c');
    expect(run.values.get('g0/n1/p0.origin')).toBeNull();
    expect(run.values.get('g0/n1/p1.origin')).toBeNull();
    expect(run.values.get('g1.origin')).toBe('r.a');
    expect(run.values.get('g1/e0.origin')).toBe('r.a.inner');
    expect(run.values.get('g1/e0/l0.origin')).toBe('r.a.inner.il');
    expect(run.values.get('g1/n0.origin')).toBe('r.a.b');
    expect(run.values.get('g1/n0/l0.origin')).toBe('r.a.b.bl');
    expect(run.values.get('g1/n0/p0.origin')).toBe('r.a.b.q');
    expect(run.values.get('g1/n0/p1.origin')).toBeNull();
    expect(run.values.get('g1/n1.origin')).toBe('r.a.b2');
    expect(run.values.get('g1/n1/p0.origin')).toBeNull();
    expect(run.values.get('g2.origin')).toBe('r.a.b');
    expect(run.values.get('g2/n0.origin')).toBe('r.a.b.bb');
    expect(run.values.get('g2/n0/p0.origin')).toBe('r.a.b.bb.qq');
    expect(run.values.get('g2/n0/p0/l0.origin')).toBeNull();
  });

  it('leaves the empty identifier of the root out of the origin identifiers', () => {
    // oracle: site/strings/origin-identifiers-empty-root-id; ElkGraphTransformer.java:58-78 (getOriginIdentifier, getIdentifier)
    const run = runSiteRow('site/strings/origin-identifiers-empty-root-id');
    expect(run.values.get('g0.origin')).toBeNull();
    expect(run.values.get('g0/e0.origin')).toBe('quiet');
    expect(run.values.get('g0/e1.origin')).toBe('outer');
    expect(run.values.get('g0/e1/l0.origin')).toBeNull();
    expect(run.values.get('g0/n0.origin')).toBe('a');
    expect(run.values.get('g0/n0/l0.origin')).toBeNull();
    expect(run.values.get('g0/n0/p0.origin')).toBe('a.p');
    expect(run.values.get('g0/n0/p0/l0.origin')).toBe('a.p.pl');
    expect(run.values.get('g0/n0/p1.origin')).toBeNull();
    expect(run.values.get('g0/n1.origin')).toBe('c');
    expect(run.values.get('g0/n1/p0.origin')).toBeNull();
    expect(run.values.get('g0/n1/p1.origin')).toBeNull();
    expect(run.values.get('g1.origin')).toBe('a');
    expect(run.values.get('g1/e0.origin')).toBe('a.inner');
    expect(run.values.get('g1/e0/l0.origin')).toBe('a.inner.il');
    expect(run.values.get('g1/n0.origin')).toBe('a.b');
    expect(run.values.get('g1/n0/l0.origin')).toBe('a.b.bl');
    expect(run.values.get('g1/n0/p0.origin')).toBe('a.b.q');
    expect(run.values.get('g1/n0/p1.origin')).toBeNull();
    expect(run.values.get('g1/n1.origin')).toBe('a.b2');
    expect(run.values.get('g1/n1/p0.origin')).toBeNull();
    expect(run.values.get('g2.origin')).toBe('a.b');
    expect(run.values.get('g2/n0.origin')).toBe('a.b.bb');
    expect(run.values.get('g2/n0/p0.origin')).toBe('a.b.bb.qq');
    expect(run.values.get('g2/n0/p0/l0.origin')).toBeNull();
  });
});
