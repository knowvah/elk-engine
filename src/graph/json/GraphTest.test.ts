// SPDX-License-Identifier: EPL-2.0
// Ported from org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/GraphTest.xtend
// @see org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/GraphTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { JsonIOException } from '../../gson/JsonIOException.js';
import { ElkGraphJson } from './ElkGraphJson.js';
import { JsonImportException } from './JsonImportException.js';

const sloppyJsonGraph = `
        {
          // the root node
          id: "root",
          /* Now the graph */ 
          "children": [ {"id": "c"}; {"id": "c1"} ],
          'edges': [] // Endline comment
        }
    `;

describe('GraphTest', () => {
  beforeEach(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('graphMustBeObjectTest', () => {
    ElkGraphJson.forGraph('{"id":1}').toElk();
  });

  it('graphMustBeObjectFailArrayTest', () => {
    expect(() => ElkGraphJson.forGraph('[]').toElk()).toThrow(JsonImportException);
  });

  it('smallGraphTest', () => {
    const graph = `
        {
          "id": "root",
          "properties": {
            "elk.direction": "DOWN"
          },
          "children": [{"id": "n1", "width": 40, "height": 40},
                      {"id": "n2", "width": 40, "height": 40}],
          "edges": [{"id": "e1", "source": "n1", "target": "n2"}]
        }
        `;

    const root = ElkGraphJson.forGraph(graph).toElk();

    expect(root.getChildren().size()).toBe(2);
    expect(root.getContainedEdges().size()).toBe(1);

    expect(root.getProperty(CoreOptions.DIRECTION)).toBe(Direction.DOWN);
  });

  it('rejectSloppyJsonIfNotLenient', () => {
    expect(() => ElkGraphJson.forGraph(sloppyJsonGraph).lenient(false).toElk()).toThrow(JsonIOException);
  });

  it('acceptSloppyJsonIfLenient', () => {
    const root = ElkGraphJson.forGraph(sloppyJsonGraph).toElk();

    expect(root.getIdentifier()).toBe('root');
    expect(root.getChildren().size()).toBe(2);
    expect(root.getChildren().get(0).getIdentifier()).toBe('c');
    expect(root.getChildren().get(1).getIdentifier()).toBe('c1');
  });
});
