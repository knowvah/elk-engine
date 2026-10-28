// SPDX-License-Identifier: EPL-2.0
// Non-mutating layout application of the ELK graph transfer for graphs with external ports (mission 7a, T11c):
// each case replays a row of test/golden/refs/java/layered-sites.json (group S15) on the port and asserts the
// Java values of the ELK graph that applyLayoutNonMutating builds.
import { describe, expect, it } from 'vitest';
import { at, geom, section } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphLayoutTransferrerNonMutating (oracle site rows)', () => {
  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-inside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-inside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/layered-externalPorts-free-votes-inside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/layered-externalPorts-free-votes-inside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-outside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-outside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-fixed-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-fixed-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-no-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-no-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-fixed-side-outside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-fixed-side-outside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('moves the nodes into a layer with a long edge dummy first and then leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/layered-externalPorts-fixed-side-outside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/layered-externalPorts-fixed-side-outside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-fixed-side-inside-labels-border-offset; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-fixed-side-inside-labels-border-offset');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-fixed-pos-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-fixed-pos-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-undefined-constraints; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-undefined-constraints');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-no-edges-inside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-no-edges-inside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-no-edges-outside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-no-edges-outside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-no-edges-no-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-no-edges-no-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-direction-down; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-direction-down');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [15, 12] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [15, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('SOUTH');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('SOUTH');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('NORTH');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('NORTH');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-direction-left; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-direction-left');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('EAST');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-free-votes-direction-up; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-free-votes-direction-up');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [15, 12] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [15, 12] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('NORTH');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('NORTH');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('SOUTH');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('SOUTH');
  });

  it('leaves the external port dummies out of the node list and fixes the port constraints of the rebuilt graph', () => {
    // oracle: site/transform/nonMutating/externalPorts-self-loops-not-activated; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-self-loops-not-activated');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list for an empty port label placement', () => {
    // oracle: site/transform/nonMutating/externalPorts-fixed-placement-empty-outside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-fixed-placement-empty-outside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });

  it('leaves the external port dummies out of the node list for a NEXT_TO_PORT_IF_POSSIBLE placement', () => {
    // oracle: site/transform/nonMutating/externalPorts-fixed-placement-next-to-port-outside-labels; ElkGraphLayoutTransferrer.java:536-570 (collectNodes), 760-800 (applyParentNodeLayout)
    const run = runSiteRow('site/transform/nonMutating/externalPorts-fixed-placement-next-to-port-outside-labels');
    const elk = run.elk;
    expect(at(elk, 'x')).toEqual(0);
    expect(at(elk, 'y')).toEqual(0);
    expect(at(elk, 'width')).toEqual(24);
    expect(at(elk, 'height')).toEqual(24);
    expect(at(elk, 'layoutOptions/portConstraints')).toEqual('FIXED_POS');
    expect(at(elk, 'layoutOptions/nodeSize.constraints')).toEqual('[]');
    expect(at(elk, 'layoutOptions/nodeSize.options')).toEqual('[DEFAULT_MINIMUM_SIZE]');
    expect(section(elk, 'edges/0')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(section(elk, 'edges/1')).toEqual({ start: [12, 12], bends: [], end: [12, 15] });
    expect(geom(elk, 'children/0')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/0/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/0/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/0/ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(geom(elk, 'children/1')).toEqual([12, 12, 0, 0]);
    expect(geom(elk, 'children/1/ports/0')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(geom(elk, 'children/1/ports/1')).toEqual([0, 0, 0, 0]);
    expect(at(elk, 'children/1/ports/1/layoutOptions/port.side')).toEqual('WEST');
  });
});
