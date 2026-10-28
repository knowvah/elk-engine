// SPDX-License-Identifier: EPL-2.0
// Hierarchical import of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S13) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { at, prop } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterHierarchical (oracle site rows)', () => {
  it('creates a nested graph per compound node with children and imports each node into the graph of its parent', () => {
    // oracle: site/transform/hierarchy/three-levels; ElkGraphImporter.java:309-369 (importHierarchicalGraph, nodes)
    const run = runSiteRow('site/transform/hierarchy/three-levels');
    const d = run.dump;
    expect(d.node('g0/n0').nested).toBe('g1');
    expect(d.node('g1/n1').nested).toBe('g2');
    expect(d.node('g0/n1').nested).toBe(null);
    expect(d.node('g0/n2').nested).toBe(null);
    expect(prop(d.graph('g1'), 'origin')).toEqual('elk:A');
    expect(prop(d.graph('g2'), 'origin')).toEqual('elk:A2');
    expect(d.graph('g0').layerlessNodes.length).toBe(3);
    expect(d.graph('g1').layerlessNodes.length).toBe(2);
    expect(d.graph('g2').layerlessNodes.length).toBe(2);
    expect(prop(d.node('g1/n0'), 'origin')).toEqual('elk:A1');
    expect(prop(d.node('g1/n1'), 'origin')).toEqual('elk:A2');
    expect(prop(d.node('g2/n0'), 'origin')).toEqual('elk:A2x');
    expect(prop(d.node('g2/n1'), 'origin')).toEqual('elk:A2y');
    expect(prop(d.node('g0/n0'), 'nodeSize.constraints')).toEqual([]);
    expect(prop(d.graph('g1'), 'direction')).toEqual('RIGHT');
    expect(prop(d.graph('g2'), 'direction')).toEqual('RIGHT');
  });

  it('places each edge in the graph of the end point whose insides it enters and creates its ports on the nested nodes', () => {
    // oracle: site/transform/hierarchy/three-levels; ElkGraphImporter.java:389-440 (importHierarchicalGraph, edges)
    const run = runSiteRow('site/transform/hierarchy/three-levels');
    const d = run.dump;
    expect(d.graph('g0').edges.length).toBe(9);
    expect(d.graph('g1').edges.length).toBe(3);
    expect(d.graph('g2').edges.length).toBe(1);
    expect(d.edge('g0/e0').source).toBe('g1/n0/p0');
    expect(d.edge('g0/e0').target).toBe('g0/n0/p0');
    expect(d.edge('g0/e2').source).toBe('g0/n0/p2');
    expect(d.edge('g0/e2').target).toBe('g1/n0/p6');
    expect(d.edge('g0/e3').source).toBe('g1/n0/p7');
    expect(d.edge('g0/e3').target).toBe('g0/n0/p3');
    expect(d.edge('g1/e2').source).toBe('g1/n0/p5');
    expect(d.edge('g1/e2').target).toBe('g2/n0/p2');
    expect(d.edge('g1/e0').source).toBe('g1/n0/p3');
    expect(d.edge('g1/e0').target).toBe('g1/n1/p0');
    expect(d.edge('g2/e0').source).toBe('g2/n0/p3');
    expect(d.edge('g2/e0').target).toBe('g2/n1/p1');
    expect(prop(d.edge('g0/e2'), 'origin')).toEqual('elk:eSelfDesc');
    expect(prop(d.edge('g0/e3'), 'origin')).toEqual('elk:eAscend');
    expect(prop(d.edge('g1/e2'), 'origin')).toEqual('elk:deepInA');
  });

  it('records the graph an edge crossing the hierarchy has to be exported relative to', () => {
    // oracle: site/transform/hierarchy/three-levels; ElkGraphImporter.java:535-590 (findCoordinateSystemOrigin)
    const run = runSiteRow('site/transform/hierarchy/three-levels');
    const d = run.dump;
    expect(prop(d.edge('g0/e0'), 'coordinateOrigin')).toEqual('g1');
    expect(prop(d.edge('g0/e1'), 'coordinateOrigin')).toEqual(undefined);
    expect(prop(d.edge('g0/e2'), 'coordinateOrigin')).toEqual(undefined);
    expect(prop(d.edge('g0/e3'), 'coordinateOrigin')).toEqual('g1');
    expect(prop(d.edge('g0/e4'), 'coordinateOrigin')).toEqual('g0');
    expect(prop(d.edge('g0/e5'), 'coordinateOrigin')).toEqual('g0');
    expect(prop(d.edge('g0/e6'), 'coordinateOrigin')).toEqual('g0');
    expect(prop(d.edge('g0/e7'), 'coordinateOrigin')).toEqual('g0');
    expect(prop(d.edge('g0/e8'), 'coordinateOrigin')).toEqual('g0');
    expect(prop(d.edge('g1/e0'), 'coordinateOrigin')).toEqual(undefined);
    expect(prop(d.edge('g1/e1'), 'coordinateOrigin')).toEqual(undefined);
    expect(prop(d.edge('g1/e2'), 'coordinateOrigin')).toEqual('g1');
    expect(prop(d.edge('g2/e0'), 'coordinateOrigin')).toEqual(undefined);
  });

  it('applies the base value of a nested graph and keeps the direction of its parent graph', () => {
    // oracle: site/transform/hierarchy/three-levels-base-spacing; ElkGraphImporter.java:348-352 (importHierarchicalGraph, spacing)
    const run = runSiteRow('site/transform/hierarchy/three-levels-base-spacing');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'spacing.baseValue')).toEqual(undefined);
    expect(prop(d.graph('g0'), 'spacing.nodeNode')).toEqual(7.5);
    expect(prop(d.graph('g0'), 'spacing.edgeNode')).toEqual(3.75);
    expect(prop(d.node('g0/n0'), 'direction')).toEqual('DOWN');
    expect(prop(d.node('g0/n0'), 'spacing.baseValue')).toEqual(undefined);
    expect(prop(d.graph('g1'), 'spacing.baseValue')).toEqual(undefined);
    expect(prop(d.graph('g1'), 'spacing.nodeNode')).toEqual(9);
    expect(prop(d.graph('g1'), 'spacing.edgeNode')).toEqual(4.5);
    expect(prop(d.graph('g1'), 'direction')).toEqual('RIGHT');
    expect(prop(d.graph('g2'), 'spacing.nodeNode')).toBeUndefined();
    expect(prop(d.graph('g2'), 'direction')).toEqual('RIGHT');
  });

  it('extends the size constraints and the minimum size of a nested graph whose node has size constraints', () => {
    // oracle: site/transform/hierarchy/three-levels-min-size; ElkGraphImporter.java:353-360 (importHierarchicalGraph, minimum graph size)
    const run = runSiteRow('site/transform/hierarchy/three-levels-min-size');
    const d = run.dump;
    const elk = run.elk;
    expect(prop(d.node('g0/n0'), 'nodeSize.constraints')).toEqual(['PORTS', 'NODE_LABELS', 'MINIMUM_SIZE']);
    expect(prop(d.node('g0/n0'), 'nodeSize.minimum')).toEqual([150, 90]);
    expect(prop(d.graph('g1'), 'nodeSize.constraints')).toEqual(['PORTS', 'NODE_LABELS', 'MINIMUM_SIZE']);
    expect(prop(d.graph('g1'), 'nodeSize.minimum')).toEqual([150, 90]);
    expect(prop(d.graph('g2'), 'nodeSize.constraints')).toBeUndefined();
    expect(at(elk, 'children/0/width')).toEqual(300);
    expect(at(elk, 'children/0/height')).toEqual(200);
  });

  it('treats a child that names the layered algorithm as part of the same run', () => {
    // oracle: site/transform/hierarchy/layered-algorithm-child; ElkGraphImporter.java:339-343, 452-458 (importHierarchicalGraph, uses ELK Layered)
    const run = runSiteRow('site/transform/hierarchy/layered-algorithm-child');
    const d = run.dump;
    expect(d.node('g0/n0').nested).toBe('g1');
    expect(d.node('g1/n1').nested).toBe('g2');
    expect(d.graph('g1').layerlessNodes.length).toBe(2);
    expect(d.graph('g2').layerlessNodes.length).toBe(2);
    expect(d.graph('g0').edges.length).toBe(9);
    expect(d.graph('g1').edges.length).toBe(3);
    expect(d.graph('g2').edges.length).toBe(1);
    expect(prop(d.node('g0/n0'), 'algorithm')).toEqual('org.eclipse.elk.layered');
    expect(prop(d.edge('g1/e2'), 'coordinateOrigin')).toEqual('g1');
    expect(prop(d.edge('g0/e4'), 'coordinateOrigin')).toEqual('g0');
  });

  it('imports a child with another algorithm as a leaf without nested graph and skips its edges', () => {
    // oracle: site/transform/hierarchy/other-algorithm-child; ElkGraphImporter.java:339-343, 452-458 (importHierarchicalGraph, other algorithm)
    const run = runSiteRow('site/transform/hierarchy/other-algorithm-child');
    const d = run.dump;
    const elk = run.elk;
    expect(d.graph('g0').layerlessNodes.length).toBe(3);
    expect(d.node('g0/n0').nested).toBe(null);
    expect(prop(d.node('g0/n0'), 'algorithm')).toEqual('org.eclipse.elk.box');
    expect(prop(d.node('g0/n0'), 'origin')).toEqual('elk:A');
    expect(d.graph('g0').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:x6');
    expect(d.node('g0/n0').ports.length).toBe(2);
    expect(at(elk, 'children/0/width')).toEqual(300);
  });

  it('imports a child with SEPARATE_CHILDREN as a leaf and leaves its content to its own layout run', () => {
    // oracle: site/transform/hierarchy/mixed-handling; ElkGraphImporter.java:339-343, 447-458 (importHierarchicalGraph)
    const run = runSiteRow('site/transform/hierarchy/mixed-handling');
    const d = run.dump;
    const elk = run.elk;
    expect(d.graph('g0').layerlessNodes.length).toBe(3);
    expect(d.node('g0/n0').nested).toBe(null);
    expect(prop(d.node('g0/n0'), 'hierarchyHandling')).toEqual('SEPARATE_CHILDREN');
    expect(d.graph('g0').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:x6');
    expect(d.node('g0/n0').ports.length).toBe(2);
    expect(d.node('g0/n1').ports.length).toBe(2);
    expect(at(elk, 'children/0/children/0/id')).toEqual('A1');
  });

  it('fails with UnsupportedGraphException for an edge into a child that another run lays out', () => {
    // oracle: site/transform/hierarchy/mixed-handling-cross-edges; ElkGraphImporter.java:1128-1135 (transformEdge)
    const run = runSiteRow('site/transform/hierarchy/mixed-handling-cross-edges');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message:
        'The source or the target of edge ElkEdge "x1" ElkNode "A1" (0.0,0.0 | 40.0,30.0) -> ElkNode "B" (0.0,0.0 | 40.0,30.0) could not be found. This usually happens when an edge connects a node laid out by ELK Layered to a node in another level of hierarchy laid out by either another instance of ELK Layered or another layout algorithm alltogether. The former can be solved by setting the hierarchyHandling option to INCLUDE_CHILDREN.',
    });
  });

  it('fails with UnsupportedGraphException for an edge into a child with noLayout', () => {
    // oracle: site/transform/hierarchy/no-layout-child; ElkGraphImporter.java:1128-1135 (transformEdge)
    const run = runSiteRow('site/transform/hierarchy/no-layout-child');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message:
        'The source or the target of edge ElkEdge "eSib" ElkNode "A1" (0.0,0.0 | 40.0,30.0) -> ElkNode "A2" (0.0,0.0 | 100.0,60.0) could not be found. This usually happens when an edge connects a node laid out by ELK Layered to a node in another level of hierarchy laid out by either another instance of ELK Layered or another layout algorithm alltogether. The former can be solved by setting the hierarchyHandling option to INCLUDE_CHILDREN.',
    });
  });

  it('imports a nested node as the top level graph with external port dummies and the top level graph as coordinate origin', () => {
    // oracle: site/transform/hierarchy/nested-target; ElkGraphImporter.java:96-130, 535-590 (importGraph, findCoordinateSystemOrigin)
    const run = runSiteRow('site/transform/hierarchy/nested-target');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'origin')).toEqual('elk:A');
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS']);
    expect(d.graph('g0').layerlessNodes.length).toBe(4);
    expect(d.node('g0/n0').type).toBe('EXTERNAL_PORT');
    expect(prop(d.node('g0/n0'), 'origin')).toEqual('elk:aOut');
    expect(d.node('g0/n1').type).toBe('EXTERNAL_PORT');
    expect(prop(d.node('g0/n2'), 'origin')).toEqual('elk:A1');
    expect(d.node('g0/n3').nested).toBe('g1');
    expect(d.graph('g0').edges.length).toBe(5);
    expect(d.graph('g1').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'coordinateOrigin')).toEqual('g0');
    expect(prop(d.edge('g0/e4'), 'coordinateOrigin')).toEqual('g0');
    expect(d.edge('g0/e4').source).toBe('g0/n2/p4');
    expect(d.edge('g0/e4').target).toBe('g1/n0/p1');
    expect(prop(d.edge('g0/e2'), 'coordinateOrigin')).toBeUndefined();
  });

  it('imports the first level only when the root does not request INCLUDE_CHILDREN', () => {
    // oracle: site/transform/hierarchy/flat-root; ElkGraphImporter.java:96-130 (importGraph, flat path)
    const run = runSiteRow('site/transform/hierarchy/flat-root');
    const d = run.dump;
    expect(d.graph('g0').layerlessNodes.length).toBe(3);
    expect(d.node('g0/n0').nested).toBe(null);
    expect(d.node('g0/n1').nested).toBe(null);
    expect(d.graph('g0').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:x6');
    expect(prop(d.graph('g0'), 'hierarchyHandling')).toEqual(undefined);
    expect(prop(d.edge('g0/e0'), 'coordinateOrigin')).toBeUndefined();
  });
});
