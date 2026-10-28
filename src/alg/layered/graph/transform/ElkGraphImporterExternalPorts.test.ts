// SPDX-License-Identifier: EPL-2.0
// External-port import of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S11) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { prop, xy } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterExternalPorts (oracle site rows)', () => {
  it('flags EXTERNAL_PORTS for child and inside self loop edges and HYPEREDGES for a second one', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphImporter.java:672-697 (checkExternalPorts)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS', 'HYPEREDGES']);
    expect(d.graph('g0').layerlessNodes.length).toBe(12);
    expect(d.graph('g0').edges.length).toBe(4);
    expect(d.node('g0/n0').type).toBe('EXTERNAL_PORT');
    expect(d.node('g0/n10').type).toBe('NORMAL');
  });

  it('marks the dummy port of a port with an edge to a non-descendant as connected to external nodes', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphImporter.java:870-888 (isConnectedToExternalNodes)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const d = run.dump;
    expect(d.port('g0/n0/p0').connectedToExternalNodes).toBe(false);
    expect(d.port('g0/n1/p0').connectedToExternalNodes).toBe(false);
    expect(d.port('g0/n4/p0').connectedToExternalNodes).toBe(true);
    expect(d.port('g0/n5/p0').connectedToExternalNodes).toBe(true);
    expect(d.port('g0/n6/p0').connectedToExternalNodes).toBe(true);
    expect(d.port('g0/n3/p0').connectedToExternalNodes).toBe(false);
  });

  it('infers the port border offset: zero for a port at the origin, the calculated offset otherwise', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphImporter.java:733-741 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const d = run.dump;
    expect(prop(d.node('g0/n3'), 'port.borderOffset')).toEqual(0);
    expect(prop(d.node('g0/n0'), 'port.borderOffset')).toEqual(0);
    expect(prop(d.node('g0/n1'), 'port.borderOffset')).toEqual(-6);
    expect(prop(d.node('g0/n2'), 'port.borderOffset')).toEqual(-206);
    expect(prop(d.node('g0/n5'), 'port.borderOffset')).toEqual(-140);
  });

  it('votes the external port side by edge direction, inside self loops reversed', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphImporter.java:822-866 (calculateNetFlow)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const d = run.dump;
    expect(prop(d.node('g0/n0'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n0'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n1'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n1'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n2'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n2'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n3'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n3'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n4'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n4'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n5'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n5'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n6'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n6'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n7'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n7'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n8'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n8'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n9'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n9'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
  });

  it('keeps the labels with text and layout and skips empty and noLayout ones', () => {
    // oracle: site/transform/externalPorts/free-votes-inside-labels; ElkGraphImporter.java:764-770 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/free-votes-inside-labels');
    const d = run.dump;
    expect(d.port('g0/n1/p0').labels.length).toBe(1);
    expect(d.label('g0/n1/p0/l0').text).toBe('lbl pB');
    expect(xy(d.label('g0/n1/p0/l0').size)).toEqual([20, 8]);
    expect(d.port('g0/n0/p0').labels.length).toBe(1);
    expect(d.label('g0/n0/p0/l0').text).toBe('lbl pA');
  });

  it('votes a self loop as an outside loop while inside self loops are not activated', () => {
    // oracle: site/transform/externalPorts/self-loops-not-activated; ElkGraphImporter.java:830-858 (calculateNetFlow)
    const run = runSiteRow('site/transform/externalPorts/self-loops-not-activated');
    const d = run.dump;
    expect(prop(d.node('g0/n6'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n6'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n7'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n7'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n8'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n8'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n9'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n9'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS', 'HYPEREDGES']);
  });

  it('makes a port with an INSIDE label an external port without any edge', () => {
    // oracle: site/transform/externalPorts/no-edges-inside-labels; ElkGraphImporter.java:690-692 (checkExternalPorts)
    const run = runSiteRow('site/transform/externalPorts/no-edges-inside-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS']);
    expect(d.graph('g0').layerlessNodes.length).toBe(12);
    expect(d.graph('g0').edges.length).toBe(0);
    expect(prop(d.node('g0/n0'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n3'), 'port.borderOffset')).toEqual(0);
    expect(prop(d.node('g0/n0'), 'port.borderOffset')).toEqual(-206);
  });

  it('does not make a port with only an OUTSIDE label an external port', () => {
    // oracle: site/transform/externalPorts/no-edges-outside-labels; ElkGraphImporter.java:690 (checkExternalPorts)
    const run = runSiteRow('site/transform/externalPorts/no-edges-outside-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual([]);
    expect(d.graph('g0').layerlessNodes.length).toBe(2);
    expect(d.node('g0/n0').type).toBe('NORMAL');
  });

  it('does not make ports without edges and with INSIDE placement but no labels external', () => {
    // oracle: site/transform/externalPorts/no-edges-no-labels; ElkGraphImporter.java:690 (checkExternalPorts)
    const run = runSiteRow('site/transform/externalPorts/no-edges-no-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual([]);
    expect(d.graph('g0').layerlessNodes.length).toBe(2);
    expect(d.node('g0/n0').type).toBe('NORMAL');
  });

  it('reduces the width of an outside label on an east or west port to the inside part', () => {
    // oracle: site/transform/externalPorts/free-votes-outside-labels; ElkGraphImporter.java:784-787 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/free-votes-outside-labels');
    const d = run.dump;
    expect(d.port('g0/n0/p0').side).toBe('WEST');
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([0, 8]);
    expect(d.port('g0/n1/p0').side).toBe('EAST');
    expect(xy(d.label('g0/n1/p0/l0').size)).toEqual([0, 8]);
    expect(prop(d.graph('g0'), 'portLabels.placement')).toEqual(['OUTSIDE']);
    expect(prop(d.node('g0/n0'), 'portLabels.placement')).toEqual(['OUTSIDE']);
  });

  it('takes the inside part of an outside label from computeInsidePart when the port labels are fixed', () => {
    // oracle: site/transform/externalPorts/free-votes-fixed-labels; ElkGraphImporter.java:775-781 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/free-votes-fixed-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'portLabels.placement')).toEqual(undefined);
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([0, 8]);
    expect(xy(d.label('g0/n1/p0/l0').size)).toEqual([0, 8]);
    expect(xy(d.label('g0/n0/p0/l0').pos)).toEqual([8, -1]);
    expect(xy(d.label('g0/n1/p0/l0').pos)).toEqual([-24, -1]);
  });

  it('creates dummy ports without labels when the ports have none', () => {
    // oracle: site/transform/externalPorts/free-votes-no-labels; ElkGraphImporter.java:764-770 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/free-votes-no-labels');
    const d = run.dump;
    expect(d.port('g0/n0/p0').labels.length).toBe(0);
    expect(d.port('g0/n9/p0').labels.length).toBe(0);
    expect(xy(d.node('g0/n0').size)).toEqual([0, 6]);
    expect(xy(d.node('g0/n2').size)).toEqual([206, 6]);
  });

  it('reduces the height of an outside label on a north or south port to the inside part', () => {
    // oracle: site/transform/externalPorts/fixed-side-outside-labels; ElkGraphImporter.java:789-792 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/fixed-side-outside-labels');
    const d = run.dump;
    expect(d.port('g0/n3/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n3/p0/l0').size)).toEqual([20, 0]);
    expect(xy(d.node('g0/n3').size)).toEqual([6, 0]);
    expect(d.port('g0/n5/p0').side).toBe('NORTH');
    expect(xy(d.label('g0/n5/p0/l0').size)).toEqual([20, 0]);
    expect(xy(d.node('g0/n5').size)).toEqual([6, 0]);
    expect(d.port('g0/n0/p0').side).toBe('WEST');
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([0, 8]);
  });

  it('sizes the labels of north, south, east and west ports under FIXED_POS and outside labels', () => {
    // oracle: site/transform/externalPorts/fixed-pos-labels; ElkGraphImporter.java:775-792 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/fixed-pos-labels');
    const d = run.dump;
    expect(d.port('g0/n3/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n3/p0/l0').size)).toEqual([20, 0]);
    expect(d.port('g0/n6/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n6/p0/l0').size)).toEqual([20, 0]);
    expect(d.port('g0/n7/p0').side).toBe('NORTH');
    expect(xy(d.label('g0/n7/p0/l0').size)).toEqual([20, 0]);
    expect(d.port('g0/n0/p0').side).toBe('WEST');
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([0, 8]);
    expect(prop(d.graph('g0'), 'portConstraints')).toEqual('FIXED_POS');
  });

  it('keeps a port border offset that is already set and infers the others', () => {
    // oracle: site/transform/externalPorts/fixed-side-inside-labels-border-offset; ElkGraphImporter.java:733 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/fixed-side-inside-labels-border-offset');
    const d = run.dump;
    expect(prop(d.node('g0/n0'), 'port.borderOffset')).toEqual(-3);
    expect(xy(d.node('g0/n0').size)).toEqual([3, 6]);
    expect(prop(d.node('g0/n1'), 'port.borderOffset')).toEqual(-6);
    expect(prop(d.node('g0/n2'), 'port.borderOffset')).toEqual(0);
    expect(xy(d.node('g0/n3').size)).toEqual([6, 0]);
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([20, 8]);
    expect(prop(d.graph('g0'), 'portConstraints')).toEqual('FIXED_SIDE');
  });

  it('imports external ports of a graph whose port constraints are UNDEFINED like a FREE graph', () => {
    // oracle: site/transform/externalPorts/undefined-constraints; ElkGraphImporter.java:720-731 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/undefined-constraints');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'portConstraints')).toEqual('UNDEFINED');
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['EXTERNAL_PORTS', 'HYPEREDGES']);
    expect(prop(d.node('g0/n0'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n1'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n0'), 'portConstraints')).toEqual('FIXED_POS');
    expect(prop(d.node('g0/n2'), 'port.borderOffset')).toEqual(-206);
  });

  it('places the voted external ports of a DOWN graph on the north and south sides', () => {
    // oracle: site/transform/externalPorts/free-votes-direction-down; ElkGraphImporter.java:822-866 (calculateNetFlow)
    const run = runSiteRow('site/transform/externalPorts/free-votes-direction-down');
    const d = run.dump;
    expect(prop(d.node('g0/n0'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n0/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n1'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n1/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n2'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n2/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n3'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n3/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n4'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n4/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n5'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n5/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n6'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n6/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n7'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n7/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n8'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n8/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n9'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n9/p0').side).toBe('SOUTH');
    expect(prop(d.graph('g0'), 'direction')).toEqual('DOWN');
    expect(xy(d.node('g0/n0').size)).toEqual([6, 80]);
    expect(prop(d.node('g0/n0'), 'port.borderOffset')).toEqual(-80);
  });

  it('places the voted external ports of a LEFT graph on the east and west sides', () => {
    // oracle: site/transform/externalPorts/free-votes-direction-left; ElkGraphImporter.java:822-866 (calculateNetFlow)
    const run = runSiteRow('site/transform/externalPorts/free-votes-direction-left');
    const d = run.dump;
    expect(prop(d.node('g0/n0'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n0'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n1'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n1'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n2'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n2'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n3'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n3'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n4'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n4'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n5'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n5'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n6'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n6'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.node('g0/n7'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n7'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n8'), 'externalPortSide')).toEqual('WEST');
    expect(prop(d.node('g0/n8'), 'layered.layering.layerConstraint')).toEqual('FIRST_SEPARATE');
    expect(prop(d.node('g0/n9'), 'externalPortSide')).toEqual('EAST');
    expect(prop(d.node('g0/n9'), 'layered.layering.layerConstraint')).toEqual('LAST_SEPARATE');
    expect(prop(d.graph('g0'), 'direction')).toEqual('LEFT');
    expect(xy(d.node('g0/n0').size)).toEqual([206, 6]);
  });

  it('places the voted external ports of an UP graph on the north and south sides', () => {
    // oracle: site/transform/externalPorts/free-votes-direction-up; ElkGraphImporter.java:822-866 (calculateNetFlow)
    const run = runSiteRow('site/transform/externalPorts/free-votes-direction-up');
    const d = run.dump;
    expect(prop(d.node('g0/n0'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n0/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n1'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n1/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n2'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n2/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n3'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n3/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n4'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n4/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n5'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n5/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n6'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n6/p0').side).toBe('NORTH');
    expect(prop(d.node('g0/n7'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n7/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n8'), 'externalPortSide')).toEqual('NORTH');
    expect(d.port('g0/n8/p0').side).toBe('SOUTH');
    expect(prop(d.node('g0/n9'), 'externalPortSide')).toEqual('SOUTH');
    expect(d.port('g0/n9/p0').side).toBe('NORTH');
    expect(prop(d.graph('g0'), 'direction')).toEqual('UP');
    expect(xy(d.node('g0/n0').size)).toEqual([6, 26]);
    expect(prop(d.node('g0/n0'), 'port.borderOffset')).toEqual(-26);
  });

  it('takes the inside part of outside labels from computeInsidePart when the port label placement is empty', () => {
    // oracle: site/transform/externalPorts/fixed-placement-empty-outside-labels; ElkGraphImporter.java:775-792 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/fixed-placement-empty-outside-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'portLabels.placement')).toEqual([]);
    expect(d.port('g0/n0/p0').side).toBe('WEST');
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([0, 8]);
    expect(d.port('g0/n1/p0').side).toBe('EAST');
    expect(xy(d.label('g0/n1/p0/l0').size)).toEqual([0, 8]);
    expect(d.port('g0/n3/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n3/p0/l0').size)).toEqual([20, 1]);
    expect(d.port('g0/n5/p0').side).toBe('NORTH');
    expect(xy(d.label('g0/n5/p0/l0').size)).toEqual([20, 1]);
    expect(d.port('g0/n6/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n6/p0/l0').size)).toEqual([20, 1]);
    expect(d.port('g0/n7/p0').side).toBe('NORTH');
    expect(xy(d.label('g0/n7/p0/l0').size)).toEqual([20, 1]);
  });

  it('takes the inside part of outside labels from computeInsidePart when the placement only says NEXT_TO_PORT_IF_POSSIBLE', () => {
    // oracle: site/transform/externalPorts/fixed-placement-next-to-port-outside-labels; ElkGraphImporter.java:775-792 (transformExternalPort)
    const run = runSiteRow('site/transform/externalPorts/fixed-placement-next-to-port-outside-labels');
    const d = run.dump;
    expect(prop(d.graph('g0'), 'portLabels.placement')).toEqual(['NEXT_TO_PORT_IF_POSSIBLE']);
    expect(d.port('g0/n0/p0').side).toBe('WEST');
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([0, 8]);
    expect(d.port('g0/n1/p0').side).toBe('EAST');
    expect(xy(d.label('g0/n1/p0/l0').size)).toEqual([0, 8]);
    expect(d.port('g0/n3/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n3/p0/l0').size)).toEqual([20, 1]);
    expect(d.port('g0/n5/p0').side).toBe('NORTH');
    expect(xy(d.label('g0/n5/p0/l0').size)).toEqual([20, 1]);
    expect(d.port('g0/n6/p0').side).toBe('SOUTH');
    expect(xy(d.label('g0/n6/p0/l0').size)).toEqual([20, 1]);
    expect(d.port('g0/n7/p0').side).toBe('NORTH');
    expect(xy(d.label('g0/n7/p0/l0').size)).toEqual([20, 1]);
  });
});
