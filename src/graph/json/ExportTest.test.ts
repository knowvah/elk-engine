// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.ExportTest (6 methods, none deferred); assertions frozen (AD-13).
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/ExportTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import type { IProperty } from '../properties/IProperty.js';
import { Property } from '../properties/Property.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphJson } from './ElkGraphJson.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ExportTest', () => {
  it('testPortLessEdge', () => {
    const graph = ElkGraphUtil.createGraph();
    const node1 = ElkGraphUtil.createNode(graph);
    const node2 = ElkGraphUtil.createNode(graph);
    ElkGraphUtil.createSimpleEdge(node1, node2);

    ElkGraphJson.forGraph(graph).toJson();
  });

  it('testUniqueIds', () => {
    const graph = ElkGraphUtil.createGraph();
    const node1 = ElkGraphUtil.createNode(graph);
    node1.setIdentifier('foo');
    const node2 = ElkGraphUtil.createNode(graph);
    node2.setIdentifier('foo');

    const json = ElkGraphJson.forGraph(graph).toJson();
    expect(json.includes('foo_g')).toBe(true); // _gxxxxx should be appended to node2 identifier
  });

  it('testIdsIncreasing', () => {
    const graph = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(graph);
    const node2 = ElkGraphUtil.createNode(graph);
    node2.setIdentifier('foo');
    ElkGraphUtil.createNode(graph);

    const json = ElkGraphJson.forGraph(graph).toJson();
    expect(json.includes('n1')).toBe(true);
    expect(json.includes('foo')).toBe(true);
    expect(json.includes('n2')).toBe(true);
    expect(!json.includes('n3')).toBe(true);
  });

  it('testOmitUnknownProperties', () => {
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
    graph.setProperty(new Property<number>('foo.bar.dummy'), 0);

    const json1 = ElkGraphJson.forGraph(graph).omitUnknownLayoutOptions(true).toJson();
    expect(json1.includes('direction')).toBe(true);
    expect(!json1.includes('foo.bar.dummy')).toBe(true);

    const json2 = ElkGraphJson.forGraph(graph).omitUnknownLayoutOptions(false).toJson();
    expect(json2.includes('direction')).toBe(true);
    expect(json2.includes('foo.bar.dummy')).toBe(true);
  });

  it('dontExportEmptyJunctionPoints', () => {
    const graph = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(graph);
    const n2 = ElkGraphUtil.createNode(graph);
    ElkGraphUtil.createSimpleEdge(n1, n2);

    const json = ElkGraphJson.forGraph(graph).omitLayout(false).toJson();

    expect(json.includes('layoutOptions')).toBe(false);
    expect(json.includes('junctionPoints')).toBe(false);
  });

  it('copeWithNullProperty', () => {
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.RANDOM_SEED, 4); // arbitrary property
    // Java passes a null property; this shouldn't raise a nullpointer
    graph.setProperty(null as unknown as IProperty<number>, 3);
  });
});
