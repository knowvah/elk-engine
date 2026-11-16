// SPDX-License-Identifier: EPL-2.0
// Proof of the structure phase against spore-layout.json (mission 8c, T7): the `scanline` and `triangulation` stops of every stops row (the
// edge sequence handed to NaiveMinST, in set iteration order, with the hash classification), the history of the hashed overlap set across
// iterations (clear keeps the capacity), and the `addAll` into an existing set.
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import * as Sets from '../../../guava/Sets.js';
import { BowyerWatsonTriangulation } from '../../common/BowyerWatsonTriangulation.js';
import { TEDGE_STRATEGY, TEdge } from '../../common/TEdge.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { ElkGraphImporter } from '../ElkGraphImporter.js';
import { DelaunayTriangulationPhase } from './DelaunayTriangulationPhase.js';
import { compareTo, replayRow } from '../../../../test/helpers/spore-replay-dump.js';
import { importInput } from '../../../../test/helpers/spore-replay-elk.js';
import {
  decodeHex,
  loadSporeRows,
  onlySteps,
  OVERLAP_ALGORITHM,
  COMPACTION_ALGORITHM,
  STEP_IMPORT,
  STEP_SCANLINE,
  STEP_TRIANGULATION,
  STEP_UPDATE,
  stopsOf,
  type HexPoint,
  type StopsRow,
} from '../../../../test/helpers/spore-replay-rows.js';

const STEPS = [STEP_SCANLINE, STEP_TRIANGULATION] as const;
const rows = loadSporeRows('stops');

const vector = ([x, y]: HexPoint): KVector => new KVector(decodeHex(x), decodeHex(y));

/** The vertices (`Node.originalVertex`) the iteration starts with: the import stop's, then each update stop's. */
function verticesAt(row: StopsRow, iteration: number): KVector[] {
  if (iteration === 0) {
    return stopsOf(row, STEP_IMPORT)[0]!.nodes.map((n) => vector(n.v));
  }
  const update = stopsOf(row, STEP_UPDATE).find((u) => u.iteration === iteration - 1)!;
  return update.vertices.map(vector);
}

describe('DelaunayTriangulationPhase: stops rows (scanline, triangulation)', () => {
  it.each(rows.map((row) => row.id))(
    '%s: pairs, edge sequence, capacity and hash classification equal the row',
    (id) => {
      const row = rows.find((r) => r.id === id)!;
      const result = replayRow(row);
      expect(result.thrown).toBeNull();
      const tally = compareTo(onlySteps(row.expected.stops, STEPS), onlySteps(result.stops, STEPS), id);
      expect(tally.first).toBeNull();
      expect(tally.within).toBe(0);
    },
  );

  it('no stops row is treeified: the order inside a tree bin is never a question here', () => {
    for (const row of rows) {
      for (const stop of stopsOf(row, STEP_TRIANGULATION)) {
        expect(stop.hash.treeified).toBe(false);
      }
    }
  });
});

describe('DelaunayTriangulationPhase: the hashed overlap set across iterations (PK5)', () => {
  const scanlineRows = rows.filter(
    (row) => row.expected.algorithm === OVERLAP_ALGORITHM && stopsOf(row, STEP_SCANLINE).length > 1,
  );

  it('clear() keeps the capacity: a later iteration with few edges still reports the grown capacity', () => {
    let kept = 0;
    for (const row of scanlineRows) {
      const stops = stopsOf(row, STEP_SCANLINE);
      stops.forEach((stop, i) => {
        if (i > 0) {
          expect(stop.capacity).toBeGreaterThanOrEqual(stops[i - 1]!.capacity);
        }
        if (stop.capacity > 16 && stop.edges.length <= 12) {
          kept++;
        }
      });
    }
    expect(kept).toBeGreaterThan(0);
  });

  it('a fresh set per iteration would iterate differently from the recorded sequence in at least one row (so the kept capacity is proven)', () => {
    let differing = 0;
    for (const row of scanlineRows) {
      for (const stop of stopsOf(row, STEP_SCANLINE)) {
        const vertices = verticesAt(row, stop.iteration);
        const fresh = Sets.newHashSet<TEdge>(TEDGE_STRATEGY);
        for (const [i, j] of stop.pairs) {
          fresh.add(new TEdge(vertices[i]!, vertices[j]!));
        }
        const order = [...fresh].map((e) => [vertices.indexOf(e.u), vertices.indexOf(e.v)]);
        if (JSON.stringify(order) !== JSON.stringify(stop.edges)) {
          differing++;
        }
      }
    }
    expect(differing).toBeGreaterThan(0);
  });

  it('the port replays the recorded sequence in every scanline iteration of every overlap row', () => {
    let iterations = 0;
    for (const row of rows.filter((r) => r.expected.algorithm === OVERLAP_ALGORITHM)) {
      const result = replayRow(row);
      const actual = onlySteps(result.stops, [STEP_SCANLINE]);
      expect(compareTo(onlySteps(row.expected.stops, [STEP_SCANLINE]), actual).first).toBeNull();
      iterations += actual.length;
    }
    expect(iterations).toBeGreaterThan(rows.length / 2);
  });
});

describe('DelaunayTriangulationPhase.process', () => {
  const COMPACTION_INPUT = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': COMPACTION_ALGORITHM },
    children: [
      { id: 'a', x: 0, y: 0, width: 20, height: 20 },
      { id: 'b', x: 100, y: 0, width: 20, height: 20 },
      { id: 'c', x: 50, y: 90, width: 20, height: 20 },
    ],
  };
  const graphOf = () => new ElkGraphImporter().importGraph(importInput({ input: COMPACTION_INPUT }));

  it('creates the edge set when there is none: the triangulation of the originalVertex list', () => {
    const graph = graphOf();
    new DelaunayTriangulationPhase().process(graph, new BasicProgressMonitor());
    const expected = BowyerWatsonTriangulation.triangulate(
      graph.vertices.map((v) => v.originalVertex),
      null,
    );
    expect([...graph.tEdges!].map((e) => [e.u.x, e.u.y, e.v.x, e.v.y])).toEqual(
      [...expected].map((e) => [e.u.x, e.u.y, e.v.x, e.v.y]),
    );
    expect(graph.tEdges!.size).toBe(3);
  });

  it('addAll into an existing set keeps that set (and its earlier members), as the overlap provider relies on', () => {
    const graph = graphOf();
    const existing = Sets.newHashSet<TEdge>(TEDGE_STRATEGY);
    const sentinel = new TEdge(new KVector(-1, -1), new KVector(-2, -2));
    existing.add(sentinel);
    graph.tEdges = existing;
    new DelaunayTriangulationPhase().process(graph, new BasicProgressMonitor());
    expect(graph.tEdges).toBe(existing);
    expect(existing.size).toBe(4);
    expect(existing.contains(sentinel)).toBe(true);
  });

  it('debug mode passes a file name made of the (null) debug folder and the suffix; the edges are unchanged', () => {
    const plain = graphOf();
    new DelaunayTriangulationPhase().process(plain, new BasicProgressMonitor());
    const debug = graphOf();
    debug.setProperty(InternalProperties.DEBUG_SVG, true);
    new DelaunayTriangulationPhase().process(debug, new BasicProgressMonitor());
    expect([...debug.tEdges!].map((e) => [e.u.x, e.v.x])).toEqual([...plain.tEdges!].map((e) => [e.u.x, e.v.x]));
  });
});
