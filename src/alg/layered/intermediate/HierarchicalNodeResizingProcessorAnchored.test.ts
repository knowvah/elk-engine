// SPDX-License-Identifier: EPL-2.0
// Anchored cases for `HierarchicalNodeResizingProcessor` (mission 7h, T15, H12/F12): recorded rows replayed through the real engine
// and the part of the recorded tree that one computation of the processor decides compared with it (doubles within AD-4, 1e-6): the
// size, offset and padding of the resized graph (`resizeGraph`, `resizeGraphNoReallyIMeanIt`), the size of the compound node that
// receives the layout, and its ports (`graphLayoutToNode`). Every literal is the row's. The movement of eastern and southern external
// ports (`moveExternalPorts`, Java :207-220) is not observed by any recorded field of a row; see plans/layered-compound/unreached.md.
import { describe, it, expect } from 'vitest';
import { loadCompoundRowsIfPresent } from '../../../../test/helpers/layered-compound-replay-rows.js';
import {
  actualFinalTree,
  actualStopTree,
  enumName,
  expectedTree,
  perGraph,
  projectionDiffs,
  vectorOf,
} from '../../../../test/helpers/layered-compound-anchored.js';
import type { TreeDump, TreeGraphDump } from '../../../../test/helpers/layered-compound-replay-dump.js';

const ROW_TIMEOUT_MS = 120_000;
const PORT_CONSTRAINTS = 'org.eclipse.elk.portConstraints';
const hasRef = loadCompoundRowsIfPresent().length > 0;

function sameProjection<T>(
  id: string,
  tree: 'final' | 'stop',
  pick: (graph: TreeGraphDump) => T,
  nonEmpty: (picked: T) => boolean,
): void {
  const actual: TreeDump = tree === 'final' ? actualFinalTree(id) : actualStopTree(id);
  const expected = perGraph(expectedTree(id), pick);
  expect(expected.some(([, picked]) => nonEmpty(picked))).toBe(true);
  expect(projectionDiffs(perGraph(actual, pick), expected)).toEqual([]);
}

const graphGeometry = (graph: TreeGraphDump): { size: number[]; offset: number[]; padding: number[] } => ({
  size: vectorOf(graph.size),
  offset: vectorOf(graph.offset),
  padding: graph.padding.map((side) => vectorOf([side])[0]!),
});

/** The compound nodes of a graph (those with a nested graph): their size and their ports' side and position. */
const compoundNodes = (graph: TreeGraphDump): [string, number[], [string, string, number[]][]][] =>
  graph.layerlessNodes
    .filter((node) => node.nested !== null)
    .map((node) => [
      node.path,
      vectorOf(node.size),
      node.ports.map((port): [string, string, number[]] => [port.path, port.side, vectorOf(port.pos)]),
    ]);

const compoundPortConstraints = (graph: TreeGraphDump): [string, string][] =>
  graph.layerlessNodes
    .filter((node) => node.nested !== null)
    .map((node) => [node.path, enumName(node.properties[PORT_CONSTRAINTS])]);

describe.skipIf(!hasRef)('HierarchicalNodeResizingProcessor anchored cases', () => {
  for (const stop of [
    'models/ticket-455_longHierarchicalEdges/2-/o-HierarchicalNodeResizingProcessor/default',
    'models/ticket-455_longHierarchicalEdges/3--HierarchicalNodeResizingProcessor/default',
  ]) {
    it(
      `resizes the graph and its offset at the stop ${stop.split('/').at(-2)} (Java :132-176)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: <stop>; HierarchicalNodeResizingProcessor.java:132-176
        sameProjection(stop, 'stop', graphGeometry, () => true);
      },
    );
  }

  it(
    'transfers the layout of the nested graphs to their compound nodes (Java :79-107)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/ticket-455_longHierarchicalEdges/3--HierarchicalNodeResizingProcessor/default; HierarchicalNodeResizingProcessor.java:79-107
      const id = 'models/ticket-455_longHierarchicalEdges/3--HierarchicalNodeResizingProcessor/default';
      sameProjection(id, 'stop', compoundNodes, (nodes) => nodes.length > 0);
    },
  );

  for (const [site, java] of [
    ['defaultMinimum', ':148-153'],
    ['minimumWithoutDefault', ':148'],
    ['fixedGraphSize', ':163'],
  ] as const) {
    it(`sizes the compound node with its minimum size, ${site} (Java ${java})`, { timeout: ROW_TIMEOUT_MS }, () => {
      // oracle: sites/HierarchicalNodeResizingProcessor/<site>; HierarchicalNodeResizingProcessor.java:132-176
      const id = `sites/HierarchicalNodeResizingProcessor/${site}`;
      sameProjection(id, 'final', graphGeometry, () => true);
      sameProjection(id, 'final', compoundNodes, (nodes) => nodes.length > 0);
    });
  }

  it(
    'fixes the ports of a compound node whose graph has external ports at the positions of their dummies (Java :79-107)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: scenarios/CompoundGraphPreprocessor/ports-fixed-side/RIGHT; HierarchicalNodeResizingProcessor.java:79-107
      const id = 'scenarios/CompoundGraphPreprocessor/ports-fixed-side/RIGHT';
      sameProjection(id, 'final', compoundNodes, (nodes) => nodes.some(([, , ports]) => ports.length > 0));
      sameProjection(id, 'final', compoundPortConstraints, (constraints) => constraints.length > 0);
    },
  );
});
