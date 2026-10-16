// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { URI } from '../../../common/util/URI.js';
import { ResourceNode } from '../../../../../test/helpers/emf/ResourceNode.js';
import type { ResourceDiagnostic } from '../Resource.js';
import { ResourceImpl } from './ResourceImpl.js';
import { ResourceSetImpl } from './ResourceSetImpl.js';

const DOC = URI.createURI('file:/a.elkj');

function resourceWith(...roots: ResourceNode[]): ResourceImpl {
  const resource = new ResourceImpl(DOC);
  resource.getContents().addAll(roots);
  return resource;
}

describe('ResourceImpl basics', () => {
  it('holds the URI given at construction and replaces it with setURI', () => {
    const resource = new ResourceImpl(DOC);
    expect(resource.getURI()).toBe(DOC);
    const other = URI.createURI('file:/b.elkj');
    resource.setURI(other);
    expect(resource.getURI()).toBe(other);
    expect(new ResourceImpl().getURI()).toBeNull();
  });

  it('returns the same lazily created contents, errors and warnings lists', () => {
    const resource = new ResourceImpl(DOC);
    expect(resource.getContents()).toBe(resource.getContents());
    expect(resource.getErrors()).toBe(resource.getErrors());
    expect(resource.getWarnings()).toBe(resource.getWarnings());
    expect(resource.getErrors()).not.toBe(resource.getWarnings());
    const diagnostic: ResourceDiagnostic = { getMessage: () => 'm', getLine: () => 3 };
    resource.getErrors().add(diagnostic);
    expect(resource.getErrors().get(0)).toBe(diagnostic);
    expect(resource.getWarnings().size()).toBe(0);
  });

  it('has no resource set until added to one, and loses it on removal', () => {
    const resource = new ResourceImpl(DOC);
    const set = new ResourceSetImpl();
    expect(resource.getResourceSet()).toBeNull();
    set.getResources().add(resource);
    expect(resource.getResourceSet()).toBe(set);
    set.getResources().remove(resource);
    expect(resource.getResourceSet()).toBeNull();
  });

  it('removes the resource from its old set when moved to a new one', () => {
    const resource = new ResourceImpl(DOC);
    const [first, second] = [new ResourceSetImpl(), new ResourceSetImpl()];
    first.getResources().add(resource);
    second.getResources().add(resource);
    expect(first.getResources().size()).toBe(0);
    expect(second.getResources().toArray()).toEqual([resource]);
    expect(resource.getResourceSet()).toBe(second);
  });
});

describe('ResourceImpl contents', () => {
  it('makes the resource the direct resource of an added root and clears it on removal', () => {
    const [root, other] = [new ResourceNode('r'), new ResourceNode('o')];
    const resource = resourceWith(root, other);
    expect(root.eDirectResource()).toBe(resource);
    expect(root.eResource()).toBe(resource);
    resource.getContents().remove(root);
    expect(root.eDirectResource()).toBeNull();
    expect(other.eResource()).toBe(resource);
    resource.getContents().clear();
    expect(other.eResource()).toBeNull();
  });

  it('is loaded once an element is added at the end, and once an empty list is cleared', () => {
    const added = new ResourceImpl(DOC);
    expect(added.isLoaded()).toBe(false);
    added.getContents().add(new ResourceNode('r'));
    expect(added.isLoaded()).toBe(true);
    const cleared = new ResourceImpl(DOC);
    cleared.getContents().clear();
    expect(cleared.isLoaded()).toBe(true);
    const nonEmptyClear = new ResourceImpl(DOC);
    nonEmptyClear.getContents().add(new ResourceNode('r'));
    nonEmptyClear.getContents().clear();
    expect(nonEmptyClear.isLoaded()).toBe(true);
  });

  it('inserts at an index', () => {
    const resource = new ResourceImpl(DOC);
    resource.getContents().add(new ResourceNode('a'));
    resource.getContents().addAt(0, new ResourceNode('b'));
    expect(resource.getContents().size()).toBe(2);
    expect(resource.isLoaded()).toBe(true);
  });

  it('rejects a duplicate root and sets the resource for addAt and setUnique', () => {
    const [a, b, c] = [new ResourceNode('a'), new ResourceNode('b'), new ResourceNode('c')];
    const resource = resourceWith(a, b);
    expect(() => resource.getContents().addAt(0, a)).toThrow(IllegalArgumentException);
    resource.getContents().addAt(1, c);
    expect(c.eResource()).toBe(resource);
    expect(resource.getContents().toArray()).toEqual([a, c, b]);
    const d = new ResourceNode('d');
    expect(resource.getContents().set(0, d)).toBe(a);
    expect(a.eResource()).toBeNull();
    expect(d.eResource()).toBe(resource);
    expect(resource.getContents().set(0, d)).toBe(d);
  });

  it('removing by index clears the removed root', () => {
    const [a, b] = [new ResourceNode('a'), new ResourceNode('b')];
    const resource = resourceWith(a, b);
    expect(resource.getContents().removeAt(0)).toBe(a);
    expect(a.eResource()).toBeNull();
    expect(b.eResource()).toBe(resource);
  });

  it('adds and removes without the inverse through basicAdd and basicRemove', () => {
    const [a, b] = [new ResourceNode('a'), new ResourceNode('b')];
    const resource = new ResourceImpl(DOC);
    resource.getContents().basicAdd(a);
    expect(resource.getContents().toArray()).toEqual([a]);
    expect(a.eResource()).toBeNull();
    resource.getContents().basicRemove(b);
    resource.getContents().basicRemove(a);
    expect(resource.getContents().size()).toBe(0);
  });

  it('addAll of nothing changes nothing and of several sets every resource', () => {
    const resource = new ResourceImpl(DOC);
    expect(resource.getContents().addAll([])).toBe(false);
    expect(resource.isLoaded()).toBe(false);
    const [a, b] = [new ResourceNode('a'), new ResourceNode('b')];
    expect(resource.getContents().addAll([a, b])).toBe(true);
    expect([a.eResource(), b.eResource()]).toEqual([resource, resource]);
  });

  it('moves a root from one resource to another', () => {
    const root = new ResourceNode('r');
    const first = resourceWith(root);
    const second = new ResourceImpl(DOC);
    second.getContents().add(root);
    expect(first.getContents().size()).toBe(0);
    expect(root.eResource()).toBe(second);
  });
});

describe('ResourceImpl.getEObject', () => {
  it('returns the content at the position given by a / path root segment; empty means 0', () => {
    const [a, b] = [new ResourceNode('a'), new ResourceNode('b')];
    const resource = resourceWith(a, b);
    expect(resource.getEObject('/')).toBe(a);
    expect(resource.getEObject('/0')).toBe(a);
    expect(resource.getEObject('/1')).toBe(b);
  });

  it('returns null for a position outside the contents', () => {
    const resource = resourceWith(new ResourceNode('a'));
    expect(resource.getEObject('/1')).toBeNull();
    expect(resource.getEObject('/-1')).toBeNull();
    expect(new ResourceImpl(DOC).getEObject('/')).toBeNull();
  });

  it('wraps a non-integer root segment as a RuntimeException with the NumberFormatException cause', () => {
    const resource = resourceWith(new ResourceNode('a'));
    let caught: unknown;
    try {
      resource.getEObject('/x');
    } catch (exception) {
      caught = exception;
    }
    expect(caught).toBeInstanceOf(RuntimeException);
    expect((caught as RuntimeException).message).toBe('For input string: "x"');
    expect((caught as RuntimeException).cause).toBeInstanceOf(NumberFormatException);
  });

  it('propagates an error thrown by the ID lookup of a ?id root segment', () => {
    class Failing extends ResourceImpl {
      protected override getEObjectByID(): never {
        throw new RangeError('boom');
      }
    }
    expect(() => new Failing(DOC).getEObject('/?id')).toThrow(RangeError);
  });

  it('looks up a ?id root segment and a plain fragment by ID, which finds nothing for ElkGraph', () => {
    const resource = resourceWith(new ResourceNode('a'));
    expect(resource.getEObject('/?n1')).toBeNull();
    expect(resource.getEObject('n1')).toBeNull();
    expect(resource.getEObject('')).toBeNull();
  });

  it('strips a trailing unique-name suffix from the last earlier ? before the ID lookup', () => {
    const lookups: string[] = [];
    class Recording extends ResourceImpl {
      protected override getEObjectByID(id: string): null {
        lookups.push(id);
        return null;
      }
    }
    const resource = new Recording(DOC);
    resource.getEObject('abc?1?');
    resource.getEObject('?');
    resource.getEObject('?x?');
    resource.getEObject('plain');
    expect(lookups).toEqual(['abc', '?', '?x?', 'plain']);
  });

  it('refuses the later segments of a path, which need the reflective segment lookup', () => {
    const resource = resourceWith(new ResourceNode('a'));
    expect(() => resource.getEObject('/0/children.0')).toThrow(UnsupportedOperationException);
    expect(new ResourceImpl(DOC).getEObject('/5/children.0')).toBeNull();
  });
});
