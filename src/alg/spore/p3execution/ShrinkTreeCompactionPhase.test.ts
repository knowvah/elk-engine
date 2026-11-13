// SPDX-License-Identifier: EPL-2.0
// Proof of ShrinkTreeCompactionPhase against spore-layout.json (mission 8c, T7): the `compaction` stop of every compaction stops row (node
// vertices and rectangle corners after DepthFirstCompaction, `ran` false for at most one vertex), plus the debug path.
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import { ElkGraphImporter } from '../ElkGraphImporter.js';
import { DelaunayTriangulationPhase } from '../p1structure/DelaunayTriangulationPhase.js';
import { MinSTPhase } from '../p2processingorder/MinSTPhase.js';
import { ShrinkTreeCompactionPhase } from './ShrinkTreeCompactionPhase.js';
import { compareTo, replayRow } from '../../../../test/helpers/spore-replay-dump.js';
import { importInput } from '../../../../test/helpers/spore-replay-elk.js';
import {
  COMPACTION_ALGORITHM,
  loadSporeRows,
  onlySteps,
  STEP_COMPACTION,
  stopsOf,
} from '../../../../test/helpers/spore-replay-rows.js';

const rows = loadSporeRows('stops').filter((row) => row.expected.algorithm === COMPACTION_ALGORITHM);

describe('ShrinkTreeCompactionPhase: compaction stops', () => {
  it('the ref has 36 compaction stops rows, one of which (a single vertex) skips the phases', () => {
    expect(rows).toHaveLength(36);
    expect(rows.filter((row) => !stopsOf(row, STEP_COMPACTION)[0]!.ran).map((row) => row.id)).toEqual([
      'stops/compaction/single1/default',
    ]);
  });

  it.each(rows.map((row) => row.id))('%s: node vertices and rectangle corners equal the row', (id) => {
    const row = rows.find((r) => r.id === id)!;
    const result = replayRow(row);
    expect(result.thrown).toBeNull();
    const tally = compareTo(
      onlySteps(row.expected.stops, [STEP_COMPACTION]),
      onlySteps(result.stops, [STEP_COMPACTION]),
      id,
    );
    expect(tally.first).toBeNull();
    expect(tally.within).toBe(0);
  });
});

describe('ShrinkTreeCompactionPhase.process', () => {
  const INPUT = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': COMPACTION_ALGORITHM },
    children: [
      { id: 'a', x: 0, y: 0, width: 20, height: 20 },
      { id: 'b', x: 200, y: 0, width: 20, height: 20 },
    ],
  };
  const compact = (debug: boolean) => {
    const graph = new ElkGraphImporter().importGraph(importInput({ input: INPUT }));
    graph.setProperty(InternalProperties.DEBUG_SVG, debug);
    new DelaunayTriangulationPhase().process(graph, new BasicProgressMonitor());
    new MinSTPhase().process(graph, new BasicProgressMonitor());
    new ShrinkTreeCompactionPhase().process(graph, new BasicProgressMonitor());
    return graph;
  };
  const positions = (graph: ReturnType<typeof compact>) => graph.vertices.map((n) => [n.vertex.x, n.rect.x]);

  it('closes the gap between two distant nodes: the child ends nearer to the root than it started', () => {
    const graph = compact(false);
    const [a, b] = graph.vertices as [(typeof graph.vertices)[number], (typeof graph.vertices)[number]];
    expect(b.vertex.x - a.vertex.x).toBeLessThan(b.originalVertex.x - a.originalVertex.x);
  });

  it('the debug SVG path (never written in the browser-safe port) gives the same placement', () => {
    expect(positions(compact(true))).toEqual(positions(compact(false)));
  });
});
