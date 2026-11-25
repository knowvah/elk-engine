// SPDX-License-Identifier: EPL-2.0
import { type DotEObject, type DotFeature, DotPackage } from '../dot/DotPackage.js';
import { type DotSerializationContext, throwDiagnostic } from './GraphvizDotSerializationDiagnostic.js';

const L = DotPackage.Literals;

/** Java `IGrammarConstraintProvider.MAX`: the upper bound of a `+=` or `*` assignment. */
const MANY = Number.POSITIVE_INFINITY;

/** One `IFeatureInfo` of a constraint: the feature and how many values the constraint takes. */
export interface FeatureBounds {
  readonly feature: DotFeature;
  readonly lower: number;
  readonly upper: number;
}

/** The parts of an `IConstraint` the diagnostics read: the type's name and the feature bounds, in feature order. */
export interface DotConstraint {
  readonly type: string;
  readonly features: readonly FeatureBounds[];
}

const bounds = (feature: DotFeature, lower: number, upper: number): FeatureBounds => ({ feature, lower, upper });

/**
 * The constraints of the generated semantic sequencer (its `Constraint:` comments) reduced to their feature bounds.
 * `Attribute` (the `Statement`/`Attribute` contexts) is missing: its generated method checks its two values itself.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSemanticSequencer.java
 */
export const GraphvizDotConstraints: Readonly<Record<string, DotConstraint>> = {
  // graphs+=Graph+
  GraphvizModel: { type: 'GraphvizModel', features: [bounds(L.GRAPHVIZ_MODEL__GRAPHS, 1, MANY)] },
  // (strict?='strict'? type=GraphType name=DotID? statements+=Statement*)
  Graph: {
    type: 'Graph',
    features: [
      bounds(L.GRAPH__STRICT, 0, 1),
      bounds(L.GRAPH__TYPE, 1, 1),
      bounds(L.GRAPH__NAME, 0, 1),
      bounds(L.GRAPH__STATEMENTS, 0, MANY),
    ],
  },
  // (type=AttributeType (attributes+=ListAttribute attributes+=ListAttribute*)?)
  AttributeStatement: {
    type: 'AttributeStatement',
    features: [bounds(L.ATTRIBUTE_STATEMENT__TYPE, 1, 1), bounds(L.ATTRIBUTE_STATEMENT__ATTRIBUTES, 0, MANY)],
  },
  // (sourceNode=Node edgeTargets+=EdgeTarget+ (attributes+=ListAttribute attributes+=ListAttribute*)?)
  EdgeStatement: {
    type: 'EdgeStatement',
    features: [
      bounds(L.EDGE_STATEMENT__SOURCE_NODE, 1, 1),
      bounds(L.EDGE_STATEMENT__EDGE_TARGETS, 1, MANY),
      bounds(L.EDGE_STATEMENT__ATTRIBUTES, 0, MANY),
    ],
  },
  // (operator=EdgeOperator (targetSubgraph=Subgraph | targetnode=Node))
  EdgeTarget: {
    type: 'EdgeTarget',
    features: [
      bounds(L.EDGE_TARGET__OPERATOR, 1, 1),
      bounds(L.EDGE_TARGET__TARGET_SUBGRAPH, 0, 1),
      bounds(L.EDGE_TARGET__TARGETNODE, 0, 1),
    ],
  },
  // (name=DotID value=DotID?)
  ListAttribute: {
    type: 'Attribute',
    features: [bounds(L.ATTRIBUTE__NAME, 1, 1), bounds(L.ATTRIBUTE__VALUE, 0, 1)],
  },
  // (node=Node (attributes+=ListAttribute attributes+=ListAttribute*)?)
  NodeStatement: {
    type: 'NodeStatement',
    features: [bounds(L.NODE_STATEMENT__NODE, 1, 1), bounds(L.NODE_STATEMENT__ATTRIBUTES, 0, MANY)],
  },
  // (name=DotID port=Port?)
  Node: { type: 'Node', features: [bounds(L.NODE__NAME, 1, 1), bounds(L.NODE__PORT, 0, 1)] },
  // (name=DotID compass_pt=ID?)
  Port: { type: 'Port', features: [bounds(L.PORT__NAME, 1, 1), bounds(L.PORT__COMPASS_PT, 0, 1)] },
  // (name=ID? statements+=Statement*)
  Subgraph: { type: 'Subgraph', features: [bounds(L.SUBGRAPH__NAME, 0, 1), bounds(L.SUBGRAPH__STATEMENTS, 0, MANY)] },
};

/**
 * `TransientValueService.defaultValueIsSerializeable`: an attribute whose default can be written, i.e. every
 * attribute but an `EString` without default. In the DOT model: the boolean `strict` and the three enums.
 */
const SERIALIZABLE_DEFAULTS: ReadonlySet<DotFeature> = new Set([
  L.GRAPH__STRICT,
  L.GRAPH__TYPE,
  L.EDGE_TARGET__OPERATOR,
  L.ATTRIBUTE_STATEMENT__TYPE,
]);

function listSize(value: unknown): number | null {
  return typeof value === 'object' && value !== null && 'size' in value ? (value as { size(): number }).size() : null;
}

/**
 * `SerializableObject.isOptional`: a single value that is not set but whose default can be written
 * (`LegacyTransientValueService.isValueTransient` is `PREFERABLY`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/BacktrackingSemanticSequencer.java:225-239
 */
export function isOptional(obj: DotEObject, feature: DotFeature): boolean {
  return (
    listSize(obj.eGet(feature.featureID, false, false)) === null &&
    !obj.eIsSet(feature.featureID) &&
    SERIALIZABLE_DEFAULTS.has(feature)
  );
}

/**
 * `SerializableObject.getValueCount`: the size of a list; for a single value 1 when it is set or its default can be
 * written (`NO`/`PREFERABLY`), 0 when it is transient (`YES`: an unset string or reference).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/BacktrackingSemanticSequencer.java:265-272
 */
export function getValueCount(obj: DotEObject, feature: DotFeature): number {
  const size = listSize(obj.eGet(feature.featureID, false, false));
  if (size !== null) return size;
  return obj.eIsSet(feature.featureID) || SERIALIZABLE_DEFAULTS.has(feature) ? 1 : 0;
}

/** The bound hints of `createBacktrackingFailedDiagnostic` for one feature. */
function hintsFor(obj: DotEObject, info: FeatureBounds, type: string): string[] {
  const count = getValueCount(obj, info.feature);
  const name = `${type}.${info.feature.name}`;
  const many = listSize(obj.eGet(info.feature.featureID, false, false)) !== null;
  const hints: string[] = [];
  if (!isOptional(obj, info.feature) && count > info.upper) {
    hints.push(
      many
        ? `${name} violates the upper bound: It holds ${count} values, but only ${info.upper} are allowed.`
        : `${name} is not allowed to have a value, but it does.`,
    );
  }
  if (count < info.lower) {
    hints.push(
      many
        ? `${name} violates the lower bound: It holds ${count} values, but at least ${info.lower} are required.`
        : `${name} is required to have a value, but it does not.`,
    );
  }
  return hints;
}

/**
 * The first arm of `SequencerDiagnosticProvider.createBacktrackingFailedDiagnostic`: when a value count is outside
 * the bounds of the constraint, the backtracking of the generic sequencer finds no path, and the error acceptor
 * throws `Could not serialize <type>:` with one hint per violated bound. Every feature's containing class is the
 * constraint's type in this grammar, so the hint names `<type>.<feature>`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/SequencerDiagnosticProvider.java:70-104
 */
export function checkBounds(obj: DotEObject, context: DotSerializationContext, constraint: DotConstraint): void {
  const hints = constraint.features.flatMap((info) => hintsFor(obj, info, constraint.type));
  if (hints.length > 0) {
    const message = `Could not serialize ${constraint.type}:\n${hints.join('\n')}`;
    throwDiagnostic({ message, exception: null, semanticObject: obj, context, feature: null });
  }
}

/**
 * `SerializableObject.getValuesString`: `Values: ` and every feature with values, `name(count)`, or `name(0-count)`
 * for an optional one, in feature order.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/BacktrackingSemanticSequencer.java:274-285
 */
function getValuesString(obj: DotEObject): string {
  const items: string[] = [];
  for (const feature of obj.eClass().getEAllStructuralFeatures()) {
    const count = getValueCount(obj, feature);
    if (count > 0) items.push(`${feature.name}(${isOptional(obj, feature) ? `0-${count}` : String(count)})`);
  }
  return `Values: ${items.join(', ')}`;
}

/**
 * The second arm of `createBacktrackingFailedDiagnostic`: every count is within its bounds, yet no path of the
 * constraint consumes the values (`constraintText` is the constraint's `toString()`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/SequencerDiagnosticProvider.java:98-103
 */
export function throwBacktrackingFailed(
  obj: DotEObject,
  context: DotSerializationContext,
  constraint: DotConstraint,
  constraintText: string,
): never {
  const message = `Could not serialize ${constraint.type} via backtracking.\nConstraint: ${constraintText}\n${getValuesString(obj)}`;
  return throwDiagnostic({ message, exception: null, semanticObject: obj, context, feature: null });
}
