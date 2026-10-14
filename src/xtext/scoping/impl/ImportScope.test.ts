// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { ISelectable } from '../../resource/ISelectable.js';
import type { EClassRef } from '../EReferenceInfo.js';
import { NULLSCOPE, type IScope } from '../IScope.js';
import { namesOf, Node, NODE_TYPE, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { ImportNormalizer } from './ImportNormalizer.js';
import { ImportScope } from './ImportScope.js';
import { MultimapBasedSelectable } from './MultimapBasedSelectable.js';
import { SimpleScope } from './SimpleScope.js';

const full = (name: string, node: Node = Node.of(name)): IEObjectDescription =>
  EObjectDescription.create(qn(name), node);
const wildcard = (ns: string, ignoreCase = false): ImportNormalizer => new ImportNormalizer(qn(ns), true, ignoreCase);
const exact = (ns: string, ignoreCase = false): ImportNormalizer => new ImportNormalizer(qn(ns), false, ignoreCase);
const selectable = (...descriptions: IEObjectDescription[]): MultimapBasedSelectable =>
  new MultimapBasedSelectable(descriptions);
const importScope = (
  normalizers: ImportNormalizer[],
  from: ISelectable | null,
  parent: IScope = NULLSCOPE,
  ignoreCase = false,
): ImportScope => new ImportScope(normalizers, parent, from, NODE_TYPE, ignoreCase);

describe('ImportScope aliasing', () => {
  it('lists the descriptions under their alias, with the full name behind', () => {
    const scope = importScope([wildcard('x')], selectable(full('x.a'), full('x.b'), full('y.c'), full('x')));
    const all = [...scope.getAllElements()];
    expect(all.map((d) => d.getName().toString())).toEqual(['a', 'b']);
    expect(all.map((d) => d.getQualifiedName().toString())).toEqual(['x.a', 'x.b']);
  });

  it('removes a name that two different normalizers make ambiguous', () => {
    const scope = importScope([wildcard('x'), wildcard('y')], selectable(full('x.a'), full('x.b'), full('y.a')));
    expect(namesOf(scope.getAllElements())).toEqual(['b']);
  });

  it('keeps a name that one normalizer reaches twice (a duplicate normalizer is dropped)', () => {
    const scope = importScope([wildcard('x'), wildcard('x')], selectable(full('x.a')));
    expect(namesOf(scope.getAllElements())).toEqual(['a']);
    expect(scope.toString()).toContain('ImportScope[x.*] imports from');
  });

  it('keeps document order of the aliases and both duplicate descriptions of one alias', () => {
    const first = Node.of('a');
    const second = Node.of('a');
    const scope = importScope([wildcard('x')], selectable(full('x.b'), full('x.a', first), full('x.a', second)));
    const all = [...scope.getAllElements()];
    expect(all.map((d) => d.getName().toString())).toEqual(['b', 'a', 'a']);
    expect(scope.getSingleElement(qn('a'))?.getEObjectOrProxy()).toBe(first);
  });

  it('folds case of the alias key when ignoring case', () => {
    const scope = importScope([wildcard('X', true)], selectable(full('x.A'), full('x.a')), NULLSCOPE, true);
    expect(namesOf(scope.getAllElements())).toEqual(['A', 'a']);
  });

  it('treats case-differing aliases reached by two normalizers as one ambiguous name', () => {
    const scope = importScope(
      [wildcard('x'), wildcard('X', true)],
      selectable(full('x.A'), full('x.a')),
      NULLSCOPE,
      true,
    );
    expect(namesOf(scope.getAllElements())).toEqual([]);
  });

  it('merges the parent elements whose names the aliases do not hide', () => {
    const parent = new SimpleScope(NULLSCOPE, [full('a'), full('z')]);
    const scope = importScope([wildcard('x')], selectable(full('x.a')), parent);
    expect(namesOf(scope.getAllElements())).toEqual(['a', 'z']);
    const folded = importScope(
      [wildcard('x', true)],
      selectable(full('x.A')),
      new SimpleScope(NULLSCOPE, [full('a')]),
      true,
    );
    expect(namesOf(folded.getAllElements())).toEqual(['A']);
  });
});

describe('ImportScope lookups by name', () => {
  it('resolves a relative name through each normalizer', () => {
    const scope = importScope([wildcard('x'), exact('y.b')], selectable(full('x.a'), full('y.b'), full('x.y.b')));
    expect(scope.getSingleElement(qn('a'))?.getQualifiedName().toString()).toBe('x.a');
    expect(scope.getSingleElement(qn('b'))?.getQualifiedName().toString()).toBe('y.b');
    expect(scope.getSingleElement(qn('y.b'))?.getQualifiedName().toString()).toBe('x.y.b');
    expect(scope.getSingleElement(qn('c'))).toBeNull();
  });

  it('finds nothing for a name two normalizers resolve to different objects', () => {
    const scope = importScope([wildcard('x'), wildcard('y')], selectable(full('x.a'), full('y.a')));
    expect(scope.getSingleElement(qn('a'))).toBeNull();
    expect([...scope.getElements(qn('a'))]).toEqual([]);
  });

  it('returns both when two normalizers resolve a name to the same object', () => {
    const shared = Node.of('s');
    const scope = importScope(
      [wildcard('x'), wildcard('y')],
      selectable(EObjectDescription.create(qn('x.a'), shared), EObjectDescription.create(qn('y.a'), shared)),
    );
    expect(namesOf(scope.getElements(qn('a')))).toEqual(['a', 'a']);
  });

  it('answers a request the parent can answer when nothing matches locally', () => {
    const parent = new SimpleScope(NULLSCOPE, [full('q')]);
    const scope = importScope([wildcard('x')], selectable(full('x.a')), parent);
    expect(namesOf(scope.getElements(qn('q')))).toEqual(['q']);
    expect(scope.getSingleElement(qn('q'))?.getName().toString()).toBe('q');
  });

  it('imports from its parent scope when it has no selectable', () => {
    const parent = new SimpleScope(NULLSCOPE, [full('x.a')]);
    const scope = importScope([wildcard('x')], null, parent);
    expect(scope.getSingleElement(qn('a'))?.getQualifiedName().toString()).toBe('x.a');
  });

  it('fails loudly when an element returned for a name cannot be named relative to the import', () => {
    const stray: ISelectable = {
      isEmpty: () => false,
      getExportedObjects: () => [],
      getExportedObjectsByName: () => [full('zzz')],
      getExportedObjectsByType: () => [],
      getExportedObjectsByObject: () => [],
    };
    const scope = importScope([wildcard('x')], stray);
    expect(() => scope.getSingleElement(qn('a'))).toThrow(IllegalStateException);
    expect(() => scope.getSingleElement(qn('a'))).toThrow("Couldn't deresolve zzz with import x.*");
  });

  it('asks the selectable with the scope type', () => {
    const seen: EClassRef[] = [];
    const spy: ISelectable = {
      isEmpty: () => false,
      getExportedObjects: () => [],
      getExportedObjectsByName: (type: EClassRef, _name: QualifiedName, _ignore: boolean) => {
        seen.push(type);
        return [];
      },
      getExportedObjectsByType: () => [],
      getExportedObjectsByObject: () => [],
    };
    importScope([wildcard('x')], spy).getSingleElement(qn('a'));
    expect(seen).toEqual([NODE_TYPE]);
  });
});

describe('ImportScope reverse lookups', () => {
  it('returns the alias an element is visible under, when its name leads back to it', () => {
    const target = Node.of('a');
    const scope = importScope([wildcard('x'), wildcard('x.y')], selectable(full('x.y.a', target)));
    // aliases `y.a` (via x) and `a` (via x.y)
    expect(namesOf(scope.getElements(target))).toEqual(['y.a', 'a']);
  });

  it('skips an alias that name lookup resolves to another object', () => {
    const first = Node.of('a');
    const second = Node.of('a');
    const scope = importScope([wildcard('x')], selectable(full('x.a', first), full('x.a', second)));
    expect(namesOf(scope.getElements(first))).toEqual(['a']);
    expect(namesOf(scope.getElements(second))).toEqual([]);
  });

  it('skips an ambiguous alias', () => {
    const target = Node.of('a');
    const scope = importScope(
      [wildcard('x'), wildcard('y')],
      selectable(full('x.a', target), full('y.a', Node.of('a'))),
    );
    expect(namesOf(scope.getElements(target))).toEqual([]);
  });

  it('skips an alias that no name lookup reaches', () => {
    const target = Node.of('a');
    const hidden: ISelectable = {
      isEmpty: () => false,
      getExportedObjects: () => [],
      getExportedObjectsByName: () => [],
      getExportedObjectsByType: () => [],
      getExportedObjectsByObject: (object: EObject) => [EObjectDescription.create(qn('x.a'), object)],
    };
    expect(namesOf(importScope([wildcard('x')], hidden).getElements(target))).toEqual([]);
  });
});
