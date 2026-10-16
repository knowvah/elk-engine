// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from '../../../emf/common/util/URI.js';
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { ResourceImpl } from '../../../emf/ecore/resource/impl/ResourceImpl.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { StringBuilder } from '../../../java/lang/StringBuilder.js';
import { ResourceNode } from '../../../../test/helpers/emf/ResourceNode.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ILazyLinkingResource, LazyProxyInformation } from './ILazyLinkingResource.js';
import type { ILazyNode, LazyURIEncoderMetamodel } from './LazyLinkingMetamodel.js';
import { LazyURIEncoder } from './LazyURIEncoder.js';

const CHILDREN_ID = 0;
const TARGET_ID = 7;
const SINGLE_ID = 8;

function reference(name: string, upperBound: number): EReferenceInfo {
  return {
    name,
    referenceType: { name: 'ElkNode', isAssignableFrom: () => true },
    upperBound,
    unique: true,
    containment: name === 'children',
    container: false,
    derived: false,
    changeable: true,
    transient: false,
  };
}
const CHILDREN = reference('children', -1);
const TARGETS = reference('targets', -1);
const SINGLE = reference('single', 1);
const BY_ID = new Map([
  [CHILDREN_ID, CHILDREN],
  [TARGET_ID, TARGETS],
  [SINGLE_ID, SINGLE],
]);

class TreeNode implements ILazyNode {
  parent: TreeNode | null = null;
  readonly children: TreeNode[];
  constructor(
    readonly name: string,
    ...children: TreeNode[]
  ) {
    this.children = children;
    for (const child of children) child.parent = this;
  }
  getParent(): ILazyNode | null {
    return this.parent;
  }
  getFirstChild(): ILazyNode | null {
    return this.children[0] ?? null;
  }
  getNextSibling(): ILazyNode | null {
    return this.parent?.children[this.parent.children.indexOf(this) + 1] ?? null;
  }
  hasNextSibling(): boolean {
    return this.getNextSibling() !== null;
  }
  getStartLine(): number {
    return 1;
  }
  getText(): string {
    return this.name;
  }
  getSemanticElement(): EObject | null {
    return null;
  }
}

class LazyResource extends ResourceImpl implements ILazyLinkingResource {
  readonly lazyLinkingResource = true as const;
  readonly triples: LazyProxyInformation[] = [];
  addLazyProxyInformation(obj: EObject, ref: EReferenceInfo, node: INode): number {
    this.triples.push({ getFirst: () => obj, getSecond: () => ref, getThird: () => node });
    return this.triples.length - 1;
  }
  getLazyProxyInformation(idx: number): LazyProxyInformation | null {
    return this.triples[idx] ?? null;
  }
}

function metamodel(nodes: Map<EObject, TreeNode>): LazyURIEncoderMetamodel {
  return {
    getNode: (obj) => nodes.get(obj) ?? null,
    toTreeNode: (node) => node as TreeNode,
    eContainmentFeature: (obj) => (obj.eContainer() === null ? null : CHILDREN),
    getFeatureID: (_c: EClass, ref) => [...BY_ID].find(([, r]) => r === ref)?.[0] as number,
    getEStructuralFeature: (_c: EClass, id) => BY_ID.get(id) as EReferenceInfo,
    eGetOne: (obj) => (obj as ResourceNode).children.get(0),
    eGetMany: (obj) => (obj as ResourceNode).children.toArray(),
  };
}

/** Root R (contents[0]) with children A and C; C has the node tree ccomp = [leaf0, [leaf1]]. */
function fixture(useIndex: boolean) {
  const [r, a, c] = [new ResourceNode('r'), new ResourceNode('a'), new ResourceNode('c')];
  r.children.addAll([a, c]);
  const resource = new LazyResource(URI.createURI('file:/doc.elkj'));
  resource.getContents().add(r);
  const inner = new TreeNode('inner', new TreeNode('l1'));
  const ccomp = new TreeNode('ccomp', new TreeNode('l0'), inner);
  const rcomp = new TreeNode('rcomp', new TreeNode('x'));
  const nodes = new Map<EObject, TreeNode>([
    [r, rcomp],
    [c, ccomp],
  ]);
  return { r, a, c, resource, ccomp, inner, rcomp, encoder: new LazyURIEncoder(metamodel(nodes), useIndex) };
}

describe('LazyURIEncoder index form', () => {
  it('encodes as |n in call order and decodes the recorded triple', () => {
    const { a, c, resource, encoder, inner } = fixture(true);
    expect(encoder.encode(c, TARGETS, inner)).toBe('|0');
    expect(encoder.encode(a, SINGLE, inner)).toBe('|1');
    const triple = encoder.decode(resource, '|1');
    expect([triple.getFirst(), triple.getSecond(), triple.getThird()]).toEqual([a, SINGLE, inner]);
    expect(encoder.getNode(c, '|0')).toBe(inner);
    expect(encoder.getIndex('|12')).toBe(12);
  });

  it('rejects an unparsable index, naming the fragment and keeping the cause', () => {
    const { encoder } = fixture(true);
    let caught: unknown;
    try {
      encoder.getIndex('|x');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(IllegalArgumentException);
    expect((caught as Error).message).toBe("Couldn't parse index from fragment '|x'");
    expect(((caught as Error).cause as Error).message).toBe('For input string: "x"');
  });

  it('requires a lazy linking resource', () => {
    const { encoder } = fixture(true);
    const plain = new ResourceImpl(URI.createURI('file:/p.elkj'));
    const lone = new ResourceNode('lone');
    plain.getContents().add(lone);
    class Exposed extends LazyURIEncoder {
      index(obj: EObject, ref: EReferenceInfo, node: INode): string {
        return this.getIndexFragment(obj, ref, node);
      }
      triple(res: ResourceImpl, fragment: string): LazyProxyInformation {
        return this.getLazyProxyInformation(res, fragment);
      }
    }
    const exposed = new Exposed({} as LazyURIEncoderMetamodel, true);
    expect(() => exposed.index(lone, TARGETS, new TreeNode('t'))).toThrow(IllegalStateException);
    expect(() => exposed.triple(plain, '|0')).toThrow('Given resource not a LazyLinkingResource');
  });

  it('classifies fragments by the leading bar', () => {
    const { encoder, resource } = fixture(true);
    expect(encoder.isCrossLinkFragment(resource, '|3')).toBe(true);
    expect(encoder.isCrossLinkFragment(resource, '/0/1')).toBe(false);
    expect(encoder.isCrossLinkFragment(resource, null)).toBe(false);
  });

  it('uses the index form only when the flag is set and the context is a lazy linking resource', () => {
    const { encoder, resource } = fixture(true);
    expect(encoder.isUseIndexFragment(resource)).toBe(true);
    expect(encoder.isUseIndexFragment(new ResourceImpl())).toBe(false);
    expect(encoder.isUseIndexFragment(null)).toBe(false);
    expect(fixture(false).encoder.isUseIndexFragment(resource)).toBe(false);
  });
});

describe('LazyURIEncoder long form', () => {
  it('encodes object path, feature id and node path, and decodes the same triple', () => {
    const { c, resource, encoder, inner } = fixture(false);
    const leaf = inner.children[0] as TreeNode;
    const fragment = encoder.encode(c, TARGETS, leaf);
    expect(fragment).toBe('|::0.0.1::7::/1/0');
    const triple = encoder.decode(resource, fragment);
    expect([triple.getFirst(), triple.getSecond(), triple.getThird()]).toEqual([c, TARGETS, leaf]);
    expect(encoder.getNode(c, fragment)).toBe(leaf);
  });

  it('encodes a root by its index in the resource contents', () => {
    const { r, encoder, rcomp } = fixture(false);
    expect(encoder.encode(r, TARGETS, rcomp.children[0] as TreeNode)).toBe('|::0::7::/0');
  });

  it('walks up with .. when the node is outside the object subtree', () => {
    const { ccomp, encoder } = fixture(false);
    const outer = new TreeNode('outer', ccomp, new TreeNode('sibling'));
    const out = new StringBuilder();
    encoder.getRelativePath(out, ccomp, outer.children[1] as TreeNode);
    expect(out.toString()).toBe('/../1');
    expect(encoder.getNodeAtPath(ccomp, '/../1')).toBe(outer.children[1]);
  });

  it('counts a sibling index up to the last child', () => {
    const { ccomp, encoder } = fixture(false);
    const out = new StringBuilder();
    encoder.getRelativePath(out, ccomp, ccomp.children[1] as TreeNode);
    expect(out.toString()).toBe('/1');
  });

  it('resolves short fragments through single-valued references and rejects bad ones', () => {
    const { r, a, resource, encoder } = fixture(false);
    expect(encoder.resolveShortFragment(resource, '0')).toBe(r);
    expect(encoder.resolveShortFragment(resource, '0.0.1')).toBe(r.children.get(1));
    expect(encoder.resolveShortFragment(resource, '0.8')).toBe(a);
    expect(encoder.fromShortExternalForm({ getName: () => 'x' }, '7')).toBe(TARGETS);
    expect(() => encoder.resolveShortFragment(resource, 'q')).toThrow('For input string: "q"');
  });

  it('fails on a missing node model and on a missing parent', () => {
    const { a, resource, encoder, ccomp } = fixture(false);
    expect(() => encoder.decode(resource, '|::0.0.0::7::/0')).toThrow(
      "Couldn't resolve lazy link, because no node model is attached.",
    );
    expect(() => encoder.getNode(a, '|::0.0.0::7::/0')).toThrow(IllegalStateException);
    expect(() => encoder.getNodeAtPath(ccomp, '/../..')).toThrow('node has no parent');
  });

  it('ignores blank path segments and negative indexes', () => {
    const { ccomp, encoder } = fixture(false);
    expect(encoder.getNodeAtPath(ccomp, '')).toBe(ccomp);
    expect(encoder.getNodeAtPath(ccomp, '/ /-1')).toBe(ccomp);
    expect(encoder.getNodeAtPath(ccomp, '/1/0').getText()).toBe('l1');
  });
});
