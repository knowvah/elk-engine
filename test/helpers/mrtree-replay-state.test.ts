// SPDX-License-Identifier: EPL-2.0
// Tests of the isolated-step replay state (mrtree-replay-state.ts): the imported row, the rebuilt "before" graphs of a transition (templates,
// ORIGIN resolution, the refused states) and dumpElk, with mutation checks on the replayed ELK graph. Expectations are the recorded rows.
import { describe, expect, it } from 'vitest';
import { ElkGraphImporter } from '../../src/alg/mrtree/ElkGraphImporter.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import { InternalProperties } from '../../src/alg/mrtree/options/InternalProperties.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { isElkNode } from '../../src/graph/ElkNode.js';
import { compareElk, dumpTGraph, nodeRef } from './mrtree-replay-dump.js';
import {
  STEP_APPLY,
  STEP_IMPORT,
  STEP_PACK,
  STEP_SPLIT,
  decodeHex,
  loadStopsRows,
  transitionsOf,
  type StopsRow,
} from './mrtree-replay-rows.js';
import {
  buildBeforeGraphs,
  buildOptionsFor,
  dumpElk,
  importRowInput,
  parseRowInput,
  registerMrTree,
} from './mrtree-replay-state.js';

const rows = loadStopsRows();
const rowById = (id: string): StopsRow => rows.find((r) => r.id === id)!;

describe('importRowInput', () => {
  it('registers the mrtree options once and parses the row input to its root with the options set', () => {
    registerMrTree();
    registerMrTree();
    const root = parseRowInput(rowById('stops/weighting/forest/weighting=FAN').input);
    expect(root.getProperty(MrTreeOptions.WEIGHTING).toString()).toBe('FAN');
    expect(root.getIdentifier()).toBe('root');
  });

  it('imports through the ported importer: one TNode per child, ORIGIN the ElkNode, maps by identifier', () => {
    const imported = importRowInput(rowById('stops/default/path6').input);
    expect(imported.tGraph.getNodes().size()).toBe(6);
    expect(imported.tGraph.getProperty(InternalProperties.ORIGIN)).toBe(imported.root);
    expect([...imported.elkNodes.keys()]).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
    expect([...imported.elkEdges.keys()]).toHaveLength(5);
  });

  it('runs NodeMicroLayout before the import unless OMIT_NODE_MICRO_LAYOUT: labeled nodes have the sizes the import stop records', () => {
    const labeled = rows.filter((r) => r.id.includes('labeled'));
    expect(labeled.length).toBeGreaterThan(0);
    for (const row of labeled) {
      const recorded = row.expected.stops.find((s) => s.step === STEP_IMPORT)!.graphs[0]!;
      const dumped = dumpTGraph(importRowInput(row.input).tGraph);
      expect(
        dumped.nodes.map((n) => [n.w, n.h]),
        row.id,
      ).toEqual(recorded.nodes.map((n) => [n.w, n.h]));
    }
  });
});

describe('buildBeforeGraphs', () => {
  const row = rowById('stops/spacing/forest/spacingNodeNode=33.0');

  it('is null for the import (nothing precedes it)', () => {
    expect(buildBeforeGraphs(row, transitionsOf(row)[0]!)).toBeNull();
  });

  it('rebuilds the split graphs with the importer-only properties from the templates and real ORIGIN elements', () => {
    const transition = transitionsOf(row).find((t) => t.step === 'DFSTreeifyer' && t.comp === 0)!;
    const built = buildBeforeGraphs(row, transition)!;
    expect(built.graphs).toHaveLength(1);
    const graph = built.graphs[0]!;
    // SPACING_NODE_NODE is not dumped: it comes from the template (the row sets 33)
    expect(graph.getProperty(MrTreeOptions.SPACING_NODE_NODE)).toBe(33);
    expect(graph.getProperty(InternalProperties.ORIGIN)).toBe(built.imported.root);
    const node = graph.getNodes().get(0);
    expect(isElkNode(node.getProperty(InternalProperties.ORIGIN))).toBe(true);
    expect(node.getProperty(InternalProperties.ORIGIN)).toBe(built.imported.elkNodes.get(nodeRef(node)));
    expect(dumpTGraph(graph)).toEqual(transition.before![0]);
  });

  it('rebuilds the graph of every component for pack (one per component, in component order)', () => {
    const forest = rowById('stops/default/forest');
    const pack = transitionsOf(forest).find((t) => t.step === STEP_PACK)!;
    const built = buildBeforeGraphs(forest, pack)!;
    expect(built.graphs).toHaveLength(4);
    expect(built.graphs.map((g) => dumpTGraph(g))).toEqual(pack.before);
  });

  // Whole-ref loop (every transition re-imports its row input): 1.6 s alone, over the 5 s default under v8 coverage at load.
  it('returns null for the states whose in-edge order is not dumped and counts them', { timeout: 60_000 }, () => {
    let rebuilt = 0;
    let refused = 0;
    for (const r of rows) {
      for (const t of transitionsOf(r)) {
        if (t.before === null) {
          continue;
        }
        if (buildBeforeGraphs(r, t) === null) {
          refused++;
        } else {
          rebuilt++;
        }
      }
    }
    expect(refused).toBeGreaterThan(0);
    expect(rebuilt).toBeGreaterThan(refused);
  });

  it('refuses an ORIGIN that is not an element of the input', () => {
    const imported = importRowInput(row.input);
    const options = buildOptionsFor(imported);
    expect(() => options.origin!('node', 'nope')).toThrow('ORIGIN node "nope"');
    expect(options.origin!('graph', 'root')).toBe(imported.root);
  });
});

describe('dumpElk', () => {
  const rowName = 'stops/default/path6';
  const apply = (): { elk: ReturnType<typeof dumpElk>; root: ReturnType<typeof importRowInput>['root'] } => {
    const row = rowById(rowName);
    const transition = transitionsOf(row).find((t) => t.step === STEP_APPLY)!;
    const built = buildBeforeGraphs(row, transition)!;
    new ElkGraphImporter().applyLayout(built.graphs[0]!);
    return { elk: dumpElk(built.imported.root), root: built.imported.root };
  };
  const recorded = rowById(rowName).expected.stops.find((s) => s.step === STEP_APPLY)!.elk!;

  it('has the recorder shape: the root first, then the children; childArea null before any layout', () => {
    const imported = importRowInput(rowById(rowName).input);
    const elk = dumpElk(imported.root);
    expect(elk.nodes.map((n) => n.id)).toEqual(['root', 'n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
    expect(elk.edges).toHaveLength(5);
    expect(elk.graph.childAreaWidth).toBeNull();
    expect(elk.graph.childAreaHeight).toBeNull();
    expect(elk.edges[0]!.sections).toEqual([]);
  });

  it('equals the recorded ELK result after applyLayout of the recorded pack state', () => {
    expect(compareElk(recorded, apply().elk)).toEqual([]);
  });

  it('names a perturbed root size, child area, node position, section end and bend point', () => {
    const { elk, root } = apply();
    expect(decodeHex(elk.graph.childAreaWidth!)).toBeGreaterThan(0);
    root.setWidth(root.getWidth() + 1);
    root.setProperty(CoreOptions.CHILD_AREA_HEIGHT, root.getProperty(CoreOptions.CHILD_AREA_HEIGHT) + 1);
    const child = [...root.getChildren()][2]!;
    child.setX(child.getX() + 1);
    const section = [...[...root.getContainedEdges()][0]!.getSections()][0]!;
    section.setEndY(section.getEndY() + 1);
    const bend = [...section.getBendPoints()][0];
    if (bend !== undefined) {
      bend.setX(bend.getX() + 1);
    }
    const paths = compareElk(recorded, dumpElk(root)).map((d) => d.path);
    expect(paths).toContain('elk.graph.w');
    expect(paths).toContain('elk.graph.childAreaHeight');
    expect(paths).toContain('elk.nodes[3:n2].x');
    expect(paths).toContain('elk.edges[0:e0].sections[0].end.y');
  });
});

describe('transitions the replays rely on', () => {
  it('every stops row has one split and a before for every processor stop', () => {
    for (const r of rows) {
      const ts = transitionsOf(r);
      expect(ts.filter((t) => t.step === STEP_SPLIT).length, r.id).toBeLessThanOrEqual(1);
      for (const t of ts.filter((x) => x.comp >= 0)) {
        expect(t.before, `${r.id} ${t.step}`).not.toBeNull();
      }
    }
  });
});
