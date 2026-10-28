// SPDX-License-Identifier: EPL-2.0
// Non-mutating layout application of the ELK graph transfer for the miscellaneous layout features (mission 7a,
// T11c): each case replays a row of test/golden/refs/java/layered-sites.json (group S15) on the port and
// asserts the Java values of the ELK graph that applyLayoutNonMutating builds.
import { describe, expect, it } from 'vitest';
import { at, geom, section } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphLayoutTransferrerNonMutating.misc (oracle site rows)', () => {
  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-undefined-port-side-fixed; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-undefined-port-side-fixed');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([-3, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([28, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-undefined-port-side-zero-size-graph; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-undefined-port-side-zero-size-graph');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-undefined-port-side-free; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-undefined-port-side-free');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
  });

  it('keeps the size of a target with a fixed graph size', () => {
    // oracle: site/transform/nonMutating/misc-node-size-minimum-fixed-graph-size; ElkGraphLayoutTransferrer.java:764-780 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-node-size-minimum-fixed-graph-size');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('resizes the rebuilt target to the minimum size of a free graph', () => {
    // oracle: site/transform/nonMutating/misc-node-size-minimum-free-graph-size; ElkGraphLayoutTransferrer.java:764-780 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-node-size-minimum-free-graph-size');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-bend-points-interactive; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-bend-points-interactive');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [112, 52] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [212, 12] });
    expect(section(elk, 'edges/2')).toEqual({ start: [112, 52], bends: [], end: [212, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([112, 52, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/2')).toEqual([212, 12, 0, 0]);
    expect(geom(elk, 'children/2/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/2/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/2/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/layered-misc-bend-points-interactive; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/layered-misc-bend-points-interactive');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [112, 52] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [212, 12] });
    expect(section(elk, 'edges/2')).toEqual({ start: [112, 52], bends: [], end: [212, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([112, 52, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/2')).toEqual([212, 12, 0, 0]);
    expect(geom(elk, 'children/2/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/2/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/2/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/2/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-bend-points-node-placement-interactive; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-bend-points-node-placement-interactive');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [72, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([72, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-edge-with-section-fixed-side; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-edge-with-section-fixed-side');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [52, 22], bends: [], end: [112, 42] });
    expect(section(elk, 'edges/1')).toEqual({ start: [112, 47], bends: [], end: [52, 17] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([40, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([40, 5, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([112, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 30, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 35, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('starts the rebuilt edge into a descendant at the source port anchor', () => {
    // oracle: site/transform/nonMutating/misc-edge-with-section-descendant; ElkGraphLayoutTransferrer.java:650-665 (applyEdgeLayout, source point)
    const run = runSiteRow('site/transform/nonMutating/misc-edge-with-section-descendant');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 100, 80]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([100, 40, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(section(elk, 'children/0/edges/0')).toEqual({ start: [112, 52], bends: [], end: [42, 42] });
    expect(geom(elk, 'children/0/children/0')).toEqual([42, 42, 0, 0]);
    expect(geom(elk, 'children/0/children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/children/0/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('creates new labels for the edge labels with text and layout', () => {
    // oracle: site/transform/nonMutating/misc-edge-labels; ElkGraphLayoutTransferrer.java:700-725 (applyEdgeLayout, labels)
    const run = runSiteRow('site/transform/nonMutating/misc-edge-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'edges/0/labels/0')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/1')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/2')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then creates new labels for the edge labels with text and layout', () => {
    // oracle: site/transform/nonMutating/layered-misc-edge-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 700-725 (applyEdgeLayout, labels)
    const run = runSiteRow('site/transform/nonMutating/layered-misc-edge-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'edges/0/labels/0')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/1')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'edges/0/labels/2')).toEqual([12, 12, 20, 8]);
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('creates new port labels for ports of a node with non-fixed port labels', () => {
    // oracle: site/transform/nonMutating/misc-port-labels; ElkGraphLayoutTransferrer.java:598-615 (applyNodeLayout, ports)
    const run = runSiteRow('site/transform/nonMutating/misc-port-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([40, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/0/labels/0')).toEqual([8, 0, 20, 8]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/0/ports/1/labels/0')).toEqual([-24, 0, 20, 8]);
  });

  it('moves the nodes into a layer with a long edge dummy first and then creates new port labels for ports of a node with non-fixed port labels', () => {
    // oracle: site/transform/nonMutating/layered-misc-port-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 598-615 (applyNodeLayout, ports)
    const run = runSiteRow('site/transform/nonMutating/layered-misc-port-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([40, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/0/labels/0')).toEqual([8, 0, 20, 8]);
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/0/ports/1/labels/0')).toEqual([-24, 0, 20, 8]);
  });

  it('creates new node labels only for nodes or labels with a label placement', () => {
    // oracle: site/transform/nonMutating/misc-node-labels-and-placement; ElkGraphLayoutTransferrer.java:615-638 (applyNodeLayout, node labels)
    const run = runSiteRow('site/transform/nonMutating/misc-node-labels-and-placement');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/labels/0')).toEqual([0, 0, 20, 8]);
    expect(geom(elk, 'children/1')).toEqual([112, 12, 0, 0]);
  });

  it('copies the computed padding to the rebuilt target when COMPUTE_PADDING is set', () => {
    // oracle: site/transform/nonMutating/misc-parent-node-layout-flags; ElkGraphLayoutTransferrer.java:447-452, 760-800 (applyLayoutNonMutating, applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-parent-node-layout-flags');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(10);
    expect(at(elk, 'height')).toEqual(8);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [4, 3], bends: [], end: [4, 3] });
    expect(geom(elk, 'children/0')).toEqual([4, 3, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([4, 3, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('copies the computed padding to the rebuilt root when COMPUTE_PADDING is set', () => {
    // oracle: site/transform/nonMutating/misc-parent-node-layout-flags-root; ElkGraphLayoutTransferrer.java:447-452, 760-800 (applyLayoutNonMutating, applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-parent-node-layout-flags-root');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then copies the computed padding to the rebuilt root when COMPUTE_PADDING is set', () => {
    // oracle: site/transform/nonMutating/layered-misc-parent-node-layout-flags-root; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 447-452, 760-800 (applyLayoutNonMutating, applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/layered-misc-parent-node-layout-flags-root');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('marks the rebuilt edges of a SPLINES graph', () => {
    // oracle: site/transform/nonMutating/misc-splines-routing-and-target-offset; ElkGraphLayoutTransferrer.java:689-697 (applyEdgeLayout, SPLINES)
    const run = runSiteRow('site/transform/nonMutating/misc-splines-routing-and-target-offset');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then marks the rebuilt edges of a SPLINES graph', () => {
    // oracle: site/transform/nonMutating/layered-misc-splines-routing-and-target-offset; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 689-697 (applyEdgeLayout, SPLINES)
    const run = runSiteRow('site/transform/nonMutating/layered-misc-splines-routing-and-target-offset');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('copies the node size under NETWORK_SIMPLEX when the flexibility allows it', () => {
    // oracle: site/transform/nonMutating/misc-network-simplex-flexibility; ElkGraphLayoutTransferrer.java:586-595 (applyNodeLayout, node size)
    const run = runSiteRow('site/transform/nonMutating/misc-network-simplex-flexibility');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 20, 20]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
  });

  it('moves the nodes into a layer with a long edge dummy first and then copies the node size under NETWORK_SIMPLEX when the flexibility allows it', () => {
    // oracle: site/transform/nonMutating/layered-misc-network-simplex-flexibility; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 586-595 (applyNodeLayout, node size)
    const run = runSiteRow('site/transform/nonMutating/layered-misc-network-simplex-flexibility');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 20, 20]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/2')).toEqual([12, 12, 0, 0]);
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-no-layout-edges; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-no-layout-edges');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('rebuilds the graph and applies the node, port and edge layout to the new elements', () => {
    // oracle: site/transform/nonMutating/misc-no-layout-edges-hierarchical; ElkGraphLayoutTransferrer.java:444-728 (applyLayoutNonMutating, applyNodeLayout, applyEdgeLayout)
    const run = runSiteRow('site/transform/nonMutating/misc-no-layout-edges-hierarchical');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });

  it('creates no port labels for the ports of a node whose port label placement is fixed', () => {
    // oracle: site/transform/nonMutating/port-labels-fixed-placement; ElkGraphLayoutTransferrer.java:606 (applyNodeLayout, port labels)
    const run = runSiteRow('site/transform/nonMutating/port-labels-fixed-placement');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [75, 25], bends: [], end: [12, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([60, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 10, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(at(elk, 'children/0/ports/0/labels')).toBeUndefined();
    expect(at(elk, 'children/0/ports/1/labels')).toBeUndefined();
    expect(at(elk, 'children/0/ports/2/labels')).toBeUndefined();
    expect(at(elk, 'children/0/ports/3/labels')).toBeUndefined();
  });
});
