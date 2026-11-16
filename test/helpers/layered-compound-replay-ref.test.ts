// SPDX-License-Identifier: EPL-2.0
// What is verified against the REAL ref test/golden/refs/java/layered-compound.json (mission 7h, T2; adapted by T8 after the wiring), structure only (L4: no
// layout literal; every expectation is derived from the ref itself or is a fact of the recorder's header):
//   - the loader parses the file, its rowCounts hold and every row passes the row typing;
//   - every row's input loads, its options apply (null removals included) and the level paths of the imported hierarchy equal the keys
//     of `expected.plans` / the level paths of `expected.tree.graphs`;
//   - every models run begins at index 0 with the CompoundGraphPreprocessor on the root level (the replay of every row through the
//     engine is `src/alg/layered/LayeredCompoundVectors.test.ts`, T9);
//   - structural facts of the recorded trees the dump twin relies on: field sets, path numbering, property id exclusions, hex numbers,
//     nested links, edge ownership, cross-hierarchy map entries;
//   - the TS dump of the tree at stop 0 of a real run (the real preprocessor, no spy) has the recorded graph paths, level paths, nested
//     links and field sets, so the dump twin and the stop numbering at index 0 agree with the recorder.
// The ref is 9 MB: it is parsed once per file (the loader caches). The suite skips with the landed message when the ref is absent.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { levelsOf, levelPathOf } from './layered-pipeline-replay-ops.js';
import {
  COMPOUND_ROW_GROUPS,
  compoundRefPath,
  compoundRowCountsDifference,
  describeCompound,
  isCompoundFullRow,
  isCompoundModelsRow,
  isCompoundScenarioRow,
  loadCompoundRowsIfPresent,
  type CompoundModelsRow,
  type CompoundRow,
  type CompoundScenarioRow,
} from './layered-compound-replay-rows.js';
import { isSiteThrowRow } from './layered-compound-replay-sites.js';
import { treeIgnoredIds, type TreeDump } from './layered-compound-replay-dump.js';
import { COMPOUND_PREPROCESSOR, prepareRow, runRow, type RunnableRow } from './layered-compound-replay-run.js';

const rows = loadCompoundRowsIfPresent();
const HEX_DOUBLE = /^[0-9a-f]{16}$/;
const PORT_TYPES = ['INPUT', 'OUTPUT', 'UNDEFINED'];
const GRAPH_KEYS = [
  'edges',
  'layerNodes',
  'layerlessNodes',
  'layers',
  'levelPath',
  'offset',
  'padding',
  'path',
  'properties',
  'size',
];
const NODE_KEYS = ['labels', 'margin', 'nested', 'padding', 'path', 'pos', 'ports', 'properties', 'size', 'type'];
const PORT_KEYS = [
  'anchor',
  'connectedToExternalNodes',
  'explicitAnchor',
  'incoming',
  'labels',
  'margin',
  'outgoing',
  'path',
  'pos',
  'properties',
  'side',
  'size',
];
const EDGE_KEYS = ['bendPoints', 'labels', 'path', 'properties', 'source', 'target'];
const LABEL_KEYS = ['path', 'pos', 'properties', 'size', 'text'];
const TREE_KEYS = ['crossHierarchyMap', 'graphs'];

type Obj = Record<string, unknown>;
interface Graph extends Obj {
  path: string;
  levelPath: string;
  properties: Obj;
  layerlessNodes: Node[];
  layerNodes: Node[];
  layers: string[][];
  edges: Edge[];
}
interface Node extends Obj {
  path: string;
  nested: string | null;
  properties: Obj;
  ports: Port[];
  labels: Label[];
}
interface Port extends Obj {
  path: string;
  properties: Obj;
  labels: Label[];
  incoming: string[];
  outgoing: string[];
}
interface Edge extends Obj {
  path: string;
  source: string | null;
  target: string | null;
  bendPoints: string[][];
  properties: Obj;
  labels: Label[];
}
interface Label extends Obj {
  path: string;
  properties: Obj;
}

const keysOf = (value: object): string[] => Object.keys(value).sort();
const treeOf = (row: CompoundRow): TreeDump => (row.expected as { tree: TreeDump }).tree;
const models = rows.filter(isCompoundModelsRow);
const scenarios = rows.filter(isCompoundScenarioRow);
// a `sites` run or logged row carries the scenarios row's tree (T14): the structural checks cover it too
const siteTreeRows = rows.filter(
  (r) => r.group === 'sites' && 'tree' in r.expected,
) as unknown as CompoundScenarioRow[];
const treeRows: (CompoundModelsRow | CompoundScenarioRow)[] = [...models, ...scenarios, ...siteTreeRows];
const graphsOf = (row: CompoundRow): Graph[] => treeOf(row).graphs as unknown as Graph[];

function elementsOf(graph: Graph): { kind: string; element: Obj & { properties: Obj } }[] {
  const out: { kind: string; element: Obj & { properties: Obj } }[] = [{ kind: 'graph', element: graph }];
  const labels = (owner: { labels: Label[] }): void =>
    owner.labels.forEach((l) => out.push({ kind: 'label', element: l }));
  for (const node of [...graph.layerlessNodes, ...graph.layerNodes]) {
    out.push({ kind: 'node', element: node });
    labels(node);
    for (const port of node.ports) {
      out.push({ kind: 'port', element: port });
      labels(port);
    }
  }
  for (const edge of graph.edges) {
    out.push({ kind: 'edge', element: edge });
    labels(edge);
  }
  return out;
}

const isRaw = (value: unknown): boolean => typeof value === 'string' && HEX_DOUBLE.test(value);
const hexList = (value: unknown): boolean => Array.isArray(value) && value.every(isRaw);

describeCompound('layered-compound ref: loader and rows', () => {
  it('parses the file, its rowCounts hold and every row passes the row typing', () => {
    const header = JSON.parse(readFileSync(compoundRefPath(), 'utf8')) as { rowCounts: unknown };
    expect(compoundRowCountsDifference(header.rowCounts, rows)).toBeNull();
    expect(COMPOUND_ROW_GROUPS.reduce((sum, g) => sum + rows.filter((r) => r.group === g).length, 0)).toBe(rows.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    const sites = rows.filter((r) => r.group === 'sites');
    expect(rows.filter(isCompoundFullRow).length + models.length + scenarios.length + sites.length).toBe(rows.length);
    const declared = Object.values(header.rowCounts as Record<string, number>);
    expect(declared.reduce((sum, n) => sum + n, 0)).toBe(rows.length);
    expect(declared).toHaveLength(COMPOUND_ROW_GROUPS.length);
  });

  it('applies every row options on the root and finds the level paths of the recorded plans / trees', () => {
    const failures: string[] = [];
    for (const row of rows) {
      const levels = levelsOf(prepareRow(row as RunnableRow))
        .map(levelPathOf)
        .sort();
      if (isSiteThrowRow(row)) {
        // a throws row (T14) records no plans or tree: the imported input must still hold levels (the root at least)
        if (levels.length === 0) {
          failures.push(row.id);
        }
        continue;
      }
      const recorded = isCompoundModelsRow(row)
        ? [...new Set(graphsOf(row).map((g) => g.levelPath))]
        : Object.keys((row.expected as { plans: object }).plans);
      if (JSON.stringify(levels) !== JSON.stringify(recorded.sort())) {
        failures.push(row.id);
      }
    }
    expect(failures).toEqual([]);
  });

  it('removes the property of a null option value on the root', () => {
    const nullRows = rows.filter((row) => Object.values(row.options).some((value) => value === null));
    expect(nullRows.length).toBeGreaterThan(0);
    for (const row of nullRows) {
      const ids = new Set([...prepareRow(row as RunnableRow).getAllProperties()].map(([property]) => property.getId()));
      for (const [id, value] of Object.entries(row.options)) {
        expect(value === null && ids.has(id)).toBe(false);
      }
    }
  });
});

describeCompound('layered-compound ref: the engine route', () => {
  it('begins every models run at index 0 with the CompoundGraphPreprocessor on the root level', () => {
    const [first] = models.filter((row) => row.expected.stop.index === 0);
    expect(first).toBeDefined();
    for (const row of models.filter((r) => r.expected.stop.index === 0)) {
      expect(row.expected.stop.processor).toBe(COMPOUND_PREPROCESSOR);
      expect(row.expected.stop.className).toBe(COMPOUND_PREPROCESSOR);
    }
  });
});

describeCompound('layered-compound ref: structure of the recorded trees', () => {
  it('has the field sets of each element kind and no ignored property id', () => {
    const ignored = treeIgnoredIds();
    const kinds: Record<string, string[]> = {
      graph: GRAPH_KEYS,
      node: NODE_KEYS,
      port: PORT_KEYS,
      edge: EDGE_KEYS,
      label: LABEL_KEYS,
    };
    const failures: string[] = [];
    for (const row of treeRows) {
      if (JSON.stringify(keysOf(treeOf(row))) !== JSON.stringify(TREE_KEYS)) {
        failures.push(`${row.id}: tree keys`);
      }
      for (const graph of graphsOf(row)) {
        for (const { kind, element } of elementsOf(graph)) {
          const ids = Object.keys(element.properties);
          const sorted = [...ids].sort();
          if (
            JSON.stringify(keysOf(element)) !== JSON.stringify([...kinds[kind]!].sort()) ||
            ids.some((id) => ignored.has(id))
          ) {
            failures.push(`${row.id}: ${kind} ${String(element.path)}`);
          }
          if (JSON.stringify(ids) !== JSON.stringify(sorted)) {
            failures.push(`${row.id}: ${kind} ${String(element.path)} properties not sorted`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('has layerNodes in every graph: exactly the paths of the layers in order, none of them layerless', () => {
    const failures: string[] = [];
    let graphCount = 0;
    for (const row of treeRows) {
      for (const graph of graphsOf(row)) {
        graphCount++;
        if (!Array.isArray(graph.layerNodes)) {
          failures.push(`${row.id}: ${graph.path} has no layerNodes`);
          continue;
        }
        const layerless = new Set(graph.layerlessNodes.map((n) => n.path));
        const listed = graph.layers.flat().filter((path) => !layerless.has(path));
        if (JSON.stringify(graph.layerNodes.map((n) => n.path)) !== JSON.stringify(graph.layers.flat())) {
          failures.push(`${row.id}: ${graph.path} layerNodes paths differ from layers`);
        }
        if (listed.length !== graph.layerNodes.length || graph.layerNodes.some((n) => layerless.has(n.path))) {
          failures.push(`${row.id}: ${graph.path} a path is in both layerlessNodes and layerNodes`);
        }
      }
    }
    expect(graphCount).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  it('writes every number as 16 lower-case hex digits', () => {
    const failures: string[] = [];
    for (const row of treeRows) {
      for (const graph of graphsOf(row)) {
        const numbers: unknown[] = [graph.size, graph.padding, graph.offset];
        for (const { kind, element } of elementsOf(graph)) {
          const fields = ['pos', 'size', 'margin', 'padding', 'anchor'].filter((f) => f in element && kind !== 'graph');
          numbers.push(...fields.map((f) => element[f]));
          if (kind === 'edge') {
            numbers.push(...(element as Edge).bendPoints);
          }
        }
        if (!numbers.every(hexList)) {
          failures.push(`${row.id}: ${graph.path}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('numbers graphs, nodes, ports, labels, layers and edges positionally, as the header says', () => {
    const failures: string[] = [];
    for (const row of treeRows) {
      graphsOf(row).forEach((graph, k) => {
        const g = `g${String(k)}`;
        const bad: boolean[] = [
          graph.path !== g,
          graph.layerlessNodes.some((n, i) => n.path !== `${g}/n${String(i)}`),
          graph.edges.some((e, m) => e.path !== `${g}/e${String(m)}`),
          graph.layers.some((layer) => layer.some((path) => !path.startsWith(`${g}/n`))),
          graph.layerlessNodes.some((n) => n.ports.some((p, j) => p.path !== `${n.path}/p${String(j)}`)),
          graph.layerlessNodes.some((n) => n.labels.some((l, i) => l.path !== `${n.path}/l${String(i)}`)),
          graph.edges.some((e) => e.labels.some((l, i) => l.path !== `${e.path}/l${String(i)}`)),
          graph.layerlessNodes.some((n) =>
            n.ports.some((p) => p.labels.some((l, i) => l.path !== `${p.path}/l${String(i)}`)),
          ),
        ];
        if (bad.includes(true)) {
          failures.push(`${row.id}: ${g}`);
        }
      });
    }
    expect(failures).toEqual([]);
  });

  it('links nested graphs forward in pre-order, each at most once, and gives an edge to the first graph that meets it', () => {
    const failures: string[] = [];
    for (const row of treeRows) {
      const graphs = graphsOf(row);
      const index = (path: string): number => Number(path.slice(1).split('/')[0]);
      const linked = graphs.flatMap((g, k) =>
        g.layerlessNodes.flatMap((n) => (n.nested === null ? [] : [[k, index(n.nested)]])),
      );
      const targets = linked.map(([, to]) => to!);
      const ascendingPerGraph = graphs.every((_, k) => {
        const own = linked.filter(([from]) => from === k).map(([, to]) => to!);
        return own.every((to, i) => i === 0 || to > own[i - 1]!);
      });
      if (new Set(targets).size !== targets.length || linked.some(([from, to]) => to! <= from!) || !ascendingPerGraph) {
        failures.push(`${row.id}: nested links`);
      }
      graphs.forEach((graph, k) => {
        for (const edge of graph.edges) {
          const touched = [edge.source, edge.target].filter((p): p is string => p !== null).map(index);
          if (touched.length > 0 && Math.min(...touched) !== k) {
            failures.push(`${row.id}: ${edge.path} is not in the first graph that meets it`);
          }
        }
      });
    }
    expect(failures).toEqual([]);
  });

  it('has references and map entries that resolve inside the tree (or use the header fallbacks)', () => {
    const failures: string[] = [];
    for (const row of treeRows) {
      const graphs = graphsOf(row);
      const edges = new Set(graphs.flatMap((g) => g.edges.map((e) => e.path)));
      const ports = new Set(graphs.flatMap((g) => g.layerlessNodes.flatMap((n) => n.ports.map((p) => p.path))));
      const graphPaths = new Set(graphs.map((g) => g.path));
      for (const graph of graphs) {
        for (const edge of graph.edges) {
          const ends = [edge.source, edge.target].filter((p): p is string => p !== null);
          if (ends.some((end) => !ports.has(end) && !/^g\d+\//.test(end))) {
            failures.push(`${row.id}: ${edge.path} end`);
          }
        }
      }
      const map = (treeOf(row) as { crossHierarchyMap: null | { origEdge: string; segments: Obj[] }[] })
        .crossHierarchyMap;
      (map ?? []).forEach((entry, k) => {
        if (!edges.has(entry.origEdge) && entry.origEdge !== `orig/${String(k)}`) {
          failures.push(`${row.id}: origEdge ${entry.origEdge}`);
        }
        entry.segments.forEach((segment, i) => {
          const okEdge = edges.has(segment.edge as string) || segment.edge === `seg/${String(k)}/${String(i)}`;
          const okFields = JSON.stringify(keysOf(segment)) === JSON.stringify(['edge', 'graph', 'type']);
          if (
            !okEdge ||
            !okFields ||
            !graphPaths.has(segment.graph as string) ||
            !PORT_TYPES.includes(segment.type as string)
          ) {
            failures.push(`${row.id}: segment ${String(k)}/${String(i)}`);
          }
        });
      });
    }
    expect(failures).toEqual([]);
  });

  it('records the origin of each graph as an ELK reference and a map that is set after the first stop', () => {
    const failures: string[] = [];
    for (const row of treeRows) {
      if (treeOf(row).crossHierarchyMap === null) {
        failures.push(`${row.id}: no map`);
      }
      for (const graph of graphsOf(row)) {
        const origin = graph.properties.origin as { elk?: unknown } | undefined;
        if (origin === undefined || !('elk' in origin)) {
          failures.push(`${row.id}: ${graph.path} origin`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describeCompound('layered-compound ref: the dump twin on a real imported tree', () => {
  it('has the recorded graph paths, level paths, nested links and field sets at stop 0 of a real run', () => {
    const first = models.filter((row) => row.expected.stop.index === 0);
    expect(first.length).toBeGreaterThan(0);
    const nestedOf = (graphs: Graph[]): (string | null)[] =>
      graphs.flatMap((g) => g.layerlessNodes.map((n) => n.nested));
    for (const row of first) {
      const run = runRow(row as RunnableRow, { wantTree: () => true, abortAfter: 0 });
      const actual = (run.stops[0]!.tree as TreeDump).graphs as unknown as Graph[];
      const recorded = graphsOf(row);
      expect(actual.map((g) => [g.path, g.levelPath])).toEqual(recorded.map((g) => [g.path, g.levelPath]));
      expect(nestedOf(actual).filter((p) => p !== null)).toEqual(nestedOf(recorded).filter((p) => p !== null));
      expect(keysOf(actual[0]!)).toEqual(keysOf(recorded[0]!));
      expect(Object.keys(actual[0]!.properties)).toEqual(Object.keys(recorded[0]!.properties));
      expect(keysOf(actual[0]!.layerlessNodes[0]!)).toEqual(keysOf(recorded[0]!.layerlessNodes[0]!));
      // before the layering every node is layerless: layerNodes is empty on both sides
      expect(actual.map((g) => g.layerNodes)).toEqual(recorded.map(() => []));
      expect(recorded.map((g) => g.layerNodes)).toEqual(recorded.map(() => []));
    }
  });
});
