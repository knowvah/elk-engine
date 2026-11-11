// SPDX-License-Identifier: EPL-2.0
// Proof of EdgeRouter (mission 8a, T15): `process` from the recorded Untreeifyer stop to the recorded EdgeRouter stop for every
// transition of the ref whose before state can be rebuilt (bend points included), plus Java-traced hand cases
// (EdgeRouter.java:77-95, 164-171, 391).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { Direction } from '../../../core/options/Direction.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { EdgeRoutingMode } from '../options/EdgeRoutingMode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { EdgeRouter } from './EdgeRouter.js';
import { avoidOverlapSpecialEdges } from './EdgeRouterSpecialEdges.js';

describe('EdgeRouter.process against the recorded stops (acceptance)', () => {
  it('equals the EdgeRouter stop of every rebuildable transition', { timeout: 60_000 }, () => {
    const replay = replayStep('EdgeRouter', () => new EdgeRouter());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(9);
    expect(replay.replayed.length).toBe(79);

    const combos = new Set(
      replay.replayed.map(
        (r) =>
          `${r.graph.getProperty(MrTreeOptions.EDGE_ROUTING_MODE).name()}/${r.graph.getProperty(MrTreeOptions.DIRECTION).name()}`,
      ),
    );
    expect([...combos].sort()).toEqual([
      'AVOID_OVERLAP/DOWN',
      'AVOID_OVERLAP/LEFT',
      'AVOID_OVERLAP/RIGHT',
      'AVOID_OVERLAP/UP',
      'MIDDLE_TO_MIDDLE/DOWN',
      'NONE/DOWN',
      'NONE/RIGHT',
    ]);
    // buildBeforeGraphs restores NodePlacer.java:103-105 (UNDEFINED becomes DOWN), so no replayed graph reads UNDEFINED

    const level = (n: TNode): number => n.getProperty(MrTreeOptions.TREE_LEVEL);
    const multiLevel = replay.replayed.filter(
      (r) =>
        r.graph.getProperty(MrTreeOptions.EDGE_ROUTING_MODE) === EdgeRoutingMode.AVOID_OVERLAP &&
        [...r.graph.getEdges()].some((e) => level(e.getTarget()!) - level(e.getSource()!) > 1),
    );
    expect(multiLevel.length).toBeGreaterThan(0);
  });
});

describe('EdgeRouter hand cases', () => {
  it('asks for LEVEL_COORDS, COMPACTION_PROC and GRAPH_BOUNDS_PROC before phase 4 (EdgeRouter.java:59-72)', () => {
    const config = new EdgeRouter().getLayoutProcessorConfiguration(new TGraph());
    expect([...config.processorsBefore(TreeLayoutPhases.P4_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.LEVEL_COORDS,
      IntermediateProcessorStrategy.COMPACTION_PROC,
      IntermediateProcessorStrategy.GRAPH_BOUNDS_PROC,
    ]);
    expect(config.processorsBefore(TreeLayoutPhases.P1_TREEIFICATION).size).toBe(0);
    expect(new EdgeRouter().getLayoutProcessorConfiguration(new TGraph())).toBe(config);
  });

  it('NONE leaves the bend points alone', () => {
    const { g, es } = graphOf(2, [[0, 1]]);
    g.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.NONE);
    runOn(new EdgeRouter(), g);
    expect(es[0]!.getBendPoints().size()).toBe(0);
  });

  it('AVOID_OVERLAP without a root node throws NoSuchElementException (TreeUtil.getRoot, EdgeRouter.java:141)', () => {
    const { g } = graphOf(2, [[0, 1]]);
    g.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.AVOID_OVERLAP);
    expect(() => runOn(new EdgeRouter(), g)).toThrow(NoSuchElementException);
  });

  it('a node without label is a NullPointerException at the SUPER_ROOT check (EdgeRouter.java:391; D10: TypeError)', () => {
    const g = new TGraph();
    g.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.AVOID_OVERLAP);
    const root = new TNode(0, g);
    root.setProperty(InternalProperties.ROOT, true);
    g.getNodes().add(root);
    expect(() => new EdgeRouter().process(g, new NullElkProgressMonitor())).toThrow(TypeError);
  });

  it('avoidOverlapSpecialEdges on a graph without nodes throws NoSuchElementException (max().get(), EdgeRouter.java:169-171)', () => {
    const g = new TGraph();
    const root = new TNode(0, g, 'n0');
    expect(() => avoidOverlapSpecialEdges(g, root, Direction.DOWN, 3, 0)).toThrow(NoSuchElementException);
  });
});
