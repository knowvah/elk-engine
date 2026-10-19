// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphJsonText, diagnosticsOf } from './ElkGraphJsonText.js';
import { createElkGraphJsonServices } from './ElkGraphJsonTextServices.js';

const UNRESOLVED_LINE = 2;
const TWO_NODES_WITH_DANGLING_EDGE =
  '{\n  edges: [{ id: "e", sources: ["gone"], targets: ["n"] }],\n  children: [{ id: "n" }]\n}';
const MALFORMED_INPUTS: readonly string[] = [
  '',
  '   ',
  '{',
  '}',
  '[]',
  'null',
  '{ "children": [ { "id": ',
  '{ "layoutOptions": { "elk.direction": } }',
  '\u0000￿"\'\\',
  '{ "id": "a\\u12" }',
  '{ "edges": [ { "sources": [ 1 ], "targets": [ ] } ] }',
];

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphJsonText.load contract', () => {
  it.each(MALFORMED_INPUTS.map((text) => [JSON.stringify(text), text] as const))(
    'does not throw on %s and reports a load error',
    (_label, text) => {
      const { errors } = ElkGraphJsonText.load(text);
      expect(errors.length).toBeGreaterThan(0);
      expect(['syntax', 'conversion']).toContain(errors[0]?.kind);
      expect(errors[0]?.severity).toBe('error');
    },
  );

  it('keeps the partial model of a text with a syntax error as the content of the resource', () => {
    const loaded = ElkGraphJsonText.load('');
    expect(loaded.errors.map((d) => d.kind)).toEqual(['syntax']);
    expect(loaded.resource.getContents().size()).toBe(loaded.root === null ? 0 : 1);
    expect(loaded.root?.getChildren().size()).toBe(0);
  });

  it('keeps the live resource: the root is its content and a read of a dangling reference appends the error', () => {
    const loaded = ElkGraphJsonText.load(TWO_NODES_WITH_DANGLING_EDGE);
    const root = loaded.root as ElkNode;
    expect(loaded.resource.getContents().get(0)).toBe(root);
    expect(loaded.errors).toEqual([]);
    const edge = [...root.getContainedEdges()][0];
    expect(edge?.getSources().get(0)).toBeDefined();
    expect(diagnosticsOf(loaded.resource)).toEqual([
      {
        kind: 'linking',
        severity: 'error',
        message: "Couldn't resolve reference to ElkConnectableShape 'gone'.",
        line: UNRESOLVED_LINE,
      },
    ]);
    expect(loaded.errors).toEqual([]);
  });

  it('gives the node model positions of the parse for locating issues', () => {
    const loaded = ElkGraphJsonText.load(TWO_NODES_WITH_DANGLING_EDGE);
    const root = loaded.root as ElkNode;
    expect(loaded.positions.objectStartLine(root)).toBe(1);
  });

  it('lists warnings after errors in the resource diagnostics', () => {
    const loaded = ElkGraphJsonText.load('{ "id": "n" }');
    loaded.resource.getWarnings().add({ getMessage: () => null, getLine: () => 7 });
    expect(diagnosticsOf(loaded.resource)).toEqual([{ kind: 'syntax', severity: 'warning', message: '', line: 7 }]);
  });

  it('keeps no state between loads: every call builds its own services and scope cache', () => {
    // identity, not `not.toBe`: vitest formats the EMF object graph of a resource and does not finish
    expect(createElkGraphJsonServices().linking === createElkGraphJsonServices().linking).toBe(false);
    const first = ElkGraphJsonText.load(TWO_NODES_WITH_DANGLING_EDGE);
    const second = ElkGraphJsonText.load(TWO_NODES_WITH_DANGLING_EDGE);
    expect(second.resource === first.resource).toBe(false);
    expect(second.root === first.root).toBe(false);
  });
});
