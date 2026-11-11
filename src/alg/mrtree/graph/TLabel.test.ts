// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TEdge } from './TEdge.js';
import { TGraph } from './TGraph.js';
import { TLabel } from './TLabel.js';
import { TNode } from './TNode.js';

const edgeBetween = (): TEdge => {
  const graph = new TGraph();
  return new TEdge(new TNode(0, graph, 'a'), new TNode(1, graph, 'b'));
};

describe('TLabel', () => {
  it('puts itself into the edge label list on construction (TLabel.java:41-45)', () => {
    const edge = edgeBetween();
    const label = new TLabel(edge, 'x');
    expect(edge.getLabels().toArray()).toEqual([label]);
    expect(label.getEdge()).toBe(edge);
    expect(label.getText()).toBe('x');
    expect(label.id).toBe(0);
  });

  it('prints l_<text> for a label with text (TLabel.java:52)', () => {
    expect(new TLabel(edgeBetween(), 'caption').toString()).toBe('l_caption');
  });

  it('prints l[<edge>] for a null or empty text (TLabel.java:48-50)', () => {
    const edge = edgeBetween();
    expect(new TLabel(edge, null).toString()).toBe('l[n_a->n_b]');
    expect(new TLabel(edge, '').toString()).toBe('l[n_a->n_b]');
    expect(edge.getLabels().size()).toBe(2);
  });

  it('is a shape with position and size', () => {
    const label = new TLabel(edgeBetween(), 't');
    label.getSize().x = 8;
    expect(label.getSize().x).toBe(8);
  });
});
