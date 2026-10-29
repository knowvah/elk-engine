// SPDX-License-Identifier: EPL-2.0
// Structural tests of the step interpreter and the prefix replay, with fake processors injected (L4: the effects
// asserted are the ones the fakes are written to have, not hand-derived layout numbers).
import { describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { importRow, type PhaseRow, type PhaseStep } from './layered-phase-replay-rows.js';
import { importDumpOf, phaseDump } from './layered-phase-replay-dump.js';
import { runPrefix, runSteps, STEP_ARITY, type Factories } from './layered-phase-replay-ops.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, ports: [{ id: 'a0' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
    { id: 'c', width: 10, height: 10 },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};
const EDGE = 'g0/e0';
const LAYER_CONSTRAINT = 'org.eclipse.elk.layered.layering.layerConstraint';
const IMPORT: PhaseStep = ['importGraph', null];
const NORMALISE: PhaseStep = ['normalise'];

function row(steps: readonly PhaseStep[] | null, prefix: readonly string[] | null = null): PhaseRow {
  return {
    id: 'scenarios/ops',
    group: 'scenarios',
    input: { elk: GRAPH },
    target: null,
    options: {},
    steps,
    prefix,
    expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [] },
  };
}

class Recorder {
  readonly calls: string[] = [];
  readonly factories: Factories = {
    createProcessor: (name) => this.fake(`processor:${name}`),
    createPhase: (phase, strategy) => this.fake(`phase:${phase}/${strategy}`),
  };

  private fake(label: string): ILayoutProcessor<LGraph> {
    return {
      process: (graph) => {
        this.calls.push(label);
        if (label === 'processor:REVERSER') {
          firstEdge(graph).reverse(graph, true);
        }
      },
    };
  }
}

function firstEdge(graph: LGraph): LEdge {
  const edge = graph.getLayerlessNodes().flatMap((n) => n.getPorts().flatMap((p) => p.getOutgoingEdges()))[0];
  if (edge === undefined) {
    throw new Error('the fixture has no edge');
  }
  return edge;
}

function dumpOf(graph: LGraph): ReturnType<typeof phaseDump> {
  return phaseDump(graph, importDumpOf(graph));
}

describe('runSteps', () => {
  it('shows the effect of a processor that reverses one edge', () => {
    const recorder = new Recorder();
    const graph = runSteps(row([IMPORT, NORMALISE, ['runProcessor', 'REVERSER'], ['dump']]), recorder.factories);
    const dump = dumpOf(graph);
    expect(recorder.calls).toEqual(['processor:REVERSER']);
    expect(dump.edges.map((e) => e.reversed)).toEqual([true]);
    expect(dump.changed.map((c) => c.path)).toContain(EDGE);
  });

  it('passes the phase name and strategy to createPhase', () => {
    const recorder = new Recorder();
    runSteps(row([IMPORT, NORMALISE, ['runPhase', 'P2_LAYERING', 'LONGEST_PATH']]), recorder.factories);
    expect(recorder.calls).toEqual(['phase:P2_LAYERING/LONGEST_PATH']);
  });

  it('reverses an edge by path with reverseEdge', () => {
    const graph = runSteps(row([IMPORT, ['reverseEdge', EDGE]]), new Recorder().factories);
    expect(dumpOf(graph).edges.map((e) => e.reversed)).toEqual([true]);
  });

  // The recorder runs the X4 pattern without touching the layerless list, as Java `LNode.setLayer` does
  // (LayeredPhaseVectors.java:1217-1228): all recorded `layers` rows keep the layered nodes in `expected.layerless`.
  it('builds layers in order from the listed node paths and keeps the nodes layerless', () => {
    const graph = runSteps(row([IMPORT, ['layers', [['g0/n1'], ['g0/n0', 'g0/n2']]]]), new Recorder().factories);
    const dump = dumpOf(graph);
    expect(dump.layers).toEqual([['g0/n1'], ['g0/n0', 'g0/n2']]);
    expect(dump.layerless).toEqual(['g0/n0', 'g0/n1', 'g0/n2']);
  });

  it('sets a C4 property on an element by path', () => {
    const value = { t: 'enum', c: 'LayerConstraint', n: 'FIRST' };
    const graph = runSteps(row([IMPORT, ['setProperty', 'g0/n0', LAYER_CONSTRAINT, value]]), new Recorder().factories);
    const entry = dumpOf(graph).changed.find((c) => c.path === 'g0/n0');
    expect(entry?.props[LAYER_CONSTRAINT]).toEqual({ t: 'enum', c: 'LayerConstraint', n: 'FIRST' });
  });

  it('imports the target level named by the importGraph argument', () => {
    const nested = { id: 'root', children: [{ id: 'p', children: [{ id: 'x' }, { id: 'y' }] }] };
    const graph = runSteps({ ...row([['importGraph', 'p']]), input: { elk: nested } }, new Recorder().factories);
    expect(graph.getLayerlessNodes().length).toBe(2);
  });

  it('names an unknown op', () => {
    expect(() => runSteps(row([IMPORT, ['frobnicate']]), new Recorder().factories)).toThrow(
      /unknown step op frobnicate/,
    );
  });

  it('rejects a wrong argument count and a step before importGraph', () => {
    expect(() => runSteps(row([IMPORT, ['reverseEdge']]), new Recorder().factories)).toThrow(
      /op reverseEdge takes 1 arguments, got 0/,
    );
    expect(() => runSteps(row([NORMALISE]), new Recorder().factories)).toThrow(/before importGraph/);
  });

  it('rejects a row without steps', () => {
    expect(() => runSteps(row(null, []), new Recorder().factories)).toThrow(/has no steps/);
  });

  it('documents exactly the eight ops', () => {
    expect(Object.keys(STEP_ARITY).sort()).toEqual(
      ['dump', 'importGraph', 'layers', 'normalise', 'reverseEdge', 'runPhase', 'runProcessor', 'setProperty'].sort(),
    );
  });
});

describe('runPrefix', () => {
  it('runs the prefix entries in order, processors and phases through their factories', () => {
    const recorder = new Recorder();
    const prefix = ['EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER', 'P1_CYCLE_BREAKING/GREEDY', 'REVERSER'];
    const graph = runPrefix(row(null, prefix), recorder.factories);
    expect(recorder.calls).toEqual([
      'processor:EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER',
      'phase:P1_CYCLE_BREAKING/GREEDY',
      'processor:REVERSER',
    ]);
    expect(dumpOf(graph).edges.map((e) => e.reversed)).toEqual([true]);
  });

  it('normalises before the first entry (random is seeded when the first processor runs)', () => {
    const seen: boolean[] = [];
    const factories: Factories = {
      createProcessor: () => ({
        process: (g) => seen.push(g.getAllProperties().containsKey(InternalProperties.RANDOM)),
      }),
      createPhase: () => ({ process: () => undefined }),
    };
    runPrefix(row(null, ['X']), factories);
    expect(seen).toEqual([true]);
  });

  it('rejects an unknown phase, and a row without a prefix', () => {
    expect(() => runPrefix(row(null, ['P3_NODE_ORDERING/X']), new Recorder().factories)).toThrow(
      /unknown phase P3_NODE_ORDERING/,
    );
    expect(() => runPrefix(row([]), new Recorder().factories)).toThrow(/has no prefix/);
  });

  it('imports with importRow semantics: the target level and the options', () => {
    expect(importRow(row(null, [])).graph.getLayerlessNodes().length).toBe(3);
  });
});
