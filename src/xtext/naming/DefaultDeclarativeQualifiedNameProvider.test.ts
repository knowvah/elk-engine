// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../emf/ecore/EObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ResourceScopeCache } from '../util/ResourceScopeCache.js';
import { DefaultDeclarativeQualifiedNameProvider } from './DefaultDeclarativeQualifiedNameProvider.js';
import type { IQualifiedNameConverter } from './IQualifiedNameConverter.js';
import { QualifiedName } from './QualifiedName.js';
import { ArithmeticException } from '../../java/lang/ArithmeticException.js';

/** The minimal InternalEObject surface the provider and EcoreUtil.getRootContainer touch. */
class Node {
  constructor(
    readonly name: string | null,
    readonly parent: Node | null = null,
  ) {}
  eContainer(): Node | null {
    return this.parent;
  }
  eInternalContainer(): Node | null {
    return this.parent;
  }
}

const asEObject = (n: Node): EObject => n as unknown as EObject;

const dotConverter: IQualifiedNameConverter = {
  toString: (name) => name.toString(),
  toQualifiedName: (text) => QualifiedName.createFromList(text.split('.')),
};

class NameAttributeProvider extends DefaultDeclarativeQualifiedNameProvider {
  computations = 0;
  protected override getResolver(): (obj: EObject) => string | null {
    return (obj) => (obj as unknown as Node).name;
  }
  protected override computeFullyQualifiedName(obj: EObject): QualifiedName | null {
    this.computations++;
    return super.computeFullyQualifiedName(obj);
  }
}

function newProvider(): NameAttributeProvider {
  return new NameAttributeProvider(dotConverter, new ResourceScopeCache());
}

describe('DefaultDeclarativeQualifiedNameProvider default dispatcher', () => {
  it('the default resolver finds no name and the default qualifiedName gives none', () => {
    const provider = new DefaultDeclarativeQualifiedNameProvider(dotConverter, new ResourceScopeCache());
    const leaf = new Node('x', new Node('root'));
    expect(provider.getFullyQualifiedName(asEObject(leaf))).toBeNull();
    expect(provider.apply(asEObject(leaf))).toBeNull();
  });
});

describe('DefaultDeclarativeQualifiedNameProvider name attribute', () => {
  it('qualifies a name with its parents', () => {
    const root = new Node('r');
    const mid = new Node('m', root);
    const leaf = new Node('l', mid);
    expect(newProvider().getFullyQualifiedName(asEObject(leaf))?.toString()).toBe('r.m.l');
  });

  it('skips an unnamed middle level', () => {
    const root = new Node('r');
    const mid = new Node(null, root);
    const leaf = new Node('l', mid);
    expect(newProvider().getFullyQualifiedName(asEObject(leaf))?.toString()).toBe('r.l');
  });

  it('an empty name is no name; a dotted name is split by the converter', () => {
    const provider = newProvider();
    expect(provider.getFullyQualifiedName(asEObject(new Node('')))).toBeNull();
    expect(provider.getFullyQualifiedName(asEObject(new Node('a.b')))?.getSegments()).toEqual(['a', 'b']);
  });

  it('a root without parents gets its own name', () => {
    expect(
      newProvider()
        .getFullyQualifiedName(asEObject(new Node('r')))
        ?.toString(),
    ).toBe('r');
  });

  it('caches per object', () => {
    const provider = newProvider();
    const leaf = new Node('l', new Node('r'));
    const first = provider.getFullyQualifiedName(asEObject(leaf));
    const computed = provider.computations;
    expect(provider.getFullyQualifiedName(asEObject(leaf))).toBe(first);
    expect(provider.computations).toBe(computed);
  });
});

class DispatchingProvider extends NameAttributeProvider {
  constructor(private readonly behaviour: (obj: Node) => QualifiedName | null) {
    super(dotConverter, new ResourceScopeCache());
  }
  protected override qualifiedName(ele: EObject): QualifiedName | null {
    return this.behaviour(ele as unknown as Node);
  }
}

describe('DefaultDeclarativeQualifiedNameProvider dispatch', () => {
  it('a dispatcher result wins over the name attribute', () => {
    const provider = new DispatchingProvider(() => QualifiedName.create('custom'));
    expect(provider.getFullyQualifiedName(asEObject(new Node('x', new Node('r'))))?.toString()).toBe('custom');
  });

  it('null from the dispatcher falls back to the name attribute', () => {
    const provider = new DispatchingProvider(() => null);
    expect(provider.getFullyQualifiedName(asEObject(new Node('x', new Node('r'))))?.toString()).toBe('r.x');
  });

  it('swallows every exception of the dispatched method', () => {
    const throwing = new DispatchingProvider((obj) => QualifiedName.create(obj.name));
    expect(throwing.getFullyQualifiedName(asEObject(new Node(null)))).toBeNull();
    const failing = new DispatchingProvider(() => {
      throw new IllegalArgumentException('boom');
    });
    expect(failing.getFullyQualifiedName(asEObject(new Node('x')))?.toString()).toBe('x');
    const thrownString = new DispatchingProvider(() => {
      throw 'not an error';
    });
    expect(thrownString.getFullyQualifiedName(asEObject(new Node(null)))).toBeNull();
  });

  it('swallows a Java RuntimeException that used to be a RangeError (only java.lang.Error propagates)', () => {
    // PolymorphicDispatcher.java:304-307 rethrows only an Error; ArithmeticException is a RuntimeException (AD-16a)
    const dividing = new DispatchingProvider(() => {
      throw new ArithmeticException('/ by zero');
    });
    expect(dividing.getFullyQualifiedName(asEObject(new Node('x')))?.toString()).toBe('x');
  });

  it('a name-less element has no name even when its dispatch throws (fallback is null)', () => {
    const provider = new DefaultDeclarativeQualifiedNameProvider(dotConverter, new ResourceScopeCache());
    expect(provider.getFullyQualifiedName(asEObject(new Node(null)))).toBeNull();
  });

  it('lets engine faults propagate', () => {
    const provider = new DispatchingProvider(() => {
      throw new RangeError('Maximum call stack size exceeded');
    });
    expect(() => provider.getFullyQualifiedName(asEObject(new Node('x')))).toThrow(RangeError);
  });
});
