// SPDX-License-Identifier: EPL-2.0
// Node, edge and parent-node layout steps of the ELK graph transfer (mission 7a, T11c): each case replays a row
// of test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { at, geom, section } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphLayoutTransferrerApply (oracle site rows)', () => {
  it('copies the size of nodes under NETWORK_SIMPLEX only when their flexibility allows resizing', () => {
    // oracle: site/transform/misc/network-simplex-flexibility; ElkGraphLayoutTransferrer.java:172-181 (applyNodeLayout, node size)
    const run = runSiteRow('site/transform/misc/network-simplex-flexibility');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 20, 20]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 20, 20]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 20, 20]);
    expect(at(elk, 'children/0/layoutOptions/nodeFlexibility')).toEqual('NODE_SIZE');
    expect(at(elk, 'children/1/layoutOptions/nodeFlexibility')).toBeUndefined();
    expect(at(elk, 'children/2/layoutOptions/nodeFlexibility')).toEqual('NONE');
    expect(at(elk, 'layoutOptions/nodePlacement.strategy')).toEqual('NETWORK_SIMPLEX');
  });

  it('starts an edge into a descendant at the source port anchor minus the offset', () => {
    // oracle: site/transform/misc/edge-with-section-descendant; ElkGraphLayoutTransferrer.java:245-262 (applyEdgeLayout, hierarchical source point)
    const run = runSiteRow('site/transform/misc/edge-with-section-descendant');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 100, 80]);
    expect(section(elk, 'children/0/edges/0')).toEqual({ start: [100, 40], bends: [], end: [42, 42] });
    expect(at(elk, 'children/0/edges/0/sections/0/incomingShape')).toEqual('host');
    expect(at(elk, 'children/0/edges/0/sections/0/outgoingShape')).toEqual('inner');
  });

  it('adds the target offset to the end point of the edge', () => {
    // oracle: site/transform/misc/target-offset; ElkGraphLayoutTransferrer.java:268-272 (applyEdgeLayout, target offset)
    const run = runSiteRow('site/transform/misc/target-offset');
    const elk = run.elk;
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [15, 10] });
    expect(at(elk, 'edges/0/layoutOptions/junctionPoints')).toEqual('()');
    expect(at(elk, 'edges/0/sections/0/incomingShape')).toEqual('a');
    expect(at(elk, 'edges/0/sections/0/outgoingShape')).toEqual('b');
  });

  it('marks the edges of a graph routed with SPLINES', () => {
    // oracle: site/transform/misc/splines-routing-and-target-offset; ElkGraphLayoutTransferrer.java:304-312 (applyEdgeLayout, SPLINES)
    const run = runSiteRow('site/transform/misc/splines-routing-and-target-offset');
    const elk = run.elk;
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(at(elk, 'edges/0/layoutOptions/edgeRouting')).toEqual('SPLINES');
    expect(at(elk, 'layoutOptions/edgeRouting')).toEqual('SPLINES');
  });

  it('replaces the bend points of the sections by the routing result', () => {
    // oracle: site/transform/misc/bend-points-interactive; ElkGraphLayoutTransferrer.java:274-312 (applyEdgeLayout)
    const run = runSiteRow('site/transform/misc/bend-points-interactive');
    const elk = run.elk;
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [112, 52] });
    expect(section(elk, 'edges/1')).toEqual({ start: [112, 52], bends: [], end: [212, 12] });
    expect(section(elk, 'edges/2')).toEqual({ start: [12, 12], bends: [], end: [212, 12] });
    expect(geom(elk, 'children/1')).toEqual([112, 52, 20, 20]);
  });

  it('replaces the bend points of an edge by the routing result under INTERACTIVE node placement', () => {
    // oracle: site/transform/misc/bend-points-node-placement-interactive; ElkGraphLayoutTransferrer.java:274-312 (applyEdgeLayout)
    const run = runSiteRow('site/transform/misc/bend-points-node-placement-interactive');
    const elk = run.elk;
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [72, 12] });
    expect(geom(elk, 'children/1')).toEqual([72, 12, 20, 20]);
  });

  it('routes edges between fixed-side and fixed-position nodes from the created ports', () => {
    // oracle: site/transform/misc/edge-with-section-fixed-side; ElkGraphLayoutTransferrer.java:274-312 (applyEdgeLayout)
    const run = runSiteRow('site/transform/misc/edge-with-section-fixed-side');
    const elk = run.elk;
    expect(section(elk, 'edges/0')).toEqual({ start: [52, 22], bends: [], end: [112, 42] });
    expect(section(elk, 'edges/1')).toEqual({ start: [112, 47], bends: [], end: [52, 17] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 40, 40]);
    expect(geom(elk, 'children/1')).toEqual([112, 12, 40, 40]);
  });

  it('places the edge labels that were transformed at the edge offset and leaves the others as they were', () => {
    // oracle: site/transform/misc/edge-labels; ElkGraphLayoutTransferrer.java:281-292 (applyEdgeLayout, labels)
    const run = runSiteRow('site/transform/misc/edge-labels');
    const elk = run.elk;
    expect(geom(elk, 'edges/0/labels/0')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/1')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/2')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/3')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'edges/0/labels/4')).toEqual([0, 0, 20, 8]);
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
  });

  it('sets node labels only when the node or the label has a label placement', () => {
    // oracle: site/transform/misc/node-labels-and-placement; ElkGraphLayoutTransferrer.java:193-215 (applyNodeLayout, node labels)
    const run = runSiteRow('site/transform/misc/node-labels-and-placement');
    const elk = run.elk;
    expect(geom(elk, 'children/0/labels/0')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'children/0/labels/1')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'children/1/labels/0')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'children/2')).toEqual([200, 0, 60, 40]);
  });

  it('sets the port labels of nodes with non-fixed port label placement and skips ports excluded from layout', () => {
    // oracle: site/transform/misc/port-labels; ElkGraphLayoutTransferrer.java:205-215 (applyNodeLayout, port labels)
    const run = runSiteRow('site/transform/misc/port-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 40, 40]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([40, 10, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([10, 40, 6, 6]);
    expect(geom(elk, 'children/0/ports/0/labels/0')).toEqual([8, 0, 20, 8]);
    expect(geom(elk, 'children/0/ports/0/labels/1')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'children/0/ports/0/labels/2')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'children/0/ports/1/labels/0')).toEqual([-24, 0, 20, 8]);
  });

  it('resizes a target node, keeps PORT_LABELS in its size constraints and copies the computed padding', () => {
    // oracle: site/transform/misc/parent-node-layout-flags; ElkGraphLayoutTransferrer.java:357-400 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/misc/parent-node-layout-flags');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 10, 8]);
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[PORT_LABELS]');
    expect(at(elk, 'children/0/layoutOptions/nodeSize.options')).toEqual('[COMPUTE_PADDING]');
    expect(at(elk, 'children/0/layoutOptions/elk.padding')).toEqual('[top=3.0,left=4.0,bottom=5.0,right=6.0]');
    expect(at(elk, 'children/0/layoutOptions/portConstraints')).toEqual('FREE');
    expect(section(elk, 'children/0/edges/0')).toEqual({ start: [4, 3], bends: [], end: [4, 3] });
    expect(geom(elk, 'children/0/children/0')).toEqual([4, 3, 20, 20]);
    expect(geom(elk, 'children/0/children/1')).toEqual([4, 3, 20, 20]);
  });

  it('resizes the root graph, fixes its size constraints and copies the computed padding', () => {
    // oracle: site/transform/misc/parent-node-layout-flags-root; ElkGraphLayoutTransferrer.java:357-400 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/misc/parent-node-layout-flags-root');
    const elk = run.elk;
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[COMPUTE_PADDING]');
    expect(at(elk, 'layoutOptions/elk.padding')).toEqual('[top=12.0,left=12.0,bottom=12.0,right=12.0]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
  });

  it('keeps the size of the target when the graph size is fixed', () => {
    // oracle: site/transform/misc/node-size-minimum-fixed-graph-size; ElkGraphLayoutTransferrer.java:363-381 (applyParentNodeLayout, fixed graph size)
    const run = runSiteRow('site/transform/misc/node-size-minimum-fixed-graph-size');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 80, 60]);
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[]');
  });

  it('resizes the target to the minimum size and keeps PORT_LABELS in its constraints', () => {
    // oracle: site/transform/misc/node-size-minimum-free-graph-size; ElkGraphLayoutTransferrer.java:363-381 (applyParentNodeLayout, free graph size)
    const run = runSiteRow('site/transform/misc/node-size-minimum-free-graph-size');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 120, 90]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 15, 6, 6]);
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[PORT_LABELS]');
    expect(at(elk, 'children/0/layoutOptions/nodeSize.minimum')).toEqual('(120.0,90.0)');
  });

  it('fixes the port positions and resizes the node of a graph with external ports', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphLayoutTransferrer.java:363-370 (applyParentNodeLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(at(elk, 'children/0/layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[]');
  });

  it('resizes the node of a graph without external ports and fixes its size constraints', () => {
    // oracle: site/transform/externalPorts/no-edges-no-labels; ElkGraphLayoutTransferrer.java:371-381 (applyParentNodeLayout, without external ports)
    const run = runSiteRow('site/transform/externalPorts/no-edges-no-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'children/0/layoutOptions/portConstraints')).toEqual('FREE');
  });

  it('does not resize the nodes of nested graphs', () => {
    // oracle: site/transform/hierarchy/three-levels; ElkGraphLayoutTransferrer.java:357-400 (applyParentNodeLayout, nested graphs)
    const run = runSiteRow('site/transform/hierarchy/three-levels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/0/children/1')).toEqual([12, 12, 100, 60]);
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'children/0/children/1/layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
  });
});
