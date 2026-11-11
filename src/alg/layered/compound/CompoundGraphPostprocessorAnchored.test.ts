// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the compound graph postprocessor (mission 7h, T15, H12/F12): one recorded row of
// test/golden/refs/java/layered-compound.json is replayed through the real engine and one part of the recorded tree that a branch of
// `CompoundGraphPostprocessorSections.ts` decides is compared (doubles within AD-4, 1e-6): the bend points of the rebuilt original
// edges (segment order, joining, offsets), `TARGET_OFFSET`, the junction points and the labels copied back. Every literal is the row's.
import { describe, it, expect } from 'vitest';
import { loadCompoundRowsIfPresent } from '../../../../test/helpers/layered-compound-replay-rows.js';
import {
  actualFinalTree,
  actualStopTree,
  chainPropertyOf,
  edgeBends,
  expectedTree,
  perGraph,
  projectionDiffs,
  vectorOf,
  vectorPropertyOf,
} from '../../../../test/helpers/layered-compound-anchored.js';
import type { TreeDump, TreeGraphDump } from '../../../../test/helpers/layered-compound-replay-dump.js';

const ROW_TIMEOUT_MS = 120_000;
const TARGET_OFFSET = 'targetOffset';
const JUNCTION_POINTS = 'org.eclipse.elk.junctionPoints';
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

const hasBends = (graphs: [string, number[][]][]): boolean => graphs.some(([, points]) => points.length > 0);
const bendsOf = (graph: TreeGraphDump): [string, number[][]][] => edgeBends(graph);
const anyBends = (picked: [string, number[][]][]): boolean => hasBends(picked);

const targetOffsets = (graph: TreeGraphDump): [string, number[] | null][] =>
  graph.edges.map((edge) => [
    edge.path,
    edge.properties[TARGET_OFFSET] === undefined ? null : vectorPropertyOf(edge.properties[TARGET_OFFSET]),
  ]);

const junctionPoints = (graph: TreeGraphDump): [string, number[][] | null][] =>
  graph.edges.map((edge) => [
    edge.path,
    edge.properties[JUNCTION_POINTS] === undefined ? null : chainPropertyOf(edge.properties[JUNCTION_POINTS]),
  ]);

const edgeLabels = (graph: TreeGraphDump): [string, { pos: number[]; size: number[] }[]][] =>
  graph.edges.map((edge) => [
    edge.path,
    edge.labels.map((label) => ({ pos: vectorOf(label.pos), size: vectorOf(label.size) })),
  ]);

describe.skipIf(!hasRef)('CompoundGraphPostprocessor anchored cases', () => {
  for (const direction of ['RIGHT', 'DOWN']) {
    it(
      `joins the segments with the source point when unnecessary bend points are wanted, ${direction} (Java :148-149, Sc6)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: sites/CompoundGraphPostprocessor/unnecessaryBendpoints/<direction>; CompoundGraphPostprocessor.java:140-153
        sameProjection(
          `sites/CompoundGraphPostprocessor/unnecessaryBendpoints/${direction}`,
          'final',
          bendsOf,
          anyBends,
        );
      },
    );
  }

  it(
    'records TARGET_OFFSET on the restored edge of the last segment (Java :166-175)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/ticket-455_longHierarchicalEdges/4--CompoundGraphPostprocessor/default; CompoundGraphPostprocessor.java:166-175
      const id = 'models/ticket-455_longHierarchicalEdges/4--CompoundGraphPostprocessor/default';
      sameProjection(id, 'stop', targetOffsets, (offsets) => offsets.some(([, offset]) => offset !== null));
    },
  );

  it(
    'restores the bend points of an edge over several levels in segment order (Java :99-187)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/ticket-455_longHierarchicalEdges/4--CompoundGraphPostprocessor/default; CompoundGraphPostprocessor.java:99-187
      sameProjection(
        'models/ticket-455_longHierarchicalEdges/4--CompoundGraphPostprocessor/default',
        'stop',
        bendsOf,
        anyBends,
      );
    },
  );

  for (const variant of ['routing-polyline-deep/RIGHT', 'routing-splines-both/DOWN', 'routing-polyline-both/RIGHT']) {
    it(
      `offsets and joins the bend points of the segments of ${variant} (Java :117-153)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: scenarios/CompoundGraphPostprocessor/<variant>; CompoundGraphPostprocessor.java:117-153
        sameProjection(`scenarios/CompoundGraphPostprocessor/${variant}`, 'final', bendsOf, anyBends);
      },
    );
  }

  for (const direction of ['out', 'in']) {
    it(
      `copies the junction points of the segments to the original edge with the offset, ${direction} (Java :164, :226)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: scenarios/CompoundGraphPostprocessor/junctions-<direction>/RIGHT; CompoundGraphPostprocessor.java:164, :226-238
        sameProjection(
          `scenarios/CompoundGraphPostprocessor/junctions-${direction}/RIGHT`,
          'final',
          junctionPoints,
          (points) => points.some(([, chain]) => chain !== null),
        );
      },
    );
  }

  for (const placement of ['center', 'head', 'tail']) {
    it(
      `copies the ${placement} label back to the original edge in the reference coordinates (Java :178, :240-259)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: scenarios/CompoundGraphPostprocessor/edge-labels-<placement>/RIGHT; CompoundGraphPostprocessor.java:178, :240-259
        sameProjection(
          `scenarios/CompoundGraphPostprocessor/edge-labels-${placement}/RIGHT`,
          'final',
          edgeLabels,
          (labels) => labels.some(([, boxes]) => boxes.length > 0),
        );
      },
    );
  }
});
