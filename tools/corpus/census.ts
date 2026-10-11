// SPDX-License-Identifier: EPL-2.0
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadManifest, repoRoot, resolveModelsDir } from '../../test/corpus/corpus.js';

export type Folder = 'examples' | 'tests' | 'tickets' | 'realworld';
export type Source = 'json' | 'elkt';

export interface CensusModel {
  id: string;
  folder: Folder;
  source: Source;
  formats: string[];
  parse: 'ok' | 'error';
  nodes: number;
  edges: number;
  ports: number;
  labels: number;
  maxDepth: number;
  declaredAlgorithms: string[];
  rootAlgorithm: string;
}

export interface Census {
  modelsCommit: string;
  elkCommit: string;
  count: number;
  models: CensusModel[];
}

export interface DiscoveredModel {
  id: string;
  formats: string[];
}

export const WRITE_FLAG = '--write';
export const ELK_ALGORITHM_PREFIX = 'org.eclipse.elk.';
export const ELK_SHORT_PREFIX = 'elk.';
export const DEFAULT_ALGORITHM = `${ELK_ALGORITHM_PREFIX}layered`;
export const ALGORITHM_OPTION_KEYS: readonly string[] = ['algorithm', 'elk.algorithm', 'org.eclipse.elk.algorithm'];
export const OPTION_CONTAINERS: readonly string[] = ['layoutOptions', 'properties'];
export const MODEL_FOLDERS: readonly Folder[] = ['examples', 'tests', 'tickets', 'realworld'];
export const MODEL_EXTENSIONS: readonly string[] = ['elkg', 'elkt', 'json'];
export const JSON_EXTENSION = 'json';
export const COMMITTED_CENSUS_RELATIVE = 'test/corpus/census.json';
export const ELK_COMMIT_RELATIVE = 'tools/oracle/ELK_COMMIT';
export const RUN_SCRIPT_RELATIVE = 'tools/oracle/run.sh';
export const ORACLE_DIR_ENV = 'ELK_ORACLE_DIR';
export const DEFAULT_ORACLE_RELATIVE = '../elk-oracle';
export const CENSUS_SCRATCH_DIR = 'census';
export const PARSE_MODE = 'parse';
export const STATUS_OK = 'ok';
export const STATUS_ORACLE_ERROR = 'oracle-error';
const ID_SEPARATOR = '/';
const OUTPUT_SEPARATOR = '__';
const MAX_BUFFER = 256 * 1024 * 1024;

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** Strips a leading `org.eclipse.elk.` or `elk.` and prefixes `org.eclipse.elk.`. */
export function normalizeAlgorithm(raw: string): string {
  let bare = raw;
  if (bare.startsWith(ELK_ALGORITHM_PREFIX)) {
    bare = bare.slice(ELK_ALGORITHM_PREFIX.length);
  } else if (bare.startsWith(ELK_SHORT_PREFIX)) {
    bare = bare.slice(ELK_SHORT_PREFIX.length);
  }
  return `${ELK_ALGORITHM_PREFIX}${bare}`;
}

/** The normalized algorithm declared directly on one node, if any. */
function declaredOn(node: Json): string | undefined {
  for (const container of OPTION_CONTAINERS) {
    const options = node[container];
    if (!isRecord(options)) continue;
    for (const key of ALGORITHM_OPTION_KEYS) {
      const value = options[key];
      if (typeof value === 'string') return normalizeAlgorithm(value);
    }
  }
  return undefined;
}

interface Tally {
  nodes: number;
  edges: number;
  ports: number;
  labels: number;
  maxDepth: number;
  algorithms: Set<string>;
}

/** Walks the hierarchy; the root is the graph itself and is not counted as a node. */
function walk(node: Json, depth: number, tally: Tally): void {
  tally.maxDepth = Math.max(tally.maxDepth, depth);
  const algorithm = declaredOn(node);
  if (algorithm !== undefined) tally.algorithms.add(algorithm);
  tally.labels += records(node['labels']).length;
  for (const port of records(node['ports'])) {
    tally.ports += 1;
    tally.labels += records(port['labels']).length;
  }
  for (const edge of records(node['edges'])) {
    tally.edges += 1;
    tally.labels += records(edge['labels']).length;
  }
  for (const child of records(node['children'])) {
    tally.nodes += 1;
    walk(child, depth + 1, tally);
  }
}

function emptyTally(): Tally {
  return { nodes: 0, edges: 0, ports: 0, labels: 0, maxDepth: 0, algorithms: new Set() };
}

/** Pure classification of one parsed (oracle parse-mode) ELK JSON graph. */
export function classifyModel(parsed: unknown, id: string, formats: readonly string[]): CensusModel {
  const sorted = [...formats].sort();
  const tally = emptyTally();
  const ok = isRecord(parsed);
  if (ok) walk(parsed, 0, tally);
  return {
    id,
    folder: id.split(ID_SEPARATOR)[0] as Folder,
    source: sorted.includes(JSON_EXTENSION) ? 'json' : 'elkt',
    formats: sorted,
    parse: ok ? 'ok' : 'error',
    nodes: tally.nodes,
    edges: tally.edges,
    ports: tally.ports,
    labels: tally.labels,
    maxDepth: tally.maxDepth,
    declaredAlgorithms: [...tally.algorithms].sort(),
    rootAlgorithm: (ok ? declaredOn(parsed) : undefined) ?? DEFAULT_ALGORITHM,
  };
}

export function caseOutputName(id: string): string {
  return `${id.split(ID_SEPARATOR).join(OUTPUT_SEPARATOR)}.json`;
}

function listFiles(dir: string, rel: string, out: string[]): void {
  for (const entry of readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const child = rel === '' ? entry.name : `${rel}${ID_SEPARATOR}${entry.name}`;
    if (entry.isDirectory()) listFiles(dir, child, out);
    else out.push(child);
  }
}

/** Groups model files of the four corpus folders by id (path without extension). */
export function discoverModels(modelsDir: string): DiscoveredModel[] {
  const byId = new Map<string, string[]>();
  for (const folder of MODEL_FOLDERS) {
    const files: string[] = [];
    listFiles(modelsDir, folder, files);
    for (const file of files) {
      const ext = path.extname(file).slice(1);
      if (!MODEL_EXTENSIONS.includes(ext)) continue;
      const id = file.slice(0, file.length - ext.length - 1);
      byId.set(id, [...(byId.get(id) ?? []), ext]);
    }
  }
  return [...byId.entries()]
    .map(([id, formats]) => ({ id, formats: formats.sort() }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function assembleCensus(models: readonly CensusModel[], modelsCommit: string, elkCommit: string): Census {
  const sorted = [...models].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]?.id === sorted[i - 1]?.id) {
      throw new Error(`Duplicate census id: ${sorted[i]?.id}`);
    }
  }
  return { modelsCommit, elkCommit, count: sorted.length, models: sorted };
}

export function serializeCensus(census: Census): string {
  return `${JSON.stringify(census, null, 2)}\n`;
}

/** Human-readable differences between two censuses (empty when equal). */
export function diffCensus(before: Census, after: Census): string[] {
  const lines: string[] = [];
  if (before.modelsCommit !== after.modelsCommit) {
    lines.push(`modelsCommit: ${before.modelsCommit} -> ${after.modelsCommit}`);
  }
  if (before.elkCommit !== after.elkCommit) {
    lines.push(`elkCommit: ${before.elkCommit} -> ${after.elkCommit}`);
  }
  const old = new Map(before.models.map((m) => [m.id, JSON.stringify(m)]));
  const next = new Map(after.models.map((m) => [m.id, JSON.stringify(m)]));
  for (const [id, json] of old) {
    if (!next.has(id)) lines.push(`removed ${id}`);
    else if (next.get(id) !== json) lines.push(`changed ${id}`);
  }
  for (const id of next.keys()) if (!old.has(id)) lines.push(`added ${id}`);
  return lines;
}

interface OracleResult {
  id: string;
  status: string;
  exception?: { class?: string; message?: string };
}

function sourcePath(modelsDir: string, model: DiscoveredModel): string {
  const ext = model.formats.includes(JSON_EXTENSION) ? JSON_EXTENSION : 'elkt';
  return path.join(modelsDir, `${model.id}.${ext}`);
}

function runOracleParse(modelsDir: string, models: readonly DiscoveredModel[], scratch: string): OracleResult[] {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  const casesFile = path.join(scratch, 'cases.jsonl');
  const lines = models.map((m) => JSON.stringify({ id: m.id, input: sourcePath(modelsDir, m), mode: PARSE_MODE }));
  writeFileSync(casesFile, `${lines.join('\n')}\n`);
  const run = spawnSync(path.join(repoRoot(), RUN_SCRIPT_RELATIVE), ['--cases', casesFile, path.join(scratch, 'out')], {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
  });
  if (run.status !== 0) throw new Error(`Oracle run failed (${run.status}): ${run.stderr}`);
  return run.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as OracleResult);
}

function readParsed(scratch: string, result: OracleResult | undefined, id: string): unknown {
  if (result?.status !== STATUS_OK) return undefined;
  const file = path.join(scratch, 'out', caseOutputName(id));
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function resolveScratch(): string {
  const override = process.env[ORACLE_DIR_ENV];
  const oracle =
    override !== undefined && override !== ''
      ? path.resolve(override)
      : path.resolve(repoRoot(), DEFAULT_ORACLE_RELATIVE);
  return path.join(oracle, CENSUS_SCRATCH_DIR);
}

function readCommitted(): Census | undefined {
  try {
    const file = path.join(repoRoot(), COMMITTED_CENSUS_RELATIVE);
    return JSON.parse(readFileSync(file, 'utf8')) as Census;
  } catch {
    return undefined;
  }
}

export interface CensusRun {
  census: Census;
  errors: OracleResult[];
}

export function buildCensus(modelsDir: string, scratch: string): CensusRun {
  const models = discoverModels(modelsDir);
  const results = runOracleParse(modelsDir, models, scratch);
  const byId = new Map(results.map((r) => [r.id, r]));
  const bad = results.filter((r) => r.status === STATUS_ORACLE_ERROR);
  if (bad.length > 0 || results.length !== models.length) {
    throw new Error(`Oracle harness fault: ${JSON.stringify(bad)}`);
  }
  const classified = models.map((m) => classifyModel(readParsed(scratch, byId.get(m.id), m.id), m.id, m.formats));
  const elkCommit = readFileSync(path.join(repoRoot(), ELK_COMMIT_RELATIVE), 'utf8').trim();
  return {
    census: assembleCensus(classified, loadManifest().commit, elkCommit),
    errors: results.filter((r) => r.status !== STATUS_OK),
  };
}

function main(argv: readonly string[]): number {
  const started = Date.now();
  const resolved = resolveModelsDir();
  if ('skip' in resolved) throw new Error(resolved.skip);
  const { census, errors } = buildCensus(resolved.dir, resolveScratch());
  for (const e of errors) process.stderr.write(`parse error: ${JSON.stringify(e)}\n`);
  const parseErrors = census.models.filter((m) => m.parse === 'error').length;
  const target = path.join(repoRoot(), COMMITTED_CENSUS_RELATIVE);
  const committed = readCommitted();
  const changes = committed === undefined ? ['census.json missing'] : diffCensus(committed, census);
  const summary = { count: census.count, parseErrors, ms: Date.now() - started };
  if (argv.includes(WRITE_FLAG)) {
    writeFileSync(target, serializeCensus(census));
  } else if (changes.length > 0) {
    process.stderr.write(`${changes.slice(0, 50).join('\n')}\n(${changes.length} differences)\n`);
  }
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  return argv.includes(WRITE_FLAG) || changes.length === 0 ? 0 : 1;
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
