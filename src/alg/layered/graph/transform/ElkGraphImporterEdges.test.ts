// SPDX-License-Identifier: EPL-2.0
// Edge import of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { at, prop, section, xy } from '../../../../../test/helpers/transform-site-dump.js';
import { originalBendpoints, runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterEdges (oracle site rows)', () => {
  it('copies the original bend points of an edge section when the crossing minimization is INTERACTIVE', () => {
    // oracle: site/transform/misc/bend-points-interactive; ElkGraphImporter.java:1224-1237 (transformEdge, original bend points)
    const run = runSiteRow('site/transform/misc/bend-points-interactive');
    expect(originalBendpoints(run, 'g0/e0')).toEqual([
      [20, 10],
      [50, 10],
      [50, 50],
      [100, 50],
    ]);
    expect(originalBendpoints(run, 'g0/e1')).toEqual([
      [20, 10],
      [100, -20],
      [200, 10],
    ]);
    expect(originalBendpoints(run, 'g0/e2')).toBeNull();
  });

  it('copies the original bend points of an edge section when the node placement is INTERACTIVE', () => {
    // oracle: site/transform/misc/bend-points-node-placement-interactive; ElkGraphImporter.java:1224-1237 (transformEdge, original bend points)
    const run = runSiteRow('site/transform/misc/bend-points-node-placement-interactive');
    const d = run.dump;
    expect(originalBendpoints(run, 'g0/e0')).toEqual([
      [20, 10],
      [40, 0],
      [60, 10],
    ]);
    expect(xy(d.node('g0/n1').pos)).toEqual([60, 0]);
  });

  it('creates the missing ports of nodes with fixed port sides at the edge section points', () => {
    // oracle: site/transform/misc/edge-with-section-fixed-side; ElkGraphImporter.java:1154-1188 (transformEdge, port creation from sections)
    const run = runSiteRow('site/transform/misc/edge-with-section-fixed-side');
    const d = run.dump;
    const elk = run.elk;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['NON_FREE_PORTS']);
    expect(xy(d.port('g0/n0/p0').pos)).toEqual([40, 10]);
    expect(d.port('g0/n0/p0').side).toBe('EAST');
    expect(d.port('g0/n0/p0').explicitAnchor).toBe(false);
    expect(xy(d.port('g0/n0/p1').pos)).toEqual([40, 5]);
    expect(d.port('g0/n0/p1').side).toBe('EAST');
    expect(d.port('g0/n0/p1').explicitAnchor).toBe(false);
    expect(xy(d.port('g0/n1/p0').pos)).toEqual([0, 30]);
    expect(d.port('g0/n1/p0').side).toBe('WEST');
    expect(xy(d.port('g0/n1/p1').pos)).toEqual([0, 35]);
    expect(d.port('g0/n1/p1').side).toBe('WEST');
    expect(d.edge('g0/e0').source).toBe('g0/n0/p0');
    expect(d.edge('g0/e0').target).toBe('g0/n1/p0');
    expect(d.edge('g0/e1').source).toBe('g0/n1/p1');
    expect(d.edge('g0/e1').target).toBe('g0/n0/p1');
    expect(section(elk, 'edges/0')).toEqual({ start: [52, 22], bends: [], end: [112, 42] });
    expect(section(elk, 'edges/1')).toEqual({ start: [112, 47], bends: [], end: [52, 17] });
  });

  it('creates the source port of an edge into a descendant as an input port at the section start', () => {
    // oracle: site/transform/misc/edge-with-section-descendant; ElkGraphImporter.java:1156-1171 (transformEdge, hierarchical source port)
    const run = runSiteRow('site/transform/misc/edge-with-section-descendant');
    const d = run.dump;
    expect(d.node('g0/n0').nested).toBe('g1');
    expect(xy(d.port('g0/n0/p0').pos)).toEqual([100, 40]);
    expect(d.port('g0/n0/p0').side).toBe('EAST');
    expect(d.port('g0/n0/p0').explicitAnchor).toBe(false);
    expect(xy(d.port('g1/n0/p0').pos)).toEqual([0, 0]);
    expect(d.port('g1/n0/p0').side).toBe('WEST');
    expect(d.edge('g0/e0').source).toBe('g0/n0/p0');
    expect(d.edge('g0/e0').target).toBe('g1/n0/p0');
    expect(d.graph('g1').edges.length).toBe(0);
  });

  it('keeps the labels with text and layout and records center and end labels as graph properties', () => {
    // oracle: site/transform/misc/edge-labels; ElkGraphImporter.java:1202-1219 (transformEdge, labels)
    const run = runSiteRow('site/transform/misc/edge-labels');
    const d = run.dump;
    const elk = run.elk;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['CENTER_LABELS', 'END_LABELS']);
    expect(d.edge('g0/e0').labels.length).toBe(3);
    expect(d.label('g0/e0/l0').text).toBe('center');
    expect(prop(d.label('g0/e0/l0'), 'edgeLabels.placement')).toEqual('CENTER');
    expect(d.label('g0/e0/l1').text).toBe('head');
    expect(prop(d.label('g0/e0/l1'), 'edgeLabels.placement')).toEqual('HEAD');
    expect(d.label('g0/e0/l2').text).toBe('tail');
    expect(prop(d.label('g0/e0/l2'), 'edgeLabels.placement')).toEqual('TAIL');
    expect(xy(d.label('g0/e0/l0').size)).toEqual([20, 8]);
    expect(at(elk, 'edges/0/labels/3/text')).toEqual('');
    expect(at(elk, 'edges/0/labels/4/text')).toEqual('hidden');
  });

  it('skips a flat edge that is excluded from layout', () => {
    // oracle: site/transform/misc/no-layout-edges; ElkGraphImporter.java:269-282 (importFlatGraph, noLayout edges)
    const run = runSiteRow('site/transform/misc/no-layout-edges');
    const d = run.dump;
    const elk = run.elk;
    expect(d.graph('g0').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:e1');
    expect(d.graph('g0').layerlessNodes.length).toBe(2);
    expect(at(elk, 'edges/1/layoutOptions/noLayout')).toEqual('true');
    expect(section(elk, 'edges/1')).toBeUndefined();
  });

  it('skips hierarchical edges that are excluded from layout or end at a node that is', () => {
    // oracle: site/transform/misc/no-layout-edges-hierarchical; ElkGraphImporter.java:404-410 (importHierarchicalGraph, noLayout edges)
    const run = runSiteRow('site/transform/misc/no-layout-edges-hierarchical');
    const d = run.dump;
    const elk = run.elk;
    expect(d.graph('g0').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:e1');
    expect(d.graph('g0').layerlessNodes.length).toBe(2);
    expect(section(elk, 'edges/1')).toBeUndefined();
    expect(section(elk, 'edges/2')).toBeUndefined();
  });

  it('fails with UnsupportedGraphException for a flat edge to a node excluded from layout', () => {
    // oracle: site/transform/misc/no-layout-edge-to-skipped-node; ElkGraphImporter.java:1128-1135 (transformEdge)
    const run = runSiteRow('site/transform/misc/no-layout-edge-to-skipped-node');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message:
        'The source or the target of edge ElkEdge "e3" ElkNode "a" (0.0,0.0 | 20.0,20.0) -> ElkNode "skip" (0.0,0.0 | 20.0,20.0) could not be found. This usually happens when an edge connects a node laid out by ELK Layered to a node in another level of hierarchy laid out by either another instance of ELK Layered or another layout algorithm alltogether. The former can be solved by setting the hierarchyHandling option to INCLUDE_CHILDREN.',
    });
  });

  it('rejects a flat edge without source', () => {
    // oracle: site/transform/misc/invalid-edge-no-source-flat; ElkGraphImporter.java:1248-1256 (checkEdgeValidity)
    const run = runSiteRow('site/transform/misc/invalid-edge-no-source-flat');
    expect(run.exception('graph')).toEqual({
      class: 'IllegalArgumentException',
      message: "Passed edge is not 'simple'.",
    });
  });

  it('rejects a flat edge without target', () => {
    // oracle: site/transform/misc/invalid-edge-no-target-flat; ElkGraphImporter.java:1248-1256 (checkEdgeValidity)
    const run = runSiteRow('site/transform/misc/invalid-edge-no-target-flat');
    expect(run.exception('graph')).toEqual({
      class: 'IllegalArgumentException',
      message: "Passed edge is not 'simple'.",
    });
  });

  it('rejects a hierarchical edge without source', () => {
    // oracle: site/transform/misc/invalid-edge-no-source-hierarchical; ElkGraphImporter.java:1248-1256 (checkEdgeValidity)
    const run = runSiteRow('site/transform/misc/invalid-edge-no-source-hierarchical');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message: 'Edges must have a source.',
    });
  });

  it('rejects a hierarchical edge without target', () => {
    // oracle: site/transform/misc/invalid-edge-no-target-hierarchical; ElkGraphImporter.java:1248-1256 (checkEdgeValidity)
    const run = runSiteRow('site/transform/misc/invalid-edge-no-target-hierarchical');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message: 'Edges must have a target.',
    });
  });

  it('rejects a flat hyperedge', () => {
    // oracle: site/transform/misc/invalid-hyperedge-flat; ElkGraphImporter.java:1248-1256 (checkEdgeValidity)
    const run = runSiteRow('site/transform/misc/invalid-hyperedge-flat');
    expect(run.exception('graph')).toEqual({
      class: 'IllegalArgumentException',
      message: "Passed edge is not 'simple'.",
    });
  });

  it('rejects a hierarchical hyperedge', () => {
    // oracle: site/transform/misc/invalid-hyperedge-hierarchical; ElkGraphImporter.java:1248-1256 (checkEdgeValidity)
    const run = runSiteRow('site/transform/misc/invalid-hyperedge-hierarchical');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message: 'Hyperedges are not supported.',
    });
  });
});
