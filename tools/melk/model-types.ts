// SPDX-License-Identifier: EPL-2.0
import type { TypeRef } from './ast.js';
import { ModelError } from './model-errors.js';

/** The `LayoutOptionData.Type` constant names the inferrer chooses. */
export type OptionTypeName = 'UNDEFINED' | 'BOOLEAN' | 'INT' | 'DOUBLE' | 'STRING' | 'ENUM' | 'ENUMSET' | 'OBJECT';

/** What a value of an option must look like for the expression evaluator. */
export type ValueKind = 'boolean' | 'int' | 'float' | 'double' | 'string' | 'other';

/** The generator-side view of an option's declared type. */
export interface OptionTypeInfo {
  /** The declared type as written, or null for an option without a type. */
  readonly declared: TypeRef | null;
  readonly type: OptionTypeName;
  /** Simple name of the `optionClass` (primitives boxed, `EnumSet<E>` replaced by `E`). */
  readonly optionClass: string;
  readonly valueKind: ValueKind;
  /** The element class of an `EnumSet`, else null. */
  readonly elementClass: string | null;
}

interface TypeRow {
  readonly type: OptionTypeName;
  readonly optionClass: string;
  readonly valueKind: ValueKind;
}

const BOOLEAN_ROW: TypeRow = { type: 'BOOLEAN', optionClass: 'Boolean', valueKind: 'boolean' };
const INT_ROW: TypeRow = { type: 'INT', optionClass: 'Integer', valueKind: 'int' };
const DOUBLE_ROW: TypeRow = { type: 'DOUBLE', optionClass: 'Double', valueKind: 'double' };
const FLOAT_ROW: TypeRow = { type: 'DOUBLE', optionClass: 'Double', valueKind: 'float' };
const STRING_ROW: TypeRow = { type: 'STRING', optionClass: 'String', valueKind: 'string' };

/** `getOptionType` / `getOptionTypeClass` for primitives: `float` is widened to `Double`. */
const PRIMITIVE_ROWS: ReadonlyMap<string, TypeRow> = new Map([
  ['boolean', BOOLEAN_ROW],
  ['int', INT_ROW],
  ['double', DOUBLE_ROW],
  ['float', FLOAT_ROW],
]);

/** `getOptionType` / `getOptionTypeClass` for the boxed types and `String`: `Float` is widened to `Double`. */
const BOXED_ROWS: ReadonlyMap<string, TypeRow> = new Map([
  ['Boolean', BOOLEAN_ROW],
  ['Integer', INT_ROW],
  ['Double', DOUBLE_ROW],
  ['Float', FLOAT_ROW],
  ['String', STRING_ROW],
]);

/** Primitive and boxed types the inferrer maps specially but the generator does not model (no value encoding). */
const UNSUPPORTED_NUMBER_TYPES: ReadonlySet<string> = new Set(['long', 'Long', 'char', 'byte', 'short', 'Number']);

const ENUM_SET = 'EnumSet';
const LIST = 'List';
const NAME_SEPARATOR = '.';

/**
 * The enum types the pinned sources refer to. The Java classifies a type through the JVM type resolver (an enum is a
 * `JvmEnumerationType`); the generator has no classpath, so the classification is this table, kept honest by the
 * comparison with the JVM dump. Keyed by simple name (`Outer.Inner` by its last segment).
 */
export const ENUM_TYPES: ReadonlySet<string> = new Set([
  'Alignment',
  'AnnulusWedgeCriteria',
  'CenterEdgeLabelPlacementStrategy',
  'CompactionStrategy',
  'ContentAlignment',
  'ComponentOrderingStrategy',
  'ConstraintCalculationStrategy',
  'CrossingMinimizationStrategy',
  'CuttingStrategy',
  'CycleBreakingStrategy',
  'Dimension',
  'Direction',
  'DirectionCongruency',
  'EdgeCoords',
  'EdgeLabelPlacement',
  'EdgeLabelSideSelection',
  'EdgeRouting',
  'EdgeRoutingMode',
  'EdgeRoutingStrategy',
  'EdgeStraighteningStrategy',
  'EdgeType',
  'FixedAlignment',
  'ForceModelStrategy',
  'GraphCompactionStrategy',
  'GreedySwitchType',
  'GroupOrderStrategy',
  'HierarchyHandling',
  'HighLevelSortingCriterion',
  'InteractiveReferencePoint',
  'LayerConstraint',
  'LayerUnzippingStrategy',
  'LayeringStrategy',
  'LongEdgeOrderingStrategy',
  'LowLevelSortingCriterion',
  'NodeArrangementStrategy',
  'NodeFlexibility',
  'NodeLabelPlacement',
  'NodePlacementStrategy',
  'NodePromotionStrategy',
  'OptimizationGoal',
  'OrderWeighting',
  'OrderingStrategy',
  'PackingMode',
  'PackingStrategy',
  'PortAlignment',
  'PortConstraints',
  'PortLabelPlacement',
  'PortSide',
  'PortSortingStrategy',
  'RadialTranslationStrategy',
  'RootSelection',
  'SelfLoopDistributionStrategy',
  'SelfLoopOrderingStrategy',
  'ShapeCoords',
  'SizeConstraint',
  'SizeOptions',
  'SortingStrategy',
  'SpanningTreeCostFunction',
  'SplineRoutingMode',
  'StructureExtractionStrategy',
  'TopdownNodeTypes',
  'TopdownSizeApproximator',
  'TraversalStrategy',
  'TreeConstructionStrategy',
  'TreeifyingOrder',
  'ValidifyStrategy',
  'WhiteSpaceEliminationStrategy',
  'WhitespaceEliminationStrategy',
  'WidthApproximationStrategy',
  'WrappingStrategy',
]);

/** The non-enum classes the pinned sources refer to; their options are `OBJECT`. */
export const CLASS_TYPES: ReadonlySet<string> = new Set([
  'ElkMargin',
  'ElkPadding',
  'ExclusiveBounds',
  'ILabelManager',
  'ITopdownSizeApproximator',
  'IndividualSpacings',
  'Integer',
  'KVector',
  'KVectorChain',
  'LayoutAlgorithmData',
  'Object',
]);

/** The last segment of a dotted name: the simple name of a class, nested or not. */
export function simpleName(name: string): string {
  return name.slice(name.lastIndexOf(NAME_SEPARATOR) + 1);
}

/** True when the simple name is a known enum. */
export function isEnumType(name: string): boolean {
  return ENUM_TYPES.has(simpleName(name));
}

/** True when the simple name is a known enum or class. */
export function isKnownType(name: string): boolean {
  return ENUM_TYPES.has(simpleName(name)) || CLASS_TYPES.has(simpleName(name));
}

function infoOf(declared: TypeRef | null, row: TypeRow, elementClass: string | null): OptionTypeInfo {
  return { declared, ...row, elementClass };
}

function objectOf(declared: TypeRef, optionClass: string): OptionTypeInfo {
  return infoOf(declared, { type: 'OBJECT', optionClass, valueKind: 'other' }, null);
}

function enumSetOf(declared: TypeRef): OptionTypeInfo {
  const element = declared.args[0];
  if (element === undefined) {
    throw new ModelError(`EnumSet option type '${declared.name}' has no type argument`);
  }
  const elementClass = simpleName(element.name);
  return infoOf(declared, { type: 'ENUMSET', optionClass: elementClass, valueKind: 'other' }, elementClass);
}

/**
 * `getOptionType` and `getOptionTypeClass`: the `LayoutOptionData.Type` constant and the `optionClass` simple name of
 * an option's declared type; an option without a type is `UNDEFINED` / `Void`.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (getOptionType)
 */
export function resolveOptionType(declared: TypeRef | null): OptionTypeInfo {
  if (declared === null) {
    return infoOf(null, { type: 'UNDEFINED', optionClass: 'Void', valueKind: 'other' }, null);
  }
  const name = simpleName(declared.name);
  if (UNSUPPORTED_NUMBER_TYPES.has(name)) {
    throw new ModelError(`option type '${declared.name}' has no value encoding in the generator`);
  }
  const row = PRIMITIVE_ROWS.get(declared.name) ?? BOXED_ROWS.get(name);
  if (row !== undefined) {
    return infoOf(declared, row, null);
  }
  return resolveReferenceType(declared, name);
}

function resolveReferenceType(declared: TypeRef, name: string): OptionTypeInfo {
  if (name === ENUM_SET) {
    return enumSetOf(declared);
  }
  if (name === LIST) {
    return objectOf(declared, LIST);
  }
  if (ENUM_TYPES.has(name)) {
    return infoOf(declared, { type: 'ENUM', optionClass: name, valueKind: 'other' }, null);
  }
  if (CLASS_TYPES.has(name)) {
    return objectOf(declared, name);
  }
  throw new ModelError(`option type '${declared.name}' is not in the generator's class index (model-types.ts)`);
}
