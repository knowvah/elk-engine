// SPDX-License-Identifier: EPL-2.0
// Structural tests of `normalise` (GraphConfigurator.java:99-136): what it sets, what it leaves, and the seed-0 stop.
import { describe, expect, it } from 'vitest';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { Spacings } from '../../src/alg/layered/options/Spacings.js';
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { Random } from '../../src/java/util/Random.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { importRow, type PhaseRow } from './layered-phase-replay-rows.js';

const SEED_ID = 'org.eclipse.elk.randomSeed';
const SPACING_ID = 'org.eclipse.elk.spacing.edgeEdge';
const MIN_EDGE_SPACING = 2;
const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, ports: [{ id: 'a0' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};

function row(options: Record<string, unknown> = {}): PhaseRow {
  return {
    id: 'scenarios/normalise',
    group: 'scenarios',
    input: { elk: GRAPH },
    target: null,
    options,
    steps: [],
    prefix: null,
    expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [] },
  };
}

describe('normalise', () => {
  it('clamps an edge spacing below 2 to 2 and leaves a larger one alone', () => {
    const small = importRow(row({ [SPACING_ID]: { t: 'double', v: '0.5' } })).graph;
    normalise(small);
    expect(small.getProperty(LayeredOptions.SPACING_EDGE_EDGE)).toBe(MIN_EDGE_SPACING);
    const large = importRow(row({ [SPACING_ID]: { t: 'double', v: '9' } })).graph;
    normalise(large);
    expect(large.getProperty(LayeredOptions.SPACING_EDGE_EDGE)).toBe(9);
  });

  it('resolves an undefined DIRECTION and keeps a set one', () => {
    const { graph } = importRow(row());
    normalise(graph);
    expect(graph.getProperty(LayeredOptions.DIRECTION)).not.toBe(Direction.UNDEFINED);
    const down = importRow(row({ 'org.eclipse.elk.direction': { t: 'enum', c: 'Direction', n: 'DOWN' } })).graph;
    normalise(down);
    expect(down.getProperty(LayeredOptions.DIRECTION)).toBe(Direction.DOWN);
  });

  it('seeds RANDOM from the seed option', () => {
    const { graph } = importRow(row({ [SEED_ID]: { t: 'int', v: 42 } }));
    normalise(graph);
    expect(graph.getProperty(InternalProperties.RANDOM).nextInt()).toBe(new Random(42).nextInt());
  });

  it('throws for seed 0 (B4: a clock seed cannot be replayed)', () => {
    const { graph } = importRow(row({ [SEED_ID]: { t: 'int', v: 0 } }));
    expect(() => normalise(graph)).toThrow(/RANDOM_SEED 0/);
  });

  it('defaults favor-straightness from the edge routing', () => {
    const plain = importRow(row()).graph;
    normalise(plain);
    expect(plain.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)).toBe(
      plain.getProperty(LayeredOptions.EDGE_ROUTING) === EdgeRouting.ORTHOGONAL,
    );
    const set = importRow(
      row({ 'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': { t: 'bool', v: false } }),
    ).graph;
    normalise(set);
    expect(set.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)).toBe(false);
  });

  it('copies the port constraints of every node and installs the spacings', () => {
    const { graph } = importRow(row());
    normalise(graph);
    for (const node of graph.getLayerlessNodes()) {
      expect(node.getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS)).toBe(
        node.getProperty(LayeredOptions.PORT_CONSTRAINTS),
      );
    }
    expect(graph.getLayerlessNodes().length).toBe(2);
    expect(graph.getProperty(InternalProperties.SPACINGS)).toBeInstanceOf(Spacings);
  });
});
