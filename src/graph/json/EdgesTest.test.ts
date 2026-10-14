// SPDX-License-Identifier: EPL-2.0
// Ported from org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/EdgesTest.xtend
// @see org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/EdgesTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkGraphJson } from './ElkGraphJson.js';

describe('EdgesTest', () => {
  beforeEach(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('extendedEdgeTest', () => {
    const graph = `
        {
          "id": "root",
          "children": [{"id": "n1"}, {"id": 3}],
          "edges": [{"id": "e1", 
            "sources": [ "n1" ], 
            "targets": [ 3 ]
          }]
        }
        `;

    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.getChildren().size()).toBe(2);
    expect(root.getContainedEdges().size()).toBe(1);

    const n1 = [...root.getChildren()].find((c) => c.getIdentifier() === 'n1');
    const n3 = [...root.getChildren()].find((c) => c.getIdentifier() === '3');

    const edge = root.getContainedEdges().get(0);
    expect(edge.getSources().size()).toBe(1);
    expect(edge.getSources().get(0)).toBe(n1);
    expect(edge.getTargets().size()).toBe(1);
    expect(edge.getTargets().get(0)).toBe(n3);
  });

  it('primitiveEdgeTest', () => {
    const graph = `
        {
          "id": "root",
          "children": [{"id": "n1"}, {"id": 3}],
          "edges": [{"id": "e1", 
            "source": "n1", 
            "target": 3
          }]
        }
        `;

    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.getChildren().size()).toBe(2);
    expect(root.getContainedEdges().size()).toBe(1);

    const n1 = [...root.getChildren()].find((c) => c.getIdentifier() === 'n1');
    const n3 = [...root.getChildren()].find((c) => c.getIdentifier() === '3');

    const edge = root.getContainedEdges().get(0);
    expect(edge.getSources().size()).toBe(1);
    expect(edge.getSources().get(0)).toBe(n1);
    expect(edge.getTargets().size()).toBe(1);
    expect(edge.getTargets().get(0)).toBe(n3);
  });

  it('edgeContainmentTest', () => {
    const graph = `
        {
          "id": "root",
          "children": [
            {"id": "p"},
            {"id": "q",
              "children": [{"id": "r"}],
              "edges": [{"id": "e", "source": "p", "target": "r" }]
            }]
        }
        `;

    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.getContainedEdges().size()).toBe(1);
  });
});
