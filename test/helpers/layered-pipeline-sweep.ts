// SPDX-License-Identifier: EPL-2.0
// The TS side of the pipeline sweep (mission 7f, T14, F6): the canonical form of the oracle's `elkDump`
// (`LayeredPipelineVectors.java`, header "Sweep") over a laid-out ElkGraph subtree, and the two replays a case runs:
// a `level` case imports one level through `ElkGraphTransformer`, lays it out with `ElkLayered.doLayout` and applies the
// layout; a `model` case lays the whole model out through `RecursiveGraphLayoutEngine` with a direction on the root.
// Numbers are the raw IEEE-754 bits of the double in hex, so a last-ulp difference changes the hash. The hash is that of
// `layered-phase-sweep.ts` (`canonicalHash`: compact JSON, object keys sorted).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ElkLayered } from '../../src/alg/layered/ElkLayered.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import { canonicalHash } from './layered-phase-sweep.js';
import { findImportTarget } from './layered-framework-replay.js';
import { loadInput } from './layered-phase-replay-rows.js';

export { isOk, isThrows, readSweep, STATUS_REFUSED, STATUS_TIMEOUT, type SweepLine } from './layered-phase-sweep.js';

export const KIND_LEVEL = 'level';
export const KIND_MODEL = 'model';
const HEX_DIGITS = 16;
const FLOAT64_BYTES = 8;
const MODEL_EXTENSION = '.json';

/** The fields every replayable line (ok or throws) of the pipeline sweep carries. */
export interface PipelineSweepCase {
  readonly id: string;
  readonly kind: typeof KIND_LEVEL | typeof KIND_MODEL;
  readonly model: string;
  readonly target: string | null;
  /** `level` cases: the `EdgeRouting` name. */
  readonly routing?: string;
  /** `model` cases: the `Direction` name set on the root. */
  readonly direction?: string;
}
export interface PipelineSweepOk extends PipelineSweepCase {
  readonly sha256: string;
}
export interface PipelineSweepThrows extends PipelineSweepCase {
  readonly status: 'throws';
  readonly class: string;
  readonly message: string;
}

/** The 16 lowercase hex digits of the raw IEEE-754 bits of a double. */
export function hex(value: number): string {
  const view = new DataView(new ArrayBuffer(FLOAT64_BYTES));
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(HEX_DIGITS).padStart(HEX_DIGITS, '0');
}

type Dump = { [key: string]: unknown };

const box = (s: ElkShape): string[] => [hex(s.getX()), hex(s.getY()), hex(s.getWidth()), hex(s.getHeight())];
const point = (x: number, y: number): string[] => [hex(x), hex(y)];
const labelsOf = (e: ElkGraphElement): string[][] => Array.from(e.getLabels(), box);

function edgeDump(edge: ElkEdge): Dump {
  return {
    id: edge.getIdentifier(),
    sections: Array.from(edge.getSections(), (section) => ({
      start: point(section.getStartX(), section.getStartY()),
      end: point(section.getEndX(), section.getEndY()),
      bends: Array.from(section.getBendPoints(), (bend) => point(bend.getX(), bend.getY())),
    })),
    junctions: Array.from(edge.getProperty(CoreOptions.JUNCTION_POINTS), (v) => point(v.x, v.y)),
    labels: labelsOf(edge),
  };
}

/** The canonical tree of a laid-out ElkGraph subtree (`elkDump` of the recorder). */
export function elkDump(node: ElkNode): Dump {
  return {
    id: node.getIdentifier(),
    box: box(node),
    labels: labelsOf(node),
    ports: Array.from(node.getPorts(), (port) => ({
      id: port.getIdentifier(),
      box: box(port),
      labels: labelsOf(port),
    })),
    children: Array.from(node.getChildren(), elkDump),
    edges: Array.from(node.getContainedEdges(), edgeDump),
  };
}

export const pipelineHash = (dump: Dump): string => canonicalHash(dump);

function modelRoot(line: PipelineSweepCase, modelsDir: string): ElkNode {
  const elk = readFileSync(path.join(modelsDir, line.model + MODEL_EXTENSION), 'utf8');
  return loadInput({ elk });
}

/** The canonical tree of a case replayed through the port. */
export function replayCase(line: PipelineSweepCase, modelsDir: string): Dump {
  const root = modelRoot(line, modelsDir);
  if (line.kind === KIND_MODEL) {
    root.setProperty(CoreOptions.DIRECTION, Direction.valueOf(line.direction!));
    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
    return elkDump(root);
  }
  const level = findImportTarget(root, line.target ?? undefined);
  level.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(line.routing!));
  const transformer = new ElkGraphTransformer();
  const lgraph = transformer.importGraph(level);
  new ElkLayered().doLayout(lgraph, new BasicProgressMonitor().withMaxHierarchyLevels(0));
  transformer.applyLayout(lgraph);
  return elkDump(level);
}
