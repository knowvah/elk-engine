// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import { NULLSCOPE, type IScope } from '../IScope.js';
import { namesOf, Node, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { ParentIterable } from './AbstractScope.ParentIterable.js';
import { AbstractScope } from './AbstractScope.js';
import { SimpleScope } from './SimpleScope.js';

const describe1 = (name: string, node: Node = Node.of(name)): IEObjectDescription =>
  EObjectDescription.create(qn(name), node);

/** Wraps a scope and counts how often its aggregate elements were requested. */
class SpyScope implements IScope {
  allRequests = 0;
  constructor(private readonly inner: IScope) {}
  getSingleElement(x: QualifiedName | EObject): IEObjectDescription | null {
    return (this.inner.getSingleElement as (v: unknown) => IEObjectDescription | null)(x);
  }
  getElements(x: QualifiedName | EObject): Iterable<IEObjectDescription> {
    return (this.inner.getElements as (v: unknown) => Iterable<IEObjectDescription>)(x);
  }
  getAllElements(): Iterable<IEObjectDescription> {
    this.allRequests++;
    return this.inner.getAllElements();
  }
}

/** An iterable that records every element pulled from it. */
function counting(descriptions: IEObjectDescription[], log: string[], label: string): Iterable<IEObjectDescription> {
  return {
    *[Symbol.iterator](): Iterator<IEObjectDescription> {
      log.push(`${label}:start`);
      for (const description of descriptions) {
        log.push(`${label}:${description.getName().toString()}`);
        yield description;
      }
    },
  };
}

describe('AbstractScope laziness', () => {
  it('does not touch the parent scope until the local elements are consumed', () => {
    const log: string[] = [];
    const bottom = new SimpleScope(NULLSCOPE, counting([describe1('c')], log, 'bottom'));
    const middleSpy = new SpyScope(new SimpleScope(bottom, counting([describe1('b')], log, 'middle')));
    const top = new SimpleScope(middleSpy, counting([describe1('a1'), describe1('a2')], log, 'top'));
    const iterator = top.getAllElements()[Symbol.iterator]();
    expect(iterator.next().value?.getName().toString()).toBe('a1');
    expect(log).toEqual(['top:start', 'top:a1']);
    expect(middleSpy.allRequests).toBe(0);
    expect(iterator.next().value?.getName().toString()).toBe('a2');
    expect(middleSpy.allRequests).toBe(0);
    expect(iterator.next().value?.getName().toString()).toBe('b');
    expect(middleSpy.allRequests).toBe(1);
    expect(log.filter((entry) => entry.startsWith('bottom'))).toEqual([]);
    expect(iterator.next().value?.getName().toString()).toBe('c');
    expect(log.filter((entry) => entry.startsWith('bottom'))).toEqual(['bottom:start', 'bottom:c']);
  });

  it('keeps one parent iterable per call and filters out shadowed parent elements', () => {
    const bottom = new SimpleScope(NULLSCOPE, [describe1('b'), describe1('c')]);
    const middle = new SimpleScope(bottom, [describe1('a'), describe1('b')]);
    const top = new SimpleScope(middle, [describe1('a')]);
    expect(namesOf(top.getAllElements())).toEqual(['a', 'b', 'c']);
  });

  it('has no parent iterable over the NULLSCOPE', () => {
    const scope = new SimpleScope(NULLSCOPE, [describe1('a')]);
    expect(namesOf(scope.getAllElements())).toEqual(['a']);
  });

  it('asks the provider of a parent iterable once, however often it is iterated', () => {
    let requests = 0;
    const iterable = new ParentIterable(new SimpleScope(NULLSCOPE, []), () => {
      requests++;
      return [describe1('x')];
    });
    expect(namesOf(iterable)).toEqual(['x']);
    expect(namesOf(iterable)).toEqual(['x']);
    expect(requests).toBe(1);
    expect(iterable.toString()).toBe('[x]');
  });
});

describe('AbstractScope lookups by name', () => {
  it('finds the first local match and falls back to the parent', () => {
    const outerNode = Node.of('a');
    const first = Node.of('a');
    const parent = new SimpleScope(NULLSCOPE, [describe1('a', outerNode), describe1('z')]);
    const scope = new SimpleScope(parent, [describe1('a', first), describe1('a')]);
    expect(scope.getSingleElement(qn('a'))?.getEObjectOrProxy()).toBe(first);
    expect(scope.getSingleElement(qn('z'))?.getName().toString()).toBe('z');
    expect(scope.getSingleElement(qn('q'))).toBeNull();
  });

  it('lists local matches first, then the parent matches no local element shadows', () => {
    const parent = new SimpleScope(NULLSCOPE, [describe1('a'), describe1('a')]);
    const scope = new SimpleScope(parent, [describe1('a')]);
    // the parent's `a` is shadowed by the local `a`
    expect(namesOf(scope.getElements(qn('a')))).toEqual(['a']);
    expect(namesOf(scope.getElements(qn('q')))).toEqual([]);
  });

  it('returns the parent result itself when an array of local matches is empty', () => {
    const sentinel: IEObjectDescription[] = [];
    const parent: IScope = {
      getSingleElement: () => null,
      getElements: () => sentinel,
      getAllElements: () => [],
    };
    class ArrayScope extends SimpleScope {
      protected override getLocalElementsByName(): IEObjectDescription[] {
        return [];
      }
    }
    expect(new ArrayScope(parent, []).getElements(qn('a'))).toBe(sentinel);
  });

  it('rejects a null parent', () => {
    expect(() => new SimpleScope(null as unknown as IScope, [])).toThrow(IllegalArgumentException);
  });

  it('prints its class, elements and parent chain', () => {
    const scope = new SimpleScope(new SimpleScope(NULLSCOPE, [describe1('p')], true), [describe1('a'), describe1('b')]);
    expect(scope.toString()).toBe('SimpleScope[a, b] -> SimpleScope[ignore case][p] -> NULLSCOPE');
  });

  it('prints the failure of a parent that cannot print', () => {
    class Unprintable implements IScope {
      constructor(private readonly failure: unknown) {}
      getSingleElement(): IEObjectDescription | null {
        return null;
      }
      getElements(): Iterable<IEObjectDescription> {
        return [];
      }
      getAllElements(): Iterable<IEObjectDescription> {
        return [];
      }
      toString(): string {
        throw this.failure;
      }
    }
    expect(new SimpleScope(new Unprintable(new TypeError('no print')), []).toString()).toBe(
      'SimpleScope[] -> TypeError : no print',
    );
    expect(new SimpleScope(new Unprintable('plain'), []).toString()).toBe('SimpleScope[] -> plain');
  });
});

describe('AbstractScope reverse lookups', () => {
  it('finds every alias of an element across the chain, innermost first', () => {
    const shared = Node.of('s');
    const parent = new SimpleScope(NULLSCOPE, [EObjectDescription.create(qn('outer.s'), shared)]);
    const scope = new SimpleScope(parent, [EObjectDescription.create(qn('s'), shared)]);
    expect(namesOf(scope.getElements(shared))).toEqual(['s', 'outer.s']);
    expect(scope.getSingleElement(shared)?.getName().toString()).toBe('s');
    expect(scope.getSingleElement(Node.of('other'))).toBeNull();
  });

  it('does not find an element that its own name no longer reaches (a duplicate)', () => {
    const first = Node.of('a');
    const second = Node.of('a');
    const scope = new SimpleScope(NULLSCOPE, [describe1('a', first), describe1('a', second)]);
    expect(scope.getSingleElement(first)).not.toBeNull();
    expect(scope.getSingleElement(second)).toBeNull();
  });

  it('applies the base rule where a scope does not override it', () => {
    class ListScope extends AbstractScope {
      constructor(private readonly list: IEObjectDescription[]) {
        super(NULLSCOPE, false);
      }
      protected override getAllLocalElements(): Iterable<IEObjectDescription> {
        return this.list;
      }
    }
    const first = Node.of('a');
    const second = Node.of('a');
    const scope = new ListScope([describe1('a', first), describe1('a', second)]);
    // name `a` reaches the first description only: the second is not found by its element
    expect(namesOf(scope.getElements(first))).toEqual(['a']);
    expect(namesOf(scope.getElements(second))).toEqual([]);
    expect(scope.getSingleElement(first)?.getEObjectOrProxy()).toBe(first);
  });
});
