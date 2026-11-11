// SPDX-License-Identifier: EPL-2.0
// Proof of Untreeifyer (mission 8a, T14): `process` from the recorded GraphBoundsProcessor stop to the recorded Untreeifyer stop for every row
// of the ref that runs it, plus Java-traced hand cases (Untreeifyer.java:33-50).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { TEdge } from '../graph/TEdge.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { Untreeifyer } from './Untreeifyer.js';

describe('Untreeifyer.process against the recorded stops (acceptance)', () => {
  it('equals the Untreeifyer stop of every transition, incl. graphs with removed edges', { timeout: 60_000 }, () => {
    const replay = replayStep('Untreeifyer', () => new Untreeifyer());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
    const withRemoved = replay.replayed.filter(
      (r) => r.graph.getProperty(InternalProperties.REMOVABLE_EDGES).size() > 0,
    );
    expect(withRemoved.length).toBeGreaterThan(0);
  });
});

describe('Untreeifyer hand cases', () => {
  it('re-adds each removable edge at the end of its source outgoing and target incoming list', () => {
    const { g, nodes, es } = graphOf(3, [
      [0, 1],
      [1, 2],
    ]);
    // edge n2 -> n0 was removed from both lists by the treeifier
    const removed = new TEdge(nodes[2]!, nodes[0]!);
    g.setProperty(InternalProperties.REMOVABLE_EDGES, new LinkedList([removed]));
    runOn(new Untreeifyer(), g);
    expect([...nodes[2]!.getOutgoingEdges()]).toEqual([removed]);
    expect([...nodes[0]!.getIncomingEdges()]).toEqual([removed]);
    expect([...nodes[0]!.getOutgoingEdges()]).toEqual([es[0]]);
    expect([...nodes[1]!.getIncomingEdges()]).toEqual([es[0]]);
  });

  it('does nothing when no edge was removed', () => {
    const { g, nodes } = graphOf(2, [[0, 1]]);
    runOn(new Untreeifyer(), g);
    expect(nodes[0]!.getOutgoingEdges().size()).toBe(1);
    expect(nodes[1]!.getIncomingEdges().size()).toBe(1);
  });
});
