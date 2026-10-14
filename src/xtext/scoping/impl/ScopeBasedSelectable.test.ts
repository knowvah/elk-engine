// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import { NODE_TYPE, namesOf, Node, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { SimpleScope } from './SimpleScope.js';
import { NULLSCOPE } from '../IScope.js';
import { ScopeBasedSelectable } from './ScopeBasedSelectable.js';

describe('ScopeBasedSelectable', () => {
  const node = Node.of('a');
  const scope = new SimpleScope(NULLSCOPE, [EObjectDescription.create(qn('a'), node)]);
  const selectable = new ScopeBasedSelectable(scope);

  it('is never empty and hands every request to the scope', () => {
    expect(selectable.isEmpty()).toBe(false);
    expect(namesOf(selectable.getExportedObjects())).toEqual(['a']);
    expect(namesOf(selectable.getExportedObjectsByType(NODE_TYPE))).toEqual(['a']);
    expect(namesOf(selectable.getExportedObjectsByName(NODE_TYPE, qn('a'), false))).toEqual(['a']);
    expect(namesOf(selectable.getExportedObjectsByName(NODE_TYPE, qn('b'), true))).toEqual([]);
    expect(namesOf(selectable.getExportedObjectsByObject(node))).toEqual(['a']);
  });

  it('prints as its scope', () => {
    expect(selectable.toString()).toBe(scope.toString());
  });
});
