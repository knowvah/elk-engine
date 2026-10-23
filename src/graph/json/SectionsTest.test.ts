// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.SectionsTest; assertions frozen (AD-13).
// Ported: edgeSectionTest, preserveSectionIdsTest, doNotAddEmptySectionsArrayExtendedEdge,
// doNotAddEmptySectionsArrayPrimitiveEdge.
// Deferred: none (J6 closed: preserveSectionIdsTest lays out with `random`).
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/SectionsTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { Maybe } from '../../core/util/Maybe.js';
import { Gson } from '../../gson/Gson.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { JsonParser } from '../../gson/JsonParser.js';
import { ElkGraphJson } from './ElkGraphJson.js';
import type { JsonImporter } from './JsonImporter.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

/**
 * Convert the string to an ElkNode, call JsonImporter#transferLayout
 * and turn the ElkNode into a json string again.
 */
function toJsonGraphAndBackToString(graph: string): string {
  // string -> json
  const json = JsonParser.parseString(graph) as JsonObject;

  // json -> elk
  const importer = new Maybe<JsonImporter>();
  const root = ElkGraphJson.forGraph(json).rememberImporter(importer).toElk();
  // transfer
  (importer.get() as JsonImporter).transferLayout(root);
  // to string
  return new Gson().toJson(json);
}

describe('SectionsTest', () => {
  it('edgeSectionTest', () => {
    const graph = `
        {
          "id": "root",
          "properties": {
            "direction": "DOWN"
          },
          "children": [{"id": "n1"}, {"id": "n2"}],
          "edges": [{"id": "e1", 
            "sources": [ "n1" ], 
            "targets": [ "n2" ],
            "sections": [{
                "id": "s1",
                "startPoint": {x: 1, y: 1},
                "endPoint": {x: 2, y: 2},
                "incomingShape": "n1",
                "outgoingSections": [ 44 ]
            },{
                "id": 44,
                "startPoint": {x: 3, y: 3},
                "endPoint": {x: 4, y: 4},
                "incomingSections": [ "s1" ],
                "outgoingShape": "n2"
            }]
          }]
        }
        `;

    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.getChildren().size() === 2).toBe(true);
    const n1 = [...root.getChildren()].find((n) => n.getIdentifier() === 'n1');
    const n2 = [...root.getChildren()].find((n) => n.getIdentifier() === 'n2');

    expect(root.getContainedEdges().size() === 1).toBe(true);
    const edge = root.getContainedEdges().get(0);
    expect(edge.getSections().size() === 2).toBe(true);

    const s1 = [...edge.getSections()].find((s) => s.getIdentifier() === 's1');
    const s44 = [...edge.getSections()].find((s) => s.getIdentifier() === '44');

    expect(s1?.getIncomingShape() === n1).toBe(true);
    expect(s44?.getOutgoingShape() === n2).toBe(true);

    expect(s1?.getOutgoingSections().size() === 1).toBe(true);
    expect(s1?.getOutgoingSections().get(0) === s44).toBe(true);

    expect(s44?.getIncomingSections().size() === 1).toBe(true);
    expect(s44?.getIncomingSections().get(0) === s1).toBe(true);
  });

  it('preserveSectionIdsTest', () => {
    const graph = `
        {
          id: "root",
          properties: { 
            'elk.algorithm': 'random'
          },
          children: [
            { id: "n1", width: 10, height: 10 },
            { id: "n2", width: 10, height: 10 }
          ],
          edges: [{
            id: "e1", sources: [ "n1" ], targets: [ "n2" ],
            sections: [{
              id: "xyz",
              startPoint: { x: 0, y: 0 },
              bendPoints: [{ x: 20, y: 0 }],
              endPoint: { x: 50, y: 0 }
            }]
          }]
        }`;

    // string -> json
    const json = JsonParser.parseString(graph) as JsonObject;

    // json -> elk
    const importer = new Maybe<JsonImporter>();
    const root = ElkGraphJson.forGraph(json).rememberImporter(importer).toElk();
    const edge = root.getContainedEdges().get(0);
    const es1 = [...edge.getSections()].find((s) => s.getIdentifier() === 'xyz');
    expect(es1).not.toBeNull();
    expect(es1).not.toBeUndefined();

    // layout
    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());

    (importer.get() as JsonImporter).transferLayout(root);

    const s = new Gson().toJson(json);
    expect(s.includes('"id":"xyz"')).toBe(true);
  });

  it('doNotAddEmptySectionsArrayExtendedEdge', () => {
    const graph = `
        {
          id: "root",
          children: [
            { id: "n1", width: 10, height: 10 },
            { id: "n2", width: 10, height: 10 }
          ],
          edges: [{ id: "e1", sources: [ "n1" ], targets: [ "n2" ] }]
        }`;

    const s = toJsonGraphAndBackToString(graph);

    expect(!s.includes('"sections"')).toBe(true);
  });

  it('doNotAddEmptySectionsArrayPrimitiveEdge', () => {
    const graph = `
        {
          id: "root",
          children: [
            { id: "n1", width: 10, height: 10 },
            { id: "n2", width: 10, height: 10 }
          ],
          edges: [{ id: "e1", source: "n1", target: "n2" }]
        }`;

    const s = toJsonGraphAndBackToString(graph);

    expect(!s.includes('"sections"')).toBe(true);
  });
});
