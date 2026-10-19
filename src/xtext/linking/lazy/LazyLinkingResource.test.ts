// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ResourceNode } from '../../../../test/helpers/emf/ResourceNode.js';
import { URI } from '../../../emf/common/util/URI.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../emf/ecore/InternalEObject.js';
import { ResourceSetImpl } from '../../../emf/ecore/resource/impl/ResourceSetImpl.js';
import { EObjectResolvingEList } from '../../../emf/ecore/util/EObjectResolvingEList.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import { DiagnosticMessage } from '../../diagnostics/DiagnosticMessage.js';
import { Severity } from '../../diagnostics/Severity.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import { ReferenceNode } from '../../parser/ReferenceNode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type {
  ILinkingDiagnosticContext,
  ILinkingDiagnosticMessageProviderExtended,
} from '../ILinkingDiagnosticMessageProvider.js';
import type { ILinkingService } from '../ILinkingService.js';
import { IllegalNodeException } from '../impl/IllegalNodeException.js';
import { LinkingDiagnosticMessageProvider } from '../impl/LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from '../impl/LinkingHelper.js';
import type { LazyProxyInformation } from './ILazyLinkingResource.js';
import { LazyLinkingResource } from './LazyLinkingResource.js';
import { OperationCanceledError, OperationCanceledException } from './LazyLinkingResourceCancel.js';
import { ExceptionDiagnostic } from './LazyLinkingResourceExceptionDiagnostic.js';
import {
  CyclicLinkingException,
  LazyProxyTriple,
  type LazyLinkingResourceMetamodel,
  type LazyReferenceList,
} from './LazyLinkingResourceTypes.js';
import type { LazyURIEncoderMetamodel } from './LazyLinkingMetamodel.js';
import { LazyURIEncoder } from './LazyURIEncoder.js';

const DOC = 'file:/a.elkj';
const NODE_CLASS = 'ElkNode';

function ref(name: string, upperBound: number, over: Partial<EReferenceInfo> = {}): EReferenceInfo {
  return {
    name,
    referenceType: { name: NODE_CLASS, isAssignableFrom: (n) => n === NODE_CLASS },
    upperBound,
    unique: true,
    containment: false,
    container: false,
    derived: false,
    changeable: true,
    transient: false,
    ...over,
  };
}
const TARGETS = ref('targets', -1);
const SINGLE = ref('single', 1);
const SKIPPED = [ref('derived', -1, { derived: true }), ref('transient', -1, { transient: true }), ref('plain', -1)];

class LNode extends ResourceNode {
  readonly targets = new EObjectResolvingEList<LNode>(this, 10);
  single: EObject | null = null;
}

const metamodel: LazyLinkingResourceMetamodel = {
  getCrossReferences: (source) => (source instanceof LNode ? [TARGETS, SINGLE, ...SKIPPED] : []),
  isResolveProxies: (r) => r.name !== 'plain',
  getContainingClassName: () => 'Cls',
  getList: (source, r) => {
    if (r !== TARGETS) throw new Error(`list of ${r.name} must not be read`);
    return (source as LNode).targets as unknown as LazyReferenceList;
  },
  getOne: (source, r) => {
    if (r !== SINGLE) throw new Error(`${r.name} must not be read`);
    return (source as LNode).single;
  },
  setOne: (source, _r, target) => {
    (source as LNode).single = target;
  },
};

const encoderMetamodel = {} as LazyURIEncoderMetamodel;

class StubService implements ILinkingService {
  readonly answers = new Map<string, readonly EObject[]>();
  readonly calls: string[] = [];
  onCall: ((text: string) => void) | null = null;
  throwing: Error | null = null;
  getLinkedObjects(_c: EObject, _r: EReferenceInfo, node: ICrossReferenceNode): readonly EObject[] {
    this.calls.push(node.getText());
    this.onCall?.(node.getText());
    if (this.throwing !== null) throw this.throwing;
    return this.answers.get(node.getText()) ?? [];
  }
}

const helper = new LinkingHelper({ toValue: (s: string | null) => s, toString: (v: unknown) => String(v) });

class TestResource extends LazyLinkingResource {
  cacheable = true;
  setLimit(limit: number): void {
    this.cyclicLinkingDectectionCounterLimit = limit;
  }
  get resolvingSet(): LazyProxyInformation[] {
    return this.resolving;
  }
  cyclic(triple: LazyProxyInformation): EObject {
    return this.handleCyclicResolution(triple);
  }
  protected override isUnresolveableProxyCacheable(): boolean {
    return this.cacheable;
  }
}

interface World {
  readonly resource: TestResource;
  readonly service: StubService;
  readonly set: ResourceSetImpl;
  readonly root: LNode;
  /** Adds a lazy proxy (link text `text`) to `owner.targets` and returns it. */
  target(owner: LNode, text: string): LNode;
  single(owner: LNode, text: string): LNode;
}

function world(provider: ILinkingDiagnosticMessageProviderExtended = new LinkingDiagnosticMessageProvider()): World {
  const service = new StubService();
  const encoder = new LazyURIEncoder(encoderMetamodel, true);
  const uri = URI.createURI(DOC);
  const resource = new TestResource(uri, metamodel, {
    linkingService: service,
    encoder,
    diagnosticMessageProvider: provider,
    linkingHelper: helper,
  });
  const root = new LNode('root');
  resource.getContents().add(root);
  const set = new ResourceSetImpl();
  set.getResources().add(resource);
  const proxyFor = (owner: LNode, r: EReferenceInfo, text: string): LNode => {
    const node = new ReferenceNode({ owner, feature: r.name, index: 0, ruleName: 'ID', text, line: 1 });
    const idx = resource.addLazyProxyInformation(owner, r, node);
    const proxy = new LNode(`proxy-${text}`);
    proxy.eSetProxyURI(uri.appendFragment(`|${idx}`));
    return proxy;
  };
  return {
    resource,
    service,
    set,
    root,
    target: (owner, text) => {
      const proxy = proxyFor(owner, TARGETS, text);
      owner.targets.addUnique(proxy);
      return proxy;
    },
    single: (owner, text) => {
      const proxy = proxyFor(owner, SINGLE, text);
      owner.single = proxy;
      return proxy;
    },
  };
}

function messages(w: World): (string | null)[] {
  return w.resource
    .getErrors()
    .toArray()
    .map((d) => d.getMessage());
}
const COULDNT = (text: string): string => `Couldn't resolve reference to ${NODE_CLASS} '${text}'.`;

describe('access through the resolving list', () => {
  it('records exactly one diagnostic for an unresolvable proxy accessed three times', () => {
    const w = world();
    const proxy = w.target(w.root, 'x');
    expect(w.root.targets.get(0)).toBe(proxy);
    expect(w.root.targets.get(0)).toBe(proxy);
    expect(w.root.targets.get(0)).toBe(proxy);
    expect(messages(w)).toEqual([COULDNT('x')]);
    expect(w.service.calls).toEqual(['x']);
    expect(w.root.targets.basicGet(0)).toBe(proxy);
  });

  it('replaces the slot with the target on success and records nothing', () => {
    const w = world();
    const other = new LNode('other');
    w.resource.getContents().add(other);
    w.target(w.root, 'ok');
    w.service.answers.set('ok', [other]);
    expect(w.root.targets.get(0)).toBe(other);
    expect(w.root.targets.basicGet(0)).toBe(other);
    expect(w.resource.getErrors().size()).toBe(0);
  });

  it('suppresses an equal diagnostic when the fragment is not cached, and removes it on success', () => {
    const w = world();
    w.resource.cacheable = false;
    const other = new LNode('other');
    w.target(w.root, 'x');
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(messages(w)).toEqual([COULDNT('x')]);
    expect(w.service.calls).toEqual(['x', 'x']);
    w.service.answers.set('x', [other]);
    expect(w.resource.getEObject('|0')).toBe(other);
    expect(messages(w)).toEqual([]);
  });

  it('keeps unrelated diagnostics when another proxy resolves', () => {
    const w = world();
    const other = new LNode('other');
    w.target(w.root, 'bad');
    w.target(w.root, 'good');
    w.service.answers.set('good', [other]);
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(w.resource.getEObject('|1')).toBe(other);
    expect(messages(w)).toEqual([COULDNT('bad')]);
  });

  it('turns a linking service returning two objects into a wrapped IllegalStateException with an ExceptionDiagnostic', () => {
    const w = world();
    const proxy = w.target(w.root, 'dup');
    w.service.answers.set('dup', [new LNode('a'), new LNode('b')]);
    expect(w.root.targets.get(0)).toBe(proxy);
    const error = w.resource.getErrors().get(0);
    expect(error).toBeInstanceOf(ExceptionDiagnostic);
    expect(error.getMessage()).toBe(
      'IllegalStateException: linkingService returned more than one object for fragment |0 (see logs for details)',
    );
    expect((error as ExceptionDiagnostic).getException()).toBeInstanceOf(IllegalStateException);
    expect(String(error)).toBe(error.getMessage());
    expect([
      error.getLine(),
      (error as ExceptionDiagnostic).getOffset(),
      (error as ExceptionDiagnostic).getLength(),
    ]).toEqual([1, 0, 1]);
    try {
      w.resource.getEObject('|0');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RuntimeException);
      expect((e as RuntimeException).cause).toBeInstanceOf(IllegalStateException);
      expect((e as RuntimeException).message).toBe('linkingService returned more than one object for fragment |0');
    }
  });

  it('records a diagnostic and returns null for a result of the wrong class', () => {
    const w = world();
    w.target(w.root, 'wrong');
    const wrong = new ResourceNode('wrong');
    (wrong as { eClass(): { getName(): string } }).eClass = () => ({ getName: () => 'Other' });
    w.service.answers.set('wrong', [wrong]);
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(messages(w)).toEqual([COULDNT('wrong')]);
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(w.service.calls).toEqual(['wrong']);
  });

  it('records the IllegalNodeException message as the diagnostic', () => {
    const w = world();
    w.target(w.root, 'bad');
    w.service.throwing = new IllegalNodeException(
      new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 'bad', line: 1 }),
      'cannot convert',
    );
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(messages(w)).toEqual(['cannot convert']);
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(messages(w)).toEqual(['cannot convert']);
  });

  it('wraps a TypeError of the service and leaves other errors and cancellations to propagate', () => {
    const w = world();
    w.target(w.root, 'x');
    w.service.throwing = new TypeError('npe');
    expect(() => w.resource.getEObject('|0')).toThrow(RuntimeException);
    expect(messages(w)).toEqual(['TypeError: npe (see logs for details)']);
    w.service.throwing = new Error('plain');
    expect(() => w.resource.getEObject('|0')).toThrow('plain');
    expect(w.resource.getErrors().size()).toBe(1);
    w.service.throwing = new OperationCanceledException();
    expect(() => w.resource.getEObject('|0')).toThrow(OperationCanceledError);
    expect(w.resource.getErrors().size()).toBe(1);
  });

  it('delegates a fragment that is not a cross link to the base resource', () => {
    const w = world();
    expect(w.resource.getEObject('/0')).toBe(w.root);
    expect(w.resource.getEObject('/5')).toBeNull();
  });
});

describe('cyclic linking', () => {
  it('resolves a cycle to one diagnostic when the limit is exceeded', () => {
    const w = world();
    w.resource.setLimit(1);
    w.target(w.root, 'a');
    w.service.onCall = (text) => {
      expect(text).toBe('a');
      w.resource.getEObject('|0');
    };
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(messages(w)).toEqual([COULDNT('a')]);
    expect(w.service.calls).toEqual(['a', 'a']);
    expect(w.resource.resolvingSet).toEqual([]);
  });

  it('rethrows a cyclic exception of another triple', () => {
    const w = world();
    w.target(w.root, 'a');
    const other = new LazyProxyTriple(
      w.root,
      TARGETS,
      new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 'o', line: 1 }),
    );
    const failure = new CyclicLinkingException('elsewhere', other);
    w.service.throwing = failure;
    expect(() => w.resource.getEObject('|0')).toThrow(failure);
    expect(w.resource.getErrors().size()).toBe(0);
  });

  it('names the cycle in the message of the exception', () => {
    const w = world();
    const node = new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 't', line: 1 });
    const first = new LazyProxyTriple(w.root, ref('a', 1), node);
    const second = new LazyProxyTriple(w.root, ref('b', 1), node);
    w.resource.resolvingSet.push(first, second);
    expect(() => w.resource.cyclic(first)).toThrow(
      "Cyclic resolution of lazy links : Cls.a->Cls.b->Cls.a in resource 'file:/a.elkj'.",
    );
    expect(() => w.resource.cyclic(second)).toThrow(
      "Cyclic resolution of lazy links : Cls.b->Cls.b in resource 'file:/a.elkj'.",
    );
    try {
      w.resource.cyclic(second);
    } catch (e) {
      expect(e).toBeInstanceOf(CyclicLinkingException);
      expect((e as CyclicLinkingException).triple).toBe(second);
    }
  });
});

describe('resolveLazyCrossReferences', () => {
  it('reports diagnostics in pre-order and resolves what can be resolved', () => {
    const w = world();
    const child = new LNode('child');
    const grandchild = new LNode('grandchild');
    const sibling = new LNode('sibling');
    w.root.children.add(child);
    child.children.add(grandchild);
    w.root.children.add(sibling);
    const found = new LNode('found');
    w.resource.getContents().add(found);
    // proxy indexes follow the load order (children first), diagnostics must not
    w.target(grandchild, 'g');
    w.target(sibling, 's');
    w.target(child, 'c');
    w.single(w.root, 'r1');
    w.target(w.root, 'r2');
    w.target(w.root, 'ok');
    w.service.answers.set('ok', [found]);
    w.service.answers.set('r1', [found]);
    w.resource.resolveLazyCrossReferences(null);
    expect(messages(w)).toEqual([COULDNT('r2'), COULDNT('c'), COULDNT('g'), COULDNT('s')]);
    expect(w.root.targets.basicGet(1)).toBe(found);
    expect(w.root.single).toBe(found);
    expect(w.service.calls).toEqual(['r2', 'ok', 'r1', 'c', 'g', 's']);
  });

  it('leaves proxies that are no lazy links of this resource alone', () => {
    const w = world();
    const foreign = new LNode('foreign');
    foreign.eSetProxyURI(URI.createURI('file:/other.elkj#|0'));
    const path = new LNode('path');
    path.eSetProxyURI(URI.createURI(`${DOC}#/0`));
    const resolved = new LNode('resolved');
    w.root.targets.addUnique(foreign);
    w.root.targets.addUnique(path);
    w.root.targets.addUnique(resolved);
    w.root.single = resolved;
    w.resource.resolveLazyCrossReferences(null);
    expect([w.root.targets.basicGet(0), w.root.targets.basicGet(1), w.root.targets.basicGet(2)]).toEqual([
      foreign,
      path,
      resolved,
    ]);
    expect(w.service.calls).toEqual([]);
    expect(w.resource.getErrors().size()).toBe(0);
  });

  it('stops when the indicator reports cancellation', () => {
    const w = world();
    expect(() => w.resource.resolveLazyCrossReferences({ isCanceled: () => true })).toThrow(OperationCanceledException);
    let polls = 0;
    expect(() =>
      w.resource.resolveLazyCrossReferences({
        isCanceled: () => ++polls === 2,
      }),
    ).toThrow(OperationCanceledException);
    expect(polls).toBe(2);
  });

  it('fails like a null pointer when the resource has no URI', () => {
    const w = world();
    w.target(w.root, 'x');
    w.resource.setURI(null);
    expect(() => w.resource.resolveLazyCrossReferences(null)).toThrow(TypeError);
  });
});

describe('diagnostic severities', () => {
  const provider = (message: DiagnosticMessage | null): ILinkingDiagnosticMessageProviderExtended => ({
    getUnresolvedProxyMessage: () => message,
    getIllegalNodeMessage: () => new DiagnosticMessage('node', Severity.WARNING, null),
    getIllegalCrossReferenceMessage: () => new DiagnosticMessage('x', Severity.ERROR, null),
    getViolatedBoundsConstraintMessage: () => new DiagnosticMessage('x', Severity.ERROR, null),
    getViolatedUniqueConstraintMessage: () => new DiagnosticMessage('x', Severity.ERROR, null),
  });

  it('files warnings under getWarnings', () => {
    const w = world(provider(new DiagnosticMessage('careful', Severity.WARNING, 'code', ['d'])));
    w.target(w.root, 'x');
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(w.resource.getErrors().size()).toBe(0);
    expect(
      w.resource
        .getWarnings()
        .toArray()
        .map((d) => d.getMessage()),
    ).toEqual(['careful']);
    w.service.answers.set('x', [new LNode('t')]);
    w.resource.markUnresolvable(w.root.targets.basicGet(0));
    w.service.throwing = new IllegalNodeException(
      new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 'x', line: 1 }),
    );
    w.target(w.root, 'y');
    expect(w.resource.getEObject('|1')).toBeNull();
    expect(
      w.resource
        .getWarnings()
        .toArray()
        .map((d) => d.getMessage()),
    ).toEqual(['careful', 'node']);
  });

  it('fails for a severity other than error and warning', () => {
    const w = world(provider(new DiagnosticMessage('ignored', Severity.IGNORE, null)));
    w.target(w.root, 'x');
    expect(() => w.resource.getEObject('|0')).toThrow(/Unexpected severity/);
  });

  it('adds nothing when the provider has no message, also with errors present', () => {
    const w = world(provider(null));
    w.target(w.root, 'x');
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(w.resource.getErrors().size()).toBe(0);
    w.resource.cacheable = false;
    w.resource.getErrors().add(new ExceptionDiagnostic(new Error('earlier')));
    w.service.answers.set('x', [new LNode('t')]);
    w.resource.getEObject('|0');
    expect(w.resource.getErrors().size()).toBe(1);
  });

  it('adds no diagnostics while validation is disabled and clears the existing ones when it becomes so', () => {
    const w = world();
    w.target(w.root, 'x');
    w.service.throwing = new IllegalNodeException(
      new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 'x', line: 1 }),
      'bad',
    );
    w.resource.getEObject('|0');
    w.resource.getWarnings().add(new ExceptionDiagnostic(new Error('w')));
    expect(w.resource.getErrors().size()).toBe(1);
    w.resource.setValidationDisabled(true);
    expect(w.resource.isValidationDisabled()).toBe(true);
    expect([w.resource.getErrors().size(), w.resource.getWarnings().size()]).toEqual([0, 0]);
    w.target(w.root, 'y');
    w.service.throwing = null;
    w.resource.getEObject('|1');
    w.service.throwing = new IllegalNodeException(
      new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 'y', line: 1 }),
      'bad',
    );
    w.resource.getEObject('|1');
    expect(w.resource.getErrors().size()).toBe(0);
    w.resource.setValidationDisabled(false);
    expect(w.resource.isValidationDisabled()).toBe(false);
  });
});

describe('unresolvable fragments and proxy information', () => {
  it('marks a proxy unresolvable and rejects a resolved object', () => {
    const w = world();
    const proxy = w.target(w.root, 'x');
    w.service.answers.set('x', [new LNode('t')]);
    w.resource.markUnresolvable(proxy);
    expect(w.resource.getEObject('|0')).toBeNull();
    expect(w.service.calls).toEqual([]);
    expect(() => w.resource.markUnresolvable(w.root)).toThrow(IllegalArgumentException);
  });

  it('stores, reads, removes and clears proxy information by index', () => {
    const w = world();
    const node = new ReferenceNode({ owner: w.root, feature: 't', index: 0, ruleName: 'ID', text: 'x', line: 1 });
    const empty = w.resource.getLazyProxyInformation.bind(w.resource);
    expect(w.resource.addLazyProxyInformation(w.root, TARGETS, node)).toBe(0);
    expect(w.resource.addLazyProxyInformation(w.root, SINGLE, node)).toBe(1);
    const second = w.resource.getLazyProxyInformation(1);
    expect([second.getFirst(), second.getSecond(), second.getThird()]).toEqual([w.root, SINGLE, node]);
    expect(w.resource.hasLazyProxyInformation(1)).toBe(true);
    expect(w.resource.removeLazyProxyInformation(1)).toBe(second);
    expect(w.resource.hasLazyProxyInformation(1)).toBe(false);
    expect(() => empty(1)).toThrow("No proxy information for index '1' available.");
    expect(w.resource.removeLazyProxyInformation(1)).toBeNull();
    w.resource.clearLazyProxyInformation();
    expect(w.resource.hasLazyProxyInformation(0)).toBe(false);
    expect(w.resource.addLazyProxyInformation(w.root, TARGETS, node)).toBe(0);
  });

  it('exposes the replaceable collaborators', () => {
    const w = world();
    const service = new StubService();
    const encoder = new LazyURIEncoder(encoderMetamodel, true);
    const provider = new LinkingDiagnosticMessageProvider();
    const other = new LinkingHelper({ toValue: (s: string | null) => s, toString: (v: unknown) => String(v) });
    w.resource.setLinkingService(service);
    w.resource.setEncoder(encoder);
    w.resource.setDiagnosticMessageProvider(provider);
    w.resource.setLinkingHelper(other);
    expect([
      w.resource.getLinkingService(),
      w.resource.getEncoder(),
      w.resource.getDiagnosticMessageProvider(),
      w.resource.getLinkingHelper(),
    ]).toEqual([service, encoder, provider, other]);
    expect(w.resource.lazyLinkingResource).toBe(true);
  });

  it('is found through its resource set by a proxy URI', () => {
    const w = world();
    const target = new LNode('t');
    w.resource.getContents().add(target);
    w.target(w.root, 'x');
    w.service.answers.set('x', [target]);
    const proxy = w.root.targets.basicGet(0) as InternalEObject;
    expect(w.set.getEObject(proxy.eProxyURI() as URI, true)).toBe(target);
  });
});
