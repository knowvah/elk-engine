// SPDX-License-Identifier: EPL-2.0
import type { Expr, GraphFeature, MdAlgorithm, MdOptionSupport, MelkFile } from './ast.js';
import { buildImportScope, evaluate, qualifiedClassName, type ImportScope } from './expr.js';
import { ModelError } from './model-errors.js';
import {
  resolveCategoryReference,
  resolveOptionReference,
  type IndexedOption,
  type OptionIndex,
} from './model-index.js';
import { algorithmClassName, bundleClassName, memberId, shrinkWhiteSpace } from './model-names.js';
import { firstReason, pendingReason, pendingTypeReason, type PendingContext } from './model-pending.js';
import { valueTargetOf, type ResolvedOption } from './model-option.js';
import { simpleName } from './model-types.js';
import type { AlgorithmData, EncodedValue, RegistryCall } from './model-value.js';

const SEPARATOR = '.';
const SOURCE_DIRECTORY = 'src';
const FACTORY_SUFFIX = 'Factory';
const NESTED_CLASS_SEPARATOR = '$';

/** `GraphFeature` constants in declaration order, the `EnumSet` iteration order of the supported features. */
const GRAPH_FEATURE_ORDER: readonly GraphFeature[] = [
  'self_loops',
  'inside_self_loops',
  'multi_edges',
  'edge_labels',
  'ports',
  'compound',
  'clusters',
  'disconnected',
];

/** A `supports` clause: the option it targets and the names of the constants the generated algorithm class declares. */
export interface ResolvedSupport {
  readonly option: ResolvedOption;
  /** The value written in the clause, or null when the option's own default applies. */
  readonly expression: Expr | null;
  /** The encoded default the algorithm registers for the option. */
  readonly value: EncodedValue;
  /** `<OPTION>`: the algorithm class constant. */
  readonly constantName: string;
  /** `<OPTION>_DEFAULT`, declared only when the clause gives a value. */
  readonly defaultConstantName: string | null;
  /** The bundle class that declares the option constant the support constant is built from. */
  readonly bundleClass: string;
}

/** An algorithm with the registry data and the names its generated metadata class needs. */
export interface ResolvedAlgorithm {
  readonly algorithm: MdAlgorithm;
  /** Fully qualified name of the generated algorithm class. */
  readonly className: string;
  readonly id: string;
  /** `<Name>Factory`, the nested factory class. */
  readonly factoryName: string;
  /** The provider type, fully qualified. */
  readonly providerType: string;
  readonly parameter: string | null;
  readonly data: AlgorithmData;
  readonly supports: readonly ResolvedSupport[];
  /** `registerAlgorithm` followed by one `addOptionSupport` per support. */
  readonly calls: readonly RegistryCall[];
  /** Why the whole algorithm is held back by a pending type, or null. */
  readonly heldBackReason: string | null;
}

/** What resolving an algorithm needs from the surrounding resolution run. */
export interface AlgorithmEnvironment {
  readonly index: OptionIndex;
  readonly options: ReadonlyMap<IndexedOption, ResolvedOption>;
  /** Upstream path of each `.melk` file, by file name. */
  readonly upstreamPaths: ReadonlyMap<string, string>;
  readonly pendingTypes: ReadonlySet<string>;
}

/**
 * The directory before `src` in an upstream path, which is the bundle that defines the algorithm; null without `src`.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (getDefiningBundleId)
 */
export function definingBundleId(upstreamPath: string | undefined): string | null {
  const segments = (upstreamPath ?? '').split('/');
  const srcIndex = segments.indexOf(SOURCE_DIRECTORY);
  return srcIndex >= 1 ? (segments[srcIndex - 1] ?? null) : null;
}

function toFirstUpper(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function categoryId(file: MelkFile, algorithm: MdAlgorithm, index: OptionIndex): string | null {
  return algorithm.category === null ? null : resolveCategoryReference(index, file, algorithm.category).id;
}

function supportedFeatures(algorithm: MdAlgorithm): string[] {
  return GRAPH_FEATURE_ORDER.filter((feature) => algorithm.supportedFeatures.includes(feature)).map((feature) =>
    feature.toUpperCase(),
  );
}

function resolveSupport(
  support: MdOptionSupport,
  file: MelkFile,
  scope: ImportScope,
  env: AlgorithmEnvironment,
): ResolvedSupport {
  const target = resolveOptionReference(env.index, { file, groups: [] }, support.option);
  const option = env.options.get(target);
  if (option === undefined) {
    throw new ModelError(`${file.fileName}: option '${support.option}' was not resolved`);
  }
  const value =
    support.value === null ? option.data.default : evaluate(support.value, scope, valueTargetOf(target.type));
  return {
    option,
    expression: support.value,
    value,
    constantName: target.constantName,
    defaultConstantName: support.value === null ? null : option.defaultConstantName,
    bundleClass: bundleClassName(target.file),
  };
}

function algorithmCalls(data: AlgorithmData, supports: readonly ResolvedSupport[]): RegistryCall[] {
  return [
    { call: 'registerAlgorithm', data },
    ...supports.map((support): RegistryCall => ({
      call: 'addOptionSupport',
      algorithm: data.id,
      option: support.option.data.id,
      default: support.value,
    })),
  ];
}

function heldBackReason(
  algorithm: MdAlgorithm,
  supports: readonly ResolvedSupport[],
  context: PendingContext,
): string | null {
  return firstReason([
    pendingTypeReason(algorithm.provider, 'the layout provider', context),
    pendingTypeReason(algorithm.validator, 'the validator', context),
    ...supports.map((support) => pendingReason(support.expression, context)),
  ]);
}

function algorithmData(
  file: MelkFile,
  algorithm: MdAlgorithm,
  className: string,
  factoryName: string,
  env: AlgorithmEnvironment,
): AlgorithmData {
  return {
    id: memberId(file, [], algorithm.name),
    name: shrinkWhiteSpace(algorithm.label ?? algorithm.name) ?? algorithm.name,
    description: shrinkWhiteSpace(algorithm.description),
    category: categoryId(file, algorithm, env.index),
    bundleName: file.bundle?.label ?? null,
    definingBundleId: definingBundleId(env.upstreamPaths.get(file.fileName)),
    previewImagePath: algorithm.previewImage,
    supportedFeatures: supportedFeatures(algorithm),
    validatorClass: algorithm.validator === null ? null : simpleName(algorithm.validator.name),
    factoryClass: `${className}${NESTED_CLASS_SEPARATOR}${factoryName}`,
  };
}

/**
 * Resolves one algorithm: its id, factory, `registerAlgorithm` data and `addOptionSupport` calls. An algorithm that
 * references a pending type anywhere carries a `heldBackReason`; it is still fully resolved.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (registerLayoutAlgorithm)
 */
export function resolveAlgorithm(file: MelkFile, algorithm: MdAlgorithm, env: AlgorithmEnvironment): ResolvedAlgorithm {
  const scope = buildImportScope(file.imports);
  const className = algorithmClassName(file, algorithm);
  const factoryName = `${toFirstUpper(algorithm.name)}${FACTORY_SUFFIX}`;
  const context: PendingContext = {
    scope,
    // Unimported simple names resolve in the package of the generated algorithm class.
    defaultPackage: className.split(SEPARATOR).slice(0, -1).join(SEPARATOR),
    pendingTypes: env.pendingTypes,
  };
  const supports = algorithm.supportedOptions.map((support) => resolveSupport(support, file, scope, env));
  const data = algorithmData(file, algorithm, className, factoryName, env);
  return {
    algorithm,
    className,
    id: data.id,
    factoryName,
    providerType: qualifiedClassName(algorithm.provider.name.split(SEPARATOR), scope, context.defaultPackage),
    parameter: algorithm.parameter,
    data,
    supports,
    calls: algorithmCalls(data, supports),
    heldBackReason: heldBackReason(algorithm, supports, context),
  };
}
