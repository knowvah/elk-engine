// SPDX-License-Identifier: EPL-2.0
// The TS side of the loops sweep (mission 7g, T19, W5): three parts of cases laid out through the real pipeline and dumped in the
// oracle's canonical form (`elkDump` of `LayeredLoopsVectors.java`, header "Sweep", the tree of 7f's sweep: `layered-pipeline-sweep.ts`).
//   a  the pipeline sweep's cases (a `level` through `ElkLayered.doLayout`, a `model` through `RecursiveGraphLayoutEngine`):
//      replayed by `layered-pipeline-sweep.ts`
//   b  the label sweep's cases (a whole `.elkt` at its own options or with a direction on the root): replayed by
//      `layered-labels-sweep.ts`
//   c  an option family: the model laid out through `RecursiveGraphLayoutEngine` with `<option id>=<value>` set on every node with
//      children (the root included)
// The hash is that of the other sweeps (`canonicalHash`: raw IEEE hex, compact JSON, object keys sorted), over a dump whose NaN
// tokens are canonical (`canonicalNaN`).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { registerLayered } from './layered-framework-replay.js';
import { replayCase as replayLabels } from './layered-labels-sweep.js';
import { applyOptions, loadInput } from './layered-phase-replay-rows.js';
import { elkDump, pipelineHash, replayCase as replayPipeline } from './layered-pipeline-sweep.js';

export { isOk, isThrows, readSweep, STATUS_REFUSED, STATUS_TIMEOUT, type SweepLine } from './layered-phase-sweep.js';

const CANONICAL_NAN = '7ff8000000000000';
/** 16 hex digits whose exponent bits are all ones: an infinity when the 52 mantissa bits are zero, a NaN otherwise. */
const NON_FINITE_BITS = /^[7f]ff[0-9a-f]{13}$/;
const INFINITY_BITS: ReadonlySet<string> = new Set(['7ff0000000000000', 'fff0000000000000']);

/**
 * The dump with every NaN token as the one canonical NaN, as the recorder's `rawHex` writes it (`Double.doubleToLongBits`): the
 * sign bit of a computed NaN differs between JVM runs, so it cannot be part of a reproducible hash. Every other token is unchanged.
 */
export function canonicalNaN(value: unknown): unknown {
  if (typeof value === 'string') {
    return NON_FINITE_BITS.test(value) && !INFINITY_BITS.has(value) ? CANONICAL_NAN : value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalNaN);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, canonicalNaN(entry)]));
  }
  return value;
}

/** The sweep hash (7f's `canonicalHash`: raw IEEE hex, compact JSON, sorted keys) over the NaN-canonical dump. */
export const loopsHash = (dump: { [key: string]: unknown }): string =>
  pipelineHash(canonicalNaN(dump) as Parameters<typeof pipelineHash>[0]);

export const PART_A = 'a';
export const PART_B = 'b';
export const PART_C = 'c';
const KIND_LEVEL = 'level';
const OPTION_SEPARATOR = '=';
const JSON_EXTENSION = '.json';

/** The fields every replayable line (ok or throws) of the loops sweep carries. */
export interface LoopsSweepCase {
  readonly id: string;
  readonly part: typeof PART_A | typeof PART_B | typeof PART_C;
  readonly kind: 'level' | 'model';
  /** Parts a, b: the path under the models directory without the extension; part c: with it. */
  readonly model: string;
  /** Part a levels: the node id (null: the root). */
  readonly target: string | null;
  /** Part a level: an `EdgeRouting`; parts a, b: `default` or a `Direction`; part c: `<option id>=<value>`. */
  readonly variant: string;
}
export interface LoopsSweepOk extends LoopsSweepCase {
  readonly sha256: string;
}
/** A refused line also names the owning mission's category (`REFUSAL_CATEGORIES` of the recorder). */
export interface LoopsSweepRefused {
  readonly id: string;
  readonly status: 'refused';
  readonly part: string;
  readonly processor: string;
  readonly category: string;
}
export interface LoopsSweepThrows extends LoopsSweepCase {
  readonly status: 'throws';
  readonly class: string;
  readonly message: string;
  /** The first ELK frame of the oracle's exception, `File.java:line`. */
  readonly frame?: string;
}

/** `<option id>=<value>` of a part c variant. */
export function splitVariant(variant: string): { id: string; value: string } {
  const at = variant.indexOf(OPTION_SEPARATOR);
  if (at < 0) {
    throw new Error(`variant ${variant} is not <option id>=<value>`);
  }
  return { id: variant.slice(0, at), value: variant.slice(at + OPTION_SEPARATOR.length) };
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

/** A `.elkt` as the recorder's `loadAny` reads it: the options no registered provider parses (lazy proxies) are dropped. */
function loadElkt(file: string): ElkNode {
  registerLayered();
  const { root, errors } = ElkGraphText.load(readFileSync(file, 'utf8'));
  if (root === null || errors.length > 0) {
    throw new Error(`${file}: .elkt does not load cleanly (${String(errors.length)} errors)`);
  }
  for (const element of elementsOf(root)) {
    [...element.getAllProperties()]
      .filter(([, value]) => value instanceof LayoutOptionProxy)
      .forEach(([key]) => element.setProperty(key, null));
  }
  return root;
}

function loadModel(file: string): ElkNode {
  return file.endsWith(JSON_EXTENSION) ? loadInput({ elk: readFileSync(file, 'utf8') }) : loadElkt(file);
}

/** The root and every descendant with children, as the recorder's `configure` sets the option family. */
function levelsOf(node: ElkNode, root: ElkNode): ElkNode[] {
  const own = node === root || [...node.getChildren()].length > 0 ? [node] : [];
  return [...own, ...[...node.getChildren()].flatMap((child) => levelsOf(child, root))];
}

function replayOption(line: LoopsSweepCase, modelsDir: string): { [key: string]: unknown } {
  const root = loadModel(path.join(modelsDir, line.model));
  const { id, value } = splitVariant(line.variant);
  levelsOf(root, root).forEach((level) => applyOptions(level, { [id]: value }));
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return elkDump(root);
}

/** The canonical tree of a case replayed through the port. */
export function replayCase(line: LoopsSweepCase, modelsDir: string): { [key: string]: unknown } {
  switch (line.part) {
    case PART_A:
      return replayPipeline(
        {
          id: line.id,
          kind: line.kind,
          model: line.model,
          target: line.target,
          ...(line.kind === KIND_LEVEL ? { routing: line.variant } : { direction: line.variant }),
        },
        modelsDir,
      );
    case PART_B:
      return replayLabels(
        { id: line.id, kind: 'model', model: line.model, target: null, variant: line.variant },
        modelsDir,
      );
    case PART_C:
      return replayOption(line, modelsDir);
  }
}
