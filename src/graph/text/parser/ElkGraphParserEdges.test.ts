// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import type { ElkNode } from '../../ElkNode.js';
import { parse } from './ElkGraphParser.js';
import type { ParseResult } from './ParseRecords.js';

const SERVICES = new ElkGraphValueConverterService();

function run(text: string): ParseResult {
  return parse(text, SERVICES);
}

function root(text: string): ElkNode {
  const result = run(text);
  expect(result.diagnostics).toEqual([]);
  return result.root as ElkNode;
}

function sectionOf(edge: ElkEdge) {
  const s = [...edge.getSections()][0] as ElkEdgeSection;
  return {
    identifier: s.getIdentifier(),
    start: [s.getStartX(), s.getStartY()],
    end: [s.getEndX(), s.getEndY()],
    bends: [...s.getBendPoints()].map((b) => [b.getX(), b.getY()]),
  };
}

describe('ElkEdgeRules: edge sections', () => {
  const edge = (layout: string): ElkEdge =>
    [...root(`node a node b edge a -> b { layout [ ${layout} ] }`).getContainedEdges()][0] as ElkEdge;

  it('creates exactly one section without identifier for an empty layout', () => {
    const sections = [...edge('').getSections()];
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getIdentifier()).toBeNull();
  });

  it('accepts the four single-section members in any order', () => {
    const forward = sectionOf(edge('start: 1, 2 end: 3, 4 bends: 5, 6 | 7, 8'));
    const reversed = sectionOf(edge('end: 3, 4 start: 1, 2 bends: 5, 6 | 7, 8'));
    expect(forward).toEqual({
      identifier: null,
      start: [1, 2],
      end: [3, 4],
      bends: [
        [5, 6],
        [7, 8],
      ],
    });
    expect(reversed).toEqual(forward);
  });

  it('parses named sections with outgoing section references and properties', () => {
    const result = run(
      'node a node b edge a -> b { layout [ section s1 -> s2, s3 [ start: 1, 2 foo: 1 ] section s2 [ ] ] }',
    );
    expect(result.diagnostics).toEqual([]);
    const sections = [...([...(result.root as ElkNode).getContainedEdges()][0] as ElkEdge).getSections()];
    expect(sections.map((s) => s.getIdentifier())).toEqual(['s1', 's2']);
    expect([...(sections[0] as ElkEdgeSection).getProperties().entryList()]).toHaveLength(1);
    expect(
      result.references.filter((r) => r.feature === 'outgoingSections').map((r) => [r.text, r.index, r.ruleName]),
    ).toEqual([
      ['s2', 0, 'ID'],
      ['s3', 1, 'ID'],
    ]);
  });

  it('rejects a single section followed by a named one and a repeated group member', () => {
    expect(run('edge a -> b { layout [ start: 1, 2 section s [ ] ] }').diagnostics[0]?.kind).toBe('syntax');
    expect(run('edge a -> b { layout [ start: 1, 2 start: 3, 4 ] }').diagnostics[0]?.kind).toBe('syntax');
  });
});
