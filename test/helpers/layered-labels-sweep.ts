// SPDX-License-Identifier: EPL-2.0
// The TS side of the labels sweep (mission 7f2, T15, G7): each label- or comment-bearing `.elkt` of the models repository
// (`tests/layered`, `tickets/layered`, `examples`) laid out through `RecursiveGraphLayoutEngine`, at the file's own options
// (`default`) or with a `Direction` set on the root, and dumped in the oracle's canonical form (`elkDump` of
// `LayeredLabelsVectors.java`, header "Sweep", the same tree as 7f's: `layered-pipeline-sweep.ts`). The oracle's loader drops
// the options no registered provider parses (`dropUnresolvedOptions`, `LayeredLabelsVectors.java`), so does this one.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { registerLayered } from './layered-framework-replay.js';
import { elkDump, pipelineHash } from './layered-pipeline-sweep.js';

export { isOk, isThrows, readSweep, STATUS_REFUSED, STATUS_TIMEOUT, type SweepLine } from './layered-phase-sweep.js';
export const labelsHash = pipelineHash;

export const VARIANT_DEFAULT = 'default';
const ELKT_EXTENSION = '.elkt';

/** The fields every replayable line (ok or throws) of the labels sweep carries. */
export interface LabelsSweepCase {
  readonly id: string;
  readonly kind: 'model';
  /** The path under the models directory, without `.elkt`. */
  readonly model: string;
  readonly target: null;
  /** `default`, or the `Direction` name set on the root. */
  readonly variant: string;
}
export interface LabelsSweepOk extends LabelsSweepCase {
  readonly sha256: string;
}
/** A refused line also names the owning mission's category (`REFUSAL_CATEGORIES` of the recorder). */
export interface LabelsSweepRefused {
  readonly id: string;
  readonly status: 'refused';
  readonly processor: string;
  readonly category: string;
}
export interface LabelsSweepThrows extends LabelsSweepCase {
  readonly status: 'throws';
  readonly class: string;
  readonly message: string;
}

/** Every element of the graph that holds properties: the node, ports, edges, labels (of labels too) and children, at every depth. */
function elementsOf(node: ElkNode): ElkGraphElement[] {
  const labelsOf = (element: ElkGraphElement): ElkGraphElement[] =>
    [...element.getLabels()].flatMap((label) => [label, ...labelsOf(label)]);
  const shapes: ElkGraphElement[] = [node, ...node.getPorts(), ...node.getContainedEdges()];
  return [
    ...shapes.flatMap((element) => [element, ...labelsOf(element)]),
    ...[...node.getChildren()].flatMap(elementsOf),
  ];
}

/** The recorder's `dropUnresolvedOptions`: a `.elkt` value no option parses stays a `LayoutOptionProxy`; the oracle removes it. */
function dropUnresolvedOptions(root: ElkNode): void {
  for (const element of elementsOf(root)) {
    [...element.getAllProperties()]
      .filter(([, value]) => value instanceof LayoutOptionProxy)
      .forEach(([key]) => element.setProperty(key, null));
  }
}

function loadModel(line: LabelsSweepCase, modelsDir: string): ElkNode {
  registerLayered();
  const file = path.join(modelsDir, line.model + ELKT_EXTENSION);
  const { root, errors } = ElkGraphText.load(readFileSync(file, 'utf8'));
  if (root === null || errors.length > 0) {
    throw new Error(`${file}: .elkt does not load cleanly (${String(errors.length)} errors)`);
  }
  dropUnresolvedOptions(root);
  return root;
}

/** The canonical tree of a case replayed through the port. */
export function replayCase(line: LabelsSweepCase, modelsDir: string): { [key: string]: unknown } {
  const root = loadModel(line, modelsDir);
  if (line.variant !== VARIANT_DEFAULT) {
    root.setProperty(CoreOptions.DIRECTION, Direction.valueOf(line.variant));
  }
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return elkDump(root);
}
