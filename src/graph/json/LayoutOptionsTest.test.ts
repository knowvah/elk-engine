// SPDX-License-Identifier: EPL-2.0
// Ported from org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/LayoutOptionsTest.xtend
// @see org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/LayoutOptionsTest.xtend
// Deferred: exportLayoutOptions → mission 7h (layered). The JVM test registers layered via PlainJavaInitialization;
// layered's `priority.direction` option (Layered.melk:732) makes the suffix `direction` ambiguous, so
// `getShortOptionKey` (JsonExporter.xtend:450-475) writes `elk.direction`. With CoreOptions only (J10), the port writes
// `direction`. Port unchanged when layered's metadata is registered. The Guava whitespace helper returns with it.
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { ElkGraphJson } from './ElkGraphJson.js';

describe('LayoutOptionsTest', () => {
  beforeEach(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('testImportLayoutOptions', () => {
    const graph = `
        {
          "id": "root",
          "layoutOptions": {
            "elk.direction": "DOWN"
          }
        }
        `;
    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.hasProperty(CoreOptions.DIRECTION)).toBe(true);
    expect(root.getProperty(CoreOptions.DIRECTION)).toBe(Direction.DOWN);
  });

  it('testImportPropertiesLegacy', () => {
    const graph = `
        {
          "id": "root",
          "properties": {
            "elk.direction": "DOWN"
          }
        }
        `;
    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.hasProperty(CoreOptions.DIRECTION)).toBe(true);
    expect(root.getProperty(CoreOptions.DIRECTION)).toBe(Direction.DOWN);
  });

  it('testImportLayoutOptionsHavePriority', () => {
    const graph = `
        {
          "id": "root",
          "layoutOptions": {
            "elk.direction": "UP"
          },
          "properties": {
            "elk.direction": "DOWN"
          }
        }
        `;
    const root = ElkGraphJson.forGraph(graph).toElk();
    expect(root.hasProperty(CoreOptions.DIRECTION)).toBe(true);
    expect(root.getProperty(CoreOptions.DIRECTION)).toBe(Direction.UP);
  });
});
