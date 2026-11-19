// SPDX-License-Identifier: EPL-2.0
// Proof of GrowTreePhase against spore-layout.json (mission 8c, T7): the `grow` stop of every overlap stops row (node vertices and rectangle
// corners, overlapsExisted per iteration), plus the phase on graphs the rows do not build.
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import { ElkGraphImporter } from '../ElkGraphImporter.js';
import { DelaunayTriangulationPhase } from '../p1structure/DelaunayTriangulationPhase.js';
import { MinSTPhase } from '../p2processingorder/MinSTPhase.js';
import { GrowTreePhase } from './GrowTreePhase.js';
import { compareTo, replayRow } from '../../../../test/helpers/spore-replay-dump.js';
import { importInput } from '../../../../test/helpers/spore-replay-elk.js';
import {
  loadSporeRows,
  onlySteps,
  OVERLAP_ALGORITHM,
  STEP_GROW,
  stopsOf,
} from '../../../../test/helpers/spore-replay-rows.js';

const rows = loadSporeRows('stops').filter((row) => row.expected.algorithm === OVERLAP_ALGORITHM);
const withGrow = rows.filter((row) => stopsOf(row, STEP_GROW).length > 0);

describe('GrowTreePhase: grow stops', () => {
  // 24 rows until e7eaea57: stops/overlap/scanlineHitboxes/default is new (eclipse-elk/elk#1244; #104, D4) and has grow stops
  it('the ref has grow stops in 19 of its 25 overlap stops rows (the other six have no overlap, or no iteration, to grow)', () => {
    expect(rows).toHaveLength(25);
    expect(rows.filter((row) => !withGrow.includes(row)).map((row) => row.id)).toEqual([
      'stops/overlap/deco10/underlyingForce',
      'stops/overlap/deco10/underlyingLayered',
      'stops/overlap/deco10/underlyingFullId',
      'stops/overlap/deco10/maxIter0',
      'stops/overlap/sparse8/default',
      'stops/overlap/single1/default',
    ]);
  });

  it.each(withGrow.map((row) => row.id))(
    '%s: node vertices, rectangle corners and overlapsExisted equal the row',
    (id) => {
      const row = withGrow.find((r) => r.id === id)!;
      const result = replayRow(row);
      expect(result.thrown).toBeNull();
      const tally = compareTo(onlySteps(row.expected.stops, [STEP_GROW]), onlySteps(result.stops, [STEP_GROW]), id);
      expect(tally.first).toBeNull();
      expect(tally.within).toBe(0);
    },
  );

  it('the last grow stop of a row that ended by convergence reports overlapsExisted false', () => {
    const converged = withGrow.filter((row) => {
      const grows = stopsOf(row, STEP_GROW);
      return !grows[grows.length - 1]!.overlapsExisted;
    });
    expect(converged.length).toBeGreaterThan(0);
  });
});

describe('GrowTreePhase.process', () => {
  const FAR = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': OVERLAP_ALGORITHM },
    children: [
      { id: 'a', x: 0, y: 0, width: 20, height: 20 },
      { id: 'b', x: 200, y: 0, width: 20, height: 20 },
    ],
  };
  const NEAR = { ...FAR, children: [FAR.children[0], { id: 'b', x: 5, y: 0, width: 20, height: 20 }] };

  const grow = (input: Record<string, unknown>, debug = false) => {
    const graph = new ElkGraphImporter().importGraph(importInput({ input }));
    graph.setProperty(InternalProperties.DEBUG_SVG, debug);
    new DelaunayTriangulationPhase().process(graph, new BasicProgressMonitor());
    new MinSTPhase().process(graph, new BasicProgressMonitor());
    new GrowTreePhase().process(graph, new BasicProgressMonitor());
    return graph;
  };

  it('nodes that do not overlap stay where they are and OVERLAPS_EXISTED becomes false', () => {
    const graph = grow(FAR);
    expect(graph.getProperty(InternalProperties.OVERLAPS_EXISTED)).toBe(false);
    const b = graph.vertices[1]!;
    expect(b.vertex).toEqual(b.originalVertex);
  });

  it('overlapping nodes are pushed apart along the tree edge and OVERLAPS_EXISTED becomes true', () => {
    const graph = grow(NEAR);
    expect(graph.getProperty(InternalProperties.OVERLAPS_EXISTED)).toBe(true);
    const [a, b] = graph.vertices as [(typeof graph.vertices)[number], (typeof graph.vertices)[number]];
    expect(b.vertex.x - a.vertex.x).toBeGreaterThan(b.originalVertex.x - a.originalVertex.x);
    expect(b.vertex.y).toBe(b.originalVertex.y);
  });

  it('the debug SVG path (never written in the browser-safe port) gives the same placement', () => {
    const plain = grow(NEAR);
    const debug = grow(NEAR, true);
    expect(debug.vertices.map((n) => [n.vertex.x, n.vertex.y])).toEqual(
      plain.vertices.map((n) => [n.vertex.x, n.vertex.y]),
    );
  });
});
