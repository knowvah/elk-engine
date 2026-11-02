// SPDX-License-Identifier: EPL-2.0
// Structural tests of the placement prefix replay: which factories it asks for, in which order, and its errors.
import { describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import type { Factories } from './layered-phase-replay-ops.js';
import { runPlacementPrefix } from './layered-placement-replay-ops.js';
import { P4_NODE_PLACEMENT, type PlacementRow } from './layered-placement-replay-rows.js';

const noop = { process: () => undefined } as unknown as ILayoutProcessor<LGraph>;

function recording(): { factories: Factories; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    factories: {
      createProcessor: (name) => {
        calls.push(`processor ${name}`);
        return noop;
      },
      createPhase: (phase, strategy) => {
        calls.push(`phase ${phase} ${strategy}`);
        return noop;
      },
    },
  };
}

function rowWith(prefix: string[] | null): PlacementRow {
  return {
    id: 'models/synthetic',
    group: 'models',
    input: { elk: { id: 'root', children: [{ id: 'a', width: 10, height: 10 }] } },
    target: null,
    options: {},
    steps: null,
    prefix,
    expected: {
      layers: [],
      layerless: [],
      hidden: [],
      edges: [],
      changed: [],
      ports: {},
      geometry: { nodes: {}, layers: [] },
    },
  };
}

describe('runPlacementPrefix', () => {
  it('asks the factories for each entry in order: phases P1 to P4 and the five 7d processors', () => {
    const entries = [
      'P1_CYCLE_BREAKING/GREEDY',
      'P2_LAYERING/NETWORK_SIMPLEX',
      'P3_NODE_ORDERING/LAYER_SWEEP',
      'IN_LAYER_CONSTRAINT_PROCESSOR',
      'LABEL_AND_NODE_SIZE_PROCESSOR',
      'INNERMOST_NODE_MARGIN_CALCULATOR',
      'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR',
      `${P4_NODE_PLACEMENT}/BRANDES_KOEPF`,
      'NODE_PLACEMENT_REPEATER',
    ];
    const { factories, calls } = recording();
    const graph = runPlacementPrefix(rowWith(entries), factories);
    expect(calls).toEqual([
      'phase P1_CYCLE_BREAKING GREEDY',
      'phase P2_LAYERING NETWORK_SIMPLEX',
      'phase P3_NODE_ORDERING LAYER_SWEEP',
      'processor IN_LAYER_CONSTRAINT_PROCESSOR',
      'processor LABEL_AND_NODE_SIZE_PROCESSOR',
      'processor INNERMOST_NODE_MARGIN_CALCULATOR',
      'processor HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR',
      'phase P4_NODE_PLACEMENT BRANDES_KOEPF',
      'processor NODE_PLACEMENT_REPEATER',
    ]);
    expect(graph.getLayerlessNodes().length).toBe(1);
  });

  it('rejects a phase it does not know, naming it', () => {
    expect(() => runPlacementPrefix(rowWith(['P5_EDGE_ROUTING/ORTHOGONAL']), recording().factories)).toThrow(
      'prefix entry P5_EDGE_ROUTING/ORTHOGONAL names the unknown phase P5_EDGE_ROUTING',
    );
  });

  it('rejects a row without a prefix, naming the row', () => {
    expect(() => runPlacementPrefix(rowWith(null), recording().factories)).toThrow(
      'row models/synthetic has no prefix',
    );
  });
});
