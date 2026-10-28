// SPDX-License-Identifier: EPL-2.0
// Flat import of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S12) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { prop } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterFlat (oracle site rows)', () => {
  it('imports only the inside self loops of the target node as edges between its external port dummies', () => {
    // oracle: site/transform/insideSelfLoops/flat-target; ElkGraphImporter.java:284-298 (importFlatGraph, inside self loops)
    const run = runSiteRow('site/transform/insideSelfLoops/flat-target');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS']);
    expect(d.graph('g0').layerlessNodes.length).toBe(3);
    expect(d.graph('g0').edges.length).toBe(1);
    expect(d.edge('g0/e0').source).toBe('g0/n0/p0');
    expect(d.edge('g0/e0').target).toBe('g0/n1/p0');
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:loopIn');
    expect(d.node('g0/n0').type).toBe('EXTERNAL_PORT');
    expect(prop(d.node('g0/n0'), 'origin')).toEqual('elk:ha');
    expect(prop(d.node('g0/n1'), 'origin')).toEqual('elk:hb');
    expect(prop(d.node('g0/n2'), 'origin')).toEqual('elk:hc');
    expect(d.port('g0/n2/p0').connectedToExternalNodes).toBe(true);
  });

  it('collects no inside self loops for a root graph and imports every sibling edge, node self loops included', () => {
    // oracle: site/transform/insideSelfLoops/flat-root; ElkGraphImporter.java:284-298 (importFlatGraph, inside self loops)
    const run = runSiteRow('site/transform/insideSelfLoops/flat-root');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['HYPEREDGES', 'SELF_LOOPS']);
    expect(d.graph('g0').layerlessNodes.length).toBe(4);
    expect(d.graph('g0').edges.length).toBe(4);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:plain');
    expect(prop(d.edge('g0/e1'), 'origin')).toEqual('elk:loopOut');
    expect(d.edge('g0/e1').source).toBe('g0/n0/p2');
    expect(d.edge('g0/e1').target).toBe('g0/n0/p1');
    expect(prop(d.edge('g0/e2'), 'origin')).toEqual('elk:toOther');
    expect(prop(d.edge('g0/e3'), 'origin')).toEqual('elk:nodeLoop');
    expect(d.edge('g0/e3').source).toBe('g0/n1/p0');
    expect(d.edge('g0/e3').target).toBe('g0/n1/p1');
    expect(prop(d.node('g0/n0'), 'compoundNode')).toEqual(true);
    expect(prop(d.node('g0/n2'), 'compoundNode')).toEqual(undefined);
    expect(d.node('g0/n0').nested).toBe(null);
  });

  it('fails with UnsupportedGraphException for an inside self loop on the imported node itself, which has no LNode in the graph', () => {
    // oracle: site/transform/insideSelfLoops/flat-target-node-self-loop; ElkGraphImporter.java:1128-1135 (transformEdge)
    const run = runSiteRow('site/transform/insideSelfLoops/flat-target-node-self-loop');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message:
        'The source or the target of edge ElkEdge "hostSelf" ElkNode "host" (0.0,0.0 | 80.0,60.0) -> ElkNode "host" (0.0,0.0 | 80.0,60.0) could not be found. This usually happens when an edge connects a node laid out by ELK Layered to a node in another level of hierarchy laid out by either another instance of ELK Layered or another layout algorithm alltogether. The former can be solved by setting the hierarchyHandling option to INCLUDE_CHILDREN.',
    });
  });

  it('gives the inside self loop of the target no model order, the contained edges of the target being none', () => {
    // oracle: site/transform/insideSelfLoops/model-order-flat-target; ElkGraphImporter.java:268-298 (importFlatGraph)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-flat-target');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS']);
    expect(prop(d.graph('g0'), 'modelOrder.maximum')).toEqual(0);
    expect(d.graph('g0').edges.length).toBe(1);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:loopIn');
    expect(prop(d.edge('g0/e0'), 'modelOrder')).toEqual(undefined);
    expect(prop(d.node('g0/n0'), 'modelOrder')).toEqual(undefined);
  });
});
