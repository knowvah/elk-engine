// SPDX-License-Identifier: EPL-2.0
// Ported from org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/LayoutOptionsTest.xtend
// @see org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/LayoutOptionsTest.xtend
// Ported: exportLayoutOptions (mission 7h, T11). The JVM test registers layered via PlainJavaInitialization; layered's
// `priority.direction` option (Layered.melk:732) makes the suffix `direction` ambiguous, so `getShortOptionKey`
// (JsonExporter.xtend:450-475) writes `elk.direction`. `registerLayered` does the same here. Guava's
// `CharMatcher.whitespace()` is the Unicode `White_Space` property, `\p{White_Space}`.
import { beforeEach, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphJson } from './ElkGraphJson.js';

describe('LayoutOptionsTest', () => {
  beforeEach(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
    registerLayered();
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

  it('exportLayoutOptions', () => {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(CoreOptions.DIRECTION, Direction.UP);

    const json = ElkGraphJson.forGraph(root).toJson();

    const expected = '{"id":"n0","layoutOptions":{"elk.direction":"UP"}}';
    const cleanJson = json.replace(/\p{White_Space}/gu, '');

    expect(cleanJson).toBe(expected);
  });
});
