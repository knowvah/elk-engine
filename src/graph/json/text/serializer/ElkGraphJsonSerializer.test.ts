// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../util/ElkGraphUtil.js';
import { ElkGraphJsonSerializer } from './ElkGraphJsonSerializer.js';

function twoNodes() {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('g');
  ElkGraphUtil.createNode(root).setIdentifier('a');
  return root;
}

describe('ElkGraphJsonSerializer', () => {
  it('concatenates the token texts of the sequence without whitespace', () => {
    expect(new ElkGraphJsonSerializer().serializeUnformatted(twoNodes())).toBe('{"id":"g","children":[{"id":"a"}]}');
  });

  it('holds the same text in the region access the formatter consumes', () => {
    const root = twoNodes();
    const serializer = new ElkGraphJsonSerializer();
    expect(serializer.serializeToRegions(root).regionForDocument().getText()).toBe(
      serializer.serializeUnformatted(root),
    );
  });

  it('does not change the graph and gives the same tokens on every call', () => {
    const root = twoNodes();
    const serializer = new ElkGraphJsonSerializer();
    const first = serializer.sequence(root).tokens.map((t) => [t.grammarElement, t.text]);
    expect(serializer.sequence(root).tokens.map((t) => [t.grammarElement, t.text])).toEqual(first);
    expect(root.getChildren().size()).toBe(1);
  });
});
