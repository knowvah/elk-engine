// SPDX-License-Identifier: EPL-2.0
// Model order and inside self loop predicates of ElkGraphImporter (mission 7a, T11c): each case replays a row
// of test/golden/refs/java/layered-sites.json (group S12) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { prop } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterModelOrder (oracle site rows)', () => {
  it('creates a nested graph for a node whose only children are inside self loops', () => {
    // oracle: site/transform/insideSelfLoops/hierarchical-host-include-children; ElkGraphImporter.java:515-530 (hasInsideSelfLoops)
    const run = runSiteRow('site/transform/insideSelfLoops/hierarchical-host-include-children');
    const d = run.dump;
    expect(d.node('g0/n0').nested).toBe('g1');
    expect(d.node('g0/n1').nested).toBe(null);
    expect(prop(d.node('g0/n0'), 'compoundNode')).toEqual(true);
    expect(prop(d.node('g0/n1'), 'compoundNode')).toEqual(true);
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['HYPEREDGES', 'SELF_LOOPS']);
    expect(prop(d.graph('g1'), 'graphProperties')).toEqual(['SELF_LOOPS']);
    expect(prop(d.graph('g1'), 'origin')).toEqual('elk:host');
    expect(d.graph('g1').layerlessNodes.length).toBe(0);
    expect(d.graph('g1').edges.length).toBe(0);
    expect(d.graph('g0').edges.length).toBe(5);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:loopIn');
    expect(d.edge('g0/e0').source).toBe('g0/n0/p0');
    expect(d.edge('g0/e0').target).toBe('g0/n0/p1');
  });

  it('cannot import inside self loops of a node whose own hierarchy handling is not INCLUDE_CHILDREN', () => {
    // oracle: site/transform/insideSelfLoops/hierarchical-host-without-include-children; ElkGraphImporter.java:515-530 (hasInsideSelfLoops)
    const run = runSiteRow('site/transform/insideSelfLoops/hierarchical-host-without-include-children');
    expect(run.exception('graph')?.class).toBe('TypeError'); // Java: NullPointerException (D10)
  });

  it('numbers nodes, ports and edges for NODES_AND_EDGES model order, inside self loops first', () => {
    // oracle: site/transform/insideSelfLoops/model-order-nodes-and-edges; ElkGraphImporter.java:472-505 (needsModelOrder, needsModelOrderBasedOnParent)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-nodes-and-edges');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'modelOrder.maximum')).toEqual(4);
    expect(prop(d.graph('g0'), 'modelOrderGroups.cb.number')).toEqual(0);
    expect(prop(d.node('g0/n0'), 'modelOrder')).toEqual(0);
    expect(prop(d.node('g0/n1'), 'modelOrder')).toEqual(1);
    expect(prop(d.node('g0/n2'), 'modelOrder')).toEqual(2);
    expect(prop(d.node('g0/n3'), 'modelOrder')).toEqual(3);
    expect(prop(d.port('g0/n0/p0'), 'modelOrder')).toEqual(0);
    expect(prop(d.port('g0/n0/p1'), 'modelOrder')).toEqual(1);
    expect(prop(d.port('g0/n0/p2'), 'modelOrder')).toEqual(2);
    expect(prop(d.edge('g0/e0'), 'origin')).toEqual('elk:loopIn');
    expect(prop(d.edge('g0/e0'), 'modelOrder')).toEqual(0);
    expect(prop(d.edge('g0/e1'), 'origin')).toEqual('elk:plain');
    expect(prop(d.edge('g0/e1'), 'modelOrder')).toEqual(2);
    expect(prop(d.edge('g0/e2'), 'origin')).toEqual('elk:loopOut');
    expect(prop(d.edge('g0/e2'), 'modelOrder')).toEqual(1);
    expect(prop(d.edge('g0/e3'), 'origin')).toEqual('elk:toOther');
    expect(prop(d.edge('g0/e3'), 'modelOrder')).toEqual(3);
    expect(prop(d.edge('g0/e4'), 'origin')).toEqual('elk:nodeLoop');
    expect(prop(d.edge('g0/e4'), 'modelOrder')).toEqual(4);
    expect(prop(d.graph('g1'), 'modelOrder')).toEqual(0);
  });

  it('numbers nodes and edges when the cycle breaking strategy needs the model order', () => {
    // oracle: site/transform/insideSelfLoops/model-order-cycle-breaking; ElkGraphImporter.java:484-505 (needsModelOrderBasedOnParent)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-cycle-breaking');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'modelOrder.maximum')).toEqual(4);
    expect(prop(d.node('g0/n0'), 'modelOrder')).toEqual(0);
    expect(prop(d.node('g0/n1'), 'modelOrder')).toEqual(1);
    expect(prop(d.node('g0/n2'), 'modelOrder')).toEqual(2);
    expect(prop(d.node('g0/n3'), 'modelOrder')).toEqual(3);
    expect(prop(d.edge('g0/e0'), 'modelOrder')).toEqual(0);
    expect(prop(d.edge('g0/e1'), 'modelOrder')).toEqual(2);
    expect(prop(d.edge('g0/e2'), 'modelOrder')).toEqual(1);
    expect(prop(d.edge('g0/e3'), 'modelOrder')).toEqual(3);
    expect(prop(d.edge('g0/e4'), 'modelOrder')).toEqual(4);
    expect(prop(d.port('g0/n0/p0'), 'modelOrder')).toEqual(0);
    expect(prop(d.port('g0/n0/p2'), 'modelOrder')).toEqual(2);
  });

  it('numbers nodes and edges when the layering strategy is BF_MODEL_ORDER', () => {
    // oracle: site/transform/insideSelfLoops/model-order-layering; ElkGraphImporter.java:484-505 (needsModelOrderBasedOnParent)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-layering');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'modelOrder.maximum')).toEqual(4);
    expect(prop(d.node('g0/n0'), 'modelOrder')).toEqual(0);
    expect(prop(d.node('g0/n1'), 'modelOrder')).toEqual(1);
    expect(prop(d.node('g0/n2'), 'modelOrder')).toEqual(2);
    expect(prop(d.node('g0/n3'), 'modelOrder')).toEqual(3);
    expect(prop(d.edge('g0/e0'), 'modelOrder')).toEqual(0);
    expect(prop(d.edge('g0/e1'), 'modelOrder')).toEqual(2);
    expect(prop(d.edge('g0/e2'), 'modelOrder')).toEqual(1);
    expect(prop(d.edge('g0/e3'), 'modelOrder')).toEqual(3);
    expect(prop(d.edge('g0/e4'), 'modelOrder')).toEqual(4);
    expect(prop(d.port('g0/n0/p0'), 'modelOrder')).toEqual(0);
    expect(prop(d.port('g0/n0/p2'), 'modelOrder')).toEqual(2);
  });
});
