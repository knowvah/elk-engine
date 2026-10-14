// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.IndividualSpacingsTest; assertions frozen (AD-13).
// Ported: exportIndividualSpacings, exportNoIndividualSpacings.
// Deferred (J6, needs a layout algorithm): importIndividualSpacingsTest -> mission 7h (layered).
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/IndividualSpacingsTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { IndividualSpacings } from '../../core/util/IndividualSpacings.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphJson } from './ElkGraphJson.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('IndividualSpacingsTest', () => {
  it('exportIndividualSpacings', () => {
    const graph = ElkGraphUtil.createGraph();

    graph.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);

    const individualSpacings = new IndividualSpacings();
    individualSpacings.setProperty(CoreOptions.SPACING_NODE_NODE, 20.0);
    graph.setProperty(CoreOptions.SPACING_INDIVIDUAL, individualSpacings);

    const json = ElkGraphJson.forGraph(graph).omitUnknownLayoutOptions(true).toJson();

    expect(json.includes('individualSpacings')).toBe(true);
    expect(json.includes('nodeNode":"10')).toBe(true);
    expect(json.includes('nodeNode":"20')).toBe(true);
  });

  it('exportNoIndividualSpacings', () => {
    const graph = ElkGraphUtil.createGraph();
    const json = ElkGraphJson.forGraph(graph).omitUnknownLayoutOptions(true).toJson();
    expect(json.includes('individualSpacings')).toBe(false);
    expect(json.includes('IndividualSpacings')).toBe(false);
  });
});
