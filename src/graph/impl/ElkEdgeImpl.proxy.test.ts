// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from '../../emf/common/util/URI.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { ResourceImpl } from '../../emf/ecore/resource/impl/ResourceImpl.js';
import { ResourceSetImpl } from '../../emf/ecore/resource/impl/ResourceSetImpl.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import type { ManyInverse } from '../../emf/ecore/util/EObjectWithInverseResolvingEList.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';

const DOC = 'file:/doc.elkj';

/** A resource that resolves `|n` fragments through a fixed table, as `LazyLinkingResource` would. */
class TableResource extends ResourceImpl {
  readonly lookups: string[] = [];

  constructor(private readonly table: ReadonlyMap<string, EObject>) {
    super(URI.createURI(DOC));
    this.setLoaded(true);
  }

  override getEObject(uriFragment: string): EObject | null {
    this.lookups.push(uriFragment);
    return this.table.get(uriFragment) ?? null;
  }
}

interface World {
  root: ElkNode;
  edge: ElkEdge;
  nodes: ElkNode[];
  proxies: ElkNode[];
  resource: TableResource;
}

/** Proxy `|i` for `edgeEnds[i]` (a node index, or `null` for an unresolvable one), installed with `addUnique`. */
function load(nodeCount: number, sources: (number | null)[], targets: (number | null)[]): World {
  const root = ElkGraphUtil.createGraph();
  const nodes = Array.from({ length: nodeCount }, () => ElkGraphUtil.createNode(root));
  const edge = ElkGraphUtil.createEdge(root);
  const table = new Map<string, EObject>();
  const proxies: ElkNode[] = [];
  const install = (list: ManyInverse<ElkNode>, ends: (number | null)[]): void => {
    for (const end of ends) {
      const proxy = ElkGraphUtil.createNode(null);
      const fragment = `|${proxies.length}`;
      proxy.eSetProxyURI(URI.createURI(`${DOC}#${fragment}`));
      if (end !== null) table.set(fragment, nodes[end] as ElkNode);
      proxies.push(proxy);
      list.addUnique(proxy);
    }
  };
  install(edge.getSources() as ManyInverse<ElkNode>, sources);
  install(edge.getTargets() as ManyInverse<ElkNode>, targets);
  const resource = new TableResource(table);
  resource.getContents().add(root);
  new ResourceSetImpl().getResources().add(resource);
  return { root, edge, nodes, proxies, resource };
}

function basic<E extends InternalEObject>(list: ManyInverse<E>): E[] {
  return Array.from({ length: list.size() }, (_, i) => list.basicGet(i));
}

/** The `resolveLazyCrossReferences` step: replace each proxy through `setUnique`. */
function resolveAll(list: ManyInverse<ElkNode>, nodes: readonly ElkNode[], indexes: readonly number[]): void {
  indexes.forEach((nodeIndex, i) => list.setUnique(i, nodes[nodeIndex] as ElkNode));
}

describe('link-node-to-node', () => {
  it('holds the edge in each proxy after load and nowhere else', () => {
    const { edge, nodes, proxies } = load(2, [0], [1]);
    expect(basic(proxies[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(basic(proxies[1]!.getIncomingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(nodes.map((n) => n.getOutgoingEdges().size() + n.getIncomingEdges().size())).toEqual([0, 0]);
    expect(proxies[0]!.eIsProxy()).toBe(true);
  });

  it('resolves on access without adding the edge to the target; the proxy keeps it', () => {
    const { edge, nodes, proxies } = load(2, [0], [1]);
    expect(edge.getSources().get(0)).toBe(nodes[0]);
    expect(edge.getTargets().get(0)).toBe(nodes[1]);
    expect(nodes[0]!.getOutgoingEdges().size()).toBe(0);
    expect(nodes[1]!.getIncomingEdges().size()).toBe(0);
    expect(basic(proxies[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(basic(proxies[1]!.getIncomingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(basic(edge.getSources() as ManyInverse<ElkNode>)).toEqual([nodes[0]]);
  });

  it('moves the edge from the proxy to the target on setUnique', () => {
    const { edge, nodes, proxies } = load(2, [0], [1]);
    resolveAll(edge.getSources() as ManyInverse<ElkNode>, nodes, [0]);
    resolveAll(edge.getTargets() as ManyInverse<ElkNode>, nodes, [1]);
    expect(basic(nodes[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(basic(nodes[1]!.getIncomingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(proxies[0]!.getOutgoingEdges().size()).toBe(0);
    expect(proxies[1]!.getIncomingEdges().size()).toBe(0);
  });
});

describe('link-unresolved-source', () => {
  it('keeps the same proxy on every access while the target still resolves', () => {
    const { edge, nodes, proxies, resource } = load(1, [null], [0]);
    expect(edge.getSources().get(0)).toBe(proxies[0]);
    expect(edge.getSources().get(0)).toBe(proxies[0]);
    expect(edge.getTargets().get(0)).toBe(nodes[0]);
    expect(resource.lookups).toEqual(['|0', '|0', '|1']);
    expect(basic(proxies[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(nodes[0]!.getOutgoingEdges().size()).toBe(0);
  });
});

describe('link-repeated-reference', () => {
  it('resolves both sources to the same node without a duplicate check', () => {
    const { edge, nodes, proxies } = load(1, [0, 0], [0]);
    expect(edge.getSources().get(0)).toBe(nodes[0]);
    expect(edge.getSources().get(1)).toBe(nodes[0]);
    expect(edge.getSources().size()).toBe(2);
    expect(basic(proxies[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(basic(proxies[1]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(nodes[0]!.getOutgoingEdges().size()).toBe(0);
  });

  it('adds the edge to the target once per reference on setUnique', () => {
    const { edge, nodes } = load(1, [0, 0], [0]);
    resolveAll(edge.getSources() as ManyInverse<ElkNode>, nodes, [0, 0]);
    expect(basic(nodes[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge, edge]);
  });
});

describe('link-self-loop', () => {
  it('adds nothing to the node when only accessed', () => {
    const { edge, nodes } = load(1, [0], [0]);
    expect(edge.getSources().get(0)).toBe(nodes[0]);
    expect(edge.getTargets().get(0)).toBe(nodes[0]);
    expect(nodes[0]!.getOutgoingEdges().size() + nodes[0]!.getIncomingEdges().size()).toBe(0);
  });

  it('adds the edge to both lists of the node on access-free setUnique, leaving the proxies empty', () => {
    const { edge, nodes, proxies } = load(1, [0], [0]);
    resolveAll(edge.getSources() as ManyInverse<ElkNode>, nodes, [0]);
    resolveAll(edge.getTargets() as ManyInverse<ElkNode>, nodes, [0]);
    expect(basic(nodes[0]!.getOutgoingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(basic(nodes[0]!.getIncomingEdges() as ManyInverse<ElkEdge>)).toEqual([edge]);
    expect(proxies.map((p) => p.getOutgoingEdges().size() + p.getIncomingEdges().size())).toEqual([0, 0]);
  });
});

describe('connectable shape lists', () => {
  it('resolves a proxy edge in outgoingEdges and incomingEdges through the owner resource', () => {
    const root = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(root);
    const real = ElkGraphUtil.createEdge(root);
    const resource = new TableResource(new Map([['|0', real]]));
    resource.getContents().add(root);
    new ResourceSetImpl().getResources().add(resource);
    const proxyEdge = ElkGraphUtil.createEdge(null);
    proxyEdge.eSetProxyURI(URI.createURI(`${DOC}#|0`));
    const outgoing = node.getOutgoingEdges() as ManyInverse<ElkEdge>;
    const incoming = node.getIncomingEdges() as ManyInverse<ElkEdge>;
    outgoing.addUnique(proxyEdge);
    incoming.addUnique(proxyEdge);
    expect(outgoing.get(0)).toBe(real);
    expect(incoming.get(0)).toBe(real);
    expect(outgoing.basicGet(0)).toBe(real);
  });
});
