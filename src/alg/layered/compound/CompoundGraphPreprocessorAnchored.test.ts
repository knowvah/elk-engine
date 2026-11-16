// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the compound graph preprocessor (mission 7h, T15, H12/F12): each case replays one recorded row of
// test/golden/refs/java/layered-compound.json through the real engine and asserts on the one part of the recorded tree that a branch
// of `CompoundGraphPreprocessor*.ts` decides, so a regression names the branch instead of "row N differs". Every literal is the row's
// (`expected.tree`; doubles within AD-4, 1e-6). The `sites/*` rows are the scenarios Sc1..Sc5 of plans/layered-compound/unreached.md;
// the tree of a site row is the one after the compound postprocessor, which keeps the dummies, their sides and the cross-hierarchy
// map. The last case is a structural fact of the Java text (no row can reach it: the importer clears the junction points).
import { describe, expect, it } from 'vitest';
import { loadCompoundRowsIfPresent } from '../../../../test/helpers/layered-compound-replay-rows.js';
import {
  actualFinalTree,
  actualStopTree,
  enumName,
  expectedTree,
  nodesOfType,
  numberOf,
  perGraph,
  projectionDiffs,
  vectorOf,
} from '../../../../test/helpers/layered-compound-anchored.js';
import type { TreeDump, TreeGraphDump } from '../../../../test/helpers/layered-compound-replay-dump.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { LEdge } from '../graph/LEdge.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { createDummyEdge } from './CompoundGraphPreprocessorDummies.js';
import { LGraph } from '../graph/LGraph.js';

const ROW_TIMEOUT_MS = 120_000;
const EXTERNAL_PORT = 'EXTERNAL_PORT';
const EXTERNAL_PORT_SIDE = 'externalPortSide';
const hasRef = loadCompoundRowsIfPresent().length > 0;

/** Compares one projection of the actual tree with the same projection of the recorded tree; both must be non-trivial. */
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

const dummySides = (graph: TreeGraphDump): [string, string][] =>
  nodesOfType(graph, EXTERNAL_PORT).map((node) => [node.path, enumName(node.properties[EXTERNAL_PORT_SIDE])]);

const dummyPortLabelSizes = (graph: TreeGraphDump): number[][] =>
  nodesOfType(graph, EXTERNAL_PORT).flatMap((node) =>
    node.ports.flatMap((port) => port.labels.map((l) => vectorOf(l.size))),
  );

const EDGE_THICKNESS = 'org.eclipse.elk.edge.thickness';
const thicknessOf = (properties: Readonly<Record<string, unknown>>): number | null =>
  properties[EDGE_THICKNESS] === undefined ? null : numberOf(properties[EDGE_THICKNESS]);

const dummyCount = (graph: TreeGraphDump): number => nodesOfType(graph, EXTERNAL_PORT).length;

const parentPortSides = (graph: TreeGraphDump): [string, string][] =>
  graph.layerlessNodes.flatMap((node) => node.ports.map((port): [string, string] => [port.path, port.side]));

describe.skipIf(!hasRef)('CompoundGraphPreprocessor anchored cases', () => {
  it(
    'sizes the label of a NORTH external port dummy on the other axis (Java :217-218, Sc1)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/CompoundGraphPreprocessor/portLabelNorth; CompoundGraphPreprocessor.java:217-218
      sameProjection(
        'sites/CompoundGraphPreprocessor/portLabelNorth',
        'final',
        dummyPortLabelSizes,
        (sizes) => sizes.length > 0,
      );
    },
  );

  it(
    'gives an output edge of a FIXED_SIDE compound the side its type implies (Java :760, Sc3)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/CompoundGraphPreprocessor/fixedSideOut; CompoundGraphPreprocessor.java:760
      sameProjection('sites/CompoundGraphPreprocessor/fixedSideOut', 'final', dummySides, (sides) => sides.length > 0);
    },
  );

  it(
    'takes the sides of the dummies back to the compound ports (Java :128-142, setSidesOfPortsToSidesOfDummyNodes)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/CompoundGraphPreprocessor/insideSelfLoopFlow; CompoundGraphPreprocessor.java:128-142
      const id = 'sites/CompoundGraphPreprocessor/insideSelfLoopFlow';
      sameProjection(id, 'final', parentPortSides, (sides) => sides.length > 0);
      sameProjection(id, 'final', dummySides, (sides) => sides.length > 0);
    },
  );

  it(
    'keeps one cross-hierarchy segment per level for an inside self loop and the loops of a flow (Java :632-680, :838-868, Sc2)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/CompoundGraphPreprocessor/insideSelfLoopFlow; CompoundGraphPreprocessor.java:632-680, :838-868
      const id = 'sites/CompoundGraphPreprocessor/insideSelfLoopFlow';
      const expected = expectedTree(id).crossHierarchyMap;
      expect(expected?.length ?? 0).toBeGreaterThan(0);
      expect(actualFinalTree(id).crossHierarchyMap).toEqual(expected);
    },
  );

  it(
    'reuses the merged external port on every level for two edges of one port (Java :396, :564, Sc4)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/CompoundGraphPreprocessor/deepOutMerged; CompoundGraphPreprocessor.java:396, :564
      const id = 'sites/CompoundGraphPreprocessor/deepOutMerged';
      sameProjection(id, 'final', dummyCount, (count) => count > 0);
      expect(actualFinalTree(id).crossHierarchyMap).toEqual(expectedTree(id).crossHierarchyMap);
    },
  );

  it(
    'creates external ports that end at the parent node without exporting them (Java :401, :438, :448, :452, Sc5)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/CompoundGraphPreprocessor/deepToParentPort; CompoundGraphPreprocessor.java:401, :438, :448, :452
      const id = 'sites/CompoundGraphPreprocessor/deepToParentPort';
      sameProjection(id, 'final', dummyCount, (count) => count > 0);
      sameProjection(id, 'final', dummySides, (sides) => sides.length > 0);
      expect(actualFinalTree(id).crossHierarchyMap).toEqual(expectedTree(id).crossHierarchyMap);
    },
  );

  it(
    'derives the side of a FREE compound port from the net flow of its edges (Java :829-870)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: scenarios/CompoundGraphPreprocessor/ports-free/RIGHT; CompoundGraphPreprocessor.java:829-870
      sameProjection(
        'scenarios/CompoundGraphPreprocessor/ports-free/RIGHT',
        'final',
        dummySides,
        (sides) => sides.length > 0,
      );
    },
  );

  it(
    'moves the labels of a cross-hierarchy edge to its head, centre and tail segments (Java :249-297)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/edge_label_placement-hierarchy01/0--CompoundGraphPreprocessor/default; CompoundGraphPreprocessor.java:249-297
      sameProjection(
        'models/edge_label_placement-hierarchy01/0--CompoundGraphPreprocessor/default',
        'stop',
        (graph) => graph.edges.map((edge) => [edge.path, edge.labels.map((label) => label.path)]),
        (edges) => edges.some(([, labels]) => labels.length > 0),
      );
    },
  );

  it(
    'merges the thickness of the edges that share an external port (Java :792-794)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/edge_label_placement-hierarchy01/0--CompoundGraphPreprocessor/default; CompoundGraphPreprocessor.java:792-794
      sameProjection(
        'models/edge_label_placement-hierarchy01/0--CompoundGraphPreprocessor/default',
        'stop',
        (graph) => graph.edges.map((edge) => [edge.path, thicknessOf(edge.properties)]),
        (edges) => edges.some(([, thickness]) => thickness !== null),
      );
    },
  );

  it('starts a dummy edge without junction points, whatever the original edge holds (Java :813-816, createDummyEdge)', () => {
    // Java text, no row: the importer clears the junction points of every original edge, so no engine run holds a non-null chain here
    const origEdge = new LEdge();
    origEdge.setProperty(LayeredOptions.EDGE_THICKNESS, 3);
    const chain = new KVectorChain();
    chain.add(new KVector(1, 2));
    origEdge.setProperty(LayeredOptions.JUNCTION_POINTS, chain);
    const dummyEdge = createDummyEdge(new LGraph(), origEdge);
    expect(dummyEdge.getProperty(LayeredOptions.EDGE_THICKNESS)).toBe(
      origEdge.getProperty(LayeredOptions.EDGE_THICKNESS),
    );
    expect(dummyEdge.hasProperty(LayeredOptions.JUNCTION_POINTS)).toBe(false);
  });
});
