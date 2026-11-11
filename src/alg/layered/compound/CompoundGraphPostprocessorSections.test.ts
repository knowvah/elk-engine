// SPDX-License-Identifier: EPL-2.0
// Proof of CompoundGraphPostprocessorSections (mission 7h, T7), unit level: what follows from the Java text of
// `CompoundGraphPostprocessor.java` on small hand-built `LGraph` trees whose `CROSS_HIERARCHY_MAP` is built by hand. No
// numeric derivation (L4): points are copies of builder values, offsets are compared with `LGraphUtil.changeCoordSystem`
// (the Java's own primitive) called directly. The row replays are in `CompoundGraphPostprocessorSections.rows.test.ts`.
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LinkedHashMultimap } from '../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../guava/Multimap.js';
import { identity } from '../../../java/util/HashStrategy.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LLabel } from '../graph/LLabel.js';
import { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { processCompoundGraphPostprocessor } from './CompoundGraphPostprocessorSections.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

afterEach(() => {
  vi.restoreAllMocks();
});

type SegmentMap = Multimap<LEdge, CrossHierarchyEdge>;

const run = (graph: LGraph, order?: 'java' | 'reversed'): void =>
  processCompoundGraphPostprocessor(graph, new NullElkProgressMonitor(), order);

const pointsOf = (chain: KVectorChain): Array<[number, number]> => [...chain].map((p) => [p.x, p.y]);
const chainOf = (...points: Array<[number, number]>): KVectorChain => {
  const chain = new KVectorChain();
  for (const [x, y] of points) {
    chain.add(new KVector(x, y));
  }
  return chain;
};

/** A root graph with the (empty) cross-hierarchy map installed. */
function newRoot(): { readonly graph: LGraph; readonly map: SegmentMap } {
  const graph = new LGraph();
  const map: SegmentMap = LinkedHashMultimap.create<LEdge, CrossHierarchyEdge>(
    identity<LEdge>(),
    identity<CrossHierarchyEdge>(),
  );
  graph.setProperty(InternalProperties.CROSS_HIERARCHY_MAP, map);
  return { graph, map };
}

function portOn(graph: LGraph, x: number, y: number): LPort {
  const node = new LNode(graph);
  graph.getLayerlessNodes().push(node);
  const port = new LPort();
  port.setNode(node);
  port.getPosition().x = x;
  port.getPosition().y = y;
  return port;
}

/** A dummy edge between two fresh ports of `graph`, carrying the given bend points. */
function segment(
  graph: LGraph,
  bends: Array<[number, number]>,
  at: readonly [number, number] = [0, 0],
): { readonly edge: LEdge; readonly source: LPort; readonly target: LPort } {
  const source = portOn(graph, at[0], at[1]);
  const target = portOn(graph, at[0] + 1, at[1] + 1);
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  edge.getBendPoints().addAll(chainOf(...bends));
  return { edge, source, target };
}

function original(map: SegmentMap, ...segments: CrossHierarchyEdge[]): LEdge {
  const orig = new LEdge();
  for (const s of segments) {
    map.put(orig, s);
  }
  return orig;
}

describe('single segment', () => {
  it('re-attaches the original edge to the segment ports and detaches the dummy edge', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, [[10, 20]]);
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));

    run(graph);

    expect(orig.getSource()).toBe(seg.source);
    expect(orig.getTarget()).toBe(seg.target);
    expect(seg.edge.getSource()).toBeNull();
    expect(seg.edge.getTarget()).toBeNull();
    expect(pointsOf(orig.getBendPoints())).toEqual([[10, 20]]);
  });

  it('replaces stale bend points of the original edge with copies of the segment bend points', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, [[1, 2]]);
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));
    orig.getBendPoints().add(new KVector(99, 99));

    run(graph);

    expect(pointsOf(orig.getBendPoints())).toEqual([[1, 2]]);
    expect(orig.getBendPoints().getFirst()).not.toBe(seg.edge.getBendPoints().getFirst());
  });

  it('sets TARGET_OFFSET to a zero vector when the segment lives in the reference graph', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, []);
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));

    run(graph);

    const offset = orig.getProperty(InternalProperties.TARGET_OFFSET);
    expect([offset.x, offset.y]).toEqual([0, 0]);
  });
});

describe('joining two segments', () => {
  /** Two segments in the root graph: the second starts at (50, 50) and bends at (60, 70) or (50, 90). */
  function twoSegments(firstBend: [number, number], secondBend: [number, number], unnecessary: boolean) {
    const { graph, map } = newRoot();
    graph.setProperty(LayeredOptions.UNNECESSARY_BENDPOINTS, unnecessary);
    const first = segment(graph, [firstBend], [0, 0]);
    const second = segment(graph, [secondBend], [50, 50]);
    const orig = original(
      map,
      new CrossHierarchyEdge(first.edge, graph, PortType.OUTPUT),
      new CrossHierarchyEdge(second.edge, graph, PortType.OUTPUT),
    );
    run(graph);
    return { orig, second };
  }

  it('inserts the next segment source point when both coordinates differ', () => {
    const { orig, second } = twoSegments([10, 10], [60, 70], false);
    const anchor = second.source.getAbsoluteAnchor();

    expect(pointsOf(orig.getBendPoints())).toEqual([
      [10, 10],
      [anchor.x, anchor.y],
      [60, 70],
    ]);
  });

  it('omits the source point when only one coordinate differs and unnecessary bend points are off', () => {
    const { orig } = twoSegments([10, 10], [10, 70], false);

    expect(pointsOf(orig.getBendPoints())).toEqual([
      [10, 10],
      [10, 70],
    ]);
  });

  it('inserts the source point when only one coordinate differs and unnecessary bend points are on', () => {
    const { orig, second } = twoSegments([10, 10], [10, 70], true);
    const anchor = second.source.getAbsoluteAnchor();

    expect(pointsOf(orig.getBendPoints())).toEqual([
      [10, 10],
      [anchor.x, anchor.y],
      [10, 70],
    ]);
  });

  it('compares with the target point when the next segment has no bend points', () => {
    const { graph, map } = newRoot();
    const first = segment(graph, [[10, 10]], [0, 0]);
    const second = segment(graph, [], [50, 50]);
    const orig = original(
      map,
      new CrossHierarchyEdge(first.edge, graph, PortType.OUTPUT),
      new CrossHierarchyEdge(second.edge, graph, PortType.OUTPUT),
    );

    run(graph);

    const anchor = second.source.getAbsoluteAnchor();
    expect(pointsOf(orig.getBendPoints())).toEqual([
      [10, 10],
      [anchor.x, anchor.y],
    ]);
  });

  it('does not insert a point when no coordinate differs, even with unnecessary bend points on', () => {
    const { orig } = twoSegments([10, 10], [10, 10], true);

    expect(pointsOf(orig.getBendPoints())).toEqual([
      [10, 10],
      [10, 10],
    ]);
  });
});

describe('sorting of the segments', () => {
  it('sorts an output segment before an input segment whatever the map order', () => {
    const { graph, map } = newRoot();
    const input = segment(graph, []);
    const output = segment(graph, []);
    const orig = original(
      map,
      new CrossHierarchyEdge(input.edge, graph, PortType.INPUT),
      new CrossHierarchyEdge(output.edge, graph, PortType.OUTPUT),
    );

    run(graph);

    expect(orig.getSource()).toBe(output.source);
    expect(orig.getTarget()).toBe(input.target);
  });

  it("order 'reversed' reverses the values before the sort, so equal segments swap", () => {
    const build = (): { graph: LGraph; orig: LEdge; a: ReturnType<typeof segment>; b: ReturnType<typeof segment> } => {
      const { graph, map } = newRoot();
      const a = segment(graph, []);
      const b = segment(graph, []);
      const orig = original(
        map,
        new CrossHierarchyEdge(a.edge, graph, PortType.OUTPUT),
        new CrossHierarchyEdge(b.edge, graph, PortType.OUTPUT),
      );
      return { graph, orig, a, b };
    };

    const java = build();
    run(java.graph, 'java');
    expect(java.orig.getSource()).toBe(java.a.source);
    expect(java.orig.getTarget()).toBe(java.b.target);

    const reversed = build();
    run(reversed.graph, 'reversed');
    expect(reversed.orig.getSource()).toBe(reversed.b.source);
    expect(reversed.orig.getTarget()).toBe(reversed.a.target);
  });
});

describe('hierarchy: reference graph and target offset', () => {
  /** A root with node N holding a nested graph H (offset, padding and node position set) with node C. */
  function nested() {
    const { graph, map } = newRoot();
    const outer = new LNode(graph);
    graph.getLayerlessNodes().push(outer);
    outer.getPosition().x = 7;
    outer.getPosition().y = 11;
    const inner = new LGraph();
    inner.setParentNode(outer);
    outer.setNestedGraph(inner);
    inner.getOffset().x = 3;
    inner.getOffset().y = 5;
    inner.getPadding().left = 13;
    inner.getPadding().top = 17;
    const sourcePort = new LPort();
    sourcePort.setNode(outer);
    const child = new LNode(inner);
    inner.getLayerlessNodes().push(child);
    const targetPort = new LPort();
    targetPort.setNode(child);
    return { graph, map, inner, sourcePort, targetPort };
  }

  it('uses the nested graph as reference when the target is a descendant of the source node', () => {
    const { graph, map, inner, sourcePort, targetPort } = nested();
    const edge = new LEdge();
    edge.setSource(sourcePort);
    edge.setTarget(targetPort);
    edge.getBendPoints().add(new KVector(1, 2));
    const orig = original(map, new CrossHierarchyEdge(edge, graph, PortType.INPUT));

    run(graph);

    const offset = new KVector();
    LGraphUtil.changeCoordSystem(offset, graph, inner);
    expect(pointsOf(orig.getBendPoints())).toEqual([[1 + offset.x, 2 + offset.y]]);
    // the target port lives in `inner`, not in the segment graph: the offset is recomputed
    const recomputed = new KVector();
    LGraphUtil.changeCoordSystem(recomputed, inner, inner);
    const targetOffset = orig.getProperty(InternalProperties.TARGET_OFFSET);
    expect([targetOffset.x, targetOffset.y]).toEqual([recomputed.x, recomputed.y]);
    expect([offset.x, offset.y]).not.toEqual([recomputed.x, recomputed.y]);
  });

  it('keeps the segment offset as TARGET_OFFSET when the target port is in the segment graph', () => {
    const { graph, map, inner, sourcePort, targetPort } = nested();
    const edge = new LEdge();
    edge.setSource(sourcePort);
    edge.setTarget(targetPort);
    const orig = original(map, new CrossHierarchyEdge(edge, inner, PortType.INPUT));

    run(graph);

    const expected = new KVector();
    LGraphUtil.changeCoordSystem(expected, inner, inner);
    const targetOffset = orig.getProperty(InternalProperties.TARGET_OFFSET);
    expect([targetOffset.x, targetOffset.y]).toEqual([expected.x, expected.y]);
  });

  it('does not set TARGET_OFFSET for a segment that does not end at the final target', () => {
    const { graph, map } = newRoot();
    const first = segment(graph, []);
    const second = segment(graph, []);
    const orig = original(
      map,
      new CrossHierarchyEdge(first.edge, graph, PortType.OUTPUT),
      new CrossHierarchyEdge(second.edge, graph, PortType.OUTPUT),
    );
    const setProperty = vi.spyOn(orig, 'setProperty');

    run(graph);

    const targetOffsetSets = setProperty.mock.calls.filter(
      ([property]) => property === InternalProperties.TARGET_OFFSET,
    );
    expect(targetOffsetSets).toHaveLength(1);
    expect(orig.getTarget()).toBe(second.target);
  });
});

describe('junction points', () => {
  const JUNCTIONS = LayeredOptions.JUNCTION_POINTS;

  it('removes the junction points of the original edge when no segment has any', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, []);
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));
    orig.setProperty(JUNCTIONS, chainOf([1, 1]));

    run(graph);

    expect(orig.hasProperty(JUNCTIONS)).toBe(false);
  });

  it('treats an empty segment chain as no junction points', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, []);
    seg.edge.setProperty(JUNCTIONS, new KVectorChain());
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));
    orig.setProperty(JUNCTIONS, chainOf([1, 1]));

    run(graph);

    expect(orig.hasProperty(JUNCTIONS)).toBe(false);
  });

  it('copies the segment junction points into the chain attached to the original edge', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, []);
    seg.edge.setProperty(JUNCTIONS, chainOf([4, 5], [6, 7]));
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));

    run(graph);

    // `getProperty` attaches a clone of the default to the holder, so the chain returned at `:207` is the edge's own
    expect(pointsOf(orig.getProperty(JUNCTIONS))).toEqual([
      [4, 5],
      [6, 7],
    ]);
    expect(orig.getProperty(JUNCTIONS)).not.toBe(seg.edge.getProperty(JUNCTIONS));
  });

  it('clears and refills the existing chain of the original edge in place', () => {
    const { graph, map } = newRoot();
    const first = segment(graph, []);
    const second = segment(graph, []);
    first.edge.setProperty(JUNCTIONS, chainOf([4, 5]));
    second.edge.setProperty(JUNCTIONS, chainOf([8, 9]));
    const orig = original(
      map,
      new CrossHierarchyEdge(first.edge, graph, PortType.OUTPUT),
      new CrossHierarchyEdge(second.edge, graph, PortType.OUTPUT),
    );
    const existing = chainOf([1, 1]);
    orig.setProperty(JUNCTIONS, existing);

    run(graph);

    expect(orig.getProperty(JUNCTIONS)).toBe(existing);
    expect(pointsOf(existing)).toEqual([
      [4, 5],
      [8, 9],
    ]);
  });
});

describe('labels', () => {
  it('moves only the labels that originate from the original edge', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, []);
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));
    const mine = new LLabel('mine');
    mine.setProperty(InternalProperties.ORIGINAL_LABEL_EDGE, orig);
    const foreign = new LLabel('foreign');
    foreign.setProperty(InternalProperties.ORIGINAL_LABEL_EDGE, new LEdge());
    const plain = new LLabel('plain');
    const mine2 = new LLabel('mine2');
    mine2.setProperty(InternalProperties.ORIGINAL_LABEL_EDGE, orig);
    seg.edge.getLabels().push(mine, foreign, plain, mine2);

    run(graph);

    expect(orig.getLabels().map((l) => l.getText())).toEqual(['mine', 'mine2']);
    expect(seg.edge.getLabels().map((l) => l.getText())).toEqual(['foreign', 'plain']);
  });

  it('transforms the label position into the reference graph', () => {
    const { graph, map } = newRoot();
    const seg = segment(graph, []);
    const orig = original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT));
    const label = new LLabel('x');
    label.getPosition().x = 2;
    label.getPosition().y = 3;
    label.setProperty(InternalProperties.ORIGINAL_LABEL_EDGE, orig);
    seg.edge.getLabels().push(label);

    run(graph);

    const expected = new KVector(2, 3);
    LGraphUtil.changeCoordSystem(expected, graph, graph);
    expect([label.getPosition().x, label.getPosition().y]).toEqual([expected.x, expected.y]);
  });
});

describe('shared dummy edges and iteration order', () => {
  it('removes a dummy edge used by several original edges only once, after all of them are done', () => {
    const { graph, map } = newRoot();
    const shared = segment(graph, [[3, 3]]);
    const chEdge = new CrossHierarchyEdge(shared.edge, graph, PortType.OUTPUT);
    const first = original(map, chEdge);
    const second = original(map, chEdge);
    const clears = vi.spyOn(LEdge.prototype, 'setSource');

    run(graph);

    expect(pointsOf(first.getBendPoints())).toEqual([[3, 3]]);
    expect(pointsOf(second.getBendPoints())).toEqual([[3, 3]]);
    expect(shared.edge.getSource()).toBeNull();
    expect(clears.mock.calls.filter(([port]) => port === null)).toHaveLength(1);
  });

  /** The edges whose `setSource` was called (with null: the removals, else: the restorations), in call order. */
  function setSourceOrder(order: 'java' | 'reversed'): {
    restored: LEdge[];
    removed: LEdge[];
    origs: LEdge[];
    dummies: LEdge[];
  } {
    const { graph, map } = newRoot();
    const origs: LEdge[] = [];
    const dummies: LEdge[] = [];
    for (let i = 0; i < 3; i++) {
      const seg = segment(graph, []);
      dummies.push(seg.edge);
      origs.push(original(map, new CrossHierarchyEdge(seg.edge, graph, PortType.OUTPUT)));
    }
    const restored: LEdge[] = [];
    const removed: LEdge[] = [];
    const spy = vi.spyOn(LEdge.prototype, 'setSource').mockImplementation(function (this: LEdge, port: LPort | null) {
      (port === null ? removed : restored).push(this);
    });
    run(graph, order);
    spy.mockRestore();
    return { restored, removed, origs, dummies };
  }

  it('visits the keys and removes the dummy edges in insertion order', () => {
    const { restored, removed, origs, dummies } = setSourceOrder('java');

    expect(restored).toEqual(origs);
    expect(removed).toEqual(dummies);
  });

  it("order 'reversed' reverses the key iteration and the dummy edge removal", () => {
    const { restored, removed, origs, dummies } = setSourceOrder('reversed');

    expect(restored).toEqual([...origs].reverse());
    expect(removed).toEqual([...dummies].reverse());
  });
});
