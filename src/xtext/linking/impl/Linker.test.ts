// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicEList } from '../../../emf/common/util/BasicEList.js';
import type { EList } from '../../../emf/common/util/EList.js';
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ValueConverterException } from '../../conversion/ValueConverterException.js';
import type { IValueConverterService } from '../../conversion/IValueConverterService.js';
import type { Diagnostic } from '../../diagnostics/Diagnostic.js';
import { LINKING_DIAGNOSTIC } from '../../diagnostics/Diagnostic.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { IDiagnosticProducer } from '../../diagnostics/IDiagnosticProducer.js';
import { Severity } from '../../diagnostics/Severity.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { INodeModel } from '../../nodemodel/INodeModel.js';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { IScope } from '../../scoping/IScope.js';
import type { ILinkingService } from '../ILinkingService.js';
import { DefaultLinkingService } from './DefaultLinkingService.js';
import { Linker } from './Linker.js';
import { LinkingDiagnosticMessageProvider } from './LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from './LinkingHelper.js';
import type { ReferenceAccess } from './ReferenceAccess.js';
import { dotConverter, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import type { ILinkingDiagnosticContext } from '../ILinkingDiagnosticMessageProvider.js';

// ---- toy model: a tree of named objects with a single, a unique many and a derived `back` reference ----

const OBJ_CLASS: EClass = { getName: (): string => 'Obj' };
const SHAPE_TYPE_NAME = 'ElkConnectableShape';
const ANY_TYPE = { name: 'Obj', isAssignableFrom: (): boolean => true };
const FLAGS = { containment: false, container: false, derived: false, changeable: true, transient: false };

const SINGLE: EReferenceInfo = { name: 'single', referenceType: ANY_TYPE, upperBound: 1, unique: true, ...FLAGS };
const MANY: EReferenceInfo = {
  name: 'many',
  referenceType: { name: SHAPE_TYPE_NAME, isAssignableFrom: (): boolean => true },
  upperBound: -1,
  unique: true,
  ...FLAGS,
};
/** The EMF opposite of `single`: the objects whose `single` points here. */
const BACK: EReferenceInfo = { name: 'back', referenceType: ANY_TYPE, upperBound: -1, unique: true, ...FLAGS };
const ALL_REFERENCES: readonly EReferenceInfo[] = [SINGLE, MANY, BACK];

class Obj implements EObject {
  single: Obj | null = null;
  many: Obj[] = [];
  back: Obj[] = [];
  readonly children: Obj[];

  constructor(
    readonly name: string,
    ...children: Obj[]
  ) {
    this.children = children;
  }

  eClass(): EClass {
    return OBJ_CLASS;
  }

  eContainer(): EObject | null {
    return null;
  }

  eContents(): EList<EObject> {
    const list = new BasicEList<EObject>();
    for (const child of this.children) list.add(child);
    return list;
  }

  eAllContents(): IterableIterator<EObject> {
    return this.children[Symbol.iterator]();
  }
}

class ToyAccess implements ReferenceAccess {
  getEAllReferences(): readonly EReferenceInfo[] {
    return ALL_REFERENCES;
  }

  getReference(_obj: EObject, featureName: string): EReferenceInfo | null {
    return ALL_REFERENCES.find((ref) => ref.name === featureName) ?? null;
  }

  eUnset(obj: EObject, ref: EReferenceInfo): void {
    const o = obj as Obj;
    if (ref === SINGLE) {
      if (o.single !== null) o.single.back = o.single.back.filter((b) => b !== o);
      o.single = null;
    } else if (ref === MANY) {
      o.many = [];
    } else {
      for (const b of o.back) b.single = null;
      o.back = [];
    }
  }

  eSet(obj: EObject, ref: EReferenceInfo, value: EObject): void {
    const o = obj as Obj;
    this.eUnset(o, ref);
    o.single = value as Obj;
    (value as Obj).back.push(o);
  }

  eGetList(obj: EObject): { addAll(values: readonly EObject[]): boolean } {
    const o = obj as Obj;
    return {
      addAll: (values): boolean => {
        const fresh = (values as readonly Obj[]).filter((v) => !o.many.includes(v));
        o.many.push(...fresh);
        return fresh.length > 0;
      },
    };
  }
}

function xref(feature: string, text: string, line: number, ruleName = 'ID'): ICrossReferenceNode {
  return { ruleName, feature, index: 0, getText: () => text, getStartLine: () => line, getSemanticElement: () => null };
}

class ToyNodes implements INodeModel {
  readonly #nodes = new Map<EObject, ICrossReferenceNode[]>();

  with(obj: Obj, ...nodes: ICrossReferenceNode[]): this {
    this.#nodes.set(obj, nodes);
    return this;
  }

  getCrossReferenceNodes(obj: EObject): readonly ICrossReferenceNode[] | null {
    return this.#nodes.get(obj) ?? null;
  }
}

class Collector implements IDiagnosticConsumer {
  readonly diagnostics: { message: string | null; severity: Severity; line: number; code: string | null }[] = [];

  consume(diagnostic: Diagnostic, severity: Severity): void {
    const code = (diagnostic as unknown as { getCode(): string | null }).getCode();
    this.diagnostics.push({ message: diagnostic.getMessage(), severity, line: diagnostic.getLine(), code });
  }

  hasConsumedDiagnostics(severity: Severity): boolean {
    return this.diagnostics.some((d) => d.severity === severity);
  }
}

const IDENTITY_CONVERTER: IValueConverterService = { toValue: (s) => s, toString: (v) => String(v) };

function scopeOf(...objs: Obj[]): IScope {
  const byName = new Map(objs.map((o) => [o.name, o]));
  return {
    getSingleElement: (nameOrObject: unknown) => {
      const found = byName.get(String(nameOrObject));
      return found === undefined ? null : EObjectDescription.create(qn(found.name), found);
    },
    getElements: () => [],
    getAllElements: () => [],
  } as IScope;
}

function newLinker(
  scopeObjs: Obj[],
  nodes: INodeModel,
  converter: IValueConverterService = IDENTITY_CONVERTER,
): Linker {
  const helper = new LinkingHelper(converter);
  const service = new DefaultLinkingService({ getScope: () => scopeOf(...scopeObjs) }, helper, dotConverter);
  return new Linker(service, new LinkingDiagnosticMessageProvider(), helper, new ToyAccess(), nodes);
}

/** A linker whose `clearReference` leaves the opposite `back` alone (what ElkGraphLinker does for ELK #170). */
class OppositeKeepingLinker extends Linker {
  protected override clearReference(obj: EObject, ref: EReferenceInfo): void {
    if (ref !== BACK) super.clearReference(obj, ref);
  }
}

describe('Linker', () => {
  it('sets a single-valued reference and reports nothing', () => {
    const a = new Obj('a');
    const b = new Obj('b');
    const root = new Obj('root', a, b);
    const nodes = new ToyNodes().with(b, xref('single', 'a', 3));
    const consumer = new Collector();

    newLinker([a, b], nodes).linkModel(root, consumer);

    expect(b.single).toBe(a);
    expect(a.back).toEqual([b]);
    expect(consumer.diagnostics).toEqual([]);
  });

  it('reports an unresolved name with the reference type and the node line', () => {
    const a = new Obj('a');
    const nodes = new ToyNodes().with(a, xref('many', 'x', 7));
    const consumer = new Collector();

    newLinker([a], nodes).linkModel(a, consumer);

    expect(a.many).toEqual([]);
    expect(consumer.diagnostics).toEqual([
      {
        message: "Couldn't resolve reference to ElkConnectableShape 'x'.",
        severity: Severity.ERROR,
        line: 7,
        code: LINKING_DIAGNOSTIC,
      },
    ]);
  });

  it('keeps one element and reports "Too many matches" for a duplicate in a unique list', () => {
    const a = new Obj('a');
    const b = new Obj('b');
    const nodes = new ToyNodes().with(b, xref('many', 'a', 1), xref('many', 'a', 2));
    const consumer = new Collector();

    newLinker([a, b], nodes).linkModel(new Obj('root', a, b), consumer);

    expect(b.many).toEqual([a]);
    expect(consumer.diagnostics).toEqual([
      {
        message:
          "Too many matches for reference to 'a'. Feature many can only hold -1 references but found 1 candidate",
        severity: Severity.ERROR,
        line: 2,
        code: LINKING_DIAGNOSTIC,
      },
    ]);
  });

  it('appends distinct names to a list in node order', () => {
    const a = new Obj('a');
    const b = new Obj('b');
    const c = new Obj('c');
    const nodes = new ToyNodes().with(c, xref('many', 'b', 1), xref('many', 'a', 1));

    newLinker([a, b, c], nodes).linkModel(new Obj('root', a, b, c), new Collector());

    expect(c.many).toEqual([b, a]);
  });

  it('rejects more links than the upper bound and leaves the reference unset', () => {
    const a = new Obj('a');
    const b = new Obj('b');
    const twoLinks: ILinkingService = { getLinkedObjects: () => [a, b] };
    const helper = new LinkingHelper(IDENTITY_CONVERTER);
    const nodes = new ToyNodes().with(a, xref('single', 'a', 4));
    const linker = new Linker(twoLinks, new LinkingDiagnosticMessageProvider(), helper, new ToyAccess(), nodes);
    const consumer = new Collector();

    linker.linkModel(a, consumer);

    expect(a.single).toBeNull();
    expect(consumer.diagnostics.map((d) => d.message)).toEqual([
      "Too many matches for reference to 'a'. Feature single can only hold 1 reference but found 2 candidates",
    ]);
  });

  it('reports an empty link text as unresolved', () => {
    const a = new Obj('a');
    const consumer = new Collector();

    newLinker([a], new ToyNodes().with(a, xref('single', '', 9))).linkModel(a, consumer);

    expect(consumer.diagnostics.map((d) => [d.message, d.line])).toEqual([
      ["Couldn't resolve reference to Obj ''.", 9],
    ]);
  });

  it('reports a converter failure as the illegal-node message on the node line', () => {
    const a = new Obj('a');
    const failing: IValueConverterService = {
      toValue: () => {
        throw new ValueConverterException('bad name', null, null);
      },
      toString: (v) => String(v),
    };
    const consumer = new Collector();

    newLinker([a], new ToyNodes().with(a, xref('single', '^', 5)), failing).linkModel(a, consumer);

    expect(consumer.diagnostics).toEqual([
      {
        message: 'org.eclipse.xtext.conversion.ValueConverterException: bad name',
        severity: Severity.ERROR,
        line: 5,
        code: LINKING_DIAGNOSTIC,
      },
    ]);
  });

  it('lets a failure of the qualified name converter propagate', () => {
    const a = new Obj('a');
    const helper = new LinkingHelper(IDENTITY_CONVERTER);
    const converter = {
      toString: () => '',
      toQualifiedName: (): never => {
        throw new IllegalArgumentException('Illegal qualified name: .');
      },
    };
    const service = new DefaultLinkingService({ getScope: () => scopeOf(a) }, helper, converter);
    const nodes = new ToyNodes().with(a, xref('single', '.', 1));
    const linker = new Linker(service, new LinkingDiagnosticMessageProvider(), helper, new ToyAccess(), nodes);

    expect(() => linker.linkModel(a, new Collector())).toThrow(IllegalArgumentException);
  });

  it('reports a feature the access does not know as an illegal cross reference', () => {
    const a = new Obj('a');
    const consumer = new Collector();

    newLinker([a], new ToyNodes().with(a, xref('nosuch', 'a', 6))).linkModel(a, consumer);

    expect(consumer.diagnostics.map((d) => [d.message, d.line])).toEqual([['Cannot find reference nosuch', 6]]);
  });

  it('orders diagnostics by containment traversal, not by line', () => {
    const child = new Obj('child');
    const root = new Obj('root', child);
    const nodes = new ToyNodes().with(root, xref('single', 'r', 30)).with(child, xref('single', 'c', 2));
    const consumer = new Collector();

    newLinker([], nodes).linkModel(root, consumer);

    expect(consumer.diagnostics.map((d) => [d.message, d.line])).toEqual([
      ["Couldn't resolve reference to Obj 'r'.", 30],
      ["Couldn't resolve reference to Obj 'c'.", 2],
    ]);
  });

  it('clears an object after a link was set into it, losing the link (ELK #170 mechanism)', () => {
    const b = new Obj('b');
    const a = new Obj('a', b);
    const nodes = new ToyNodes().with(a, xref('single', 'b', 1));

    newLinker([a, b], nodes).linkModel(a, new Collector());

    expect(a.single).toBeNull();
    expect(b.back).toEqual([]);
  });

  it('keeps the link when clearReference skips the opposite reference', () => {
    const b = new Obj('b');
    const a = new Obj('a', b);
    const nodes = new ToyNodes().with(a, xref('single', 'b', 1));
    const helper = new LinkingHelper(IDENTITY_CONVERTER);
    const service = new DefaultLinkingService({ getScope: () => scopeOf(a, b) }, helper, dotConverter);

    new OppositeKeepingLinker(
      service,
      new LinkingDiagnosticMessageProvider(),
      helper,
      new ToyAccess(),
      nodes,
    ).linkModel(a, new Collector());

    expect(a.single).toBe(b);
    expect(b.back).toEqual([a]);
  });

  it('clears stale references even on objects without a node', () => {
    const b = new Obj('b');
    const a = new Obj('a');
    a.single = b;
    b.back = [a];
    a.many = [b];

    newLinker([a, b], new ToyNodes()).linkModel(a, new Collector());

    expect(a.single).toBeNull();
    expect(a.many).toEqual([]);
  });

  it('runs the model hooks in order and honours the extension points', () => {
    const calls: string[] = [];
    const a = new Obj('a');
    const nodes = new ToyNodes().with(a, xref('single', 'zzz', 1));
    const helper = new LinkingHelper(IDENTITY_CONVERTER);
    const service = new DefaultLinkingService({ getScope: () => scopeOf(a) }, helper, dotConverter);

    class HookedLinker extends Linker {
      protected override beforeModelLinked(): void {
        calls.push('before');
      }
      protected override afterModelLinked(): void {
        calls.push('after');
      }
      protected override beforeEnsureIsLinked(_obj: EObject, eRef: EReferenceInfo, _p: IDiagnosticProducer): void {
        calls.push(`ensure ${eRef.name}`);
      }
      protected override isNullValidResult(): boolean {
        return true;
      }
    }
    const consumer = new Collector();

    new HookedLinker(service, new LinkingDiagnosticMessageProvider(), helper, new ToyAccess(), nodes).linkModel(
      a,
      consumer,
    );

    expect(calls).toEqual(['before', 'ensure single', 'after']);
    expect(consumer.diagnostics).toEqual([]);
  });

  it('exposes its collaborators', () => {
    const helper = new LinkingHelper(IDENTITY_CONVERTER);
    const service = new DefaultLinkingService({ getScope: () => scopeOf() }, helper, dotConverter);
    const provider = new LinkingDiagnosticMessageProvider();
    const linker = new Linker(service, provider, helper, new ToyAccess(), new ToyNodes());

    expect(linker.getLinkingService()).toBe(service);
    expect(linker.getDiagnosticMessageProvider()).toBe(provider);
    expect(linker.getLinkingHelper()).toBe(helper);
  });

  // Java passes a null unresolved-proxy message to the producer (Linker.java:136-137), whose createDiagnostic
  // dereferences it (LinkingDiagnosticProducer.java:27): a NullPointerException, a TypeError here (D10). Was a
  // port-local skip until the user's T16 decision of 2026-10-15.
  it('fails on a null unresolved message like the Java producer', () => {
    const a = new Obj('a');
    const helper = new LinkingHelper(IDENTITY_CONVERTER);
    const quiet = new (class extends LinkingDiagnosticMessageProvider {
      override getUnresolvedProxyMessage(_c: ILinkingDiagnosticContext): never {
        return null as never;
      }
    })();
    const service = new DefaultLinkingService({ getScope: () => scopeOf() }, helper, dotConverter);
    const consumer = new Collector();

    const linker = new Linker(service, quiet, helper, new ToyAccess(), new ToyNodes().with(a, xref('single', 'q', 1)));

    expect(() => linker.linkModel(a, consumer)).toThrow(TypeError);
    expect(consumer.diagnostics).toEqual([]);
  });

  it('rethrows non-linking errors from the linking service', () => {
    const a = new Obj('a');
    const boom: ILinkingService = {
      getLinkedObjects: () => {
        throw new RangeError('boom');
      },
    };
    const linker = new Linker(
      boom,
      new LinkingDiagnosticMessageProvider(),
      new LinkingHelper(IDENTITY_CONVERTER),
      new ToyAccess(),
      new ToyNodes().with(a, xref('single', 'a', 1)),
    );

    expect(() => linker.linkModel(a, new Collector())).toThrow(RangeError);
  });
});
