// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { VertiFlexOptions } from '../../src/alg/vertiflex/options/VertiFlexOptions.js';
import { OutlineNode } from '../../src/alg/vertiflex/p2relative/OutlineNode.js';
import {
  applyDump,
  buildOutline,
  compareStop,
  dumpVertiFlex,
  formatDifferences,
  importInput,
  rebuildBefore,
  rebuildStop,
} from './vertiflex-replay-dump.js';
import {
  accumulate,
  decodeHex,
  encodeHex,
  loadVertiFlexRows,
  STEP_IMPORT,
  STEP_RELATIVE_X_PLACER,
  STEP_Y_PLACER,
  type Dump,
  type HexPoint,
  type NodeEntry,
  type PropsEntry,
  type StopsRow,
} from './vertiflex-replay-rows.js';

const stopsRows = loadVertiFlexRows('stops');
const STAR = stopsRows.find((row) => row.id === 'stops/star2/default')!;
const BEND = stopsRows.find((row) => row.expected.steps[6] === 'BendEdgeRouter')!;
const EXACT = 0;
const SUB_TOLERANCE = 1e-9;
const SUPER_TOLERANCE = 1e-3;

const perturb = (hex: string, delta: number): string => encodeHex(decodeHex(hex) + delta);

describe('dumpVertiFlex against the recorder', () => {
  it(
    'equals the Import stop of every stops row exactly (graph, nodes, ports, labels, edges)',
    { timeout: 60_000 },
    () => {
      for (const row of stopsRows) {
        const dump = dumpVertiFlex(importInput(row));
        const recorded = accumulate(row, 0);
        expect(formatDifferences(compareStop({ ...recorded, props: [] }, dump, EXACT))).toBe('');
      }
    },
  );
});

describe('rebuildStop: the recorded state written onto a re-imported graph and dumped again', () => {
  it('reproduces the accumulated state of every stop of every stops row exactly', { timeout: 60_000 }, () => {
    for (const row of stopsRows) {
      row.expected.steps.forEach((step, index) => {
        const expected = accumulate(row, index);
        const actual = dumpVertiFlex(rebuildStop(row, step));
        const differences = compareStop(expected, actual, EXACT);
        expect(formatDifferences(differences), `${row.id} after ${step}`).toBe('');
      });
    }
  });

  it('rebuilds the state before a step from the previous stop', () => {
    const graph = rebuildBefore(STAR, STEP_RELATIVE_X_PLACER);
    expect(dumpVertiFlex(graph).props.map((p) => p.id)).toEqual(['root', 'n0', 'n1', 'n2']);
    expect(graph.getChildren().get(1)!.getY()).toBe(decodeHex(accumulate(STAR, 3).nodes[1]!.y));
  });

  it('rebuilds a missing edge section from the recorded one (a count mismatch replaces the sections)', () => {
    const state = accumulate(BEND, BEND.expected.steps.length - 1);
    const sectioned = state.edges.find((e) => e.sections.length > 0)!;
    const graph = importInput(BEND);
    applyDump(graph, {
      ...state,
      edges: [{ id: sectioned.id, sections: [...sectioned.sections, ...sectioned.sections] }],
    });
    const edge = [...graph.getContainedEdges()].find((e) => e.getIdentifier() === sectioned.id)!;
    expect(edge.getSections().size()).toBe(sectioned.sections.length * 2);
  });

  it('rejects a recorded id the graph does not have', () => {
    const state = accumulate(STAR, 0);
    const bogus: NodeEntry = { ...state.nodes[0]!, id: 'nX' };
    expect(() => applyDump(importInput(STAR), { ...state, nodes: [bogus] })).toThrow(
      'recorded node nX is not in the imported graph',
    );
    expect(() => applyDump(importInput(STAR), { ...state, graph: { ...state.graph, id: 'other' } })).toThrow(
      'the recorded graph is other, the imported root root',
    );
  });
});

describe('buildOutline', () => {
  it('builds the chain from the head following next', () => {
    const points: HexPoint[] = [
      [encodeHex(1), encodeHex(2)],
      [encodeHex(3), encodeHex(4)],
    ];
    const head = buildOutline(points);
    expect([head.getRelativeX(), head.getAbsoluteY()]).toEqual([1, 2]);
    expect(head.isLast()).toBe(false);
    const tail: OutlineNode = head.getNext()!;
    expect([tail.getRelativeX(), tail.getAbsoluteY(), tail.isLast()]).toEqual([3, 4, true]);
    expect(() => buildOutline([])).toThrow('an outline has at least one point');
  });
});

describe('compareStop mutation checks: a comparison that cannot fail proves nothing', () => {
  const state: Dump = accumulate(STAR, STAR.expected.steps.indexOf(STEP_RELATIVE_X_PLACER));
  const clone = (): Dump => structuredClone(state) as Dump;

  it('is empty for equal dumps and for a difference below the tolerance', () => {
    expect(compareStop(state, clone())).toEqual([]);
    const near = clone();
    const nodes = near.nodes.map((n, i) => (i === 0 ? { ...n, x: perturb(n.x, SUB_TOLERANCE) } : n));
    expect(compareStop(state, { ...near, nodes })).toEqual([]);
    expect(compareStop(state, { ...near, nodes }, EXACT)).toHaveLength(1);
  });

  it('reports a perturbed coordinate with its path, expected and actual value', () => {
    const mutated = clone();
    const nodes = mutated.nodes.map((n, i) => (i === 1 ? { ...n, x: perturb(n.x, SUPER_TOLERANCE) } : n));
    const differences = compareStop(state, { ...mutated, nodes });
    expect(differences).toEqual([
      {
        path: 'dump.nodes[n1].x',
        expected: decodeHex(state.nodes[1]!.x),
        actual: decodeHex(state.nodes[1]!.x) + SUPER_TOLERANCE,
      },
    ]);
  });

  it('reports a perturbed outline point', () => {
    const mutated = clone();
    const props: PropsEntry[] = mutated.props.map((p) => {
      if (p.id !== 'n0') return p;
      const outline = [...(p.props.LEFT_OUTLINE as HexPoint[])];
      outline[2] = [outline[2]![0], perturb(outline[2]![1], SUPER_TOLERANCE)];
      return { ...p, props: { ...p.props, LEFT_OUTLINE: outline } };
    });
    const differences = compareStop(state, { ...mutated, props });
    expect(differences.map((d) => d.path)).toEqual(['dump.props[n0].props.LEFT_OUTLINE[2][1]']);
  });

  it('reports a dropped outline point as a length difference', () => {
    const mutated = clone();
    const props = mutated.props.map((p) =>
      p.id === 'n0'
        ? { ...p, props: { ...p.props, RIGHT_OUTLINE: (p.props.RIGHT_OUTLINE as HexPoint[]).slice(1) } }
        : p,
    );
    expect(compareStop(state, { ...mutated, props })[0]!.path).toBe('dump.props[n0].props.RIGHT_OUTLINE.length');
  });

  it('reports a changed property value, an integer one exactly', () => {
    const mutated = clone();
    const props = mutated.props.map((p) => (p.id === 'n1' ? { ...p, props: { ...p.props, NODE_MODEL_ORDER: 7 } } : p));
    expect(compareStop(state, { ...mutated, props })).toEqual([
      { path: 'dump.props[n1].props.NODE_MODEL_ORDER', expected: state.props[2]!.props.NODE_MODEL_ORDER, actual: 7 },
    ]);
  });

  it('reports a missing and an extra property key', () => {
    const mutated = clone();
    const props = mutated.props.map((p) => {
      if (p.id !== 'n1') return p;
      const { MIN_X: _minX, ...rest } = p.props;
      return { ...p, props: rest };
    });
    const differences = compareStop(state, { ...mutated, props });
    expect(differences.map((d) => d.path)).toEqual(['dump.props[n1].props.<keys>']);
  });

  it('reports a swapped order of two nodes by their ids', () => {
    const mutated = clone();
    const nodes = [mutated.nodes[1]!, mutated.nodes[0]!, ...mutated.nodes.slice(2)];
    expect(compareStop(state, { ...mutated, nodes }).map((d) => d.path)).toEqual([
      'dump.nodes[0].id',
      'dump.nodes[1].id',
    ]);
  });

  it('reports a missing node and a changed root id', () => {
    const mutated = clone();
    expect(compareStop(state, { ...mutated, nodes: mutated.nodes.slice(1) })[0]!.path).toBe('dump.nodes.length');
    expect(compareStop(state, { ...mutated, graph: { ...mutated.graph, id: 'r' } })[0]).toEqual({
      path: 'dump.graph.id',
      expected: 'root',
      actual: 'r',
    });
  });

  it('reports an edge section only when the state carries one', () => {
    const routed = accumulate(BEND, BEND.expected.steps.length - 1);
    const mutated = structuredClone(routed) as Dump;
    const index = mutated.edges.findIndex((e) => e.sections.length > 0);
    const edges = mutated.edges.map((e, i) =>
      i === index
        ? {
            ...e,
            sections: e.sections.map((s) => ({
              ...s,
              end: [s.end[0], perturb(s.end[1], SUPER_TOLERANCE)] as HexPoint,
            })),
          }
        : e,
    );
    const differences = compareStop(routed, { ...mutated, edges });
    expect(differences.map((d) => d.path)).toEqual([`dump.edges[${routed.edges[index]!.id}].sections[0].end[1]`]);
  });

  it('formats at most the limit of differences with a count of the rest', () => {
    const text = formatDifferences(
      Array.from({ length: 3 }, (_, i) => ({ path: `p${String(i)}`, expected: i, actual: i + 1 })),
      2,
    );
    expect(text).toBe('p0: expected 0, actual 1\np1: expected 1, actual 2\n... 1 more');
  });
});

describe('rebuilt state is what a step reads', () => {
  it('sets ROOT_NODE to the root node object and NODE_MODEL_ORDER per child at the P1 stop', () => {
    const graph = rebuildStop(STAR as StopsRow, STEP_Y_PLACER);
    const children = [...graph.getChildren()];
    const dump = dumpVertiFlex(graph);
    expect(dump.props[0]).toEqual({ id: 'root', props: { ROOT_NODE: 'n0' } });
    expect(dump.props.slice(1).map((p) => p.props.NODE_MODEL_ORDER)).toEqual([0, 1, 2]);
    expect(children.map((c) => c.getY())).toEqual(accumulate(STAR, 3).nodes.map((n) => decodeHex(n.y)));
    expect(STEP_IMPORT).toBe('Import');
  });
});

describe('per-node options in the rebuilt state', () => {
  it('are exactly what the importer makes of the row input, not injected by the helper', { timeout: 60_000 }, () => {
    const nodeOption = 'org.eclipse.elk.vertiflex.considerNodeModelOrder';
    const rows = stopsRows.filter((row) => row.id.includes('nodeOrderFalseNodesOnly'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const imported = importInput(row);
      const rebuilt = rebuildBefore(row, STEP_RELATIVE_X_PLACER);
      const inputChildren = row.input.children as { id: string; layoutOptions?: Record<string, unknown> }[];
      const read = (g: typeof imported): (boolean | null)[] =>
        [...g.getChildren()].map((n) =>
          n.hasProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER)
            ? n.getProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER)
            : null,
        );
      expect(read(rebuilt)).toEqual(read(imported));
      expect(read(rebuilt)).toEqual(
        inputChildren.map((c) =>
          c.layoutOptions?.considerNodeModelOrder === undefined
            ? null
            : c.layoutOptions.considerNodeModelOrder === 'true',
        ),
      );
      expect(read(rebuilt).includes(false)).toBe(true);
    }
  });
});
