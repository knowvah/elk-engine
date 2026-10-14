// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NULLSCOPE } from './IScope.js';
import { Node, qn } from '../../../test/helpers/xtext/ScopeFixture.js';

describe('NULLSCOPE', () => {
  it('finds and lists nothing', () => {
    const node = Node.of('a');
    expect(NULLSCOPE.getSingleElement(qn('a'))).toBeNull();
    expect(NULLSCOPE.getSingleElement(node)).toBeNull();
    expect([...NULLSCOPE.getElements(qn('a'))]).toEqual([]);
    expect([...NULLSCOPE.getElements(node)]).toEqual([]);
    expect([...NULLSCOPE.getAllElements()]).toEqual([]);
  });

  it('prints its name', () => {
    expect(NULLSCOPE.toString()).toBe('NULLSCOPE');
  });
});
