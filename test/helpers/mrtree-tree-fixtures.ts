// SPDX-License-Identifier: EPL-2.0
// Fixtures shared by the explicit-stack proofs of the mrtree phases (mission tree-recursion-depth, #67): the seeded tree
// specs, the importer's edge insertion and the progress-monitor dump every phase proof uses.
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import { TEdge } from '../../src/alg/mrtree/graph/TEdge.js';
import type { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import type { TNode } from '../../src/alg/mrtree/graph/TNode.js';
import { randomSpec, seededRandom, SHAPES, type TreeSpec } from './spore-tree-fixtures.js';

const MAX_NODES = 40;
const SPEC_SEED_STRIDE = 7919;

/** The `seed`-th tree spec: a shape cycled by seed, 2 to `MAX_NODES` nodes. */
export function specOf(seed: number): TreeSpec {
  const rnd = seededRandom(seed * SPEC_SEED_STRIDE);
  return randomSpec(SHAPES[seed % SHAPES.length]!, 2 + Math.floor(rnd() * (MAX_NODES - 1)), rnd);
}

/** Adds an edge as the importer does (ElkGraphImporter.java:146-152). */
export function addEdge(graph: TGraph, source: TNode, target: TNode): void {
  const edge = new TEdge(source, target);
  source.getOutgoingEdges().add(edge);
  target.getIncomingEdges().add(edge);
  graph.getEdges().add(edge);
}

/** A monitor tree: every sub-task's name, state and children. */
export function monitorTree(monitor: IElkProgressMonitor): unknown {
  return [monitor.getTaskName(), monitor.isRunning(), monitor.getSubMonitors().map(monitorTree)];
}
