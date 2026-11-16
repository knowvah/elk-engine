// SPDX-License-Identifier: EPL-2.0
// Java-traced proof of FLabel (mission 8b, T6; expectations read from FLabel.java, the line named in the test name).
import { describe, expect, it } from 'vitest';
import { ForceOptions } from '../options/ForceOptions.js';
import { FEdge } from './FEdge.js';
import { FLabel } from './FLabel.js';
import { FNode } from './FNode.js';

/** An edge between nodes at the given centres (their sizes stay 0) and a label of size 6 x 4 on it. */
function labelled(sx: number, sy: number, tx: number, ty: number, text: string | null = 'l'): FLabel {
  const source = new FNode('a');
  const target = new FNode('b');
  source.getPosition().x = sx;
  source.getPosition().y = sy;
  target.getPosition().x = tx;
  target.getPosition().y = ty;
  const edge = new FEdge();
  edge.setSource(source);
  edge.setTarget(target);
  const label = new FLabel(edge, text);
  label.getSize().x = 6;
  label.getSize().y = 4;
  return label;
}

describe('FLabel', () => {
  it('FLabel.java:39-42: the constructor puts the label into the list of its edge', () => {
    const label = labelled(0, 0, 1, 1);
    expect(label.getEdge().getLabels()).toEqual([label]);
    expect(label.getText()).toBe('l');
  });

  it('FLabel.java:46-52: toString is l_ plus the text, or l[edge] when the text is null or empty', () => {
    expect(labelled(0, 0, 1, 1, 'txt').toString()).toBe('l_txt');
    expect(labelled(0, 0, 1, 1, '').toString()).toBe('l[n_a->n_b]');
    expect(labelled(0, 0, 1, 1, null).toString()).toBe('l[n_a->n_b]');
  });

  it('FLabel.java:81-86: inline puts the label centre on the middle of the edge', () => {
    const label = labelled(10, 20, 50, 60);
    label.setProperty(ForceOptions.EDGE_LABELS_INLINE, true);
    label.refreshPosition();
    // middle (30, 40) minus half the label size (3, 2)
    expect([label.getPosition().x, label.getPosition().y]).toEqual([27, 38]);
  });

  it('FLabel.java:92-96: src.x >= tgt.x and src.y >= tgt.y (Java CASE1)', () => {
    const label = labelled(50, 60, 10, 20);
    label.getEdge().setProperty(ForceOptions.SPACING_EDGE_LABEL, 2);
    label.refreshPosition();
    // src.x >= tgt.x and src.y >= tgt.y: x = 10 + 20 + 2, y = 20 + 20 - 2 - 4
    expect([label.getPosition().x, label.getPosition().y]).toEqual([32, 34]);
  });

  it('FLabel.java:97-101: src.x >= tgt.x and src.y < tgt.y (Java CASE2)', () => {
    const label = labelled(50, 20, 10, 60);
    label.getEdge().setProperty(ForceOptions.SPACING_EDGE_LABEL, 2);
    label.refreshPosition();
    // x = 10 + 20 + 2, y = 20 + 20 + 2
    expect([label.getPosition().x, label.getPosition().y]).toEqual([32, 42]);
  });

  it('FLabel.java:103-106: src.x < tgt.x and src.y >= tgt.y (Java CASE2)', () => {
    const label = labelled(10, 60, 50, 20);
    label.getEdge().setProperty(ForceOptions.SPACING_EDGE_LABEL, 2);
    label.refreshPosition();
    // x = 10 + 20 + 2, y = 20 + 20 + 2
    expect([label.getPosition().x, label.getPosition().y]).toEqual([32, 42]);
  });

  it('FLabel.java:107-111: src.x < tgt.x and src.y < tgt.y (Java CASE1)', () => {
    const label = labelled(10, 20, 50, 60);
    label.getEdge().setProperty(ForceOptions.SPACING_EDGE_LABEL, 2);
    label.refreshPosition();
    // x = 10 + 20 + 2, y = 20 + 20 - 2 - 4
    expect([label.getPosition().x, label.getPosition().y]).toEqual([32, 34]);
  });

  it('FLabel.java:89: the default spacing is the edge option default (5)', () => {
    const label = labelled(10, 20, 50, 60);
    label.refreshPosition();
    expect([label.getPosition().x, label.getPosition().y]).toEqual([35, 31]);
  });
});
