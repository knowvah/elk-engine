// SPDX-License-Identifier: EPL-2.0
// Non-mutating layout application of the ELK graph transfer for inside self loops, curated models and graphs
// without origins (mission 7a, T11c): each case replays a row of test/golden/refs/java/layered-sites.json
// (group S15) on the port and asserts the Java values of the ELK graph that applyLayoutNonMutating builds.
import { describe, expect, it } from 'vitest';
import { at, geom, section } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphLayoutTransferrerNonMutating.loops (oracle site rows)', () => {
  it('adds the target offset to the end point of the rebuilt edge', () => {
    // oracle: site/transform/nonMutating/target-offset; ElkGraphLayoutTransferrer.java:676-678 (applyEdgeLayout, target offset)
    const run = runSiteRow('site/transform/nonMutating/target-offset');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [15, 10] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-flat-target; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-flat-target');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-flat-root; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-flat-root');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/2')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/3')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/3/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-hierarchical-host-include-children; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-hierarchical-host-include-children');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/3/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/layered-insideSelfLoops-hierarchical-host-include-children; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/layered-insideSelfLoops-hierarchical-host-include-children');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/3/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-model-order-nodes-and-edges; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-model-order-nodes-and-edges');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/3/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-model-order-cycle-breaking; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-model-order-cycle-breaking');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/3/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-model-order-flat-target; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-model-order-flat-target');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
  });

  it('rebuilds the edges of a graph with inside self loops without touching the original', () => {
    // oracle: site/transform/nonMutating/insideSelfLoops-model-order-layering; ElkGraphLayoutTransferrer.java:444-534 (applyLayoutNonMutating), 641-728 (applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/insideSelfLoops-model-order-layering');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([80, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/3/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/3/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/3/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('skips the nodes without ELK origin in layers and in the layerless list', () => {
    // oracle: site/transform/nonMutating/lgraph-without-origins; ElkGraphLayoutTransferrer.java:536-570 (collectNodes)
    const run = runSiteRow('site/transform/nonMutating/lgraph-without-origins');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(0);
    expect(at(elk, 'height')).toEqual(0);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
  });

  it('rebuilds a curated model with compound nodes and labels', () => {
    // oracle: site/transform/nonMutating/curated-inside-compound-nodes-01; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating)
    const run = runSiteRow('site/transform/nonMutating/curated-inside-compound-nodes-01');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [14.5, 14.5], bends: [], end: [14.5, 14.5] });
    expect(section(elk, 'edges/1')).toEqual({ start: [14.5, 14.5], bends: [], end: [14.5, 14.5] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/0/ports/0/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/1/ports/0/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/1/ports/1/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/2/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/2/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/2/ports/0/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/2/ports/0/labels/0')).toEqual([0, 0, 0, 0]);
  });

  it('moves the nodes into a layer with a long edge dummy first and then rebuilds a curated model with compound nodes and labels', () => {
    // oracle: site/transform/nonMutating/layered-curated-inside-compound-nodes-01; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 444-728 (applyLayoutNonMutating)
    const run = runSiteRow('site/transform/nonMutating/layered-curated-inside-compound-nodes-01');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [14.5, 14.5], bends: [], end: [14.5, 14.5] });
    expect(section(elk, 'edges/1')).toEqual({ start: [14.5, 14.5], bends: [], end: [14.5, 14.5] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/0/ports/0/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/1/ports/0/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/1/ports/1/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/2/labels/0')).toEqual([0, 0, 0, 0]);
    expect(geom(elk, 'children/2/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/2/ports/0/layoutOptions/port.side')).toEqual('UNDEFINED');
    expect(geom(elk, 'children/2/ports/0/labels/0')).toEqual([0, 0, 0, 0]);
  });

  it('rebuilds a curated model with compound nodes and labels', () => {
    // oracle: site/transform/nonMutating/curated-273-insideSelfLoopsWithLabels; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating)
    const run = runSiteRow('site/transform/nonMutating/curated-273-insideSelfLoopsWithLabels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
  });

  it('moves the nodes into a layer with a long edge dummy first and then rebuilds a curated model with compound nodes and labels', () => {
    // oracle: site/transform/nonMutating/layered-curated-273-insideSelfLoopsWithLabels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 444-728 (applyLayoutNonMutating)
    const run = runSiteRow('site/transform/nonMutating/layered-curated-273-insideSelfLoopsWithLabels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
  });
});
