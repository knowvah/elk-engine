// SPDX-License-Identifier: EPL-2.0
// Proof of RootProcessor (mission 8a, T14): `process` from the recorded FanProcessor-preceding state to the recorded RootProcessor stop for
// every row of the ref that runs it, plus Java-traced hand cases (RootProcessor.java:41-86; expectations from the Java source).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RootProcessor } from './RootProcessor.js';

describe('RootProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the RootProcessor stop of every transition, for no, one and several roots', { timeout: 60_000 }, () => {
    const replay = replayStep('RootProcessor', () => new RootProcessor());
    expect(replay.total).toBe(89);
    expect(replay.refused).toBe(0);
    expect(replay.replayed).toHaveLength(89);
    const labels = replay.replayed.map((r) =>
      r.graph
        .getNodes()
        .toArray()
        .filter((n) => n.getProperty(InternalProperties.DUMMY))
        .map((n) => n.getLabel()),
    );
    expect(labels.some((l) => l.length === 0)).toBe(true);
    expect(labels.some((l) => l[0] === 'SUPER_ROOT')).toBe(true);
    expect(labels.some((l) => l[0] === 'DUMMY_ROOT')).toBe(true);
  });
});

describe('RootProcessor hand cases', () => {
  const rootsOf = (g: ReturnType<typeof graphOf>['g']): (string | null)[] =>
    g
      .getNodes()
      .toArray()
      .filter((n) => n.getProperty(InternalProperties.ROOT))
      .map((n) => n.getLabel());

  it('an empty graph gets a DUMMY_ROOT marked ROOT and DUMMY (case 0)', () => {
    const { g } = graphOf(0, []);
    runOn(new RootProcessor(), g);
    expect(g.getNodes().size()).toBe(1);
    const dummy = g.getNodes().get(0);
    expect([dummy.getLabel(), dummy.id, dummy.getProperty(InternalProperties.ROOT)]).toEqual(['DUMMY_ROOT', 0, true]);
    expect(dummy.getProperty(InternalProperties.DUMMY)).toBe(true);
  });

  it('a single root is only marked ROOT (case 1)', () => {
    const { g, nodes } = graphOf(2, [[0, 1]]);
    runOn(new RootProcessor(), g);
    expect(g.getNodes().size()).toBe(2);
    expect(rootsOf(g)).toEqual(['n0']);
    expect(nodes[1]!.getProperty(InternalProperties.ROOT)).toBe(false);
  });

  it('several roots become children of a SUPER_ROOT appended to the graph (default)', () => {
    const { g, nodes } = graphOf(3, [[0, 2]]);
    runOn(new RootProcessor(), g);
    const superRoot = g.getNodes().get(3);
    expect(superRoot.getLabel()).toBe('SUPER_ROOT');
    expect(rootsOf(g)).toEqual(['SUPER_ROOT']);
    expect(superRoot.getProperty(InternalProperties.DUMMY)).toBe(true);
    expect([...superRoot.getChildren()]).toEqual([nodes[0], nodes[1]]);
    expect(nodes[0]!.getProperty(InternalProperties.ROOT)).toBe(false);
    expect(nodes[1]!.getProperty(InternalProperties.ROOT)).toBe(false);
  });

  it('a reused processor starts from an empty root list', () => {
    const processor = new RootProcessor();
    runOn(processor, graphOf(3, []).g);
    const second = graphOf(2, [[0, 1]]).g;
    runOn(processor, second);
    expect(second.getNodes().size()).toBe(2);
    expect(rootsOf(second)).toEqual(['n0']);
  });
});
