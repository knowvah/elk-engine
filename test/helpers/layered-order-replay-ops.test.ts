// SPDX-License-Identifier: EPL-2.0
// Structural tests of the order prefix replay: which factories it asks for, in which order, and its errors.
import { describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { runOrderPrefix } from './layered-order-replay-ops.js';
import type { OrderRow } from './layered-order-replay-rows.js';
import type { Factories } from './layered-phase-replay-ops.js';

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

function rowWith(prefix: string[] | null): OrderRow {
  return {
    id: 'models/synthetic',
    group: 'models',
    input: { elk: { id: 'root', children: [{ id: 'a', width: 10, height: 10 }] } },
    target: null,
    options: {},
    steps: null,
    prefix,
    expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [], ports: {} },
  };
}

describe('runOrderPrefix', () => {
  it('asks the factories for each entry in order, P3_NODE_ORDERING included', () => {
    const { factories, calls } = recording();
    const graph = runOrderPrefix(
      rowWith(['P1_CYCLE_BREAKING/GREEDY', 'PORT_SIDE_PROCESSOR', 'P3_NODE_ORDERING/LAYER_SWEEP']),
      factories,
    );
    expect(calls).toEqual([
      'phase P1_CYCLE_BREAKING GREEDY',
      'processor PORT_SIDE_PROCESSOR',
      'phase P3_NODE_ORDERING LAYER_SWEEP',
    ]);
    expect(graph.getLayerlessNodes().length).toBe(1);
  });

  it('rejects a phase it does not know, naming it', () => {
    expect(() => runOrderPrefix(rowWith(['P4_NODE_PLACEMENT/X']), recording().factories)).toThrow(
      'prefix entry P4_NODE_PLACEMENT/X names the unknown phase P4_NODE_PLACEMENT',
    );
  });

  it('rejects a row without a prefix, naming the row', () => {
    expect(() => runOrderPrefix(rowWith(null), recording().factories)).toThrow('row models/synthetic has no prefix');
  });
});
