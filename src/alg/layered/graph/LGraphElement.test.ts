// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkGraphElement } from '../../../graph/ElkGraphElement.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LEdge } from './LEdge.js';
import { LGraph } from './LGraph.js';
import { LGraphElement } from './LGraphElement.js';
import { LLabel } from './LLabel.js';
import { LNode } from './LNode.js';
import { LPort } from './LPort.js';

class Element extends LGraphElement {}

describe('LGraphElement', () => {
  it('starts with id 0 and the id is freely assignable', () => {
    const element = new Element();
    expect(element.id).toBe(0);
    element.id = 7;
    expect(element.id).toBe(7);
  });

  it('has no designation without an origin', () => {
    expect(new Element().getDesignation()).toBeNull();
  });

  it('designates itself with the identifier of its origin', () => {
    const element = new Element();
    const node = ElkGraphUtil.createGraph();
    node.setIdentifier('origin1');
    element.setProperty(InternalProperties.ORIGIN, node);
    expect(element.getDesignation()).toBe('origin1');
  });

  it('has no designation when the origin is not an ElkGraph element', () => {
    const element = new Element();
    element.setProperty(InternalProperties.ORIGIN, 'not an element');
    expect(element.getDesignation()).toBeNull();
  });
});

describe('LGraphElement designation and strings with an origin (oracle row)', () => {
  /** r (the root) holds a (port p, child b with port q) and the edge outer, as in the recorder's input graph. */
  function elkElements(): Record<'root' | 'a' | 'p' | 'outer' | 'q', ElkGraphElement> {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('r');
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const p = ElkGraphUtil.createPort(a);
    p.setIdentifier('p');
    const b = ElkGraphUtil.createNode(a);
    b.setIdentifier('b');
    const q = ElkGraphUtil.createPort(b);
    q.setIdentifier('q');
    const outer = ElkGraphUtil.createEdge(root);
    outer.setIdentifier('outer');
    return { root, a, p, outer, q };
  }

  const withOrigin = <T extends LGraphElement>(element: T, origin: unknown): T => {
    element.setProperty(InternalProperties.ORIGIN, origin);
    return element;
  };
  const strings = (e: LGraphElement & { toString(): string }): (string | null)[] => [e.toString(), e.getDesignation()];

  // oracle: site/strings/origin-set-by-steps; LGraphElement.java:51
  it('names nodes, ports, edges, labels and graphs by the dot-joined identifiers of their origin', () => {
    const elk = elkElements();
    expect(strings(withOrigin(new LNode(new LGraph()), elk.a))).toEqual(['n_r.a', 'r.a']);
    expect(strings(withOrigin(new LPort(), elk.p))).toEqual(['p_r.a.p', 'r.a.p']);
    expect(strings(withOrigin(new LEdge(), elk.outer))).toEqual(['e_r.outer', 'r.outer']);
    expect(strings(withOrigin(new LLabel(), elk.q))).toEqual(['l_r.a.b.q', 'r.a.b.q']);
    expect(strings(withOrigin(new LLabel('text wins'), elk.q))).toEqual(['l_text wins', 'text wins']);
    // Java's LLabel(String) accepts null, which Guava's isNullOrEmpty treats like ""
    expect(strings(withOrigin(new LLabel(null as unknown as string), elk.a))).toEqual(['l_r.a', 'r.a']);
    expect(strings(withOrigin(new LGraph(), elk.root))).toEqual(['G-unlayered[]', 'r']);
  });

  it('labels win over the origin for nodes, an empty label does not; foreign origins and no origin give the index', () => {
    const elk = elkElements();
    const graph = new LGraph();
    const emptyLabelled = withOrigin(new LNode(graph), elk.a);
    emptyLabelled.getLabels().push(new LLabel());
    expect(strings(emptyLabelled)).toEqual(['n_r.a', 'r.a']);
    const labelled = withOrigin(new LNode(graph), elk.a);
    labelled.getLabels().push(new LLabel('caption'));
    expect(strings(labelled)).toEqual(['n_caption', 'caption']);
    expect(strings(withOrigin(new LNode(graph), labelled))).toEqual(['n_-1', '-1']);
    expect(strings(new LNode(graph))).toEqual(['n_-1', '-1']);
    expect(strings(new LPort())).toEqual(['p_-1', '-1']);
    expect(strings(new LEdge())).toEqual(['e_', null]);
    expect(strings(new LLabel())).toEqual(['label', null]);
  });
});
