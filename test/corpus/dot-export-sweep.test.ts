// SPDX-License-Identifier: EPL-2.0
// graphviz-dot D6 / T12 sweep: the port's DOT export over every `.elkt` model of $ELK_MODELS_DIR against the
// source-built oracle's output (written by tools/oracle/dot-export-sweep.sh with the CoreOptions-only registry into
// $ELK_ORACLE_DIR/sweep/dot-export/; tools/oracle/DotExportSweep.java documents the per-model files). One `it` per
// indicator:
//   text-equal     /898   `GraphvizDot.serialize(DotExporter.transform(load(elkt)))` (default properties, unformatted)
//                         equals the oracle's `<name>.dot` byte for byte; where the oracle recorded `<name>.throws.json`
//                         the port fails at the same stage with the corresponding class (and message, unless JDK-worded)
//   reparse-equal  /ok    `GraphvizDot.load(<oracle text>)` gives the oracle's parse-back: the same error lines, the
//                         same model dump, and the same answer to "does the parse equal the exported model"
// Each indicator logs `dot-export sweep: <indicator>=<n>/<total> diffs=<k>` and fails with the per-model report.
// Skipped with a message when the models dir or the sweep is absent or of another pin (CI has neither).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { GraphvizDot } from '../../src/alg/graphviz/dot/GraphvizDot.js';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import { DotExporter } from '../../src/alg/graphviz/dot/transform/DotExporter.js';
import { DotTransformationData } from '../../src/alg/graphviz/dot/transform/DotTransformationData.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { URI } from '../../src/emf/common/util/URI.js';
import { ResourceImpl } from '../../src/emf/ecore/resource/impl/ResourceImpl.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { isCoverageRun } from '../helpers/coverage-run.js';
import { dumpTarget } from '../helpers/dot-export-dump.js';
import { type Thrown, thrownDiff } from '../helpers/dot-export-rows.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const ELKT = '.elkt';
const DOT = '.dot';
const MODEL = '.model.json';
const THROWS = '.throws.json';
const ID_SEPARATOR = '/';
const ID_REPLACEMENT = '__';
const SWEEP_SCRIPT = 'tools/oracle/dot-export-sweep.sh';
const SWEEP_DIR_ENV = 'DOT_EXPORT_SWEEP_DIR';
const ORACLE_DIR_ENV = 'ELK_ORACLE_DIR';
const DEFAULT_ORACLE_RELATIVE_PATH = '../elk-oracle';
const SUMMARY = 'summary.json';
const OUTPUT_URI = 'output.graphviz_dot';
const EXPECTED_MODELS = 898;
const TEST_TIMEOUT_MS = isCoverageRun() ? 600_000 : 240_000;
const STAGE_LOAD = 'load';
const STAGE_TRANSFORM = 'transform';
const STAGE_SERIALIZE = 'serialize';
const MAX_REPORTED = 20;

/** `summary.json` of the sweep: the pins it ran on and its counts. */
interface Summary {
  readonly elkCommit: string;
  readonly modelsCommit: string;
  readonly models: number;
}

/** `<name>.throws.json`: the stage that failed in the oracle and its exception. */
interface OracleThrows extends Thrown {
  readonly stage: string;
}

/** `<name>.model.json`: the oracle's load of its own text. */
interface OracleReparse {
  readonly errors: readonly { readonly line: number; readonly message: string }[];
  readonly equal: boolean;
  readonly model: unknown;
}

/** What the port made of one model: the text, or the stage that failed and its error. */
interface PortExport {
  readonly text?: string;
  readonly target?: GraphvizModel;
  readonly stage?: string;
  readonly error?: unknown;
}

interface Verdict {
  readonly total: number;
  readonly diffs: readonly string[];
}

function sweepDir(): string {
  const override = process.env[SWEEP_DIR_ENV];
  if (override !== undefined && override !== '') return path.resolve(override);
  const oracle = process.env[ORACLE_DIR_ENV] ?? path.resolve(repoRoot(), DEFAULT_ORACLE_RELATIVE_PATH);
  return path.join(oracle, 'sweep', 'dot-export');
}

function pinned(): { elkCommit: string; modelsCommit: string } {
  const root = repoRoot();
  const manifest = JSON.parse(readFileSync(path.join(root, 'test', 'corpus', 'manifest.json'), 'utf8')) as {
    commit: string;
  };
  const elkCommit = readFileSync(path.join(root, 'tools', 'oracle', 'ELK_COMMIT'), 'utf8').trim();
  return { elkCommit, modelsCommit: manifest.commit };
}

/** Why the sweep cannot be compared, or undefined when it can. */
function sweepSkipReason(dir: string): string | undefined {
  const file = path.join(dir, SUMMARY);
  if (!existsSync(file)) return `no oracle sweep at ${dir}; run ${SWEEP_SCRIPT}`;
  const summary = JSON.parse(readFileSync(file, 'utf8')) as Summary;
  const pins = pinned();
  if (summary.elkCommit !== pins.elkCommit || summary.modelsCommit !== pins.modelsCommit) {
    return `the oracle sweep at ${dir} is of another pin; rerun ${SWEEP_SCRIPT} --force`;
  }
  return undefined;
}

const models = resolveModelsDir();
const dir = sweepDir();
const skipReason = 'skip' in models ? models.skip : sweepSkipReason(dir);

/** Every `.elkt` below the models dir, relative, in byte order (the order of `dot-export-sweep.sh --list`). */
function modelFiles(modelsDir: string): string[] {
  return readdirSync(modelsDir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(ELKT))
    .map((e) => path.relative(modelsDir, path.join(e.parentPath, e.name)).split(path.sep).join(ID_SEPARATOR))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const outputName = (model: string): string => model.slice(0, -ELKT.length).split(ID_SEPARATOR).join(ID_REPLACEMENT);
const oracleFile = (model: string, suffix: string): string => path.join(dir, outputName(model) + suffix);
const oracleJson = <T>(model: string, suffix: string): T =>
  JSON.parse(readFileSync(oracleFile(model, suffix), 'utf8')) as T;

function loadGraph(modelsDir: string, model: string): ElkNode {
  const result = ElkGraphText.load(readFileSync(path.join(modelsDir, model), 'utf8'));
  if (result.errors.length > 0 || result.root === null) {
    throw new Error(result.errors[0]?.message ?? 'no root');
  }
  return result.root;
}

/** The sweep's `serialize`: the model alone in a fresh resource "output.graphviz_dot", unformatted. */
function serialize(model: GraphvizModel): string {
  const resource = new ResourceImpl(URI.createURI(OUTPUT_URI));
  resource.getContents().add(model);
  return GraphvizDot.serialize(model);
}

/** The stages of `DotExportSweep.Sweeper.sweep` on the port; the first failing stage ends the run. */
function portExport(modelsDir: string, model: string): PortExport {
  let stage = STAGE_LOAD;
  try {
    const data = new DotTransformationData<ElkNode, GraphvizModel>();
    data.setSourceGraph(loadGraph(modelsDir, model));
    stage = STAGE_TRANSFORM;
    new DotExporter().transform(data);
    const target = data.getTargetGraphs()[0] as GraphvizModel;
    stage = STAGE_SERIALIZE;
    return { text: serialize(target), target };
  } catch (error) {
    return { stage, error };
  }
}

/** The first byte offset at which two texts differ, for the report. */
function firstDifference(expected: string, actual: string): string {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `first divergent byte ${i} (oracle ${a.length} bytes, port ${b.length} bytes)`;
}

function textDiff(model: string, port: PortExport): string | null {
  if (existsSync(oracleFile(model, THROWS))) {
    const expected = oracleJson<OracleThrows>(model, THROWS);
    if (port.stage === undefined) return `the oracle throws ${expected.class} in ${expected.stage}; the port does not`;
    if (port.stage !== expected.stage) return `stage: oracle ${expected.stage}, port ${port.stage}`;
    return thrownDiff(expected, port.error);
  }
  if (port.text === undefined) return `the port throws in ${port.stage}: ${String(port.error)}`;
  const expected = readFileSync(oracleFile(model, DOT), 'utf8');
  return port.text === expected ? null : firstDifference(expected, port.text);
}

function reparseDiff(model: string, port: PortExport): string | null {
  const expected = oracleJson<OracleReparse>(model, MODEL);
  const loaded = GraphvizDot.load(readFileSync(oracleFile(model, DOT), 'utf8'));
  const lines = loaded.errors.map((e) => e.line);
  const expectedLines = expected.errors.map((e) => e.line);
  if (JSON.stringify(lines) !== JSON.stringify(expectedLines)) {
    return `error lines: oracle ${JSON.stringify(expectedLines)}, port ${JSON.stringify(lines)}`;
  }
  const dump = JSON.stringify(dumpTarget(loaded.model));
  if (dump !== JSON.stringify(expected.model)) return 'the parsed model differs from the oracle parse';
  if (port.target === undefined) return 'the port exported no model to compare the parse with';
  const equal = dump === JSON.stringify(dumpTarget(port.target));
  return equal === expected.equal ? null : `parse equals export: oracle ${expected.equal}, port ${equal}`;
}

function verdict(ids: readonly string[], diff: (model: string) => string | null): Verdict {
  const diffs: string[] = [];
  for (const model of ids) {
    const d = diff(model);
    if (d !== null) diffs.push(`${model}: ${d}`);
  }
  return { total: ids.length, diffs };
}

function report(indicator: string, v: Verdict): void {
  console.log(`dot-export sweep: ${indicator}=${v.total - v.diffs.length}/${v.total} diffs=${v.diffs.length}`);
}

function expectNoDiffs(v: Verdict): void {
  expect(v.diffs.slice(0, MAX_REPORTED).join('\n')).toBe('');
}

describe('dot export sweep vs the oracle', () => {
  if (skipReason !== undefined) {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  const modelsDir = (models as { dir: string }).dir;
  const ids = modelFiles(modelsDir);
  const exports = new Map<string, PortExport>();
  const portOf = (model: string): PortExport => {
    const known = exports.get(model);
    if (known !== undefined) return known;
    const made = portExport(modelsDir, model);
    exports.set(model, made);
    return made;
  };

  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it(`the sweep covers ${EXPECTED_MODELS} .elkt models, each with a text or a recorded exception`, () => {
    expect(ids).toHaveLength(EXPECTED_MODELS);
    const summary = JSON.parse(readFileSync(path.join(dir, SUMMARY), 'utf8')) as Summary;
    expect(summary.models).toBe(EXPECTED_MODELS);
    const missing = ids.filter((m) => !existsSync(oracleFile(m, DOT)) && !existsSync(oracleFile(m, THROWS)));
    expect(missing).toEqual([]);
  });

  it(
    'text-equal',
    () => {
      const v = verdict(ids, (model) => textDiff(model, portOf(model)));
      report('text-equal', v);
      expectNoDiffs(v);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'reparse-equal',
    () => {
      const exported = ids.filter((m) => existsSync(oracleFile(m, DOT)));
      const v = verdict(exported, (model) => reparseDiff(model, portOf(model)));
      report('reparse-equal', v);
      expectNoDiffs(v);
    },
    TEST_TIMEOUT_MS,
  );
});
