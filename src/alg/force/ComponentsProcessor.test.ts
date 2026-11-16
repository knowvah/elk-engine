// SPDX-License-Identifier: EPL-2.0
// Proof of ComponentsProcessor (mission 8b, T6): split and recombine against the `split` and `recombine` stops of
// test/golden/refs/java/{force,stress}.json at the AD-4 bar. Each step starts from the recorded state of the step before it (rebuilt by
// test/helpers/force-replay-dump.ts), so a divergence localises; `randomPeek` is not compared there (a generator cannot be rebuilt from its
// fingerprint). Java-traced hand cases cover the branches no row reaches (L4: expectations from the Java source, the line named).
import { describe, expect, it } from 'vitest';
import { classify, compareJson, formatDifferences, registerForce } from '../../../test/helpers/force-replay-dump.js';
import {
  FORCE_REFS,
  findStop,
  loadForceRows,
  STEP_RECOMBINE,
  STEP_SPLIT,
  type ForceRef,
  type StopsRow,
} from '../../../test/helpers/force-replay-rows.js';
import { ownedStop, type OwnedStep } from '../../../test/helpers/force-replay-run.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { FBendpoint } from './graph/FBendpoint.js';
import { FEdge } from './graph/FEdge.js';
import { FGraph } from './graph/FGraph.js';
import { FLabel } from './graph/FLabel.js';
import { FNode } from './graph/FNode.js';
import { ForceOptions } from './options/ForceOptions.js';
import { InternalProperties } from './options/InternalProperties.js';

const HEAVY = { timeout: 60_000 } as const;
const STOP_COUNTS = { force: 194, stress: 108 } as const;

registerForce();

function replayFailures(rows: readonly StopsRow[], step: OwnedStep): string[] {
  return rows.flatMap((row) => {
    const replay = ownedStop(row, step);
    if (replay === null) {
      return [`${row.id}: no ${step} stop`];
    }
    const differences = compareJson(replay.expected, replay.actual, replay.options);
    return differences.length === 0 ? [] : [`${row.id}\n${formatDifferences(differences, 3)}`];
  });
}

describe.each(FORCE_REFS)('ComponentsProcessor against the %s ref', (ref: ForceRef) => {
  const rows = loadForceRows(ref, 'stops');

  it(
    `splits the recorded import state of all ${String(STOP_COUNTS[ref])} rows into the recorded components`,
    HEAVY,
    () => {
      expect(rows.filter((row) => findStop(row, STEP_SPLIT) !== undefined)).toHaveLength(STOP_COUNTS[ref]);
      expect(replayFailures(rows, STEP_SPLIT)).toEqual([]);
    },
  );

  it(
    `recombines the recorded component states of all ${String(STOP_COUNTS[ref])} rows into the recorded graph`,
    HEAVY,
    () => {
      expect(rows.filter((row) => findStop(row, STEP_RECOMBINE) !== undefined)).toHaveLength(STOP_COUNTS[ref]);
      expect(replayFailures(rows, STEP_RECOMBINE)).toEqual([]);
    },
  );

  it('reaches both the several-component and the single-component arm of split and recombine', () => {
    const counts = rows.map((row) => findStop(row, STEP_SPLIT)!.components.length);
    expect(counts.some((n) => n > 1)).toBe(true);
    expect(counts.some((n) => n === 1)).toBe(true);
  });

  it('classifies no split or recombine stop as differing', HEAVY, () => {
    const classes = rows.flatMap((row) =>
      ([STEP_SPLIT, STEP_RECOMBINE] as const).map((step) => {
        const replay = ownedStop(row, step)!;
        return classify(replay.expected, replay.actual, replay.options);
      }),
    );
    expect(classes.filter((c) => c === 'differs')).toEqual([]);
  });
});

/** A node with an id, a position, a size and a priority. */
function node(id: number, x: number, y: number, w: number, h: number, prio?: number): FNode {
  const n = new FNode(`n${String(id)}`);
  n.id = id;
  n.getPosition().x = x;
  n.getPosition().y = y;
  n.getSize().x = w;
  n.getSize().y = h;
  if (prio !== undefined) {
    n.setProperty(ForceOptions.PRIORITY, prio);
  }
  return n;
}

/** A graph made of the nodes, and an edge for each pair of the list. */
function graphOf(nodes: FNode[], pairs: [number, number][] = []): FGraph {
  const graph = new FGraph();
  graph.getNodes().push(...nodes);
  for (const [s, t] of pairs) {
    const edge = new FEdge();
    edge.setSource(nodes[s]!);
    edge.setTarget(nodes[t]!);
    graph.getEdges().push(edge);
  }
  return graph;
}

describe('ComponentsProcessor.split, Java-traced cases', () => {
  it('ComponentsProcessor.java:75: a graph with no nodes splits into no component', () => {
    expect(new ComponentsProcessor().split(new FGraph())).toEqual([]);
  });

  it('ComponentsProcessor.java:101-110: a node reached through an edge joins the component of the edge, ids restart at 0 per component', () => {
    const nodes = [node(0, 0, 0, 1, 1), node(1, 0, 0, 1, 1), node(2, 0, 0, 1, 1), node(3, 0, 0, 1, 1)];
    const graph = graphOf(nodes, [
      [0, 2],
      [3, 1],
    ]);
    const components = new ComponentsProcessor().split(graph);
    expect(components.map((c) => c.getNodes().map((n) => n.toString()))).toEqual([
      ['n_n0', 'n_n2'],
      ['n_n1', 'n_n3'],
    ]);
    expect(components.map((c) => c.getNodes().map((n) => n.id))).toEqual([
      [0, 1],
      [0, 1],
    ]);
    expect(components.map((c) => c.getEdges().length)).toEqual([1, 1]);
  });

  it('ComponentsProcessor.java:76-80: with several components each copies the properties of the graph', () => {
    const graph = graphOf([node(0, 0, 0, 1, 1), node(1, 0, 0, 1, 1)]);
    graph.setProperty(ForceOptions.ITERATIONS, 9);
    const components = new ComponentsProcessor().split(graph);
    expect(components.map((c) => c.getProperty(ForceOptions.ITERATIONS))).toEqual([9, 9]);
  });

  it('ComponentsProcessor.java:129-132: the edge a node was reached by is not followed back, and an edge that closes a cycle is collected by both its end nodes', () => {
    const nodes = [node(0, 0, 0, 1, 1), node(1, 0, 0, 1, 1), node(2, 0, 0, 1, 1)];
    const graph = graphOf(nodes, [
      [0, 1],
      [1, 2],
      [2, 0],
    ]);
    new FLabel(graph.getEdges()[1]!, 'x');
    graph.getLabels().push(graph.getEdges()[1]!.getLabels()[0]!);
    const [component, ...rest] = new ComponentsProcessor().split(graph);
    expect(rest).toEqual([]);
    expect(component!.getNodes().map((n) => n.id)).toEqual([0, 1, 2]);
    // e20 is added when n2 is visited (its other end n0 is already visited) and again when n0 resumes its incidence list
    expect(component!.getEdges().length).toBe(4);
    expect(new Set(component!.getEdges()).size).toBe(3);
    expect(component!.getLabels().map((l) => l.getText())).toEqual(['x']);
  });
});

describe('ComponentsProcessor.recombine, Java-traced cases', () => {
  it('ComponentsProcessor.java:171-172: one component is returned untouched', () => {
    const only = graphOf([node(0, 5, 5, 2, 2)]);
    expect(new ComponentsProcessor().recombine([only])).toBe(only);
    expect(only.getProperty(InternalProperties.BB_UPLEFT)).toBeNull();
  });

  it('ComponentsProcessor.java:173-174: no component gives an empty graph', () => {
    const result = new ComponentsProcessor().recombine([]);
    expect([result.getNodes().length, result.getEdges().length, result.getLabels().length]).toEqual([0, 0, 0]);
  });

  it('ComponentsProcessor.java:176-192: priority is the sum of the node priorities, the box is that of the node borders', () => {
    const a = graphOf([node(0, 10, 10, 4, 2, 3), node(1, 20, 30, 6, 8, 4)]);
    const b = graphOf([node(0, 0, 0, 2, 2)]);
    new ComponentsProcessor().recombine([a, b]);
    expect(a.getProperty(ForceOptions.PRIORITY)).toBe(7);
    expect(a.getProperty(InternalProperties.BB_UPLEFT)!.x).toBe(8);
    expect(a.getProperty(InternalProperties.BB_UPLEFT)!.y).toBe(9);
    expect(a.getProperty(InternalProperties.BB_LOWRIGHT)!.x).toBe(23);
    expect(a.getProperty(InternalProperties.BB_LOWRIGHT)!.y).toBe(34);
  });

  it('ComponentsProcessor.java:194-208: the higher priority comes first, then the smaller area', () => {
    const small = graphOf([node(0, 0, 0, 2, 2)]);
    const big = graphOf([node(0, 0, 0, 10, 10)]);
    const important = graphOf([node(0, 0, 0, 20, 20, 5)]);
    const components = [big, important, small];
    new ComponentsProcessor().recombine(components);
    expect(components).toEqual([important, small, big]);
  });

  it('ComponentsProcessor.java:194-208: components equal in priority and area keep their order (Collections.sort is stable)', () => {
    const first = graphOf([node(0, 0, 0, 4, 4)]);
    const second = graphOf([node(0, 100, 100, 4, 4)]);
    const third = graphOf([node(0, -7, 3, 4, 4)]);
    const components = [second, third, first];
    new ComponentsProcessor().recombine(components);
    expect(components).toEqual([second, third, first]);
  });

  it('ComponentsProcessor.java:210-241: components are placed into rows by the maximal row width and moved by the row offset', () => {
    const left = graphOf([node(0, 10, 10, 20, 20)]);
    const right = graphOf([node(0, 50, 50, 20, 20)]);
    const below = graphOf([node(0, 0, 0, 20, 20)]);
    const spacing = 5;
    for (const g of [left, right, below]) {
      g.setProperty(ForceOptions.SPACING_NODE_NODE, spacing);
      g.setProperty(ForceOptions.ASPECT_RATIO, Math.fround(1));
    }
    const result = new ComponentsProcessor().recombine([left, right, below]);
    // areas are equal (400): order kept; total area 1200, sqrt (float) 34.64102 * 1 > box width 20; a row holds
    // 20 + 5 + 20 = 45 > 34.64, so the second box starts the next row at y = 20 + 5, the third the one after
    expect(result.getNodes().map((n) => [n.getPosition().x, n.getPosition().y])).toEqual([
      [10, 10],
      [10, 35],
      [10, 60],
    ]);
  });

  it('ComponentsProcessor.java:222: the square root of the total area is narrowed to float before it meets the aspect ratio', () => {
    // two boxes 3 x 3 apart by spacing 0: total area 18, sqrt = 4.242640687119285, float 4.2426405; times aspect 2 = 8.485281
    // (float); the row width is 8.485281 > 3 + 3 = 6, so both fit in one row. With 2.9 instead the row is 4.2426405 * 1 = 4.24 < 6
    const make = (aspect: number): FGraph => {
      const a = graphOf([node(0, 1.5, 1.5, 3, 3)]);
      const b = graphOf([node(0, 1.5, 1.5, 3, 3)]);
      for (const g of [a, b]) {
        g.setProperty(ForceOptions.SPACING_NODE_NODE, 0);
        g.setProperty(ForceOptions.ASPECT_RATIO, Math.fround(aspect));
      }
      return new ComponentsProcessor().recombine([a, b]);
    };
    expect(
      make(2)
        .getNodes()
        .map((n) => [n.getPosition().x, n.getPosition().y]),
    ).toEqual([
      [1.5, 1.5],
      [4.5, 1.5],
    ]);
    expect(
      make(1)
        .getNodes()
        .map((n) => [n.getPosition().x, n.getPosition().y]),
    ).toEqual([
      [1.5, 1.5],
      [1.5, 4.5],
    ]);
  });

  it('ComponentsProcessor.java:249-271: moving a component also moves its bend points and labels and collects its edges', () => {
    const make = (x: number): FGraph => {
      const g = graphOf([node(0, x, 0, 2, 2), node(1, x + 10, 0, 2, 2)], [[0, 1]]);
      const edge = g.getEdges()[0]!;
      const bend = new FBendpoint(edge);
      bend.getPosition().x = x + 5;
      g.getBendpoints().push(bend);
      const label = new FLabel(edge, 'l');
      label.getPosition().x = x + 5;
      g.getLabels().push(label);
      g.setProperty(ForceOptions.SPACING_NODE_NODE, 0);
      g.setProperty(ForceOptions.ASPECT_RATIO, Math.fround(0.5));
      return g;
    };
    const result = new ComponentsProcessor().recombine([make(0), make(100)]);
    // each box is 14 x 2 with its upper left at (-1, -1); the narrow row width puts the second below the first
    expect(result.getEdges().length).toBe(2);
    expect(result.getEdges().map((e) => e.getBendpoints()[0]!.getPosition().x)).toEqual([6, 6]);
    expect(result.getLabels().map((l) => l.getPosition().x)).toEqual([6, 6]);
    expect(result.getBendpoints()).toEqual([]);
  });
});
