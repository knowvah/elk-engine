// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.TransferLayoutTest; assertions frozen (AD-13).
// Ported: transferLayoutTest, transferLayoutFailTest, transferLayoutEdgeSectionExistsTest (J6 closed; uses `random`).
// Deferred:
//   - EdgeCoordsTest.edgeCoordsTest (the whole EdgeCoordsTest file, 1 method) -> mission 7h (layered)
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/TransferLayoutTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { Maybe } from '../../core/util/Maybe.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { JsonParser } from '../../gson/JsonParser.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphJson } from './ElkGraphJson.js';
import { JsonImportException } from './JsonImportException.js';
import type { JsonImporter } from './JsonImporter.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

const graph = `
    {
      "id": "root",
      "properties": {
        "algorithm": "random",
        "direction": "DOWN"
      },
      "children": [{"id": "n1", "width": 40, "height": 40},
                  {"id": "n2", "width": 40, "height": 40}],
      "edges": [{"id": "e1", "source": "n1", "target": "n2"}]
    }
    `;

describe('TransferLayoutTest', () => {
  it('transferLayoutTest', () => {
    const mby = new Maybe<JsonImporter>();
    const root = ElkGraphJson.forGraph(graph).rememberImporter(mby).toElk();

    (mby.get() as JsonImporter).transferLayout(root);
  });

  it('transferLayoutFailTest', () => {
    const mby = new Maybe<JsonImporter>();
    const root = ElkGraphJson.forGraph(graph).rememberImporter(mby).toElk();

    // modify graph
    root.getChildren().add(ElkGraphUtil.createNode(root));

    // this should throw an exception now
    expect(() => (mby.get() as JsonImporter).transferLayout(root)).toThrow(JsonImportException);
  });

  it('transferLayoutEdgeSectionExistsTest', () => {
    const jsonGraph = JsonParser.parseString(graph) as JsonObject;

    const mby = new Maybe<JsonImporter>();
    const root = ElkGraphJson.forGraph(jsonGraph).rememberImporter(mby).toElk();

    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());

    (mby.get() as JsonImporter).transferLayout(root);

    for (const c of jsonGraph.get('children')!.getAsJsonArray()) {
      if (!c.isJsonObject()) continue;
      checkCoordinate(c as JsonObject, 'x');
      checkCoordinate(c as JsonObject, 'y');
    }

    for (const e of jsonGraph.get('edges')!.getAsJsonArray()) {
      if (!e.isJsonObject()) continue;
      const eo = e as JsonObject;
      const sections = eo.get('sections');
      expect(sections !== null, 'Every edge must have at least one section.').toBe(true);
      for (const sec of sections!.getAsJsonArray()) {
        if (sec.isJsonObject()) checkSection(sec as JsonObject);
      }
      checkContainer(eo);
    }
  });
});

function checkCoordinate(o: JsonObject, c: string): void {
  expect(o.has(c), `${c} coordinate must exist`).toBe(true);
  const coor = o.get(c)!;
  expect(coor.isJsonPrimitive()).toBe(true);
  expect(coor.getAsJsonPrimitive().getAsDouble() > 0).toBe(true);
}

function checkSection(o: JsonObject): void {
  expect(o.has('id')).toBe(true);
  expect(o.has('startPoint')).toBe(true);
  expect(o.has('endPoint')).toBe(true);
}

function checkContainer(o: JsonObject): void {
  expect(o.has('container')).toBe(true);
}
