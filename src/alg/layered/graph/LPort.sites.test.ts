// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { edgeBetween, edgeScenario } from '../../../../test/helpers/lgraph-site-ledge.js';
import { nodeAt, place, xy } from '../../../../test/helpers/lgraph-site-shapes.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LLabel } from './LLabel.js';
import { LPort } from './LPort.js';

/**
 * Cases anchored on the `site/lport/*` rows of test/golden/refs/java/layered-sites.json (JVM oracle, T10). The scenario
 * is the one of the `site/ledge/*` rows (test/helpers/lgraph-site-ledge.ts): layers L0 (a) and L1 (b, c), each node with
 * an output port `*.out` on the EAST and an input port `*.in` on the WEST side.
 */
describe('LPort.setNode (oracle row)', () => {
  // oracle: site/lport/setNode; LPort.java:102, 363
  it('moves the port between the port lists of its nodes', () => {
    const s = edgeScenario();
    const p = place(new LPort(), 0, 0, 4, 6);
    expect([p.getNode(), p.getIndex()]).toEqual([null, -1]);
    p.setNode(s.a);
    expect([p.getNode(), p.getIndex()]).toEqual([s.a, 2]);
    p.setNode(s.b);
    expect([p.getNode(), p.getIndex()]).toEqual([s.b, 2]);
    expect(s.a.getPorts()).toEqual([s.aOut, s.aIn]);
    expect(s.b.getPorts()).toEqual([s.bIn, s.bOut, p]);
    p.setNode(null);
    expect([p.getNode(), p.getIndex()]).toEqual([null, -1]);
    expect(s.b.getPorts()).toEqual([s.bIn, s.bOut]);
  });
});

describe('LPort.setSide (oracle row)', () => {
  // oracle: site/lport/setSide; LPort.java:130 (default anchors per side, explicit anchors kept, null rejected)
  it('sets the default anchor per side unless the anchor was supplied explicitly', () => {
    const s = edgeScenario();
    const q = place(new LPort(), 0, 0, 6, 10);
    q.setNode(s.a);
    const anchorAfter = (side: PortSide): [string, number[]] => {
      q.setSide(side);
      return [q.getSide().name(), xy(q.getAnchor())];
    };
    expect(anchorAfter(PortSide.UNDEFINED)).toEqual(['UNDEFINED', [0, 0]]);
    expect(anchorAfter(PortSide.NORTH)).toEqual(['NORTH', [3, 0]]);
    expect(anchorAfter(PortSide.EAST)).toEqual(['EAST', [6, 5]]);
    expect(anchorAfter(PortSide.SOUTH)).toEqual(['SOUTH', [3, 10]]);
    expect(anchorAfter(PortSide.WEST)).toEqual(['WEST', [0, 5]]);

    q.setExplicitlySuppliedPortAnchor(true);
    q.getAnchor().x = 1;
    q.getAnchor().y = 1;
    expect(q.isExplicitlySuppliedPortAnchor()).toBe(true);
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
      expect(anchorAfter(side)).toEqual([side.name(), [1, 1]]);
    }
    // Java throws NullPointerException; a TypeError stands in (AD-16b), and the side stays
    expect(() => q.setSide(null as unknown as PortSide)).toThrow(TypeError);
    expect(q.getSide()).toBe(PortSide.WEST);
  });
});

describe('LPort edges (oracle row)', () => {
  // oracle: site/lport/edges; LPort.java:238-363
  it('counts, orders and lists the edges and neighbours of each port, including a dangling edge', () => {
    const s = edgeScenario();
    const e1 = edgeBetween(s.aOut, s.bIn);
    const e2 = edgeBetween(s.cOut, s.aOut);
    const e3 = edgeBetween(s.aOut, s.cIn);
    const e4 = edgeBetween(s.bOut, s.aIn);
    const lonely = nodeAt(s.graph, 0, 0, 1, 1);
    const lonelyPort = new LPort();
    lonelyPort.setNode(lonely);
    const danglingIn = edgeBetween(null, s.aIn);

    const facts = (port: LPort): unknown[] => [
      port.getDegree(),
      port.getNetFlow(),
      port.getIncomingEdges(),
      port.getOutgoingEdges(),
      [...port.getConnectedEdges()],
      [...port.getPredecessorPorts()],
      [...port.getSuccessorPorts()],
      [...port.getConnectedPorts()],
      port.getIndex(),
    ];
    expect(facts(s.aOut)).toEqual([
      3,
      -1,
      [e2],
      [e1, e3],
      [e2, e1, e3],
      [s.cOut],
      [s.bIn, s.cIn],
      [s.cOut, s.bIn, s.cIn],
      0,
    ]);
    expect(facts(s.aIn)).toEqual([2, 2, [e4, danglingIn], [], [e4, danglingIn], [s.bOut, null], [], [s.bOut, null], 1]);
    expect(facts(s.bIn)).toEqual([1, 1, [e1], [], [e1], [s.aOut], [], [s.aOut], 0]);
    expect(facts(s.cIn)).toEqual([1, 1, [e3], [], [e3], [s.aOut], [], [s.aOut], 0]);
    expect(facts(lonelyPort)).toEqual([0, 0, [], [], [], [], [], [], 0]);
    expect(s.aIn.isConnectedToExternalNodes()).toBe(true);
    s.aIn.setConnectedToExternalNodes(false);
    expect(s.aIn.isConnectedToExternalNodes()).toBe(false);
  });
});

describe('LPort strings and anchor (oracle rows)', () => {
  // oracle: site/lport/strings; LPort.java:226, 372, 384
  it('names and designates a port by its first label or its index and prints its ends', () => {
    const s = edgeScenario();
    edgeBetween(s.aOut, s.bIn);
    edgeBetween(s.cOut, s.bIn);
    edgeBetween(s.aOut, s.cIn);
    const nameless = new LPort();
    nameless.setNode(s.a);
    const named = new LPort();
    named.setNode(s.a);
    named.getLabels().push(new LLabel('label name'));
    const emptyNamed = new LPort();
    emptyNamed.setNode(s.a);
    emptyNamed.getLabels().push(new LLabel(''));
    const free = new LPort();
    const nullNamed = new LPort();
    // Java's LLabel(String) accepts null, which Guava's isNullOrEmpty treats like ""
    nullNamed.getLabels().push(new LLabel(null as unknown as string));

    const row = (p: LPort): unknown[] => [p.getName(), p.getDesignation(), p.toString()];
    expect(row(s.aOut)).toEqual([null, '0', 'p_0[n_0]']);
    expect(row(s.aIn)).toEqual([null, '1', 'p_1[n_0]']);
    expect(row(s.bIn)).toEqual([null, '0', 'p_0[n_0]']);
    expect(row(s.cIn)).toEqual([null, '0', 'p_0[n_1] << 0[n_0]']);
    expect(row(nameless)).toEqual([null, '2', 'p_2[n_0]']);
    expect(row(named)).toEqual(['label name', 'label name', 'p_label name[n_0]']);
    expect(row(emptyNamed)).toEqual(['', '4', 'p_4[n_0]']);
    expect(row(free)).toEqual([null, '-1', 'p_-1']);
    expect(row(nullNamed)).toEqual([null, '-1', 'p_-1']);

    s.a.getLabels().push(new LLabel('node name'));
    const loopPort = new LPort();
    loopPort.setNode(s.a);
    edgeBetween(loopPort, loopPort);
    expect(s.aOut.toString()).toBe('p_0[n_node name]');
    expect(loopPort.toString()).toBe('p_5[n_node name]');
  });

  // oracle: site/lport/absoluteAnchor; LPort.java:198
  it('getAbsoluteAnchor adds node position, port position and anchor', () => {
    const s = edgeScenario();
    const p1 = place(new LPort(), 1, 2, 4, 4);
    p1.getAnchor().x = 0.5;
    p1.getAnchor().y = 0.25;
    p1.setNode(s.a);
    s.a.getPosition().x = 10;
    s.a.getPosition().y = 20;
    expect(xy(p1.getAbsoluteAnchor())).toEqual([11.5, 22.25]);
  });
});
