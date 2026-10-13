// SPDX-License-Identifier: EPL-2.0
import { LayoutOptionDataTarget } from '../../src/core/data/LayoutOptionDataTarget.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import type { Expr, MdOption } from './ast.js';
import { evaluate, type ImportScope, type ValueTarget } from './expr.js';
import { resolveOptionReference, type IndexedOption, type OptionIndex } from './model-index.js';
import {
  defaultConstantName,
  dependencyConstantName,
  lowerBoundConstantName,
  shrinkWhiteSpace,
  upperBoundConstantName,
} from './model-names.js';
import type { OptionTypeInfo } from './model-types.js';
import type { EncodedValue, OptionData, RegistryCall } from './model-value.js';

const SEPARATOR = '.';
const VISIBILITY_HIDDEN = 'HIDDEN';
const VISIBILITY_ADVANCED = 'ADVANCED';
const VISIBILITY_VISIBLE = 'VISIBLE';

/** A `requires` clause with its target resolved and its required value encoded. */
export interface ResolvedDependency {
  readonly constantName: string;
  readonly target: IndexedOption;
  readonly expression: Expr | null;
  readonly value: EncodedValue;
}

/** An option with the registry data and the names the emitter needs. */
export interface ResolvedOption {
  /** The option in its file: groups, ids, imports, declared type and the unevaluated expressions. */
  readonly entry: IndexedOption;
  readonly data: OptionData;
  readonly defaultConstantName: string;
  readonly lowerBoundConstantName: string;
  readonly upperBoundConstantName: string;
  readonly dependencies: readonly ResolvedDependency[];
}

export function valueTargetOf(type: OptionTypeInfo): ValueTarget {
  return { kind: type.valueKind, elementClass: type.elementClass };
}

/** Evaluates an optional expression written in `scope`'s file for a value of `type`; absent is `null`. */
export function evaluateOptional(expr: Expr | null, scope: ImportScope, type: OptionTypeInfo): EncodedValue {
  return expr === null ? null : evaluate(expr, scope, valueTargetOf(type));
}

function visibilityOf(option: MdOption): string {
  switch (option.modifier) {
    case 'programmatic':
    case 'output':
    case 'global':
      return VISIBILITY_HIDDEN;
    case 'advanced':
      return VISIBILITY_ADVANCED;
    case null:
      return VISIBILITY_VISIBLE;
  }
}

/** The target names in `EnumSet` (ordinal) order. */
function targetNames(option: MdOption): string[] {
  if (option.targets.length === 0) {
    return [];
  }
  const [first, ...rest] = option.targets.map((target) => LayoutOptionDataTarget.valueOf(target.toUpperCase()));
  return first === undefined ? [] : [...EnumSet.of(first, ...rest)].map((target) => target.name());
}

function optionData(entry: IndexedOption): OptionData {
  const { option, type } = entry;
  return {
    id: entry.id,
    group: entry.groups.join(SEPARATOR),
    name: shrinkWhiteSpace(option.label ?? option.name) ?? option.name,
    description: shrinkWhiteSpace(option.description),
    type: type.type,
    optionClass: type.optionClass,
    default: evaluateOptional(option.defaultValue, entry.scope, type),
    lowerBound: evaluateOptional(option.lowerBound, entry.scope, type),
    upperBound: evaluateOptional(option.upperBound, entry.scope, type),
    targets: targetNames(option),
    visibility: visibilityOf(option),
    legacyIds: option.legacyIds.length === 0 ? null : option.legacyIds,
  };
}

function resolveDependencies(entry: IndexedOption, index: OptionIndex): ResolvedDependency[] {
  return entry.option.dependencies.map((dependency, position) => {
    const target = resolveOptionReference(index, entry, dependency.target);
    return {
      constantName: dependencyConstantName(entry.constantName, target.constantName, position),
      target,
      expression: dependency.value,
      value: evaluateOptional(dependency.value, entry.scope, target.type),
    };
  });
}

export function resolveOption(entry: IndexedOption, index: OptionIndex): ResolvedOption {
  return {
    entry,
    data: optionData(entry),
    defaultConstantName: defaultConstantName(entry.constantName),
    lowerBoundConstantName: lowerBoundConstantName(entry.constantName),
    upperBoundConstantName: upperBoundConstantName(entry.constantName),
    dependencies: resolveDependencies(entry, index),
  };
}

export function optionCalls(option: ResolvedOption): RegistryCall[] {
  const dependencyCalls = option.dependencies.map((dependency): RegistryCall => ({
    call: 'addDependency',
    source: option.data.id,
    target: dependency.target.id,
    value: dependency.value,
  }));
  return [{ call: 'registerOption', data: option.data }, ...dependencyCalls];
}
