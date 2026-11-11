// SPDX-License-Identifier: EPL-2.0
// Support for the anchored cases of mission 7h (T15, H12, F12/F16): one recorded row of test/golden/refs/java/layered-compound.json is
// loaded by id, run through the real engine (`runRow`) and the tree at one hierarchical stop is read as the recorder's dump, so a case
// asserts on one decided part (a node's side, an edge's bend points, a graph's size) and takes every literal from the row's own
// `expected.tree`. Doubles of a dump are 16-hex-digit bit patterns (`dumpTree`); `doubleOf` decodes them and `AD4_TOLERANCE` is the
// bar for a coordinate (AD-4).
import { loadCompoundRows, type CompoundRow } from './layered-compound-replay-rows.js';
import { runRow, type RowRun, type StopRecord } from './layered-compound-replay-run.js';
import type { TreeDump, TreeGraphDump } from './layered-compound-replay-dump.js';
import type { EdgeDump, NodeDump } from './layered-framework-replay.js';

export const AD4_TOLERANCE = 1e-6;

let byId: ReadonlyMap<string, CompoundRow> | null = null;

/** The row with this id; an unknown id is a bug of the case. */
export function compoundRowById(id: string): CompoundRow {
  byId ??= new Map(loadCompoundRows().map((row) => [row.id, row] as const));
  const row = byId.get(id);
  if (row === undefined) {
    throw new Error(`no compound row ${id}`);
  }
  return row;
}

/** The tree a `models` row records at its stop, or a `scenarios`/`sites` row records at the last stop (the postprocessor). */
export function recordedTreeOf(row: CompoundRow): TreeDump {
  const expected = row.expected as { readonly tree?: unknown };
  if (expected.tree === undefined) {
    throw new Error(`row ${row.id} records no tree`);
  }
  return expected.tree as TreeDump;
}

/** The recorded stops of a `models` row's own stop: its index. */
export function recordedStopIndexOf(row: CompoundRow): number {
  const stop = (row.expected as { readonly stop?: { readonly index: number } }).stop;
  if (stop === undefined) {
    throw new Error(`row ${row.id} records no stop`);
  }
  return stop.index;
}

/** The run of a row, snapshotting the tree at every stop `wanted` selects. */
export function runWithTrees(row: CompoundRow, wanted: (stop: Omit<StopRecord, 'tree'>) => boolean): RowRun {
  return runRow(row as Parameters<typeof runRow>[0], { wantTree: wanted });
}

/** The tree at the stop with this index, which must have been reached. */
export function treeAtStop(row: CompoundRow, index: number): TreeDump {
  const run = runWithTrees(row, (stop) => stop.index === index);
  const tree = run.stops[index]?.tree;
  if (tree === undefined) {
    throw new Error(`row ${row.id}: stop ${String(index)} was not reached (${String(run.stops.length)} stops)`);
  }
  return tree as TreeDump;
}

/** The tree at the last stop, the compound postprocessor's. */
export function treeAtPostprocessor(row: CompoundRow): TreeDump {
  const run = runWithTrees(row, (stop) => stop.processor === 'CompoundGraphPostprocessor');
  const tree = run.stops.at(-1)?.tree;
  if (tree === undefined) {
    throw new Error(`row ${row.id}: the run did not end at the compound postprocessor`);
  }
  return tree as TreeDump;
}

/** The graph of the level path, which must exist. */
export function graphAt(tree: TreeDump, levelPath: string): TreeGraphDump {
  const graph = tree.graphs.find((candidate) => candidate.levelPath === levelPath);
  if (graph === undefined) {
    throw new Error(`no graph at level path ${levelPath}`);
  }
  return graph;
}

/** A dump double (16 hex digits of the IEEE 754 bits) as a number. */
export function doubleOf(bits: string): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, BigInt(`0x${bits}`));
  return view.getFloat64(0);
}

/** A dump vector (`[x, y]` doubles) as numbers. */
export const vectorOf = (bits: readonly string[]): number[] => bits.map(doubleOf);

// ------------------------------------------------------------------------------------------------------------
// memoised runs: one engine run per row and stop selector across the cases of a file

const finalTrees = new Map<string, TreeDump>();
const stopTrees = new Map<string, TreeDump>();

/** The tree this port records at the compound postprocessor of the row (run once per row id). */
export function actualFinalTree(id: string): TreeDump {
  let tree = finalTrees.get(id);
  if (tree === undefined) {
    tree = treeAtPostprocessor(compoundRowById(id));
    finalTrees.set(id, tree);
  }
  return tree;
}

/** The tree this port holds at the stop a `models` row records (run once per row id). */
export function actualStopTree(id: string): TreeDump {
  let tree = stopTrees.get(id);
  if (tree === undefined) {
    const row = compoundRowById(id);
    tree = treeAtStop(row, recordedStopIndexOf(row));
    stopTrees.set(id, tree);
  }
  return tree;
}

/** The recorded tree of a row. */
export const expectedTree = (id: string): TreeDump => recordedTreeOf(compoundRowById(id));

// ------------------------------------------------------------------------------------------------------------
// projections and the comparison of a projection

/** Every graph of a tree, projected: `[levelPath, pick(graph)]`. */
export const perGraph = <T>(tree: TreeDump, pick: (graph: TreeGraphDump) => T): [string, T][] =>
  tree.graphs.map((graph) => [graph.levelPath, pick(graph)]);

/** The nodes of one dump type (`NORMAL`, `EXTERNAL_PORT`, ...) of a graph, in the graph's order. */
export const nodesOfType = (graph: TreeGraphDump, type: string): readonly NodeDump[] =>
  graph.layerlessNodes.filter((node) => node.type === type);

/** The `n` (constant name) of a recorded enum property value. */
export const enumName = (value: unknown): string => (value as { readonly n: string }).n;

/** A recorded scalar property (`{ t: 'double', v: '1.0' }`) or an actual one (the number) as a number. */
export const numberOf = (value: unknown): number =>
  typeof value === 'number' ? value : Number((value as { readonly v: string }).v);

interface CoordinateProperty {
  readonly fields: { readonly x: { readonly v: string | number }; readonly y: { readonly v: string | number } };
}
interface ChainProperty {
  readonly items: readonly CoordinateProperty[];
}

/** A `KVector` property in the recorded form (`v` a decimal string) or the actual form (`v` a number), as `[x, y]`. */
export const vectorPropertyOf = (value: unknown): number[] => {
  const { x, y } = (value as CoordinateProperty).fields;
  return [Number(x.v), Number(y.v)];
};

/** A `KVectorChain` property in either form as its points. */
export const chainPropertyOf = (value: unknown): number[][] => (value as ChainProperty).items.map(vectorPropertyOf);

/** The edges of a graph with their bend points decoded. */
export const edgeBends = (graph: TreeGraphDump): [string, number[][]][] =>
  graph.edges.map((edge: EdgeDump) => [edge.path, edge.bendPoints.map(vectorOf)]);

/**
 * The differences of two projections (`[]`: the same): numbers within AD-4, everything else exactly. Each line names the path of the
 * difference, so a failing case says which part of the recorded tree it is.
 */
export function projectionDiffs(actual: unknown, expected: unknown, at = '$'): string[] {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(actual - expected) <= AD4_TOLERANCE
      ? []
      : [`${at}: expected ${String(expected)}, got ${String(actual)}`];
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const lengths =
      expected.length === actual.length
        ? []
        : [`${at}: expected ${String(expected.length)} items, got ${String(actual.length)}`];
    return [
      ...lengths,
      ...expected.flatMap((item, i) =>
        i < actual.length ? projectionDiffs(actual[i], item, `${at}[${String(i)}]`) : [],
      ),
    ];
  }
  if (expected !== null && typeof expected === 'object' && actual !== null && typeof actual === 'object') {
    return Object.keys(expected).flatMap((key) =>
      projectionDiffs(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${at}.${key}`,
      ),
    );
  }
  return Object.is(actual, expected)
    ? []
    : [`${at}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
}
