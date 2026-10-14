// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.TransferLayoutTest; assertions frozen (AD-13).
// Ported: transferLayoutTest, transferLayoutFailTest.
// Deferred (J6, needs a layout algorithm):
//   - TransferLayoutTest.transferLayoutEdgeSectionExistsTest -> mission 5 (random)
//   - EdgeCoordsTest.edgeCoordsTest (the whole EdgeCoordsTest file, 1 method) -> mission 7h (layered)
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/TransferLayoutTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { Maybe } from '../../core/util/Maybe.js';
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
});
