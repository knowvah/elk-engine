// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { EClassRef } from '../EReferenceInfo.js';
import { namesOf, Node, NODE_TYPE, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { MultimapBasedSelectable } from './MultimapBasedSelectable.js';

const desc = (name: string, node: Node = Node.of(name)): IEObjectDescription =>
  EObjectDescription.create(qn(name), node);
const NOTHING: EClassRef = { name: 'None', isAssignableFrom: () => false };

describe('MultimapBasedSelectable', () => {
  it('is empty without descriptions, and answers every request with nothing', () => {
    const empty = new MultimapBasedSelectable([]);
    expect(empty.isEmpty()).toBe(true);
    expect([...empty.getExportedObjects()]).toEqual([]);
    expect([...empty.getExportedObjectsByType(NODE_TYPE)]).toEqual([]);
    expect([...empty.getExportedObjectsByObject(Node.of('x'))]).toEqual([]);
    expect([...empty.getExportedObjectsByName(NODE_TYPE, qn('a'), false)]).toEqual([]);
  });

  it('lists the descriptions in the given order, filtered by assignable type', () => {
    const selectable = new MultimapBasedSelectable([desc('b'), desc('a'), desc('c')]);
    expect(selectable.isEmpty()).toBe(false);
    expect(namesOf(selectable.getExportedObjects())).toEqual(['b', 'a', 'c']);
    expect(namesOf(selectable.getExportedObjectsByType(NODE_TYPE))).toEqual(['b', 'a', 'c']);
    expect(namesOf(selectable.getExportedObjectsByType(NOTHING))).toEqual([]);
  });

  it('selects by name in document order, exactly or ignoring case', () => {
    const first = Node.of('a');
    const second = Node.of('a');
    const upper = Node.of('A');
    const selectable = new MultimapBasedSelectable([desc('a', first), desc('A', upper), desc('a', second)]);
    const exact = [...selectable.getExportedObjectsByName(NODE_TYPE, qn('a'), false)];
    expect(exact.map((d) => d.getEObjectOrProxy())).toEqual([first, second]);
    const folded = [...selectable.getExportedObjectsByName(NODE_TYPE, qn('a'), true)];
    expect(folded.map((d) => d.getEObjectOrProxy())).toEqual([first, upper, second]);
    expect([...selectable.getExportedObjectsByName(NODE_TYPE, qn('b'), false)]).toEqual([]);
    expect([...selectable.getExportedObjectsByName(NOTHING, qn('a'), false)]).toEqual([]);
    expect([...selectable.getExportedObjectsByName(NOTHING, qn('a'), true)]).toEqual([]);
  });

  it('selects by element', () => {
    const target = Node.of('t');
    const selectable = new MultimapBasedSelectable([desc('x'), desc('t', target), desc('t.alias', target)]);
    expect(namesOf(selectable.getExportedObjectsByObject(target))).toEqual(['t', 't.alias']);
  });

  it('is rebuilt by setExportedObjects', () => {
    const selectable = new MultimapBasedSelectable([desc('a')]);
    selectable.setExportedObjects([desc('b')]);
    expect(namesOf(selectable.getExportedObjects())).toEqual(['b']);
    expect([...selectable.getExportedObjectsByName(NODE_TYPE, qn('a'), false)]).toEqual([]);
    expect(namesOf(selectable.getExportedObjectsByName(NODE_TYPE, qn('b'), false))).toEqual(['b']);
  });
});
