// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from '../../../emf/common/util/URI.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../emf/ecore/InternalEObject.js';
import { ResourceImpl } from '../../../emf/ecore/resource/impl/ResourceImpl.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { ResourceNode } from '../../../../test/helpers/emf/ResourceNode.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { IDiagnosticProducer } from '../../diagnostics/IDiagnosticProducer.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { INode } from '../../nodemodel/INode.js';
import type { INodeModel } from '../../nodemodel/INodeModel.js';
import { ReferenceNode } from '../../parser/ReferenceNode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ILazyLinkingResource, LazyProxyInformation } from './ILazyLinkingResource.js';
import { LazyLinker } from './LazyLinker.js';
import type { LazyEClass, LazyEPackage, LazyLinkerMetamodel, LazyURIEncoderMetamodel } from './LazyLinkingMetamodel.js';
import { LazyURIEncoder } from './LazyURIEncoder.js';

function reference(name: string, upperBound: number, containment = false): EReferenceInfo {
  return {
    name,
    referenceType: { name: 'Shape', isAssignableFrom: () => true },
    upperBound,
    unique: true,
    containment,
    container: false,
    derived: false,
    changeable: true,
    transient: false,
  };
}
const CHILDREN = reference('children', -1, true);
const TARGETS = reference('targets', -1);
const SINGLE = reference('single', 1);
const QUEUED_LIST = reference('queuedList', -1);
const QUEUED_ONE = reference('queuedOne', 1);
const ALL = [CHILDREN, TARGETS, SINGLE, QUEUED_LIST, QUEUED_ONE];
const NOT_RESOLVING = new Set([QUEUED_LIST, QUEUED_ONE]);

/** A node with the four non-containment features of the fixture. */
class LNode extends ResourceNode {
  targets: EObject[] = [];
  single: EObject | null = null;
  queuedList: EObject[] = [];
  queuedOne: EObject | null = null;
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

interface ClassSpec {
  readonly name: string;
  readonly abstract?: boolean;
  readonly iface?: boolean;
  readonly sub?: boolean;
}

function makePackage(nsURI: string, specs: readonly ClassSpec[], superOf: (c: ClassSpec) => boolean) {
  const calls = { getEClassifiers: 0 };
  const classes: LazyEClass[] = [];
  const pkg: LazyEPackage = {
    getNsURI: () => nsURI,
    getEClassifiers: () => {
      calls.getEClassifiers++;
      return classes;
    },
  };
  for (const spec of specs) {
    classes.push({
      getName: () => spec.name,
      isAbstract: () => spec.abstract === true,
      isInterface: () => spec.iface === true,
      getEPackage: () => pkg,
      isAssignableFrom: () => superOf(spec),
    });
  }
  return { pkg, classes, calls };
}

const UNRELATED = 'Unrelated';
const SUBS = (c: ClassSpec): boolean => c.sub === true;

function setup(
  options: { shape?: Partial<ClassSpec>; local?: ClassSpec[]; grammar?: ClassSpec[]; registry?: ClassSpec[] } = {},
) {
  const local = makePackage('urn:local', options.local ?? [{ name: 'Concrete', sub: true }], SUBS);
  const shape: LazyEClass = {
    getName: () => 'Shape',
    isAbstract: () => options.shape?.abstract ?? true,
    isInterface: () => options.shape?.iface ?? false,
    getEPackage: () => local.pkg,
    isAssignableFrom: (c) => c.getName() !== UNRELATED,
  };
  const grammar = makePackage('urn:grammar', options.grammar ?? [], SUBS);
  const registry = makePackage('urn:registry', options.registry ?? [], SUBS);
  const registered = new Map<string, LazyEPackage>([
    ['urn:local', local.pkg],
    ['urn:grammar', grammar.pkg],
    ['urn:registry', registry.pkg],
  ]);
  const log: string[] = [];
  const metamodel: LazyLinkerMetamodel = {
    getEAllReferences: () => ALL,
    getReference: (_obj, feature) => ALL.find((r) => r.name === feature) ?? null,
    eUnset: (obj, ref) => {
      const node = obj as LNode;
      if (ref === TARGETS) node.targets = [];
      if (ref === SINGLE) node.single = null;
      if (ref === QUEUED_LIST) node.queuedList = [];
      if (ref === QUEUED_ONE) node.queuedOne = null;
    },
    eSet: (obj, ref, value) => {
      log.push(`eSet:${ref.name}`);
      if (ref === SINGLE) (obj as LNode).single = value;
      if (ref === QUEUED_ONE) (obj as LNode).queuedOne = value;
    },
    eGetList: (obj, ref) => ({
      addAll: (values) => {
        log.push(`addAll:${ref.name}`);
        const node = obj as LNode;
        (ref === TARGETS ? node.targets : node.queuedList).push(...values);
        return true;
      },
    }),
    isResolveProxies: (ref) => !NOT_RESOLVING.has(ref),
    addUnique: (obj, _ref, proxy) => {
      log.push('addUnique:targets');
      (obj as LNode).targets.push(proxy);
    },
    getReferenceType: () => shape,
    getMetamodelPackages: () => [local.pkg, grammar.pkg],
    getRegistry: () => ({
      keySet: () => [...registered.keys()],
      getEPackage: (ns) => registered.get(ns) as LazyEPackage,
    }),
  };
  return { metamodel, shape, local, grammar, registry, log };
}

class Linker extends LazyLinker {
  readonly created: string[] = [];
  readonly after: string[] = [];
  skipLeafless = new Set<string>();

  protected override createInstance(eClass: LazyEClass): InternalEObject {
    this.created.push(eClass.getName());
    return new ResourceNode(`proxy:${eClass.getName()}`);
  }
  protected override afterCreateAndSetProxy(
    obj: EObject,
    node: INode,
    eRef: EReferenceInfo,
    p: IDiagnosticProducer,
  ): void {
    this.after.push(`${(obj as LNode).id}.${eRef.name}:${node.getText()}`);
    super.afterCreateAndSetProxy(obj, node, eRef, p);
  }
  protected override hasLeafNodes(node: INode): boolean {
    return !this.skipLeafless.has(node.getText());
  }
  proxyType(obj: EObject, ref: EReferenceInfo): LazyEClass {
    return this.getProxyType(obj, ref);
  }
  exposedCreateProxy(obj: EObject, node: INode, ref: EReferenceInfo): EObject {
    return this.createProxy(obj, node, ref);
  }
}

const CONSUMER: IDiagnosticConsumer = {
  consume: () => {
    throw new Error('no diagnostic expected');
  },
  hasConsumedDiagnostics: () => false,
};

function refNode(owner: EObject, feature: string, text: string, index = 0): ReferenceNode {
  return new ReferenceNode({ owner, feature, index, ruleName: 'ID', text, line: 1 });
}

function model(table: Map<EObject, ICrossReferenceNode[]>): INodeModel {
  return { getCrossReferenceNodes: (obj) => table.get(obj) ?? null };
}

function build(options: Parameters<typeof setup>[0] = {}) {
  const parts = setup(options);
  const [r, a, c] = [new LNode('r'), new LNode('a'), new LNode('c')];
  r.children.addAll([a, c]);
  const resource = new LazyResource(URI.createURI('file:/doc.elkj'));
  resource.getContents().add(r);
  const table = new Map<EObject, ICrossReferenceNode[]>();
  const encoder = new LazyURIEncoder({} as LazyURIEncoderMetamodel, true);
  const linker = new Linker(parts.metamodel, model(table), encoder);
  return { ...parts, r, a, c, resource, table, encoder, linker };
}

describe('LazyLinker proxy installation', () => {
  it('installs proxies pre-order, text order within an object, with fragments |0..|n and no diagnostic', () => {
    const t = build();
    t.table.set(t.r, [refNode(t.r, 'targets', 'c'), refNode(t.r, 'targets', 'a', 1)]);
    t.table.set(t.a, [refNode(t.a, 'single', 'c')]);
    t.table.set(t.c, [refNode(t.c, 'targets', 'a')]);
    t.linker.linkModel(t.r, CONSUMER);
    const fragments = (list: EObject[]): (string | undefined)[] =>
      list.map((p) => (p as InternalEObject).eProxyURI()?.toString());
    expect(fragments(t.r.targets)).toEqual(['file:/doc.elkj#|0', 'file:/doc.elkj#|1']);
    expect(fragments([t.a.single as EObject])).toEqual(['file:/doc.elkj#|2']);
    expect(fragments(t.c.targets)).toEqual(['file:/doc.elkj#|3']);
    expect(
      t.resource.triples.map((x) => [(x.getFirst() as LNode).id, x.getSecond().name, x.getThird().getText()]),
    ).toEqual([
      ['r', 'targets', 'c'],
      ['r', 'targets', 'a'],
      ['a', 'single', 'c'],
      ['c', 'targets', 'a'],
    ]);
    expect(t.linker.created).toEqual(['Concrete', 'Concrete', 'Concrete', 'Concrete']);
  });

  it('uses addUnique for many-valued and eSet for single-valued references', () => {
    const t = build();
    t.table.set(t.a, [refNode(t.a, 'targets', 'x'), refNode(t.a, 'single', 'y')]);
    t.linker.linkModel(t.r, CONSUMER);
    expect(t.log).toEqual(['addUnique:targets', 'eSet:single']);
    expect(t.linker.after).toEqual(['a.targets:x', 'a.single:y']);
  });

  it('clears non-containment references before installing', () => {
    const t = build();
    t.a.targets = [t.c];
    t.a.single = t.c;
    t.linker.linkModel(t.r, CONSUMER);
    expect([t.a.targets, t.a.single]).toEqual([[], null]);
  });

  it('skips objects without a node and nodes without leaves', () => {
    const t = build();
    t.table.set(t.a, [refNode(t.a, 'targets', 'gone'), refNode(t.a, 'targets', 'kept', 1)]);
    t.linker.skipLeafless.add('gone');
    t.linker.linkModel(t.r, CONSUMER);
    expect(t.a.targets).toHaveLength(1);
    expect(t.linker.after).toEqual(['a.targets:kept']);
    expect(t.c.targets).toEqual([]);
  });

  it('skips an object whose references are all containments', () => {
    const t = build();
    t.table.set(t.a, [refNode(t.a, 'targets', 'x')]);
    const only = { ...t.metamodel, getEAllReferences: () => [CHILDREN] };
    new Linker(only, model(t.table), t.encoder).linkModel(t.r, CONSUMER);
    expect(t.resource.triples).toHaveLength(0);
  });

  it('fails when a node names a feature the object does not have', () => {
    const t = build();
    t.table.set(t.a, [refNode(t.a, 'nope', 'x')]);
    expect(() => t.linker.linkModel(t.r, CONSUMER)).toThrow(
      new IllegalStateException("Couldn't find EReference for crossreference 'ElkNode::nope'."),
    );
  });

  it('refuses to create a proxy for an object outside a resource', () => {
    const t = build();
    expect(() => t.linker.exposedCreateProxy(new ResourceNode('lone'), refNode(t.a, 'single', 'x'), SINGLE)).toThrow(
      'object must be contained in a resource',
    );
  });

  it('queues links of non-resolving references: every node of a list, the first of a single', () => {
    const t = build();
    t.table.set(t.a, [
      refNode(t.a, 'queuedList', 'p'),
      refNode(t.a, 'queuedOne', 'q'),
      refNode(t.a, 'queuedList', 'r', 1),
      refNode(t.a, 'queuedOne', 'ignored', 1),
    ]);
    t.linker.linkModel(t.r, CONSUMER);
    expect(t.a.queuedList).toHaveLength(2);
    expect(t.a.queuedOne).not.toBeNull();
    expect(t.log).toEqual(['addAll:queuedList', 'addAll:queuedList', 'eSet:queuedOne']);
    expect(t.linker.created).toHaveLength(3);
    expect(t.resource.triples.map((x) => x.getThird().getText())).toEqual(['p', 'r', 'q']);
  });
});

describe('LazyLinker proxy type', () => {
  it('takes the first instantiable subtype of the package in declaration order', () => {
    const t = build({
      local: [
        { name: 'Abstract', abstract: true, sub: true },
        { name: 'Iface', iface: true, sub: true },
        { name: UNRELATED },
        { name: 'First', sub: true },
        { name: 'Second', sub: true },
      ],
    });
    expect(t.linker.proxyType(t.a, SINGLE).getName()).toBe('First');
  });

  it('returns a concrete reference type unchanged and treats an interface like an abstract class', () => {
    const concrete = build({ shape: { abstract: false } });
    expect(concrete.linker.proxyType(concrete.a, SINGLE)).toBe(concrete.shape);
    const iface = build({ shape: { abstract: false, iface: true } });
    expect(iface.linker.proxyType(iface.a, SINGLE).getName()).toBe('Concrete');
  });

  it('falls back to the grammar packages, then the registry, skipping visited packages', () => {
    const viaGrammar = build({ local: [], grammar: [{ name: 'G', sub: true }], registry: [{ name: 'R', sub: true }] });
    expect(viaGrammar.linker.proxyType(viaGrammar.a, SINGLE).getName()).toBe('G');
    expect(viaGrammar.registry.calls.getEClassifiers).toBe(0);
    const viaRegistry = build({ local: [], registry: [{ name: 'R', sub: true }] });
    expect(viaRegistry.linker.proxyType(viaRegistry.a, SINGLE).getName()).toBe('R');
    expect(viaRegistry.local.calls.getEClassifiers).toBe(1);
    expect(viaRegistry.grammar.calls.getEClassifiers).toBe(1);
  });

  it('throws when no instantiable subtype exists anywhere', () => {
    const t = build({ local: [] });
    expect(() => t.linker.proxyType(t.a, SINGLE)).toThrow(
      "Could not find an instantiable subtype for type: 'Shape' (urn:local).",
    );
  });

  it('caches the answer per reference type', () => {
    const t = build();
    t.linker.proxyType(t.a, SINGLE);
    t.linker.proxyType(t.c, TARGETS);
    expect(t.local.calls.getEClassifiers).toBe(1);
  });
});

describe('LazyLinker defaults and accessors', () => {
  it('has no object factory in the base class', () => {
    const t = build();
    const base = new LazyLinker(t.metamodel, model(t.table), t.encoder);
    t.table.set(t.a, [refNode(t.a, 'single', 'x')]);
    expect(() => base.linkModel(t.r, CONSUMER)).toThrow(
      "No factory for 'Concrete': override createInstance or createProxy",
    );
  });

  it('exposes its encoder and registry', () => {
    const t = build();
    expect(t.linker.getEncoder()).toBe(t.encoder);
    expect(t.linker.getRegistry().keySet()).toEqual(['urn:local', 'urn:grammar', 'urn:registry']);
  });
});
