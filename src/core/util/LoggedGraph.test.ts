// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkNodeImpl } from '../../graph/impl/ElkNodeImpl.js';
import { ElkLabelImpl } from '../../graph/impl/ElkLabelImpl.js';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { LoggedGraph } from './LoggedGraph.js';

const { Type } = LoggedGraph;

describe('LoggedGraph.Type', () => {
  it('lists ELK, JSON, DOT, SVG in order with extensions', () => {
    expect(Type.values().map((t) => t.name())).toEqual(['ELK', 'JSON', 'DOT', 'SVG']);
    expect(Type.values().map((t) => t.getFileExtension())).toEqual(['elkg', 'json', 'dot', 'svg']);
    expect(Type.values().map((t) => t.ordinal())).toEqual([0, 1, 2, 3]);
    expect(String(Type.DOT)).toBe('DOT');
  });

  it('accepts an ElkNode for ELK and strings for the others', () => {
    expect(Type.ELK.isTypeCompatible(new ElkNodeImpl())).toBe(true);
    expect(Type.ELK.isTypeCompatible('x')).toBe(false);
    expect(Type.JSON.isTypeCompatible('{}')).toBe(true);
    expect(Type.SVG.isTypeCompatible(new ElkNodeImpl())).toBe(false);
  });

  it('names java.lang.String for a string given to ELK', () => {
    expect(() => Type.ELK.checkTypeCompatibility('x')).toThrow('Type java.lang.String incompatible for ELK');
  });

  it('names the generated impl class for a model object given to DOT', () => {
    expect(() => Type.DOT.checkTypeCompatibility(new ElkLabelImpl())).toThrow(
      'Type org.eclipse.elk.graph.impl.ElkLabelImpl incompatible for DOT',
    );
  });

  it('falls back to a js.<typeof> class name for other values', () => {
    expect(() => Type.JSON.checkTypeCompatibility(5)).toThrow('Type js.number incompatible for JSON');
    expect(() => Type.JSON.checkTypeCompatibility({})).toThrow('Type js.object incompatible for JSON');
    expect(() => Type.JSON.checkTypeCompatibility(null)).toThrow('Type js.object incompatible for JSON');
  });

  it('does not throw for compatible objects', () => {
    expect(Type.DOT.checkTypeCompatibility('digraph{}')).toBeUndefined();
  });
});

describe('LoggedGraph', () => {
  it('throws ClassCastException for a string with Type.ELK', () => {
    let thrown: unknown;
    try {
      new LoggedGraph('x', 't', Type.ELK);
    } catch (e) {
      thrown = e;
    }
    expect(thrown instanceof ClassCastException).toBe(true);
    expect((thrown as ClassCastException).message).toBe('Type java.lang.String incompatible for ELK');
  });

  it('accepts an ElkNode for ELK and serializes the Java fallback text', () => {
    const node = new ElkNodeImpl();
    const g = new LoggedGraph(node, 'tag', Type.ELK);
    expect(g.getGraph()).toBe(node);
    expect(g.getTag()).toBe('tag');
    expect(g.getGraphType()).toBe(Type.ELK);
    expect(g.serialize()).toBe('Unexpected problem serializing ELK Graph.');
  });

  it('serializes string graphs as themselves', () => {
    const g = new LoggedGraph('digraph{}', 'd', Type.DOT);
    expect(g.serialize()).toBe('digraph{}');
    expect(g.getGraphType().getFileExtension()).toBe('dot');
  });
});
