// SPDX-License-Identifier: EPL-2.0
// DebugUtil logs the DOT and the JSON debug graph of DotDebugUtil / JsonDebugUtil to the monitor (DebugUtil.java:48-121):
// the same tag for both, DOT first. The strings themselves are proven against the recorded rows in `DebugUtilLogged.test.ts`.
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { LoggedGraphType } from '../../core/util/LoggedGraph.js';
import { DebugUtil } from './DebugUtil.js';
import { DotDebugUtil } from './DotDebugUtil.js';
import { LGraph } from './graph/LGraph.js';
import { JsonDebugUtil } from './JsonDebugUtil.js';
import { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './p4nodes/LinearSegmentsNodePlacerLinearSegment.js';
import { HyperEdgeSegment } from './p5edges/orthogonal/HyperEdgeSegment.js';

/** What the monitor logged, as `[tag, type name, graph]` triples in order. */
function logged(monitor: BasicProgressMonitor): [string, string, unknown][] {
  return monitor.getLoggedGraphs()!.map((graph) => [graph.getTag(), graph.getGraphType().name(), graph.getGraph()]);
}

describe('DebugUtil', () => {
  const graph = new LGraph();
  const monitor = (): BasicProgressMonitor => new BasicProgressMonitor().withLogging(true);

  it('logDebugGraphSlot (Java logDebugGraph(monitor, lgraph, slotIndex, name)) logs DOT then JSON under slotIndex-name', () => {
    const target = monitor();
    DebugUtil.logDebugGraphSlot(target, graph, 3, 'slot');
    expect(logged(target)).toEqual([
      ['3-slot', LoggedGraphType.DOT.name(), DotDebugUtil.createDebugGraph(graph)],
      ['3-slot', LoggedGraphType.JSON.name(), JsonDebugUtil.createDebugGraph(graph)],
    ]);
  });

  it('logDebugGraphSegments (the segment-graph overload) logs DOT then JSON under "segment graph"', () => {
    const target = monitor();
    const segments = [new LinearSegment()];
    DebugUtil.logDebugGraphSegments(target, graph, segments, [[]]);
    expect(logged(target)).toEqual([
      ['segment graph', LoggedGraphType.DOT.name(), DotDebugUtil.createDebugGraphSegments(graph, segments, [[]])],
      ['segment graph', LoggedGraphType.JSON.name(), JsonDebugUtil.createDebugGraphSegments(graph, segments, [[]])],
    ]);
  });

  it('logDebugGraphHyperedges (the hypernode overload) logs DOT then JSON under "prefix - label"', () => {
    const target = monitor();
    const hypernodes = [new HyperEdgeSegment(null)];
    DebugUtil.logDebugGraphHyperedges(target, graph, 0, hypernodes, 'prefix', 'label');
    expect(logged(target)).toEqual([
      ['prefix - label', LoggedGraphType.DOT.name(), DotDebugUtil.createDebugGraphHyperedges(graph, hypernodes)],
      ['prefix - label', LoggedGraphType.JSON.name(), JsonDebugUtil.createDebugGraphHyperedges(graph, hypernodes)],
    ]);
  });
});
