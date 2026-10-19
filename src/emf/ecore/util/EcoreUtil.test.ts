// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { EList } from '../../common/util/EList.js';
import { URI } from '../../common/util/URI.js';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import { ResourceNode } from '../../../../test/helpers/emf/ResourceNode.js';
import type { EObject } from '../EObject.js';
import { ResourceImpl } from '../resource/impl/ResourceImpl.js';
import { ResourceSetImpl } from '../resource/impl/ResourceSetImpl.js';
import type { ResourceSet } from '../resource/ResourceSet.js';
import type { EClass } from '../EClass.js';
import type { InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EcoreUtil } from './EcoreUtil.js';

const PARENT = 0;
const THING_CLASS: EClass = { getName: () => 'Thing' };

/** Only a container pointer; containers are wired with `eBasicSetContainer`. */
class Thing extends BasicEObjectImpl {
  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return THING_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [];
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('unused');
  }

  protected override javaClassName(): string {
    return `Thing(${this.id})`;
  }
}

/** Builds `parent <- child` links from `[child, parent]` pairs. */
function tree(...links: Array<[string, string]>): Record<string, Thing> {
  const things: Record<string, Thing> = {};
  const at = (id: string): Thing => (things[id] ??= new Thing(id));
  for (const [child, parent] of links) {
    at(child).eBasicSetContainer(at(parent), PARENT);
  }
  return things;
}

describe('EcoreUtil.isAncestor', () => {
  it('is reflexive and follows the container chain upwards only', () => {
    const t = tree(['n1', 'g'], ['n2', 'n1']);
    const [g, n1, n2] = [t['g'], t['n1'], t['n2']] as [Thing, Thing, Thing];
    expect(EcoreUtil.isAncestor(n1, n1)).toBe(true);
    expect(EcoreUtil.isAncestor(g, n2)).toBe(true);
    expect(EcoreUtil.isAncestor(n2, g)).toBe(false);
    expect(EcoreUtil.isAncestor(null, n2)).toBe(false);
    expect(EcoreUtil.isAncestor(g, null)).toBe(false);
  });

  it('stops when a cycle returns to the start', () => {
    const t = tree(['n1', 'n2'], ['n2', 'n1']);
    expect(EcoreUtil.isAncestor(new Thing('g'), t['n1'] as Thing)).toBe(false);
    expect(EcoreUtil.isAncestor(t['n2'] as Thing, t['n1'] as Thing)).toBe(true);
  });

  it('restarts inside a cycle that does not contain the start after 100000 steps', () => {
    const t = tree(['x', 'a'], ['a', 'b'], ['b', 'a']);
    expect(EcoreUtil.isAncestor(new Thing('g'), t['x'] as Thing)).toBe(false);
    expect(EcoreUtil.isAncestor(t['b'] as Thing, t['x'] as Thing)).toBe(true);
  });
});

describe('EcoreUtil.getRootContainer', () => {
  it('returns the topmost container, the object itself when uncontained, and null for null', () => {
    const t = tree(['n1', 'g'], ['n2', 'n1']);
    expect(EcoreUtil.getRootContainer(t['n2'] as Thing)).toBe(t['g']);
    expect(EcoreUtil.getRootContainer(t['g'] as Thing)).toBe(t['g']);
    expect(EcoreUtil.getRootContainer(null)).toBeNull();
  });

  it('throws IllegalStateException on a cycle through the object', () => {
    const t = tree(['n1', 'n2'], ['n2', 'n1']);
    expect(() => EcoreUtil.getRootContainer(t['n1'] as Thing)).toThrow(
      new IllegalStateException('There is a cycle in the containment hierarchy of Thing(n1)'),
    );
  });

  it('restarts inside a cycle that does not contain the object after 100000 steps', () => {
    const t = tree(['x', 'a'], ['a', 'b'], ['b', 'a']);
    expect(() => EcoreUtil.getRootContainer(t['x'] as Thing)).toThrow(
      new IllegalStateException('There is a cycle in the containment hierarchy of Thing(a)'),
    );
  });
});

describe('EcoreUtil.resolve', () => {
  const DOC = 'file:/a.elkj';

  /** A resource set whose `getEObject(uri, loadOnDemand)` is scripted; calls are recorded. */
  function scriptedSet(
    lookup: (uri: URI, loadOnDemand: boolean) => EObject | null,
  ): ResourceSet & { calls: Array<[string, boolean]> } {
    const calls: Array<[string, boolean]> = [];
    return {
      calls,
      getResources: (): never => {
        throw new Error('unused');
      },
      getResource: (): never => {
        throw new Error('unused');
      },
      getEObject: (uri, loadOnDemand) => {
        calls.push([uri.toString(), loadOnDemand]);
        return lookup(uri, loadOnDemand);
      },
    };
  }

  function proxyTo(fragment: string): ResourceNode {
    const proxy = new ResourceNode(`proxy${fragment}`);
    proxy.eSetProxyURI(URI.createURI(`${DOC}#${fragment}`));
    return proxy;
  }

  it('returns the target a proxy URI names, looked up with loadOnDemand', () => {
    const target = new ResourceNode('target');
    const set = new ResourceSetImpl();
    const resource = new ResourceImpl(URI.createURI(DOC));
    resource.getContents().add(target);
    set.getResources().add(resource);
    const proxy = proxyTo('/0');
    expect(EcoreUtil.resolve(proxy, set)).toBe(target);
  });

  it('returns the proxy itself when the fragment resolves to nothing', () => {
    const set = new ResourceSetImpl();
    set.getResources().add(new ResourceImpl(URI.createURI(DOC)));
    const proxy = proxyTo('/9');
    expect(EcoreUtil.resolve(proxy, set)).toBe(proxy);
  });

  it('returns an object without a proxy URI unchanged, and never consults the set', () => {
    const set = scriptedSet(() => {
      throw new Error('unexpected lookup');
    });
    const plain = new ResourceNode('plain');
    expect(EcoreUtil.resolve(plain, set)).toBe(plain);
    expect(set.calls).toEqual([]);
  });

  it('returns the proxy for a null resource set (the package registry holds nothing)', () => {
    const proxy = proxyTo('/0');
    expect(EcoreUtil.resolve(proxy, null)).toBe(proxy);
  });

  it('returns the proxy when the lookup yields the proxy itself', () => {
    const proxy = proxyTo('/0');
    const set = scriptedSet(() => proxy);
    expect(EcoreUtil.resolve(proxy, set)).toBe(proxy);
    expect(set.calls).toEqual([[`${DOC}#/0`, true]]);
  });

  it('follows a chain of proxies to the final target', () => {
    const target = new ResourceNode('target');
    const second = proxyTo('second');
    const first = proxyTo('first');
    const set = scriptedSet((uri) =>
      uri.fragment() === 'first' ? second : uri.fragment() === 'second' ? target : null,
    );
    expect(EcoreUtil.resolve(first, set)).toBe(target);
    expect(set.calls.map(([uri]) => uri)).toEqual([`${DOC}#first`, `${DOC}#second`]);
  });

  it('retries without loadOnDemand when the first lookup throws a RuntimeException', () => {
    const target = new ResourceNode('target');
    const set = scriptedSet((_uri, loadOnDemand) => {
      if (loadOnDemand) {
        throw new RuntimeException('cannot demand load');
      }
      return target;
    });
    expect(EcoreUtil.resolve(proxyTo('/0'), set)).toBe(target);
    expect(set.calls).toEqual([
      [`${DOC}#/0`, true],
      [`${DOC}#/0`, false],
    ]);
  });

  it('ignores a failure of the retry and returns the proxy', () => {
    const set = scriptedSet(() => {
      throw new RuntimeException('always fails');
    });
    const proxy = proxyTo('/0');
    expect(EcoreUtil.resolve(proxy, set)).toBe(proxy);
    expect(set.calls).toHaveLength(2);
  });

  it('ignores a failure while following the chain and returns the last proxy reached', () => {
    const second = proxyTo('second');
    const set = scriptedSet((uri) => {
      if (uri.fragment() === 'second') {
        throw new RuntimeException('chain broken');
      }
      return second;
    });
    const first = proxyTo('first');
    expect(EcoreUtil.resolve(first, set)).toBe(second);
  });

  it('does not swallow an error that is not a RuntimeException', () => {
    const set = scriptedSet(() => {
      throw new RangeError('not a runtime exception');
    });
    expect(() => EcoreUtil.resolve(proxyTo('/0'), set)).toThrow(RangeError);
    const retryFails = scriptedSet((_uri, loadOnDemand) => {
      if (loadOnDemand) {
        throw new RuntimeException('first');
      }
      throw new RangeError('retry');
    });
    expect(() => EcoreUtil.resolve(proxyTo('/0'), retryFails)).toThrow(RangeError);
  });

  it('resolveFromObject uses the resource set of the context object, via its container chain', () => {
    const target = new ResourceNode('target');
    const set = new ResourceSetImpl();
    const resource = new ResourceImpl(URI.createURI(DOC));
    const root = new ResourceNode('root');
    const nested = new ResourceNode('nested');
    root.children.add(nested);
    resource.getContents().addAll([target, root]);
    set.getResources().add(resource);
    expect(EcoreUtil.resolveFromObject(proxyTo('/0'), nested)).toBe(target);
  });

  it('resolveFromObject returns the proxy for a null context or one outside any resource set', () => {
    const proxy = proxyTo('/0');
    expect(EcoreUtil.resolveFromObject(proxy, null)).toBe(proxy);
    expect(EcoreUtil.resolveFromObject(proxy, new ResourceNode('free'))).toBe(proxy);
    const lone = new ResourceNode('lone');
    new ResourceImpl(URI.createURI(DOC)).getContents().add(lone);
    expect(EcoreUtil.resolveFromObject(proxy, lone)).toBe(proxy);
  });
});
