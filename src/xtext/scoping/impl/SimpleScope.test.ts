// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import { NULLSCOPE } from '../IScope.js';
import { namesOf, Node, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { SimpleScope } from './SimpleScope.js';

const desc = (name: string, node: Node = Node.of(name)): IEObjectDescription =>
  EObjectDescription.create(qn(name), node);

describe('SimpleScope shadowing', () => {
  it('shadows parent elements of the same name only', () => {
    const parent = new SimpleScope(NULLSCOPE, [desc('a'), desc('b')]);
    const scope = new SimpleScope(parent, [desc('a')]);
    expect(namesOf(scope.getAllElements())).toEqual(['a', 'b']);
    expect(scope.isShadowed(desc('a'))).toBe(true);
    expect(scope.isShadowed(desc('b'))).toBe(false);
    expect(scope.isShadowed(desc('A'))).toBe(false);
  });

  it('shadows by lower-case name when ignoring case', () => {
    const scope = new SimpleScope(NULLSCOPE, [desc('Ab')], true);
    expect(scope.isShadowed(desc('aB'))).toBe(true);
    expect(scope.isIgnoreCase()).toBe(true);
    expect(scope.getSingleElement(qn('AB'))?.getName().toString()).toBe('Ab');
  });

  it('builds the shadowing index once', () => {
    let iterations = 0;
    const counting = {
      *[Symbol.iterator](): Iterator<IEObjectDescription> {
        iterations++;
        yield desc('a');
      },
    };
    const scope = new SimpleScope(NULLSCOPE, counting);
    scope.isShadowed(desc('a'));
    scope.isShadowed(desc('b'));
    expect(iterations).toBe(1);
  });

  it('rejects null descriptions', () => {
    expect(() => new SimpleScope(NULLSCOPE, null as unknown as IEObjectDescription[])).toThrow(
      IllegalArgumentException,
    );
    expect(() => new SimpleScope(NULLSCOPE, null as unknown as IEObjectDescription[])).toThrow(
      'descriptions may not be null',
    );
  });
});

describe('SimpleScope reverse lookup', () => {
  it('finds an element through its shadowing key, only if its name reaches it', () => {
    const first = Node.of('a');
    const second = Node.of('a');
    const other = Node.of('b');
    const scope = new SimpleScope(NULLSCOPE, [desc('a', first), desc('a', second), desc('b', other)]);
    expect(namesOf(scope.getElements(first))).toEqual(['a']);
    expect(namesOf(scope.getElements(second))).toEqual([]);
    expect(namesOf(scope.getElements(other))).toEqual(['b']);
  });

  it('finds a description of the same object that is not the listed one (lazy views)', () => {
    const node = Node.of('a');
    let creations = 0;
    // each iteration builds new description objects, as a Guava transform view does
    const lazy = {
      *[Symbol.iterator](): Iterator<IEObjectDescription> {
        creations++;
        yield desc('a', node);
      },
    };
    const scope = new SimpleScope(NULLSCOPE, lazy);
    expect(scope.getSingleElement(node)?.getEObjectOrProxy()).toBe(node);
    expect(creations).toBeGreaterThan(1);
  });

  it('with ignore case, the key is the lower-case name', () => {
    const upper = Node.of('A');
    const lower = Node.of('a');
    const scope = new SimpleScope(NULLSCOPE, [desc('A', upper), desc('a', lower)], true);
    expect(namesOf(scope.getElements(upper))).toEqual(['A']);
    expect(namesOf(scope.getElements(lower))).toEqual([]);
  });
});
