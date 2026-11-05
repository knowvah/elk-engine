// SPDX-License-Identifier: EPL-2.0
// The graph-source half of the layout test runner: `ModelResourcePath` resolution (`io/AbstractResourcePath.java`,
// `FileNameFilter`, `FileExtensionFilter`), the models root, and the model loaders.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { MODELS_DIR_ENV } from '../corpus/corpus.js';
import { registerLayered } from './layered-framework-replay.js';

/** A `ModelResourcePath`: `dir/**` lists a directory, `dir/**` + `/` recurses, anything else is one file. */
export interface FileGraphSource {
  readonly path: string;
  /** `FileNameFilter`: the whole file name must match (Java `Matcher.matches`). */
  readonly filter?: RegExp;
  /** `FileExtensionFilter`; `elkg` selects the `.json` twin the models carry for it. */
  readonly extensions?: readonly string[];
}

export const FULL_SUITES_ENV = 'PIPELINE_SUITES_FULL';
const FULL_SUITES_ON = '1';
const ALL_FILES_SUFFIX = '/**';
const ALL_FILES_RECURSIVE_SUFFIX = '/**/';
const DEFAULT_EXTENSIONS: readonly string[] = ['elkt', 'elkg'];
const ELKG_EXTENSION = 'elkg';
const JSON_SUFFIX = '.json';
const ELKT_SUFFIX = '.elkt';
const ENCODING = 'utf8';
const VENDORED_INPUTS = path.join(import.meta.dirname, '..', 'golden', 'inputs');

/** Where the models are read from: the vendored inputs, or `$ELK_MODELS_DIR` under `PIPELINE_SUITES_FULL=1`. */
export function inputsRoot(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const models = env[MODELS_DIR_ENV];
  return env[FULL_SUITES_ENV] === FULL_SUITES_ON && models !== undefined && models !== ''
    ? path.resolve(models)
    : VENDORED_INPUTS;
}

interface ResolvedPath {
  readonly target: string;
  readonly isDirectory: boolean;
  readonly isRecursive: boolean;
}

function resolveResourcePath(root: string, relative: string): ResolvedPath {
  const asDirectory = (suffix: string, isRecursive: boolean): ResolvedPath => ({
    target: path.join(root, relative.slice(0, relative.length - suffix.length)),
    isDirectory: true,
    isRecursive,
  });
  if (relative.endsWith(ALL_FILES_SUFFIX)) {
    return asDirectory(ALL_FILES_SUFFIX, false);
  }
  if (relative.endsWith(ALL_FILES_RECURSIVE_SUFFIX)) {
    return asDirectory(ALL_FILES_RECURSIVE_SUFFIX, true);
  }
  return { target: path.join(root, relative), isDirectory: false, isRecursive: false };
}

/** The file name filter of a source (the Java default is `.elkt` / `.elkg` when the path has none). */
function acceptsName(source: FileGraphSource, name: string): boolean {
  const { filter, extensions } = source;
  if (filter === undefined && extensions === undefined) {
    return acceptsExtension(DEFAULT_EXTENSIONS, name);
  }
  const byName = filter === undefined || new RegExp(`^(?:${filter.source})$`, filter.flags).test(name);
  return byName && (extensions === undefined || acceptsExtension(extensions, name));
}

function acceptsExtension(extensions: readonly string[], name: string): boolean {
  return extensions.some((extension) => {
    const bare = extension.startsWith('.') ? extension.slice(1) : extension;
    return bare === ELKG_EXTENSION ? name.endsWith(JSON_SUFFIX) : name.endsWith(`.${bare}`);
  });
}

function listDirectory(directory: string, source: FileGraphSource, isRecursive: boolean): string[] {
  const files: string[] = [];
  const children = readdirSync(directory, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const child of children) {
    const full = path.join(directory, child.name);
    if (child.isFile() && acceptsName(source, child.name)) {
      files.push(full);
    } else if (child.isDirectory() && isRecursive) {
      files.push(...listDirectory(full, source, isRecursive));
    }
  }
  return files;
}

/** `AbstractResourcePath.listResources`: the files a source names, a missing path naming none; sorted for determinism. */
export function listGraphFiles(source: FileGraphSource, root: string): string[] {
  const { target, isDirectory, isRecursive } = resolveResourcePath(root, source.path);
  if (!existsSync(target)) {
    return [];
  }
  const stat = statSync(target);
  if (isDirectory) {
    return stat.isDirectory() ? listDirectory(target, source, isRecursive) : [];
  }
  return stat.isFile() ? [target] : [];
}

/** Loads a model file: `.elkt` through the text loader, `.json` (the `.elkg` twin) through the JSON importer. */
export function loadGraphFile(file: string): ElkNode {
  registerLayered();
  const text = readFileSync(file, ENCODING);
  if (file.endsWith(JSON_SUFFIX)) {
    return ElkGraphJson.forGraph(text).toElk();
  }
  if (!file.endsWith(ELKT_SUFFIX)) {
    throw new Error(`Cannot load ${file}: only ${ELKT_SUFFIX} and ${JSON_SUFFIX} models are supported`);
  }
  const { root, errors } = ElkGraphText.load(text);
  if (root === null || errors.length > 0) {
    throw new Error(`Cannot load ${file}: ${errors[0]?.message ?? 'no root'}`);
  }
  return root;
}
