// SPDX-License-Identifier: EPL-2.0
// Proof of ElkGraphImporter (mission 8a, T9): importGraph against the 54 `import` stops of test/golden/refs/java/mrtree.json (and every
// full/throws input must import), applyLayout against the recorded `applyLayout` stops given the recorded pack state, the two oracle throws
// that surface there, and Java-traced hand cases for the branches the rows do not reach (L4: expectations from the rows, the Java source).
import { describe, expect, it } from 'vitest';
import { compareElk, compareGraph, dumpTGraph, formatDifferences } from '../../../test/helpers/mrtree-replay-dump.js';
import {
  STEP_APPLY,
  STEP_IMPORT,
  STEP_PACK,
  loadFullRows,
  loadStopsRows,
  loadThrowsRows,
  type StopsRow,
  type Transition,
} from '../../../test/helpers/mrtree-replay-rows.js';
import {
  buildBeforeGraphs,
  dumpElk,
  importRowInput,
  parseRowInput,
} from '../../../test/helpers/mrtree-replay-state.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { KVector } from '../../core/math/KVector.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import { TEdge } from './graph/TEdge.js';
import { TGraph } from './graph/TGraph.js';
import { TNode } from './graph/TNode.js';
import { InternalProperties } from './options/InternalProperties.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

const stopsRows = loadStopsRows();

/** The applyLayout state of a row: the pack stop is its predecessor, also when the step threw and recorded no stop of its own. */
function applyTransition(row: StopsRow): Transition | undefined {
  const pack = row.expected.stops.find((s) => s.step === STEP_PACK);
  const recorded = row.expected.stops.find((s) => s.step === STEP_APPLY);
  return pack === undefined ? undefined : { step: STEP_APPLY, comp: -1, before: pack.graphs, stop: recorded ?? pack };
}

describe('importGraph against the recorded import stops (acceptance)', () => {
  it('equals the import stop of every one of the 54 stops rows', () => {
    expect(stopsRows).toHaveLength(54);
    for (const row of stopsRows) {
      const recorded = row.expected.stops.find((s) => s.step === STEP_IMPORT)!.graphs[0]!;
      const actual = dumpTGraph(importRowInput(row.input).tGraph);
      expect(formatDifferences(compareGraph(recorded, actual)), row.id).toBe('');
    }
  });

  it('imports the input of every full row (122) and every throws row (12) without throwing', () => {
    const inputs = [...loadFullRows(), ...loadThrowsRows()];
    expect(inputs).toHaveLength(134);
    for (const row of inputs) {
      const root = parseRowInput(row.input);
      expect(new ElkGraphImporter().importGraph(root).getNodes().size(), row.id).toBe(root.getChildren().size());
    }
  });

  it('keeps the node order of the children and gives each TNode its index as id', () => {
    const imported = importRowInput(stopsRows.find((r) => r.id === 'stops/default/forest')!.input);
    const nodes = [...imported.tGraph.getNodes()];
    expect(nodes.map((n) => n.id)).toEqual(nodes.map((_, i) => i));
    expect(nodes.map((n) => n.getProperty(InternalProperties.ORIGIN))).toEqual([...imported.root.getChildren()]);
  });
});

describe('importGraph hand cases (ElkGraphImporter.java:49-135)', () => {
  const graph = (): ElkNode => ElkGraphUtil.createGraph();

  it('uses the first label text and "" without labels; sizes are at least 1; the position is the centre', () => {
    const root = graph();
    const labeled = ElkGraphUtil.createNode(root);
    ElkGraphUtil.createLabelWithText('first', labeled);
    ElkGraphUtil.createLabelWithText('second', labeled);
    labeled.setDimensions(0, -3);
    labeled.setLocation(10, 20);
    const plain = ElkGraphUtil.createNode(root);
    plain.setDimensions(8, 6);
    plain.setLocation(2, 4);
    const [a, b] = [...new ElkGraphImporter().importGraph(root).getNodes()];
    expect([a!.getLabel(), b!.getLabel()]).toEqual(['first', '']);
    expect([a!.getSize().x, a!.getSize().y]).toEqual([1, 1]);
    expect([a!.getPosition().x, a!.getPosition().y]).toEqual([10 + 0 / 2, 20 + -3 / 2]);
    expect([b!.getSize().x, b!.getSize().y, b!.getPosition().x, b!.getPosition().y]).toEqual([8, 6, 2 + 4, 4 + 3]);
  });

  it('excludes self-loops and hierarchical edges, includes edges through ports, and excludes an edge to a node of another graph (hierarchical)', () => {
    const root = graph();
    const a = ElkGraphUtil.createNode(root);
    const b = ElkGraphUtil.createNode(root);
    const inner = ElkGraphUtil.createNode(a);
    const port = ElkGraphUtil.createPort(a);
    const kept = ElkGraphUtil.createSimpleEdge(a, b);
    const viaPort = ElkGraphUtil.createSimpleEdge(port, b);
    ElkGraphUtil.createSimpleEdge(a, a);
    ElkGraphUtil.createSimpleEdge(a, inner);
    const foreign = graph();
    const stranger = ElkGraphUtil.createNode(foreign);
    const toStranger = ElkGraphUtil.createEdge(root);
    toStranger.getSources().add(b);
    toStranger.getTargets().add(stranger);
    const imported = new ElkGraphImporter().importGraph(root);
    const origins = [...imported.getEdges()].map((e) => e.getProperty(InternalProperties.ORIGIN));
    expect(origins).toEqual([kept, viaPort]);
    const [ta, tb] = [...imported.getNodes()];
    expect([...ta!.getOutgoingEdges()].map((e) => e.getProperty(InternalProperties.ORIGIN))).toEqual([kept, viaPort]);
    expect([...tb!.getIncomingEdges()]).toHaveLength(2);
  });

  it('copies the options of the ElkNodes and ElkEdges and sets ORIGIN last for the graph', () => {
    const root = graph();
    root.setProperty(MrTreeOptions.SPACING_NODE_NODE, 33);
    const a = ElkGraphUtil.createNode(root);
    a.setProperty(MrTreeOptions.PRIORITY, 7);
    const b = ElkGraphUtil.createNode(root);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    edge.setProperty(MrTreeOptions.PRIORITY, 9);
    const imported = new ElkGraphImporter().importGraph(root);
    expect(imported.getProperty(MrTreeOptions.SPACING_NODE_NODE)).toBe(33);
    expect(imported.getProperty(InternalProperties.ORIGIN)).toBe(root);
    expect(imported.getNodes().get(0).getProperty(MrTreeOptions.PRIORITY)).toBe(7);
    expect(imported.getEdges().get(0).getProperty(MrTreeOptions.PRIORITY)).toBe(9);
    expect(imported.getEdges().get(0).getProperty(InternalProperties.ORIGIN)).toBe(edge);
  });
});

describe('applyLayout against the recorded applyLayout stops', () => {
  const replay = (row: StopsRow): ReturnType<typeof compareElk> | 'skipped' => {
    const built = buildBeforeGraphs(row, applyTransition(row)!);
    if (built === null) {
      return 'skipped';
    }
    new ElkGraphImporter().applyLayout(built.graphs[0]!);
    return compareElk(row.expected.stops.find((s) => s.step === STEP_APPLY)!.elk!, dumpElk(built.imported.root));
  };

  it('equals the recorded ELK result for every row that has the stop and a rebuildable pack state', () => {
    let compared = 0;
    let skipped = 0;
    for (const row of stopsRows.filter((r) => r.expected.stops.some((s) => s.step === STEP_APPLY))) {
      const outcome = replay(row);
      if (outcome === 'skipped') {
        skipped++;
      } else {
        expect(formatDifferences(outcome), row.id).toBe('');
        compared++;
      }
    }
    expect(compared + skipped).toBe(
      stopsRows.filter((r) => r.expected.stops.some((s) => s.step === STEP_APPLY)).length,
    );
    expect(compared).toBeGreaterThan(30);
  });

  it('throws the recorded IllegalArgumentException for an edge without bend points (edgeRoutingMode=NONE)', () => {
    const rows = stopsRows.filter(
      (r) => r.expected.throwsAt === STEP_APPLY && r.expected.throws!.class.endsWith('IllegalArgumentException'),
    );
    expect(rows.length).toBeGreaterThan(0);
    let thrown = 0;
    for (const row of rows) {
      const built = buildBeforeGraphs(row, applyTransition(row)!);
      if (built === null) {
        continue;
      }
      expect(() => new ElkGraphImporter().applyLayout(built.graphs[0]!), row.id).toThrow(IllegalArgumentException);
      expect(() => new ElkGraphImporter().applyLayout(built.graphs[0]!), row.id).toThrow(row.expected.throws!.message!);
      thrown++;
    }
    expect(thrown).toBeGreaterThan(0);
  });

  it('fails with a TypeError for the graph without nodes (the oracle NullPointerException at ElkGraphImporter.java:172)', () => {
    const row = stopsRows.find((r) => r.id === 'stops/default/emptyGraph')!;
    expect(row.expected.throws!.class).toBe('java.lang.NullPointerException');
    expect(row.expected.throws!.frame).toBe('ElkGraphImporter.java:172');
    expect(() => new ElkGraphImporter().applyLayout(new TGraph())).toThrow(TypeError);
  });
});

describe('applyLayout hand cases (ElkGraphImporter.java:154-203)', () => {
  function laidOut(fixed: boolean): { root: ElkNode; a: ElkNode } {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(MrTreeOptions.PADDING, new ElkPadding(1, 2, 3, 4));
    root.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, fixed);
    root.setDimensions(500, 400);
    const a = ElkGraphUtil.createNode(root);
    a.setDimensions(10, 20);
    const b = ElkGraphUtil.createNode(root);
    b.setDimensions(30, 40);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    const importer = new ElkGraphImporter();
    const tGraph = importer.importGraph(root);
    const [ta, tb] = [...tGraph.getNodes()];
    ta!.getPosition().x = 15;
    ta!.getPosition().y = 30;
    tb!.getPosition().x = 70;
    tb!.getPosition().y = 50;
    ta!.setProperty(MrTreeOptions.PRIORITY, 11);
    tGraph.getEdges().get(0).getBendPoints().add(new KVector(1, 2));
    tGraph.getEdges().get(0).getBendPoints().add(new KVector(3, 4));
    tGraph.getEdges().get(0).getBendPoints().add(new KVector(5, 6));
    importer.applyLayout(tGraph);
    expect([...edge.getSections()]).toHaveLength(1);
    return { root, a };
  }

  it('moves the nodes to the TNode positions, copies the TNode properties and the bend points, resizes and sets the child area', () => {
    const { root, a } = laidOut(false);
    expect([a.getX(), a.getY()]).toEqual([15, 30]);
    expect(a.getProperty(MrTreeOptions.PRIORITY)).toBe(11);
    const section = [...[...root.getContainedEdges()][0]!.getSections()][0]!;
    expect([section.getStartX(), section.getStartY(), section.getEndX(), section.getEndY()]).toEqual([1, 2, 5, 6]);
    expect([...section.getBendPoints()].map((p) => [p.getX(), p.getY()])).toEqual([[3, 4]]);
    // minX 15-5/... : node extents x in [10, 85], y in [20, 70] (centres 15/70, sizes 10..30 and 20..40, as set above)
    const childW = 70 + 30 / 2 - (15 - 10 / 2);
    const childH = 50 + 40 / 2 - (30 - 20 / 2);
    expect(root.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(childW);
    expect(root.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(childH);
    expect(root.getWidth()).toBe(childW + 6);
    expect(root.getHeight()).toBe(childH + 4);
  });

  it('keeps the graph size with nodeSize.fixedGraphSize but still sets the child area', () => {
    const { root } = laidOut(true);
    expect([root.getWidth(), root.getHeight()]).toEqual([500, 400]);
    expect(root.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBeGreaterThan(0);
  });

  it('skips a TNode whose ORIGIN is not an ElkNode and a TEdge without an ORIGIN', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    a.setDimensions(4, 4);
    const importer = new ElkGraphImporter();
    const tGraph = importer.importGraph(root);
    const node = tGraph.getNodes().get(0);
    node.setProperty(InternalProperties.ORIGIN, null);
    node.getPosition().x = 99;
    const other = new TNode(1, tGraph, '');
    tGraph.getNodes().add(other);
    tGraph.getEdges().add(new TEdge(node, other));
    importer.applyLayout(tGraph);
    expect(a.getX()).toBe(0);
  });
});

describe('toNodeBorder (private static, no caller upstream: ElkGraphImporter.java:213-228)', () => {
  const toNodeBorder = (center: KVector, next: KVector, size: KVector): void =>
    (ElkGraphImporter as unknown as Record<'toNodeBorder', (c: KVector, n: KVector, s: KVector) => void>).toNodeBorder(
      center,
      next,
      size,
    );

  it('scales the move to the border by the smaller of the two axis ratios, 1 inside the node', () => {
    const cases: [[number, number], [number, number], [number, number]][] = [
      [
        [0, 0],
        [10, 0],
        [2, 0],
      ],
      [
        [0, 0],
        [0, 10],
        [0, 2],
      ],
      [
        [0, 0],
        [10, 20],
        [1, 2],
      ],
      [
        [0, 0],
        [1, 1],
        [1, 1],
      ],
    ];
    for (const [center, next, expected] of cases) {
      const c = new KVector(center[0], center[1]);
      toNodeBorder(c, new KVector(next[0], next[1]), new KVector(4, 4));
      expect([c.x, c.y]).toEqual(expected);
    }
  });
});
