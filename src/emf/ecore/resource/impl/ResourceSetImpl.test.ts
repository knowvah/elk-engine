// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { URI } from '../../../common/util/URI.js';
import { ResourceNode } from '../../../../../test/helpers/emf/ResourceNode.js';
import type { Resource } from '../Resource.js';
import { ResourceImpl } from './ResourceImpl.js';
import { ResourceSetImpl } from './ResourceSetImpl.js';

const DOC = 'file:/a.elkj';
const MISSING_MESSAGE = `Cannot create a resource for 'file:/missing.elkj'; a registered resource factory is needed`;

/** A set with one loaded resource `DOC` holding `root`. */
function loadedSet(root: ResourceNode): { set: ResourceSetImpl; resource: ResourceImpl } {
  const set = new ResourceSetImpl();
  const resource = new ResourceImpl(URI.createURI(DOC));
  resource.getContents().add(root);
  set.getResources().add(resource);
  return { set, resource };
}

describe('ResourceSetImpl.getResources', () => {
  it('is one lazily created list that sets and clears the resource set of its members', () => {
    const set = new ResourceSetImpl();
    expect(set.getResources()).toBe(set.getResources());
    const [a, b] = [new ResourceImpl(URI.createURI('x:/a')), new ResourceImpl(URI.createURI('x:/b'))];
    set.getResources().addAll([a, b]);
    expect([a.getResourceSet(), b.getResourceSet()]).toEqual([set, set]);
    set.getResources().clear();
    expect([a.getResourceSet(), b.getResourceSet()]).toEqual([null, null]);
  });

  it('rejects a duplicate and supports addAt, set and removeAt with their inverses', () => {
    const set = new ResourceSetImpl();
    const [a, b, c] = ['a', 'b', 'c'].map((n) => new ResourceImpl(URI.createURI(`x:/${n}`)));
    const [ra, rb, rc] = [a as ResourceImpl, b as ResourceImpl, c as ResourceImpl];
    set.getResources().add(ra);
    expect(() => set.getResources().addAt(0, ra)).toThrow(IllegalArgumentException);
    set.getResources().addAt(0, rb);
    expect(set.getResources().set(1, rc)).toBe(ra);
    expect(ra.getResourceSet()).toBeNull();
    expect(rc.getResourceSet()).toBe(set);
    expect(set.getResources().set(1, rc)).toBe(rc);
    expect(set.getResources().removeAt(0)).toBe(rb);
    expect(rb.getResourceSet()).toBeNull();
    expect(set.getResources().toArray()).toEqual([rc]);
  });

  it('adds and removes without the inverse through basicAdd and basicRemove', () => {
    const set = new ResourceSetImpl();
    const resource = new ResourceImpl(URI.createURI('x:/a'));
    const list = set.getResources() as unknown as {
      basicAdd(r: Resource): void;
      basicRemove(r: Resource): void;
    };
    list.basicAdd(resource);
    expect(set.getResources().toArray()).toEqual([resource]);
    expect(resource.getResourceSet()).toBeNull();
    list.basicRemove(new ResourceImpl(URI.createURI('x:/other')));
    list.basicRemove(resource);
    expect(set.getResources().size()).toBe(0);
  });

  it('addAll of nothing changes nothing', () => {
    expect(new ResourceSetImpl().getResources().addAll([])).toBe(false);
  });
});

describe('ResourceSetImpl.getResource', () => {
  it('finds a loaded resource by URI with and without loadOnDemand', () => {
    const { set, resource } = loadedSet(new ResourceNode('r'));
    resource.getContents().add(new ResourceNode('second'));
    expect(set.getResource(URI.createURI(DOC), false)).toBe(resource);
    expect(set.getResource(URI.createURI(DOC), true)).toBe(resource);
  });

  it('returns null for an unknown URI without loadOnDemand', () => {
    const { set } = loadedSet(new ResourceNode('r'));
    expect(set.getResource(URI.createURI('file:/missing.elkj'), false)).toBeNull();
    expect(new ResourceSetImpl().getResource(URI.createURI(DOC), false)).toBeNull();
  });

  it('fails like EMF without a registered factory for an unknown URI with loadOnDemand', () => {
    const { set } = loadedSet(new ResourceNode('r'));
    expect(() => set.getResource(URI.createURI('file:/missing.elkj'), true)).toThrow(
      new RuntimeException(MISSING_MESSAGE),
    );
  });

  it('demand loads an unloaded resource through demandLoad, which the base does not support', () => {
    const set = new ResourceSetImpl();
    set.getResources().add(new ResourceImpl(URI.createURI(DOC)));
    expect(() => set.getResource(URI.createURI(DOC), true)).toThrow(UnsupportedOperationException);
    expect(set.getResource(URI.createURI(DOC), false)).not.toBeNull();
  });

  it('lets a subclass demand load', () => {
    const loaded: string[] = [];
    class Loading extends ResourceSetImpl {
      protected override demandLoad(resource: Resource): void {
        loaded.push((resource.getURI() as URI).toString());
        (resource as ResourceImpl).getContents().add(new ResourceNode('loaded'));
      }
    }
    const set = new Loading();
    set.getResources().add(new ResourceImpl(URI.createURI(DOC)));
    const resource = set.getResource(URI.createURI(DOC), true) as ResourceImpl;
    expect(loaded).toEqual([DOC]);
    expect(resource.isLoaded()).toBe(true);
    set.getResource(URI.createURI(DOC), true);
    expect(loaded).toEqual([DOC]);
  });
});

describe('ResourceSetImpl.getEObject', () => {
  it('looks the fragment up in the resource of the fragment-less URI', () => {
    const root = new ResourceNode('r');
    const { set } = loadedSet(root);
    expect(set.getEObject(URI.createURI(`${DOC}#/`), false)).toBe(root);
    expect(set.getEObject(URI.createURI(`${DOC}#/0`), true)).toBe(root);
  });

  it('returns null when the resource is missing or the fragment names nothing', () => {
    const { set } = loadedSet(new ResourceNode('r'));
    expect(set.getEObject(URI.createURI('file:/missing.elkj#/'), false)).toBeNull();
    expect(set.getEObject(URI.createURI(`${DOC}#/3`), false)).toBeNull();
  });

  it('propagates the RuntimeException of demand creation, which EcoreUtil.resolve retries without', () => {
    const { set } = loadedSet(new ResourceNode('r'));
    expect(() => set.getEObject(URI.createURI('file:/missing.elkj#/'), true)).toThrow(MISSING_MESSAGE);
  });

  it('dispatches to an overridden resource getEObject (the LazyLinkingResource hook)', () => {
    const target = new ResourceNode('t');
    class Lazy extends ResourceImpl {
      override getEObject(uriFragment: string): ResourceNode | null {
        return uriFragment === '|0' ? target : null;
      }
    }
    const set = new ResourceSetImpl();
    set.getResources().add(new Lazy(URI.createURI(DOC)));
    expect(set.getEObject(URI.createURI(`${DOC}#|0`), false)).toBe(target);
    expect(set.getEObject(URI.createURI(`${DOC}#|1`), false)).toBeNull();
  });
});
