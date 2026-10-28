// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { edgeBetween, edgeScenario } from '../../../../test/helpers/lgraph-site-ledge.js';
import { labelAt } from '../../../../test/helpers/lgraph-site-shapes.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LEdge } from './LEdge.js';
import { LLabel } from './LLabel.js';
import { LNode } from './LNode.js';
import { LPort } from './LPort.js';

/**
 * Cases anchored on the `site/ledge/*` rows of test/golden/refs/java/layered-sites.json (JVM oracle, T10). The scenarios
 * (test/helpers/lgraph-site-ledge.ts) are built here with the TS API; the literals are the row values.
 */
/** Expects every named port to hold exactly the given [incoming, outgoing] edges (none if not given). */
function expectLists(ports: Record<string, LPort>, expected: Record<string, [LEdge[], LEdge[]]>): void {
  for (const [name, port] of Object.entries(ports)) {
    const [incoming, outgoing] = expected[name] ?? [[], []];
    expect([name, port.getIncomingEdges(), port.getOutgoingEdges()]).toEqual([name, incoming, outgoing]);
  }
}

describe('LEdge endpoints (oracle row)', () => {
  // oracle: site/ledge/endpoints; LEdge.java:112-187
  it('keeps the port edge lists in step with the endpoints, including indexed insertion', () => {
    const s = edgeScenario();
    const ports = { aOut: s.aOut, aIn: s.aIn, bIn: s.bIn, bOut: s.bOut, cIn: s.cIn, cOut: s.cOut };
    const e = new LEdge();
    expect([e.getSource(), e.getTarget()]).toEqual([null, null]);

    e.setSource(s.aOut);
    e.setTarget(s.bIn);
    expectLists(ports, { aOut: [[], [e]], bIn: [[e], []] });
    e.setSource(s.cOut);
    e.setTarget(s.cIn);
    expectLists(ports, { cOut: [[], [e]], cIn: [[e], []] });
    e.setSource(null);
    e.setTarget(null);
    expectLists(ports, {});
    expect([e.getSource(), e.getTarget()]).toEqual([null, null]);

    e.setSource(s.aOut);
    const f = edgeBetween(s.aOut, s.bIn);
    const g = edgeBetween(s.aOut, s.bIn);
    e.setTargetAndInsertAtIndex(s.bIn, 0);
    expectLists(ports, { aOut: [[], [e, f, g]], bIn: [[e, f, g], []] });
    e.setTargetAndInsertAtIndex(s.bIn, 2);
    expectLists(ports, { aOut: [[], [e, f, g]], bIn: [[f, g, e], []] });
    e.setTargetAndInsertAtIndex(s.cIn, 0);
    expectLists(ports, { aOut: [[], [e, f, g]], bIn: [[f, g], []], cIn: [[e], []] });
    // a bad index leaves the edge unlinked from the old target but already pointing at the new one
    expect(() => e.setTargetAndInsertAtIndex(s.bIn, 9)).toThrow(IndexOutOfBoundsException);
    expect(() => e.setTargetAndInsertAtIndex(s.bIn, 9)).toThrow('Index: 9, Size: 2');
    expect(e.getTarget()).toBe(s.bIn);
    expectLists(ports, { aOut: [[], [e, f, g]], bIn: [[f, g], []] });
    e.setTargetAndInsertAtIndex(null, 0);
    expect(e.getTarget()).toBeNull();
    expectLists(ports, { aOut: [[], [e, f, g]], bIn: [[f, g], []] });
  });
});

describe('LEdge.reverse (oracle rows)', () => {
  const POINTS = (edge: LEdge): number[][] => [...edge.getBendPoints()].map((v) => [v.x, v.y]);
  const placements = (labels: LLabel[]): string[] =>
    labels.map((l) => l.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT).name());

  // [adaptPorts, INPUT_COLLECT on b.in, OUTPUT_COLLECT on a.out, source after the first reverse, target, extra ports on a, on b]
  // 'new' is the collector port created by the reverse on the opposite node; the second reverse restores the original ports
  const ROWS: [string, boolean, boolean, boolean, 'bIn' | 'new', 'aOut' | 'new', number, number][] = [
    ['plain-collect-none', false, false, false, 'bIn', 'aOut', 0, 0],
    ['plain-collect-input', false, true, false, 'bIn', 'aOut', 0, 0],
    ['plain-collect-output', false, false, true, 'bIn', 'aOut', 0, 0],
    ['plain-collect-both', false, true, true, 'bIn', 'aOut', 0, 0],
    ['adaptPorts-collect-none', true, false, false, 'bIn', 'aOut', 0, 0],
    ['adaptPorts-collect-input', true, true, false, 'new', 'aOut', 0, 1],
    ['adaptPorts-collect-output', true, false, true, 'bIn', 'new', 1, 0],
    ['adaptPorts-collect-both', true, true, true, 'new', 'new', 1, 1],
  ];

  // oracle: site/ledge/reverse-{plain,adaptPorts}-collect-{none,input,output,both}; LEdge.java:58-110
  it.each(ROWS)(
    'site/ledge/reverse-%s',
    (_row, adaptPorts, inputCollect, outputCollect, source, target, aExtra, bExtra) => {
      const s = edgeScenario();
      s.bIn.setProperty(InternalProperties.INPUT_COLLECT, inputCollect);
      s.aOut.setProperty(InternalProperties.OUTPUT_COLLECT, outputCollect);
      const e = edgeBetween(s.aOut, s.bIn);
      e.getBendPoints().add(1, 2);
      e.getBendPoints().add(3, 4);
      const labels = [
        [labelAt('tail', 0, 0, 1, 1), EdgeLabelPlacement.TAIL],
        [labelAt('head', 0, 0, 1, 1), EdgeLabelPlacement.HEAD],
        [labelAt('center', 0, 0, 1, 1), EdgeLabelPlacement.CENTER],
      ] as const;
      for (const [label, placement] of labels) {
        label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, placement);
        e.getLabels().push(label);
      }

      e.reverse(s.graph, adaptPorts);
      // the collector ports reverse creates sit behind the original two ports of their node
      expect(e.getSource()).toBe(source === 'bIn' ? s.bIn : s.b.getPorts()[2]);
      expect(e.getTarget()).toBe(target === 'aOut' ? s.aOut : s.a.getPorts()[2]);
      expect([s.a.getPorts().length - 2, s.b.getPorts().length - 2]).toEqual([aExtra, bExtra]);
      expect(e.getProperty(InternalProperties.REVERSED)).toBe(true);
      expect(POINTS(e)).toEqual([
        [3, 4],
        [1, 2],
      ]);
      expect(placements(e.getLabels())).toEqual(['HEAD', 'TAIL', 'CENTER']);

      e.reverse(s.graph, adaptPorts);
      expect(e.getSource()).toBe(s.aOut);
      expect(e.getTarget()).toBe(s.bIn);
      expect([s.a.getPorts().length - 2, s.b.getPorts().length - 2]).toEqual([aExtra, bExtra]);
      expect(e.getProperty(InternalProperties.REVERSED)).toBe(false);
      expect(POINTS(e)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    },
  );
});

describe('LEdge queries and strings (oracle rows)', () => {
  // oracle: site/ledge/reverse-unlinked; LEdge.java:58-110 (with adaptPorts false the null ports are never dereferenced)
  it('reversing an edge without endpoints completes and leaves it without endpoints', () => {
    const s = edgeScenario();
    edgeBetween(s.aOut, s.bIn);
    const loose = new LEdge();
    loose.reverse(s.graph, false);
    expect([loose.getSource(), loose.getTarget()]).toEqual([null, null]);
  });

  // oracle: site/ledge/queries; LEdge.java:189-260
  it('isSelfLoop and isInLayerEdge decide by the end nodes and their layers; getOther rejects strangers', () => {
    const s = edgeScenario();
    const e = edgeBetween(s.aOut, s.bIn);
    const same = edgeBetween(s.bOut, s.bIn);
    const sameLayer = edgeBetween(s.bOut, s.cIn);
    const noSource = edgeBetween(null, s.bIn);
    const noTarget = edgeBetween(s.aOut, null);
    const none = new LEdge();
    const layerless1 = new LNode(s.graph);
    const layerless2 = new LNode(s.graph);
    const [lp1, lp2] = [new LPort(), new LPort()];
    lp1.setNode(layerless1);
    lp2.setNode(layerless2);
    const layerlessEdge = edgeBetween(lp1, lp2);
    const orphanPort = new LPort();
    const orphanLoop = edgeBetween(orphanPort, orphanPort);

    expect(
      [e, same, sameLayer, noSource, noTarget, none, layerlessEdge, orphanLoop].map((x) => x.isSelfLoop()),
    ).toEqual([false, true, false, false, false, false, false, false]);
    expect([e, same, sameLayer, layerlessEdge].map((x) => x.isInLayerEdge())).toEqual([false, false, true, true]);
    expect(e.getOther(s.aOut)).toBe(s.bIn);
    expect(e.getOther(s.bIn)).toBe(s.aOut);
    const message = "'port' must be either the source port or target port of the edge.";
    expect(() => e.getOther(s.cIn)).toThrow(IllegalArgumentException);
    expect(() => e.getOther(s.cIn)).toThrow(message);
    // Java's getOther(null) matches the LPort overload and fails the same way
    expect(() => e.getOther(null as unknown as LPort)).toThrow(message);
    expect(e.getOther(s.a)).toBe(s.b);
    expect(e.getOther(s.b)).toBe(s.a);
    expect(() => e.getOther(s.c)).toThrow(IllegalArgumentException);
    expect(() => e.getOther(s.c)).toThrow("'node' must either be the source node or target node of the edge.");
  });

  // oracle: site/ledge/strings; LEdge.java:262-290
  it('prints the edge with its label or designation, and the designations and nodes of both ends', () => {
    const s = edgeScenario();
    s.aOut.getLabels().push(new LLabel('port name'));
    s.a.getLabels().push(new LLabel('node name'));
    const plain = edgeBetween(s.aOut, s.bIn);
    const labelled = edgeBetween(s.aOut, s.cIn);
    labelled.getLabels().push(new LLabel('caption'));
    const emptyLabel = edgeBetween(s.aIn, s.cIn);
    emptyLabel.getLabels().push(new LLabel(''));
    const loose = new LEdge();
    const half = new LEdge();
    half.setSource(s.aOut);
    expect(plain.toString()).toBe('e_ port name[n_node name] -> 0[n_0]');
    expect(plain.getDesignation()).toBeNull();
    expect(labelled.toString()).toBe('e_caption port name[n_node name] -> 0[n_1]');
    expect(labelled.getDesignation()).toBe('caption');
    expect(emptyLabel.toString()).toBe('e_ 1[n_node name] -> 0[n_1]');
    expect(emptyLabel.getDesignation()).toBeNull();
    expect([loose.toString(), loose.getDesignation()]).toEqual(['e_', null]);
    expect([half.toString(), half.getDesignation()]).toEqual(['e_', null]);
  });
});
