// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-phases.json (mission 7b, T1 records, T3 loads; B1, B2, B5) and the import
// half of their replay: load the row's input (a vendored file whose SHA-256 is verified, or the prepared ELK JSON
// inline), apply the row's C4 `options` to the root (B3 arrives through them, where the recorder wrote it) and import
// the target level with the 7a transform exactly as the 7a replay's `importGraph(targetId)` does.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { repoRoot } from '../corpus/corpus.js';
import { dumpWithPropertyValues } from './layered-site-replay-dump.js';
import { findImportTarget, registerLayered, type LGraphDump } from './layered-framework-replay.js';
import { assignPaths } from './layered-site-replay-args.js';
import { Ctx, property } from './layered-site-replay-context.js';
import { importDumpOf, recordImport, type Expected } from './layered-phase-replay-dump.js';

export type { Expected };

/** A vendored input file (its prepared graph is the file plus the row's root `options`). */
export interface FileInput {
  readonly path: string;
  readonly sha256: string;
}
/** The prepared ELK JSON, inline (a string as the recorder writes it; an already parsed object is accepted too). */
export interface ElkInput {
  readonly elk: string | object;
}
export type PhaseInput = FileInput | ElkInput;

/** One interpreted step: the op name, then its arguments (see `STEP_ARITY` in layered-phase-replay-ops.ts). */
export type PhaseStep = readonly [string, ...unknown[]];

export const ROW_GROUPS = ['models', 'scenarios', 'sites'] as const;
export type RowGroup = (typeof ROW_GROUPS)[number];

export interface PhaseRow {
  readonly id: string;
  readonly group: RowGroup;
  readonly input: PhaseInput;
  /** The ELK id of the node whose children are imported; `null` for the root. */
  readonly target: string | null;
  /** C4 values by option id, applied to the root. */
  readonly options: Readonly<Record<string, unknown>>;
  readonly steps: readonly PhaseStep[] | null;
  readonly prefix: readonly string[] | null;
  readonly expected: Expected;
}

/** The graph an import produced and its dump (T1's whole-graph dump with every property value encoded). */
export interface ImportedRow {
  readonly graph: LGraph;
  readonly importDump: LGraphDump;
}

const ELKT_EXTENSION = '.elkt';
const JSON_ENCODING = 'utf8';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkRow(row: unknown, index: number): PhaseRow {
  if (!isObject(row) || typeof row.id !== 'string' || !isObject(row.input) || !isObject(row.expected)) {
    throw new Error(`layered-phases row ${String(index)} is malformed`);
  }
  if (!(ROW_GROUPS as readonly unknown[]).includes(row.group)) {
    throw new Error(`row ${row.id}: unknown group ${JSON.stringify(row.group)}`);
  }
  if ((row.steps === null) === (row.prefix === null)) {
    throw new Error(`row ${row.id}: exactly one of steps and prefix must be set`);
  }
  return row as unknown as PhaseRow;
}

/** The rows of a `layered-phases.json` file, structurally checked (the file is external data). */
export function loadRows(file: string): PhaseRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, JSON_ENCODING));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  return parsed.rows.map((row, i) => checkRow(row, i));
}

function readVerified(input: FileInput): string {
  const text = readFileSync(path.resolve(repoRoot(), input.path), JSON_ENCODING);
  const actual = createHash('sha256').update(text, JSON_ENCODING).digest('hex');
  if (actual !== input.sha256) {
    throw new Error(`${input.path}: sha256 is ${actual}, the row pins ${input.sha256}`);
  }
  return text;
}

function parseElkt(file: string, text: string): ElkNode {
  const { root, errors } = ElkGraphText.load(text);
  if (root === null || errors.length > 0) {
    throw new Error(`${file}: .elkt does not load cleanly (${String(errors.length)} errors)`);
  }
  return root;
}

/** The root ElkNode of a row's input, with layered registered. */
export function loadInput(input: PhaseInput): ElkNode {
  registerLayered();
  if ('elk' in input) {
    return ElkGraphJson.forGraph(typeof input.elk === 'string' ? input.elk : JSON.stringify(input.elk)).toElk();
  }
  const text = readVerified(input);
  return input.path.endsWith(ELKT_EXTENSION) ? parseElkt(input.path, text) : ElkGraphJson.forGraph(text).toElk();
}

function isC4(value: unknown): boolean {
  return isObject(value) && (typeof value.t === 'string' || 'ref' in value);
}

/**
 * Applies a C4 option map to the root through the metadata service: a tagged C4 value is decoded, a plain JSON value
 * is parsed by the option's own `parseValue` (the string form `.elkt` uses).
 */
export function applyOptions(root: ElkNode, options: Readonly<Record<string, unknown>>): void {
  const ctx = new Ctx({});
  for (const [id, value] of Object.entries(options)) {
    const data = LayoutMetaDataService.getInstance().getOptionData(id);
    if (isC4(value)) {
      root.setProperty(data ?? property(id), ctx.decode(value));
    } else if (data !== null) {
      root.setProperty(data, data.parseValue(String(value)));
    } else {
      throw new Error(`option ${id} is unknown to the metadata service`);
    }
  }
}

/**
 * The row's prepared root: the input, then the row's options set on the node the row imports (its `target`, else the
 * root), as the recorder does (`LayeredPhaseVectors.java:1299-1300`). B3 (SEPARATE_CONNECTED_COMPONENTS=false) arrives
 * through `options` of the pipeline rows that carry it (`:1489`); step rows have none and add none.
 */
export function prepareRoot(row: PhaseRow): ElkNode {
  const root = loadInput(row.input);
  applyOptions(findImportTarget(root, row.target ?? undefined), row.options);
  return root;
}

/**
 * `importGraph(targetId)` of the 7a replay: the transform over the root or the node with the target id. The graph's
 * positional paths and post-import dump are remembered for `phaseDump` and the step ops.
 */
export function importTarget(root: ElkNode, target: string | null): LGraph {
  const graph = new ElkGraphTransformer().importGraph(findImportTarget(root, target ?? undefined));
  recordImport(graph, assignPaths(graph), dumpWithPropertyValues(graph));
  return graph;
}

/** Imports a row's input with its options and dumps the result: the baseline of `phaseDump`. */
export function importRow(row: PhaseRow): ImportedRow {
  const graph = importTarget(prepareRoot(row), row.target);
  return { graph, importDump: importDumpOf(graph) };
}
