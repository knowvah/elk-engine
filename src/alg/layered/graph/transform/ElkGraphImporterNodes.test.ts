// SPDX-License-Identifier: EPL-2.0
// Node import of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { at, geom, prop, xy } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterNodes (oracle site rows)', () => {
  it('imports the labels with text, skips empty ones and nodes excluded from layout, and keeps the label placement', () => {
    // oracle: site/transform/misc/node-labels-and-placement; ElkGraphImporter.java:905-985 (transformNode)
    const run = runSiteRow('site/transform/misc/node-labels-and-placement');
    const d = run.dump;
    const elk = run.elk;
    expect(d.graph('g0').layerlessNodes.length).toBe(2);
    expect(d.node('g0/n0').labels.length).toBe(1);
    expect(d.label('g0/n0/l0').text).toBe('title');
    expect(xy(d.label('g0/n0/l0').size)).toEqual([20, 8]);
    expect(prop(d.node('g0/n0'), 'nodeLabels.placement')).toEqual(['H_CENTER', 'V_TOP', 'INSIDE']);
    expect(d.node('g0/n1').labels.length).toBe(1);
    expect(d.label('g0/n1/l0').text).toBe('untouched');
    expect(prop(d.node('g0/n1'), 'nodeLabels.placement')).toBeUndefined();
    expect(at(elk, 'children/0/labels/0/text')).toEqual('title');
    expect(at(elk, 'children/0/labels/1/text')).toEqual('');
    expect(geom(elk, 'children/2')).toEqual([200, 0, 60, 40]);
  });

  it('skips a port excluded from layout when importing the ports of a node', () => {
    // oracle: site/transform/misc/port-labels; ElkGraphImporter.java:940-945 (transformNode, ports)
    const run = runSiteRow('site/transform/misc/port-labels');
    const d = run.dump;
    const elk = run.elk;
    expect(d.node('g0/n0').ports.length).toBe(2);
    expect(d.port('g0/n0/p0').side).toBe('EAST');
    expect(d.port('g0/n0/p1').side).toBe('WEST');
    expect(prop(d.node('g0/n0'), 'portLabels.placement')).toEqual(['OUTSIDE']);
    expect(at(elk, 'children/0/ports/2/layoutOptions/noLayout')).toEqual('true');
    expect(geom(elk, 'children/0/ports/2')).toEqual([10, 40, 6, 6]);
  });

  it('copies the node flexibility of a node and leaves the default for the others', () => {
    // oracle: site/transform/misc/network-simplex-flexibility; ElkGraphImporter.java:905-927 (transformNode, property copy)
    const run = runSiteRow('site/transform/misc/network-simplex-flexibility');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'nodePlacement.strategy')).toEqual(undefined);
    expect(prop(d.node('g0/n0'), 'nodeFlexibility')).toEqual(undefined);
    expect(prop(d.node('g0/n1'), 'nodeFlexibility')).toBeUndefined();
    expect(prop(d.node('g0/n2'), 'nodeFlexibility')).toEqual(undefined);
    expect(d.graph('g0').layerlessNodes.length).toBe(3);
  });
});
