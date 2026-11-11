// SPDX-License-Identifier: EPL-2.0
// The order of the segments of a cross-hierarchy edge: each `CROSS_HIERARCHY_MAP` list recorded in the compound ref
// (`expected.tree.crossHierarchyMap`, segments stably sorted by `CrossHierarchyEdgeComparator(root)` over the Java's
// insertion order) is rebuilt as real `LGraph`s (the nesting from the dumped `nested` links), `LEdge`s and
// `CrossHierarchyEdge`s, reversed, sorted with the ported comparator, and must come out in the recorded order.
// Branches the recorded lists do not reach (no list has two segments of one type on one level; no segment sits outside the
// root): the tie returning 0 and the IllegalArgumentException, tested below from the Java's structure only.
import { describe, expect, it } from 'vitest';
import {
  describeCompound,
  isCompoundModelsRow,
  isCompoundScenarioRow,
  loadCompoundRowsIfPresent,
} from '../../../../test/helpers/layered-compound-replay-rows.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { PortType } from '../options/PortType.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { CrossHierarchyEdgeComparator } from './CrossHierarchyEdgeComparator.js';

interface RecordedSegment {
  readonly edge: string;
  readonly graph: string;
  readonly type: string;
}
interface RecordedKey {
  readonly origEdge: string;
  readonly segments: readonly RecordedSegment[];
}
interface RecordedNode {
  readonly nested: string | null;
}
interface RecordedTree {
  readonly graphs: readonly {
    readonly path: string;
    readonly layerlessNodes: readonly RecordedNode[];
    readonly layerNodes: readonly RecordedNode[];
  }[];
  readonly crossHierarchyMap: readonly RecordedKey[] | null;
}

/** The recorded graph paths as `LGraph`s, nested as dumped; the root is the graph no node nests. */
function rebuildGraphs(tree: RecordedTree): { readonly root: LGraph; readonly byPath: Map<string, LGraph> } {
  const byPath = new Map<string, LGraph>(tree.graphs.map((graph) => [graph.path, new LGraph()]));
  const nestedPaths = new Set<string>();
  for (const dumped of tree.graphs) {
    for (const node of [...dumped.layerlessNodes, ...dumped.layerNodes]) {
      if (node.nested !== null) {
        const parent = new LNode(byPath.get(dumped.path)!);
        const child = byPath.get(node.nested)!;
        parent.setNestedGraph(child);
        child.setParentNode(parent);
        nestedPaths.add(node.nested);
      }
    }
  }
  const rootPath = tree.graphs.map((graph) => graph.path).find((path) => !nestedPaths.has(path))!;
  return { root: byPath.get(rootPath)!, byPath };
}

const typeOf = (name: string): PortType => PortType.valueOf(name);
const describeSegment = (segment: CrossHierarchyEdge, paths: Map<LGraph, string>): string =>
  `${segment.getType().toString()}:${paths.get(segment.getGraph())!}`;

const rows = [...loadCompoundRowsIfPresent('models'), ...loadCompoundRowsIfPresent('scenarios')];
/** One row per distinct sorted (type, graph) list, so every shape of recorded list is replayed once. */
const shapes = new Map<string, { readonly id: string; readonly tree: RecordedTree; readonly key: RecordedKey }>();
for (const row of rows) {
  if (!isCompoundModelsRow(row) && !isCompoundScenarioRow(row)) {
    continue;
  }
  const tree = row.expected.tree as RecordedTree;
  for (const key of tree.crossHierarchyMap ?? []) {
    const shape = `${row.id.split('/')[1]}|${key.segments.map((s) => `${s.type}:${s.graph}`).join(' ')}`;
    if (!shapes.has(shape)) {
      shapes.set(shape, { id: row.id, tree, key });
    }
  }
}

describeCompound('CrossHierarchyEdgeComparator sorts the recorded cross-hierarchy segment lists', () => {
  it('has recorded lists with both types and several levels', () => {
    const lists = [...shapes.values()].map(({ key }) => key.segments);
    expect(lists.some((list) => list.some((s) => s.type === 'OUTPUT') && list.some((s) => s.type === 'INPUT'))).toBe(
      true,
    );
    expect(lists.some((list) => list.length >= 4)).toBe(true);
  });

  it.each([...shapes.entries()])('reproduces the recorded order of %s', (_shape, { tree, key }) => {
    const { root, byPath } = rebuildGraphs(tree);
    const paths = new Map<LGraph, string>([...byPath.entries()].map(([path, graph]) => [graph, path]));
    const segments = key.segments.map((s) => new CrossHierarchyEdge(new LEdge(), byPath.get(s.graph)!, typeOf(s.type)));
    const sorted = [...segments].reverse().sort((a, b) => new CrossHierarchyEdgeComparator(root).compare(a, b));
    expect(sorted.map((s) => describeSegment(s, paths))).toEqual(key.segments.map((s) => `${s.type}:${s.graph}`));
  });
});

describe('CrossHierarchyEdgeComparator (the Java structure)', () => {
  /** root > a (nested in a node of root) > b (nested in a node of a). */
  function chain(): { root: LGraph; a: LGraph; b: LGraph } {
    const root = new LGraph();
    const a = new LGraph();
    const b = new LGraph();
    const nodeInRoot = new LNode(root);
    nodeInRoot.setNestedGraph(a);
    a.setParentNode(nodeInRoot);
    const nodeInA = new LNode(a);
    nodeInA.setNestedGraph(b);
    b.setParentNode(nodeInA);
    return { root, a, b };
  }

  it('returns 0 for two segments of one type on one level (insertion order then decides)', () => {
    const { root, a } = chain();
    const comparator = new CrossHierarchyEdgeComparator(root);
    const first = new CrossHierarchyEdge(new LEdge(), a, PortType.INPUT);
    const second = new CrossHierarchyEdge(new LEdge(), a, PortType.INPUT);
    expect(comparator.compare(first, second)).toBe(0);
    expect(
      comparator.compare(
        new CrossHierarchyEdge(new LEdge(), a, PortType.OUTPUT),
        new CrossHierarchyEdge(new LEdge(), a, PortType.OUTPUT),
      ),
    ).toBe(0);
  });

  it('puts output segments before input segments and orders by the level difference', () => {
    const { root, a, b } = chain();
    const comparator = new CrossHierarchyEdgeComparator(root);
    const out = new CrossHierarchyEdge(new LEdge(), root, PortType.OUTPUT);
    const input = new CrossHierarchyEdge(new LEdge(), root, PortType.INPUT);
    expect(comparator.compare(out, input)).toBe(-1);
    expect(comparator.compare(input, out)).toBe(1);
    const deepIn = new CrossHierarchyEdge(new LEdge(), b, PortType.INPUT);
    const shallowIn = new CrossHierarchyEdge(new LEdge(), a, PortType.INPUT);
    expect(comparator.compare(shallowIn, deepIn)).toBe(-1);
    expect(comparator.compare(deepIn, shallowIn)).toBe(1);
    const deepOut = new CrossHierarchyEdge(new LEdge(), b, PortType.OUTPUT);
    const shallowOut = new CrossHierarchyEdge(new LEdge(), a, PortType.OUTPUT);
    expect(comparator.compare(deepOut, shallowOut)).toBe(-1);
    expect(comparator.compare(shallowOut, deepOut)).toBe(1);
  });

  it('throws when a segment graph is not below the top-level graph', () => {
    const { root } = chain();
    const stray = new CrossHierarchyEdge(new LEdge(), new LGraph(), PortType.INPUT);
    const ok = new CrossHierarchyEdge(new LEdge(), root, PortType.INPUT);
    expect(() => new CrossHierarchyEdgeComparator(root).compare(stray, ok)).toThrow(IllegalArgumentException);
  });
});
