// SPDX-License-Identifier: EPL-2.0
import { isDeepStrictEqual } from 'node:util';
import { format, resolveConfig } from 'prettier';
import type { Expr } from './ast.js';
import { buildImportScope } from './expr.js';
import {
  ImportCollector,
  descriptionLines,
  docComment,
  header,
  seeTag,
  str,
  emitBound,
  emitExpression,
  emitOptionClass,
  localName,
  moduleOfClass,
  packageOfClass,
  resolveClass,
  tsTypeOf,
  type TypeContext,
} from './imports.js';
import { definingBundleId, type ResolvedAlgorithm, type ResolvedSupport } from './model-algorithms.js';
import { loadUpstreamPaths } from './config.js';
import type { IndexedOption } from './model-index.js';
import { bundleClassName } from './model-names.js';
import type { ResolvedBundle, ResolvedDependency, ResolvedOption, RegistryCall } from './model.js';

/** Test-only options of {@link emitBundle}. */
export interface EmitOptions {
  /** Repository-relative directory the files will live in (default: the AD-7 location), for relative imports. */
  readonly outputDir?: string;
  /** Module path (repository-relative `.ts`) per Java class name, replacing the AD-7 mapping. */
  readonly importOverrides?: ReadonlyMap<string, string>;
}

const REGISTRY = 'ILayoutMetaDataProvider.Registry';
const OPTION_DATA = 'src/core/data/LayoutOptionData.ts';
const CATEGORY_DATA = 'src/core/data/LayoutCategoryData.ts';
const ALGORITHM_DATA = 'src/core/data/LayoutAlgorithmData.ts';
const PROVIDER_MODULE = 'src/core/data/ILayoutMetaDataProvider.ts';
const PROPERTY_MODULE = 'src/graph/properties/Property.ts';
const PROPERTY_INTERFACE_MODULE = 'src/graph/properties/IProperty.ts';
const COMPARABLE_MODULE = 'src/java/lang/Comparable.ts';
const GRAPH_FEATURE_FQN = 'org.eclipse.elk.graph.properties.GraphFeature';
const ENUM_SET_FQN = 'java.util.EnumSet';
const IFACTORY_FQN = 'org.eclipse.elk.core.util.IFactory';
const LAYOUT_PROVIDER_FQN = 'org.eclipse.elk.core.AbstractLayoutProvider';

/** Per-file state: where unimported names resolve and the imports collected so far. */
interface FileContext extends TypeContext {
  readonly className: string;
}

/** What `held back by a pending type` removed, keyed by the model objects the emitter walks. */
interface HeldBack {
  readonly options: ReadonlyMap<ResolvedOption, string>;
  readonly dependencies: ReadonlyMap<ResolvedDependency, string>;
  readonly algorithms: ReadonlyMap<ResolvedAlgorithm, string>;
}

function indexHeldBack(bundle: ResolvedBundle): HeldBack {
  const pending = bundle.heldBack.filter((held) => held.call.call === 'addDependency');
  const options = new Map<ResolvedOption, string>();
  const dependencies = new Map<ResolvedDependency, string>();
  for (const option of bundle.options) {
    const held = bundle.heldBack.find((h) => h.call.call === 'registerOption' && h.call.data === option.data);
    if (held !== undefined) {
      options.set(option, held.reason);
    }
    for (const dependency of option.dependencies) {
      const position = pending.findIndex((h) => isHeldDependency(h.call, option, dependency));
      const taken = pending.splice(position, position < 0 ? 0 : 1)[0];
      if (taken !== undefined) {
        dependencies.set(dependency, taken.reason);
      }
    }
  }
  const algorithms = new Map(
    bundle.algorithms.flatMap((a) => (a.heldBackReason === null ? [] : [[a, a.heldBackReason] as const])),
  );
  return { options, dependencies, algorithms };
}

function isHeldDependency(call: RegistryCall, option: ResolvedOption, dependency: ResolvedDependency): boolean {
  return (
    call.call === 'addDependency' &&
    call.source === option.data.id &&
    call.target === dependency.target.id &&
    isDeepStrictEqual(call.value, dependency.value)
  );
}

function fileContext(
  className: string,
  file: string,
  source: { imports: readonly string[] },
  opts: EmitOptions,
): FileContext {
  return {
    className: localName(className),
    scope: buildImportScope(source.imports),
    defaultPackage: packageOfClass(className),
    imports: new ImportCollector(file, opts.importOverrides),
  };
}

/** The context in which the declaration of another file's option resolves its type names. */
function contextOfOption(option: ResolvedOption, context: FileContext): TypeContext {
  return contextOfEntry(option.entry, context);
}

function contextOfEntry(entry: IndexedOption, context: FileContext): TypeContext {
  return {
    scope: entry.scope,
    defaultPackage: packageOfClass(bundleClassName(entry.file)),
    imports: context.imports,
  };
}

function constantDeclaration(
  doc: readonly string[],
  modifiers: string,
  name: string,
  type: string,
  initializer: string,
): string {
  const comment = doc.length === 0 ? '' : `${docComment(doc)}\n`;
  return `${comment}${modifiers} ${name}: ${type} = ${initializer};`;
}

function boundConstant(label: string, bound: Expr, name: string, option: ResolvedOption, context: FileContext): string {
  const ownContext = contextOfOption(option, context);
  const comparable = context.imports.useNamed('Comparable', COMPARABLE_MODULE, 'type');
  return constantDeclaration(
    [`${label} bound value for {@link ${option.entry.constantName}}.`],
    'private static readonly',
    name,
    `${comparable}<${tsTypeOf(option.entry.option.type, ownContext)}>`,
    emitBound(bound, ownContext),
  );
}

function optionConstants(option: ResolvedOption, context: FileContext): string[] {
  const { entry } = option;
  const { option: md } = entry;
  const ownContext = contextOfOption(option, context);
  const type = tsTypeOf(md.type, ownContext);
  const defaults =
    md.defaultValue === null
      ? []
      : [
          constantDeclaration(
            [`Default value for {@link ${entry.constantName}}.`],
            'private static readonly',
            option.defaultConstantName,
            `${type}${md.defaultValue.kind === 'null' ? ' | null' : ''}`,
            emitExpression(md.defaultValue, ownContext),
          ),
        ];
  const bounds = [
    md.lowerBound === null
      ? []
      : [boundConstant('Lower', md.lowerBound, option.lowerBoundConstantName, option, context)],
    md.upperBound === null
      ? []
      : [boundConstant('Upper', md.upperBound, option.upperBoundConstantName, option, context)],
  ].flat();
  return [...defaults, ...bounds, propertyConstant(option, type, context)];
}

function propertyArguments(option: ResolvedOption, context: FileContext): string {
  const { option: md } = option.entry;
  const owner = context.className;
  if (md.defaultValue === null && md.lowerBound === null && md.upperBound === null) {
    return str(option.data.id);
  }
  const defaultValue =
    md.defaultValue === null
      ? 'undefined'
      : `${owner}.${option.defaultConstantName}${md.defaultValue.kind === 'null' ? ' ?? undefined' : ''}`;
  const lower = md.lowerBound === null ? 'null' : `${owner}.${option.lowerBoundConstantName}`;
  const upper = md.upperBound === null ? 'null' : `${owner}.${option.upperBoundConstantName}`;
  return [str(option.data.id), defaultValue, lower, upper].join(', ');
}

function propertyConstant(option: ResolvedOption, type: string, context: FileContext): string {
  const { imports } = context;
  const property = imports.useNamed('Property', PROPERTY_MODULE, 'value');
  const iProperty = imports.useNamed('IProperty', PROPERTY_INTERFACE_MODULE, 'type');
  const { option: md } = option.entry;
  const doc = [...descriptionLines(md.description), ...(md.deprecated ? ['@deprecated'] : [])];
  return constantDeclaration(
    doc,
    'static readonly',
    option.entry.constantName,
    `${iProperty}<${type}>`,
    `new ${property}<${type}>(${propertyArguments(option, context)})`,
  );
}

function dependencyConstant(source: ResolvedOption, dependency: ResolvedDependency, context: FileContext): string[] {
  if (dependency.expression === null) {
    return [];
  }
  const type = tsTypeOf(dependency.target.option.type, contextOfEntry(dependency.target, context));
  const own: TypeContext = {
    scope: source.entry.scope,
    defaultPackage: context.defaultPackage,
    imports: context.imports,
  };
  return [
    constantDeclaration(
      [
        `Required value for dependency between {@link ${source.entry.constantName}} and {@link ${dependency.target.constantName}}.`,
      ],
      'private static readonly',
      dependency.constantName,
      type,
      emitExpression(dependency.expression, own),
    ),
  ];
}

// ---- apply ----

/** `.name(value)` as a one-element list, or nothing when the value is absent (the builder's default applies). */
function clause(name: string, value: string | null): string[] {
  return value === null ? [] : [`.${name}(${value})`];
}

function quoted(value: string | null): string | null {
  return value === null ? null : str(value);
}

function optionRegistration(option: ResolvedOption, context: FileContext): string {
  const { entry, data } = option;
  const { option: md } = entry;
  const { imports } = context;
  const layoutOptionData = imports.useNamed('LayoutOptionData', OPTION_DATA, 'value');
  const owner = context.className;
  const constant = (expr: Expr | null, name: string): string | null => (expr === null ? null : `${owner}.${name}`);
  const enumSet = md.targets.length === 0 ? null : imports.useClass(ENUM_SET_FQN, 'value');
  const targets = md.targets.map((t) => `${layoutOptionData}.Target.${t.toUpperCase()}`).join(', ');
  const chain = [
    ...clause('id', str(data.id)),
    ...clause('group', str(data.group)),
    ...clause('name', str(data.name)),
    ...clause('description', quoted(data.description)),
    ...clause('defaultValue', constant(md.defaultValue, option.defaultConstantName)),
    ...clause('lowerBound', constant(md.lowerBound, option.lowerBoundConstantName)),
    ...clause('upperBound', constant(md.upperBound, option.upperBoundConstantName)),
    ...clause('type', `${layoutOptionData}.Type.${data.type}`),
    ...clause('optionClass', emitOptionClass(data.optionClass, md.type, contextOfOption(option, context))),
    ...clause('targets', enumSet === null ? null : `${enumSet}.of(${targets})`),
    ...clause('visibility', `${layoutOptionData}.Visibility.${data.visibility}`),
    ...clause('legacyIds', data.legacyIds === null ? null : data.legacyIds.map(str).join(', ')),
  ];
  return `registry.register(new ${layoutOptionData}.Builder()${chain.join('')}.create());`;
}

function dependencyRegistration(source: ResolvedOption, dependency: ResolvedDependency, context: FileContext): string {
  const value = dependency.expression === null ? 'null' : `${context.className}.${dependency.constantName}`;
  return `registry.addDependency(${str(source.data.id)}, ${str(dependency.target.id)}, ${value});`;
}

function categoryRegistrations(bundle: ResolvedBundle, context: FileContext): string[] {
  return bundle.calls.flatMap((call) => {
    if (call.call !== 'registerCategory') {
      return [];
    }
    const builder = context.imports.useNamed('LayoutCategoryData', CATEGORY_DATA, 'value');
    const description = call.data.description === null ? '' : `.description(${str(call.data.description)})`;
    return [
      `registry.register(new ${builder}.Builder().id(${str(call.data.id)}).name(${str(call.data.name)})${description}.create());`,
    ];
  });
}

function heldComment(kind: string, reason: string): string {
  return `// Held back (${kind}): ${reason}.`;
}

function optionStatements(bundle: ResolvedBundle, held: HeldBack, context: FileContext): string[] {
  return bundle.options.flatMap((option) => {
    const heldOption = held.options.get(option);
    const registration =
      heldOption === undefined
        ? optionRegistration(option, context)
        : heldComment(`option ${option.data.id}`, heldOption);
    const dependencies = option.dependencies.map((dependency) => {
      const reason = held.dependencies.get(dependency);
      return reason === undefined
        ? dependencyRegistration(option, dependency, context)
        : heldComment(`dependency ${option.data.id} -> ${dependency.target.id}`, reason);
    });
    return [registration, ...dependencies];
  });
}

function algorithmStatements(bundle: ResolvedBundle, held: HeldBack, context: FileContext): string[] {
  return bundle.algorithms.map((algorithm) => {
    const reason = held.algorithms.get(algorithm);
    if (reason !== undefined) {
      return heldComment(`algorithm ${algorithm.id}`, reason);
    }
    const name = context.imports.useClass(algorithm.className, 'value');
    return `new ${name}().apply(registry);`;
  });
}

function applyMethod(statements: readonly string[], context: FileContext): string {
  context.imports.useNamed('ILayoutMetaDataProvider', PROVIDER_MODULE, 'type');
  return `apply(registry: ${REGISTRY}): void {\n${statements.join('\n')}\n}`;
}

function classDeclaration(
  name: string,
  doc: readonly string[],
  members: readonly string[],
  context: FileContext,
): string {
  context.imports.useNamed('ILayoutMetaDataProvider', PROVIDER_MODULE, 'type');
  return `${docComment(doc)}\nexport class ${name} implements ILayoutMetaDataProvider {\n${members.join('\n\n')}\n}`;
}

function assemble(sourceFile: string, context: FileContext, declarations: readonly string[]): string {
  return `${header(sourceFile)}\n${context.imports.render().join('\n')}\n\n${declarations.join('\n\n')}\n`;
}

function bundleSource(bundle: ResolvedBundle, file: string, opts: EmitOptions): string {
  const context = fileContext(bundle.bundleClass, file, bundle.source, opts);
  const held = indexHeldBack(bundle);
  const constants = bundle.options.filter((o) => !held.options.has(o)).flatMap((o) => optionConstants(o, context));
  const dependencyConstants = bundle.options.flatMap((o) =>
    o.dependencies.filter((d) => !held.dependencies.has(d)).flatMap((d) => dependencyConstant(o, d, context)),
  );
  const statements = [
    ...optionStatements(bundle, held, context),
    ...categoryRegistrations(bundle, context),
    ...algorithmStatements(bundle, held, context),
  ];
  const upstream = loadUpstreamPaths().get(bundle.file);
  const doc = [seeTag(definingBundleId(upstream), bundle.bundleClass)];
  const members = [...constants, ...dependencyConstants, applyMethod(statements, context)];
  return assemble(bundle.file, context, [classDeclaration(localName(bundle.bundleClass), doc, members, context)]);
}

// ---- algorithm classes ----

function supportInitializer(support: ResolvedSupport, context: FileContext): string {
  const bundleName = context.imports.useClass(support.bundleClass, 'value');
  if (support.defaultConstantName === null) {
    return `${bundleName}.${support.constantName}`;
  }
  const property = context.imports.useNamed('Property', PROPERTY_MODULE, 'value');
  return `${property}.withDefault(${bundleName}.${support.constantName}, ${context.className}.${support.defaultConstantName})`;
}

function supportConstants(algorithm: ResolvedAlgorithm, support: ResolvedSupport, context: FileContext): string[] {
  const type = tsTypeOf(support.option.entry.option.type, contextOfOption(support.option, context));
  const iProperty = context.imports.useNamed('IProperty', PROPERTY_INTERFACE_MODULE, 'type');
  const defaults =
    support.expression === null || support.defaultConstantName === null
      ? []
      : [
          constantDeclaration(
            [`Default value for {@link ${support.constantName}} with algorithm "${algorithm.data.name}".`],
            'private static readonly',
            support.defaultConstantName,
            type,
            emitExpression(support.expression, context),
          ),
        ];
  const constant = constantDeclaration(
    descriptionLines(support.option.entry.option.description),
    'static readonly',
    support.constantName,
    `${iProperty}<${type}>`,
    supportInitializer(support, context),
  );
  return [...defaults, constant];
}

function algorithmRegistration(algorithm: ResolvedAlgorithm, context: FileContext): string {
  const { data } = algorithm;
  const { imports } = context;
  const builder = imports.useNamed('LayoutAlgorithmData', ALGORITHM_DATA, 'value');
  const enumSet = data.supportedFeatures.length === 0 ? null : imports.useClass(ENUM_SET_FQN, 'value');
  const feature = enumSet === null ? '' : imports.useClass(GRAPH_FEATURE_FQN, 'value');
  const features = data.supportedFeatures.map((f) => `${feature}.${f}`).join(', ');
  const validator = algorithm.algorithm.validator;
  const validatorClass =
    validator === null ? null : imports.useClass(resolveClass(validator.name.split('.'), context), 'value');
  const chain = [
    ...clause('id', str(data.id)),
    ...clause('name', str(data.name)),
    ...clause('description', quoted(data.description)),
    ...clause('providerFactory', `new ${algorithm.factoryName}()`),
    ...clause('category', quoted(data.category)),
    ...clause('melkBundleName', quoted(data.bundleName)),
    ...clause('definingBundleId', quoted(data.definingBundleId)),
    ...clause('imagePath', quoted(data.previewImagePath)),
    ...clause('supportedFeatures', enumSet === null ? null : `${enumSet}.of(${features})`),
    ...clause('validatorClass', validatorClass),
  ];
  return `registry.register(new ${builder}.Builder()${chain.join('')}.create());`;
}

function supportRegistrations(algorithm: ResolvedAlgorithm, context: FileContext): string[] {
  return algorithm.supports.map((support) => {
    const value =
      support.defaultConstantName === null
        ? `${context.className}.${support.constantName}.getDefault()`
        : `${context.className}.${support.defaultConstantName}`;
    return `registry.addOptionSupport(${str(algorithm.id)}, ${str(support.option.data.id)}, ${value});`;
  });
}

function factoryClass(algorithm: ResolvedAlgorithm, context: FileContext, definingBundle: string | null): string {
  const { imports } = context;
  const factory = imports.useClass(IFACTORY_FQN, 'type');
  const layoutProvider = imports.useClass(LAYOUT_PROVIDER_FQN, 'type');
  const provider = imports.useClass(algorithm.providerType, 'value');
  const doc = docComment(['Layouter-specific algorithm factory.', seeTag(definingBundle, algorithm.className)]);
  return `${doc}
export class ${algorithm.factoryName} implements ${factory}<${layoutProvider}> {
  create(): ${layoutProvider} {
    const provider: ${layoutProvider} = new ${provider}();
    provider.initialize(${str(algorithm.parameter ?? '')});
    return provider;
  }

  destroy(obj: ${layoutProvider}): void {
    obj.dispose();
  }
}`;
}

function algorithmSource(
  bundle: ResolvedBundle,
  algorithm: ResolvedAlgorithm,
  file: string,
  opts: EmitOptions,
): string {
  const context = fileContext(algorithm.className, file, bundle.source, opts);
  const idDoc = docComment([`The id of the ${algorithm.algorithm.label ?? algorithm.algorithm.name} algorithm.`]);
  const members = [
    `${idDoc}\nstatic readonly ALGORITHM_ID: string = ${str(algorithm.id)};`,
    ...algorithm.supports.flatMap((support) => supportConstants(algorithm, support, context)),
    `${docComment(['Layouter-specific algorithm factory.'])}\nstatic readonly ${algorithm.factoryName}: typeof ${algorithm.factoryName} = ${algorithm.factoryName};`,
    applyMethod([algorithmRegistration(algorithm, context), ...supportRegistrations(algorithm, context)], context),
  ];
  const upstream = loadUpstreamPaths().get(bundle.file);
  const definingBundle = definingBundleId(upstream);
  const declarations = [
    factoryClass(algorithm, context, definingBundle),
    classDeclaration(localName(algorithm.className), [seeTag(definingBundle, algorithm.className)], members, context),
  ];
  return assemble(bundle.file, context, declarations);
}

async function formatSource(text: string, file: string): Promise<string> {
  const config = await resolveConfig(file);
  return format(text, { ...config, filepath: file, parser: 'typescript' });
}

function fileFor(className: string, opts: EmitOptions): string {
  return opts.outputDir === undefined ? moduleOfClass(className) : `${opts.outputDir}/${localName(className)}.ts`;
}

/**
 * Emits TypeScript for a resolved bundle: the bundle class and one class per algorithm that is not held back. The
 * result maps repository-relative output paths to prettier-formatted text.
 */
export async function emitBundle(bundle: ResolvedBundle, opts: EmitOptions = {}): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const bundleFile = fileFor(bundle.bundleClass, opts);
  files.set(bundleFile, await formatSource(bundleSource(bundle, bundleFile, opts), bundleFile));
  for (const algorithm of bundle.algorithms.filter((a) => a.heldBackReason === null)) {
    const file = fileFor(algorithm.className, opts);
    files.set(file, await formatSource(algorithmSource(bundle, algorithm, file, opts), file));
  }
  return files;
}
