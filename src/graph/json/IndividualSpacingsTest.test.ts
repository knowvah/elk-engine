// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.IndividualSpacingsTest; assertions frozen (AD-13).
// Ported: exportIndividualSpacings, exportNoIndividualSpacings, importIndividualSpacingsTest (mission 7h, T11: lays the graph
// out with layered, registered below).
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/IndividualSpacingsTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import { IndividualSpacings } from '../../core/util/IndividualSpacings.js';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphJson } from './ElkGraphJson.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
  registerLayered();
});

const DOUBLE_EQ = 0.001;

const IMPORT_GRAPH = `
        {
          "id": "n0",
          "children": [
            {
              "id": "outer",
              "layoutOptions": {
                  "nodeLabels.padding": "[top=0.0,left=0.0,bottom=0.0,right=0.0]"
              },
              "children": [
                {
                  "id": "i1",
                  "labels": [
                    {
                      "text": "Node 1",
                      "width": 40.0,
                      "height": 15.0
                    }
                  ],
                  "layoutOptions": {
                    "nodeLabels.placement": "[H_CENTER, V_TOP, INSIDE]"
                  },
                  "width": 60.0,
                  "height": 40.0
                },
                {
                  "id": "i2",
                  "layoutOptions": {
                    "nodeLabels.placement": "[H_CENTER, V_TOP, INSIDE]"
                  },
                  "individualSpacings": {
                    "nodeLabels.padding": "[top=10.0,left=0.0,bottom=0.0,right=0.0]"
                  },
                  "labels": [
                    {
                      "text": "Node 2",
                      "width": 40.0,
                      "height": 15.0
                    }
                  ],
                  "width": 60.0,
                  "height": 40.0
                }
              ]
            }
          ]
        }
        `;

describe('IndividualSpacingsTest', () => {
  it('importIndividualSpacingsTest', () => {
    const root = ElkGraphJson.forGraph(IMPORT_GRAPH).toElk();
    expect(root.getChildren().size() === 1).toBe(true);
    const outer = [...root.getChildren()].find((node) => node.getIdentifier() === 'outer')!;
    expect(outer.getChildren().size() === 2).toBe(true);
    const i1 = [...outer.getChildren()].find((node) => node.getIdentifier() === 'i1')!;
    const i2 = [...outer.getChildren()].find((node) => node.getIdentifier() === 'i2')!;

    expect(i1.hasProperty(CoreOptions.SPACING_INDIVIDUAL)).toBe(false);
    expect(i2.hasProperty(CoreOptions.SPACING_INDIVIDUAL)).toBe(true);

    new RecursiveGraphLayoutEngine().layout(root, new NullElkProgressMonitor());
    const l1 = i1.getLabels().get(0);
    const l2 = i2.getLabels().get(0);

    assertEqualsWithin('', 0.0, l1.getY(), DOUBLE_EQ);
    assertEqualsWithin('', 10.0, l2.getY(), DOUBLE_EQ);
  });

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
