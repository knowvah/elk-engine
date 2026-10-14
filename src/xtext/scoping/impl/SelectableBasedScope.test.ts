// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import { NULLSCOPE } from '../IScope.js';
import { namesOf, Node, NODE_TYPE, qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { MultimapBasedSelectable } from './MultimapBasedSelectable.js';
import { SelectableBasedScope } from './SelectableBasedScope.js';

const selectable = (...names: string[]): MultimapBasedSelectable =>
  new MultimapBasedSelectable(names.map((n) => EObjectDescription.create(qn(n), Node.of(n))));

describe('SelectableBasedScope.createScope', () => {
  it('is the outer scope when nothing is selectable', () => {
    expect(SelectableBasedScope.createScope(NULLSCOPE, null, NODE_TYPE, false)).toBe(NULLSCOPE);
    expect(SelectableBasedScope.createScope(NULLSCOPE, selectable(), NODE_TYPE, false)).toBe(NULLSCOPE);
  });

  it('looks up by name and lists by type', () => {
    const scope = SelectableBasedScope.createScope(NULLSCOPE, selectable('a', 'b.c'), NODE_TYPE, false);
    expect(scope.getSingleElement(qn('b.c'))?.getName().toString()).toBe('b.c');
    expect(scope.getSingleElement(qn('c'))).toBeNull();
    expect(namesOf(scope.getAllElements())).toEqual(['a', 'b.c']);
  });

  it('looks up ignoring case when asked to', () => {
    const scope = SelectableBasedScope.createScope(NULLSCOPE, selectable('Ab'), NODE_TYPE, true);
    expect(scope.getSingleElement(qn('aB'))?.getName().toString()).toBe('Ab');
  });

  it('applies the filter to names and listings', () => {
    const scope = SelectableBasedScope.createScope(
      NULLSCOPE,
      selectable('a', 'b'),
      NODE_TYPE,
      false,
      (d) => d.getName().toString() !== 'a',
    );
    expect(scope.getSingleElement(qn('a'))).toBeNull();
    expect(scope.getSingleElement(qn('b'))?.getName().toString()).toBe('b');
    expect(namesOf(scope.getAllElements())).toEqual(['b']);
  });
});

describe('SelectableBasedScope accessors', () => {
  it('exposes its selectable and filter to subclasses', () => {
    const source = selectable('a');
    const filter = (): boolean => true;
    class Open extends SelectableBasedScope {
      constructor() {
        super(NULLSCOPE, source, filter, NODE_TYPE, false);
      }
      parts(): unknown[] {
        return [this.getSelectable(), this.getFilter()];
      }
    }
    expect(new Open().parts()).toEqual([source, filter]);
    expect(new Open().parts()[0]).toBe(source);
    expect(new Open().parts()[1]).toBe(filter);
  });
});
