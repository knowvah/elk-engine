// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { QualifiedName } from '../naming/QualifiedName.js';
import { NULLSCOPE } from './IScope.js';
import { namesOf, Node, qn } from '../../../test/helpers/xtext/ScopeFixture.js';
import { scopedElementsFor, scopeFor } from './Scopes.js';

const nameOf = (node: Node): QualifiedName | null => (node.id === null ? null : QualifiedName.create(node.id));

describe('scopedElementsFor', () => {
  it('describes the elements that have a name and skips the others', () => {
    const named = Node.of('a');
    const anonymous = Node.of(null);
    const descriptions = [...scopedElementsFor([named, anonymous, Node.of('b')], nameOf)];
    expect(namesOf(descriptions)).toEqual(['a', 'b']);
    expect(descriptions[0]?.getEObjectOrProxy()).toBe(named);
    expect(descriptions[0]?.getUserDataKeys()).toEqual([]);
  });

  it('computes names again on each iteration, with new descriptions', () => {
    let calls = 0;
    const view = scopedElementsFor([Node.of('a')], (n) => {
      calls++;
      return nameOf(n);
    });
    const first = [...view][0];
    const second = [...view][0];
    expect(calls).toBe(2);
    expect(first).not.toBe(second);
  });

  it('finds no names for ElkGraph elements without the default name attribute', () => {
    expect([...scopedElementsFor([Node.of('a')])]).toEqual([]);
  });
});

describe('scopeFor', () => {
  it('builds a scope over named elements with the given outer scope', () => {
    const a = Node.of('a');
    const outer = scopeFor([Node.of('z')], nameOf, NULLSCOPE);
    const scope = scopeFor([a, Node.of(null)], nameOf, outer);
    expect(scope.getSingleElement(qn('a'))?.getEObjectOrProxy()).toBe(a);
    expect(scope.getSingleElement(qn('z'))?.getName().toString()).toBe('z');
    expect(namesOf(scope.getAllElements())).toEqual(['a', 'z']);
    expect(scope.getSingleElement(a)?.getName().toString()).toBe('a');
  });

  it('with the default naming (no name attribute) finds nothing, and defaults the outer scope', () => {
    expect(namesOf(scopeFor([Node.of('a')]).getAllElements())).toEqual([]);
    const outer = scopeFor([Node.of('z')], nameOf, NULLSCOPE);
    expect(
      scopeFor([Node.of('a')], outer)
        .getSingleElement(qn('z'))
        ?.getName()
        .toString(),
    ).toBe('z');
  });
});
