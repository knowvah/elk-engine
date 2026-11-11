// SPDX-License-Identifier: EPL-2.0
// Proof of ComponentsProcessor (mission 8a, T9): `split` against the recorded split stops given the recorded import graph, `pack` against the
// recorded pack stops given each component's recorded EdgeRouter state (merged properties included), the stop-13 provenance of the boxed
// `!=` at ComponentsProcessor.java:249, and Java-traced hand cases (L4). The multi-component pack replays run the real GraphBoundsProcessor (T14).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dumpStop, compareStop, formatDifferences } from '../../../test/helpers/mrtree-replay-dump.js';
import {
  STEP_PACK,
  STEP_SPLIT,
  loadStopsRows,
  transitionsOfStep,
  type StopsRow,
} from '../../../test/helpers/mrtree-replay-rows.js';
import { buildBeforeGraphs, importRowInput } from '../../../test/helpers/mrtree-replay-state.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Property } from '../../graph/properties/Property.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { TEdge } from './graph/TEdge.js';
import { TGraph } from './graph/TGraph.js';
import { TNode } from './graph/TNode.js';
import { InternalProperties } from './options/InternalProperties.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

const stopsRows = loadStopsRows();
const rowOf = (id: string): StopsRow => stopsRows.find((r) => r.id === id)!;

describe('split against the recorded split stops (acceptance)', () => {
  it('equals the split stop of every row, from the recorded import graph', () => {
    const transitions = transitionsOfStep(STEP_SPLIT);
    expect(transitions).toHaveLength(54);
    let skipped = 0;
    let components = 0;
    for (const { rowId, transition } of transitions) {
      const row = rowOf(rowId);
      const built = buildBeforeGraphs(row, transition);
      if (built === null) {
        skipped++;
        continue;
      }
      const result = new ComponentsProcessor().split(built.graphs[0]!);
      components += result.length;
      expect(formatDifferences(compareStop(transition.stop, dumpStop(STEP_SPLIT, -1, result))), rowId).toBe('');
    }
    expect(skipped).toBe(0);
    expect(components).toBeGreaterThan(54);
  });

  it('returns the graph itself when separateConnectedComponents is false and renumbers ids only for several components', () => {
    const single = rowOf('stops/separate/forest/separateConnectedComponents=false');
    const built = buildBeforeGraphs(single, transitionsOfStep(STEP_SPLIT, [single])[0]!.transition)!;
    const graph = built.graphs[0]!;
    expect(new ComponentsProcessor().split(graph)).toEqual([graph]);
    expect(new ComponentsProcessor().split(graph)[0]).toBe(graph);
    // one connected component: no renumbering happens (ids stay the import indices)
    const path = rowOf('stops/default/path6');
    const g = buildBeforeGraphs(path, transitionsOfStep(STEP_SPLIT, [path])[0]!.transition)!.graphs[0]!;
    const comps = new ComponentsProcessor().split(g);
    expect(comps).toHaveLength(1);
    expect(comps[0]!.getNodes().size()).toBe(6);
  });

  it('collects a component through both directions of every edge, once per node, and copies the graph properties', () => {
    const graph = new TGraph();
    graph.setProperty(MrTreeOptions.SPACING_NODE_NODE, 42);
    const [a, b, c, d] = [0, 1, 2, 3].map((i) => new TNode(i, graph, `n${String(i)}`));
    for (const n of [a!, b!, c!, d!]) {
      graph.getNodes().add(n);
    }
    // c -> a -> b chain plus the isolated d: DFS from a reaches c through the edge target side
    graph.getEdges().add(new TEdge(a!, b!));
    graph.getEdges().add(new TEdge(c!, a!));
    const comps = new ComponentsProcessor().split(graph);
    expect(comps.map((comp) => [...comp.getNodes()].map((n) => n.toString()))).toEqual([
      ['n_n0', 'n_n1', 'n_n2'],
      ['n_n3'],
    ]);
    expect(comps[0]!.getEdges().size()).toBe(4);
    expect(comps.map((comp) => comp.getProperty(MrTreeOptions.SPACING_NODE_NODE))).toEqual([42, 42]);
    expect(comps.map((comp) => [...comp.getNodes()].map((n) => n.id))).toEqual([[0, 1, 2], [0]]);
  });
});

describe('pack against the recorded pack stops (acceptance)', () => {
  it('equals the pack stop, merged properties included, for every row whose component states can be rebuilt', () => {
    const transitions = transitionsOfStep(STEP_PACK);
    expect(transitions).toHaveLength(53);
    let replayed = 0;
    let skipped = 0;
    let multi = 0;
    for (const { rowId, transition } of transitions) {
      const built = buildBeforeGraphs(rowOf(rowId), transition);
      if (built === null) {
        skipped++;
        continue;
      }
      const result = new ComponentsProcessor().pack(built.graphs);
      multi += built.graphs.length > 1 ? 1 : 0;
      expect(formatDifferences(compareStop(transition.stop, dumpStop(STEP_PACK, -1, [result]))), rowId).toBe('');
      replayed++;
    }
    expect({ replayed, skipped, multi, total: transitions.length }).toEqual({
      replayed: 44,
      skipped: 9,
      multi: 11,
      total: 53,
    });
  });

  it('returns an empty graph for no components', () => {
    const result = new ComponentsProcessor().pack([]);
    expect(result.getNodes().size()).toBe(0);
    expect(result.getEdges().size()).toBe(0);
  });
});

describe('pack hand cases (ComponentsProcessor.java:159-241)', () => {
  const component = (width: number, height: number): TGraph => {
    const graph = new TGraph();
    const node = new TNode(0, graph, '');
    node.getSize().x = width;
    node.getSize().y = height;
    graph.getNodes().add(node);
    graph.setProperty(MrTreeOptions.SPACING_NODE_NODE, 0);
    graph.setProperty(MrTreeOptions.ASPECT_RATIO, 1);
    return graph;
  };

  it('narrows sqrt(totalArea) to float (:220): a row 1e-8 wider than the float is broken, the double would keep it', () => {
    // widths 1 and w2 sum to W = 1.50000001; the areas sum to W*W, so sqrt is W within one double ulp, while the float
    // nearest to it is 1.5 < W (JLS 5.1.3): the second component must start a new row. h2 is chosen so that W <= sqrt(area).
    const w2 = 0.5 + 1e-8;
    const h2 = 2.500000009999999;
    const first = component(1, 1);
    const second = component(w2, h2);
    const result = new ComponentsProcessor().pack([second, first]);
    const [n1, n2] = [first, second].map((g) => g.getNodes().get(0));
    expect(n2!.getPosition().x - n1!.getPosition().x).toBe(0);
    expect(n2!.getPosition().y - n1!.getPosition().y).toBe(1);
    expect(result.getNodes().size()).toBe(2);
  });

  it('puts components of unequal priority first by priority (descending), equal ones by area (ascending)', () => {
    const small = component(1, 1);
    const big = component(10, 10);
    const prior = component(5, 5);
    prior.getNodes().get(0).setProperty(MrTreeOptions.PRIORITY, 5);
    const list = [big, small, prior];
    new ComponentsProcessor().pack(list);
    expect(list).toEqual([prior, small, big]);
  });
});

describe('the boxed != of ComponentsProcessor.java:249 (stop 13)', () => {
  const component = (width: number, height: number, set: (graph: TGraph) => void = () => undefined): TGraph => {
    const graph = new TGraph();
    const node = new TNode(0, graph, '');
    node.getSize().x = width;
    node.getSize().y = height;
    graph.getNodes().add(node);
    set(graph);
    return graph;
  };
  const X = new Property<number>('test.stop13.x', 0);
  const Y = new Property<number>('test.stop13.y', 0);
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('the left operand is a fresh clone for a Cloneable default and the one shared object otherwise', () => {
    importRowInput(rowOf('stops/default/path6').input);
    const removable = InternalProperties.REMOVABLE_EDGES.getDefault();
    expect(removable).not.toBe(InternalProperties.REMOVABLE_EDGES.getDefault());
    expect([...removable]).toEqual([]);
    expect(MrTreeOptions.PRIORITY.getDefault()).toBe(1);
    expect(InternalProperties.GRAPH_XMIN.getDefault()).toBe(0);
    expect(InternalProperties.BB_UPLEFT.getDefault()).toBeNull();
    expect(InternalProperties.BB_LOWRIGHT.getDefault()).toBeNull();
  });

  it('a stored value equal to the shared default is skipped (Integer 0: the cached object), any other value is the last writer', () => {
    // equal priority, areas 1 < 2 < 3 (ascending): the components merge in the order a, b, c
    const a = component(1, 1, (g) => g.setProperty(X, 1).setProperty(Y, 1));
    const b = component(2, 1, (g) => g.setProperty(X, 0).setProperty(Y, 2));
    const c = component(3, 1, (g) => g.setProperty(Y, 3));
    const result = new ComponentsProcessor().pack([c, a, b]);
    expect(result.getProperty(X)).toBe(1);
    expect(result.getProperty(Y)).toBe(3);
  });

  it('debugMode: the third differing writer is refused and reported, the second one wins', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const debugging = (g: TGraph): TGraph => {
      g.setProperty(CoreOptions.DEBUG_MODE, true);
      return g;
    };
    const a = component(1, 1, (g) => debugging(g).setProperty(Y, 1));
    const b = component(2, 1, (g) => debugging(g).setProperty(Y, 2));
    const c = component(3, 1, (g) => debugging(g).setProperty(Y, 3));
    const result = new ComponentsProcessor().pack([a, b, c]);
    expect(result.getProperty(Y)).toBe(2);
    // every property that is set on all three components and differs from its default is reported for the third one
    // (debugMode itself, the two bounding-box vectors pack sets, and y); their order is the HashMap order of the third
    // component's map, which only the error stream shows
    expect(error.mock.calls.map(([message]) => message as string).sort()).toEqual(
      ['boundingBox.lowRight', 'boundingBox.upLeft', 'org.eclipse.elk.debugMode', 'test.stop13.y'].map(
        (id) => `Found different values for property ${id} in components.`,
      ),
    );
  });
});
