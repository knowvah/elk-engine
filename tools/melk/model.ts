// SPDX-License-Identifier: EPL-2.0
import type { MdAlgorithm, MdCategory, MelkFile } from './ast.js';
import { loadUpstreamPaths } from './config.js';
import { resolveAlgorithm, type AlgorithmEnvironment, type ResolvedAlgorithm } from './model-algorithms.js';
import { buildOptionIndex, type IndexedOption, type OptionIndex } from './model-index.js';
import { bundleClassName, memberId, shrinkWhiteSpace } from './model-names.js';
import { optionCalls, resolveOption, type ResolvedOption } from './model-option.js';
import { firstReason, pendingReason, type PendingContext } from './model-pending.js';
import type { CategoryData, RegistryCall } from './model-value.js';
import { buildImportScope } from './expr.js';

export type { AlgorithmData, CategoryData, EncodedValue, OptionData, RegistryCall } from './model-value.js';
export type { ResolvedAlgorithm, ResolvedSupport } from './model-algorithms.js';
export { valueTargetOf, type ResolvedDependency, type ResolvedOption } from './model-option.js';

const SEPARATOR = '.';

/** A registration moved out of `calls` because it references a pending type (decision C1). */
export interface HeldBackCall {
  readonly call: RegistryCall;
  readonly reason: string;
}

/** Options of `resolveAll`. */
export interface ResolveOptions {
  /** Fully qualified names of types that are not ported yet; registrations referencing them are held back. */
  readonly pendingTypes?: readonly string[];
  /** Upstream path of each `.melk` file by file name; defaults to the vendored sources' manifest. */
  readonly upstreamPaths?: ReadonlyMap<string, string>;
}

/** The model of one `.melk` file: the registry calls its generated bundle class makes, and the options behind them. */
export interface ResolvedBundle {
  readonly file: string;
  readonly packageName: string;
  /** Fully qualified name of the generated bundle class, the key of `metadata.json`'s `providers`. */
  readonly bundleClass: string;
  /** What `apply(registry)` records, minus the held-back registrations: options, dependencies, categories, algorithms. */
  readonly calls: readonly RegistryCall[];
  readonly heldBack: readonly HeldBackCall[];
  readonly options: readonly ResolvedOption[];
  readonly algorithms: readonly ResolvedAlgorithm[];
  readonly source: MelkFile;
}

function categoryData(file: MelkFile, category: MdCategory): CategoryData {
  return {
    id: memberId(file, [], category.name),
    name: shrinkWhiteSpace(category.label ?? category.name) ?? category.name,
    description: shrinkWhiteSpace(category.description),
  };
}

/** A call with the reason it is held back (null when it is registered). */
interface Candidate {
  readonly call: RegistryCall;
  readonly reason: string | null;
}

function contextOf(file: MelkFile, pendingTypes: ReadonlySet<string>): PendingContext {
  return {
    scope: buildImportScope(file.imports),
    defaultPackage: bundleClassName(file).split(SEPARATOR).slice(0, -1).join(SEPARATOR),
    pendingTypes,
  };
}

function optionCandidates(option: ResolvedOption, context: PendingContext): Candidate[] {
  const { option: md } = option.entry;
  const [register, ...dependencyCalls] = optionCalls(option);
  const registerReason = firstReason(
    [md.defaultValue, md.lowerBound, md.upperBound].map((e) => pendingReason(e, context)),
  );
  const dependencies = dependencyCalls.map((call, position): Candidate => ({
    call,
    reason: pendingReason(option.dependencies[position]?.expression ?? null, context),
  }));
  return [{ call: register as RegistryCall, reason: registerReason }, ...dependencies];
}

function algorithmCandidates(algorithm: ResolvedAlgorithm): Candidate[] {
  return algorithm.calls.map((call) => ({ call, reason: algorithm.heldBackReason }));
}

function resolveBundle(file: MelkFile, packageName: string, env: AlgorithmEnvironment): ResolvedBundle {
  const context = contextOf(file, env.pendingTypes);
  const options = (env.index.byFile.get(file.fileName) ?? []).map((entry) => requireOption(env, entry));
  const categories = file.members
    .filter((member): member is MdCategory => member.kind === 'category')
    .map((category): Candidate => ({
      call: { call: 'registerCategory', data: categoryData(file, category) },
      reason: null,
    }));
  const algorithms = file.members
    .filter((member): member is MdAlgorithm => member.kind === 'algorithm')
    .map((algorithm) => resolveAlgorithm(file, algorithm, env));
  const candidates = [
    ...options.flatMap((option) => optionCandidates(option, context)),
    ...categories,
    ...algorithms.flatMap(algorithmCandidates),
  ];
  return {
    file: file.fileName,
    packageName,
    bundleClass: bundleClassName(file),
    calls: candidates.filter((c) => c.reason === null).map((c) => c.call),
    heldBack: candidates.flatMap((c) => (c.reason === null ? [] : [{ call: c.call, reason: c.reason }])),
    options,
    algorithms,
    source: file,
  };
}

function requireOption(env: AlgorithmEnvironment, entry: IndexedOption): ResolvedOption {
  const option = env.options.get(entry);
  if (option === undefined) {
    throw new Error(`option ${entry.scopedName} was not resolved`);
  }
  return option;
}

function resolveOptions(index: OptionIndex): Map<IndexedOption, ResolvedOption> {
  const options = new Map<IndexedOption, ResolvedOption>();
  for (const entries of index.byFile.values()) {
    for (const entry of entries) {
      options.set(entry, resolveOption(entry, index));
    }
  }
  return options;
}

/**
 * Turns parsed `.melk` files into the registry calls the generated Java makes, in the order the recorder sees them:
 * options, each followed by its dependencies, then categories, then each algorithm's calls. Registrations that
 * reference a pending type move from `calls` to `heldBack`. Files without a package define no bundle and are
 * skipped, as the inferrer skips them.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (infer)
 */
export function resolveAll(files: readonly MelkFile[], options: ResolveOptions = {}): ResolvedBundle[] {
  const index = buildOptionIndex(files);
  const env: AlgorithmEnvironment = {
    index,
    options: resolveOptions(index),
    upstreamPaths: options.upstreamPaths ?? loadUpstreamPaths(),
    pendingTypes: new Set(options.pendingTypes ?? []),
  };
  return files.flatMap((file) => (file.packageName === null ? [] : [resolveBundle(file, file.packageName, env)]));
}
