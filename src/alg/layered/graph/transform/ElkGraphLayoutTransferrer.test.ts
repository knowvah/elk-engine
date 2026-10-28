// SPDX-License-Identifier: EPL-2.0
// Layout application facade of the ELK graph transfer (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (groups S12 to S14) on the port and asserts the Java values of the
// fields its branch produces.
import { describe, expect, it } from 'vitest';
import { at, geom, section } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';
import { ElkGraphTransformer } from './ElkGraphTransformer.js';
import { LGraph } from '../LGraph.js';
import { LNode } from '../LNode.js';

describe('ElkGraphLayoutTransferrer (oracle site rows)', () => {
  it('applies the layout of a nested graph recursively and adds the edges that descend into the nodes it represents', () => {
    // oracle: site/transform/hierarchy/three-levels; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/hierarchy/three-levels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(geom(elk, 'children/0/children/0')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/0/children/1')).toEqual([12, 12, 100, 60]);
    expect(geom(elk, 'children/0/children/1/children/0')).toEqual([12, 12, 20, 20]);
    expect(geom(elk, 'children/0/children/1/children/1')).toEqual([12, 12, 20, 20]);
    expect(section(elk, 'children/0/edges/2')).toEqual({ start: [55, 25], bends: [], end: [315, 35] });
    expect(section(elk, 'children/0/edges/3')).toEqual({ start: [3, 23], bends: [], end: [15, 25] });
    expect(section(elk, 'children/0/edges/5')).toEqual({ start: [0, 0], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/children/1/edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/edges/4')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
  });

  it('offsets the edges of the top level graph by the padding and the hierarchical coordinate origin', () => {
    // oracle: site/transform/hierarchy/three-levels; ElkGraphLayoutTransferrer.java:233-315, 326-350 (applyEdgeLayout, calculateHierarchicalOffset)
    const run = runSiteRow('site/transform/hierarchy/three-levels');
    const elk = run.elk;
    expect(section(elk, 'edges/0')).toEqual({ start: [24, 24], bends: [], end: [24, 24] });
    expect(section(elk, 'edges/1')).toEqual({ start: [67, 37], bends: [], end: [27, 37] });
    expect(section(elk, 'edges/2')).toEqual({ start: [36, 36], bends: [], end: [36, 36] });
    expect(section(elk, 'edges/3')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/4')).toEqual({ start: [59, 44], bends: [], end: [36, 36] });
  });

  it('applies the same layout to a graph whose nested graphs got base-value spacings', () => {
    // oracle: site/transform/hierarchy/three-levels-base-spacing; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/hierarchy/three-levels-base-spacing');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(section(elk, 'children/0/edges/2')).toEqual({ start: [55, 25], bends: [], end: [315, 35] });
    expect(section(elk, 'edges/1')).toEqual({ start: [67, 37], bends: [], end: [27, 37] });
  });

  it('applies the layout to a node with minimum size constraints and keeps its port constraints FREE', () => {
    // oracle: site/transform/hierarchy/three-levels-min-size; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/hierarchy/three-levels-min-size');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(at(elk, 'children/0/layoutOptions/portConstraints')).toEqual('FREE');
    expect(at(elk, 'children/0/layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(section(elk, 'children/0/edges/2')).toEqual({ start: [55, 25], bends: [], end: [315, 35] });
  });

  it('applies a nested layout for a child that names the layered algorithm', () => {
    // oracle: site/transform/hierarchy/layered-algorithm-child; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/hierarchy/layered-algorithm-child');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(section(elk, 'children/0/edges/2')).toEqual({ start: [55, 25], bends: [], end: [315, 35] });
    expect(section(elk, 'edges/1')).toEqual({ start: [67, 37], bends: [], end: [27, 37] });
    expect(section(elk, 'children/0/children/1/edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
  });

  it('leaves the children and edges of a node with another algorithm untouched', () => {
    // oracle: site/transform/hierarchy/other-algorithm-child; ElkGraphLayoutTransferrer.java:102-104 (applyLayout, leaf nodes)
    const run = runSiteRow('site/transform/hierarchy/other-algorithm-child');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/edges/0')).toBeUndefined();
    expect(geom(elk, 'children/0/children/0')).toEqual([0, 0, 40, 30]);
    expect(geom(elk, 'children/0/children/1')).toEqual([0, 0, 100, 60]);
  });

  it('leaves the content of a SEPARATE_CHILDREN node untouched', () => {
    // oracle: site/transform/hierarchy/mixed-handling; ElkGraphLayoutTransferrer.java:102-104 (applyLayout, leaf nodes)
    const run = runSiteRow('site/transform/hierarchy/mixed-handling');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/edges/1')).toBeUndefined();
    expect(geom(elk, 'children/0/children/0')).toEqual([0, 0, 40, 30]);
    expect(geom(elk, 'children/0/children/1')).toEqual([0, 0, 100, 60]);
    expect(geom(elk, 'children/0/children/0/ports/0')).toEqual([40, 10, 6, 6]);
  });

  it('applies only the first level when the root requested no hierarchy handling', () => {
    // oracle: site/transform/hierarchy/flat-root; ElkGraphLayoutTransferrer.java:67-147 (applyLayout, flat graph)
    const run = runSiteRow('site/transform/hierarchy/flat-root');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 300, 200]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 40, 30]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 30, 30]);
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0/children/0')).toEqual([0, 0, 40, 30]);
  });

  it('applies the layout of a nested target node, positioning its external ports', () => {
    // oracle: site/transform/hierarchy/nested-target; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, nested target)
    const run = runSiteRow('site/transform/hierarchy/nested-target');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 12, 6, 6]);
    expect(section(elk, 'children/0/edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/edges/4')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/1')).toEqual([0, 0, 40, 30]);
    expect(section(elk, 'edges/0')).toBeUndefined();
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
  });

  it('sets the positions of the external ports of the top level graph from their dummies', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([-182, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/3')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/4')).toEqual([0, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/5')).toEqual([-116, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/6')).toEqual([30, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/7')).toEqual([-146, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/8')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([200, 12, 6, 6]);
    expect(section(elk, 'children/0/edges/0')).toEqual({ start: [12, 12], bends: [], end: [24, 15] });
    expect(section(elk, 'children/0/edges/1')).toEqual({ start: [6, 15], bends: [], end: [12, 12] });
    expect(section(elk, 'children/0/edges/2')).toEqual({ start: [12, 12], bends: [], end: [-182, 15] });
    expect(section(elk, 'children/0/edges/3')).toEqual({ start: [-182, 15], bends: [], end: [12, 12] });
  });

  it('positions the external ports of a graph with outside port labels', () => {
    // oracle: site/transform/externalPorts/free-votes-outside-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-outside-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([-182, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([200, 12, 6, 6]);
    expect(at(elk, 'children/0/ports/0/labels/0/x')).toEqual(8);
    expect(at(elk, 'children/0/ports/0/labels/0/width')).toEqual(20);
  });

  it('positions the external ports of a graph with fixed port labels', () => {
    // oracle: site/transform/externalPorts/free-votes-fixed-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-fixed-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([-182, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([200, 12, 6, 6]);
    expect(at(elk, 'children/0/ports/0/labels/0/x')).toEqual(8);
  });

  it('positions the external ports of a graph without port labels', () => {
    // oracle: site/transform/externalPorts/free-votes-no-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-no-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/5')).toEqual([-116, 12, 6, 6]);
  });

  it('positions fixed-side external ports on all four sides', () => {
    // oracle: site/transform/externalPorts/fixed-side-outside-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/fixed-side-outside-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/3')).toEqual([12, -6, 6, 6]);
    expect(geom(elk, 'children/0/ports/4')).toEqual([0, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/5')).toEqual([12, 24, 6, 6]);
    expect(geom(elk, 'children/0/ports/6')).toEqual([12, 0, 6, 6]);
    expect(geom(elk, 'children/0/ports/7')).toEqual([12, 24, 6, 6]);
    expect(geom(elk, 'children/0/ports/8')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([24, 12, 6, 6]);
  });

  it('positions external ports with a preset border offset', () => {
    // oracle: site/transform/externalPorts/fixed-side-inside-labels-border-offset; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/fixed-side-inside-labels-border-offset');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([21, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([24, 12, 6, 6]);
  });

  it('positions external ports of a FIXED_POS graph', () => {
    // oracle: site/transform/externalPorts/fixed-pos-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/fixed-pos-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/3')).toEqual([12, -6, 6, 6]);
    expect(geom(elk, 'children/0/ports/5')).toEqual([12, 24, 6, 6]);
  });

  it('positions external ports of a graph with undefined port constraints', () => {
    // oracle: site/transform/externalPorts/undefined-constraints; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/undefined-constraints');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([-182, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/5')).toEqual([-116, 12, 6, 6]);
    expect(at(elk, 'children/0/layoutOptions/portConstraints')).toEqual('FIXED_POS');
  });

  it('positions external ports that only exist for their inside labels', () => {
    // oracle: site/transform/externalPorts/no-edges-inside-labels; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/no-edges-inside-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([-182, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/5')).toEqual([-42, 12, 6, 6]);
  });

  it('leaves the node of a graph without external ports as it was', () => {
    // oracle: site/transform/externalPorts/no-edges-outside-labels; ElkGraphLayoutTransferrer.java:102-104 (applyLayout)
    const run = runSiteRow('site/transform/externalPorts/no-edges-outside-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([200, 4.8, 6, 6]);
  });

  it('leaves the node of a graph with neither external ports nor labels as it was', () => {
    // oracle: site/transform/externalPorts/no-edges-no-labels; ElkGraphLayoutTransferrer.java:102-104 (applyLayout)
    const run = runSiteRow('site/transform/externalPorts/no-edges-no-labels');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([200, 4.8, 6, 6]);
  });

  it('positions the external ports of a DOWN graph', () => {
    // oracle: site/transform/externalPorts/free-votes-direction-down; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-direction-down');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([12, -56, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([12, 30, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([12, 90, 6, 6]);
  });

  it('positions the external ports of a LEFT graph', () => {
    // oracle: site/transform/externalPorts/free-votes-direction-left; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-direction-left');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([200, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([-176, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([24, 12, 6, 6]);
  });

  it('positions the external ports of an UP graph', () => {
    // oracle: site/transform/externalPorts/free-votes-direction-up; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/free-votes-direction-up');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([12, 20, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([12, -46, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([12, 14, 6, 6]);
  });

  it('positions the external ports of a graph that does not activate inside self loops', () => {
    // oracle: site/transform/externalPorts/self-loops-not-activated; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/externalPorts/self-loops-not-activated');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([24, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/6')).toEqual([-146, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/9')).toEqual([200, 12, 6, 6]);
  });

  it('resizes the target node to its external ports and routes the inside self loop', () => {
    // oracle: site/transform/insideSelfLoops/flat-target; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/insideSelfLoops/flat-target');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([18, 12, 6, 6]);
    expect(geom(elk, 'children/0/ports/2')).toEqual([24, 12, 6, 6]);
    expect(at(elk, 'children/0/layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(section(elk, 'edges/0')).toEqual({ start: [86, 15], bends: [], end: [18, 15] });
    expect(section(elk, 'edges/1')).toBeUndefined();
    expect(geom(elk, 'children/1')).toEqual([0, 0, 80, 60]);
  });

  it('routes sibling edges and node self loops and leaves the inside self loop unrouted', () => {
    // oracle: site/transform/insideSelfLoops/flat-root; ElkGraphLayoutTransferrer.java:233-315 (applyEdgeLayout)
    const run = runSiteRow('site/transform/insideSelfLoops/flat-root');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(section(elk, 'edges/0')).toBeUndefined();
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/4')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
  });

  it('routes the inside self loop of a host with a nested graph', () => {
    // oracle: site/transform/insideSelfLoops/hierarchical-host-include-children; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/insideSelfLoops/hierarchical-host-include-children');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/2')).toEqual({ start: [12, 12], bends: [], end: [95, 25] });
    expect(section(elk, 'edges/3')).toEqual({ start: [95, 55], bends: [], end: [12, 12] });
    expect(section(elk, 'edges/4')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
  });

  it('applies the layout of a graph imported with NODES_AND_EDGES model order', () => {
    // oracle: site/transform/insideSelfLoops/model-order-nodes-and-edges; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-nodes-and-edges');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
  });

  it('applies the layout of a graph imported with MODEL_ORDER cycle breaking', () => {
    // oracle: site/transform/insideSelfLoops/model-order-cycle-breaking; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-cycle-breaking');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
  });

  it('applies the layout of a graph imported with BF_MODEL_ORDER layering', () => {
    // oracle: site/transform/insideSelfLoops/model-order-layering; ElkGraphLayoutTransferrer.java:125-127, 145-147 (applyLayout, nested graphs)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-layering');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([12, 12, 80, 60]);
    expect(section(elk, 'edges/0')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/1')).toEqual({ start: [95, 55], bends: [], end: [15, 25] });
    expect(section(elk, 'edges/4')).toEqual({ start: [95, 25], bends: [], end: [15, 25] });
  });

  it('applies the layout of a flat target imported with PREFER_EDGES model order', () => {
    // oracle: site/transform/insideSelfLoops/model-order-flat-target; ElkGraphLayoutTransferrer.java:105-111 (applyLayout, external ports)
    const run = runSiteRow('site/transform/insideSelfLoops/model-order-flat-target');
    const elk = run.elk;
    expect(geom(elk, 'children/0')).toEqual([0, 0, 24, 24]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([80, 12, 6, 6]);
    expect(section(elk, 'edges/0')).toEqual({ start: [86, 15], bends: [], end: [18, 15] });
  });

  it('leaves a graph without ELK origin as it is', () => {
    // oracle: site/transform/misc/apply-layout-without-origin; ElkGraphLayoutTransferrer.java:68-71 (applyLayout)
    const graph = new LGraph();
    const node = new LNode(graph);
    graph.getLayerlessNodes().push(node);
    node.getSize().x = 10;
    node.getSize().y = 10;
    new ElkGraphTransformer().applyLayout(graph);
    expect([graph.getSize().x, graph.getSize().y]).toEqual([0, 0]);
    expect([
      graph.getPadding().top,
      graph.getPadding().right,
      graph.getPadding().bottom,
      graph.getPadding().left,
    ]).toEqual([0, 0, 0, 0]);
    expect([graph.getOffset().x, graph.getOffset().y]).toEqual([0, 0]);
    expect(graph.getLayerlessNodes()).toEqual([node]);
    expect(graph.getParentNode()).toBeNull();
    expect([node.getPosition().x, node.getPosition().y]).toEqual([0, 0]);
    expect([node.getSize().x, node.getSize().y]).toEqual([10, 10]);
    expect(node.getGraph()).toBe(graph);
    expect(node.getPorts()).toEqual([]);
  });
});
