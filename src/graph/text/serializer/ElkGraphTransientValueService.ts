// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';

/** Xtext `ITransientValueService.ListTransient`. @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/ITransientValueService.java */
export const ListTransient = { YES: 'YES', NO: 'NO', SOME: 'SOME' } as const;
export type ListTransient = (typeof ListTransient)[keyof typeof ListTransient];

/** Xtext `ITransientValueService.ValueTransient`. @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/ITransientValueService.java */
export const ValueTransient = { YES: 'YES', PREFERABLY: 'PREFERABLY', NO: 'NO' } as const;
export type ValueTransient = (typeof ValueTransient)[keyof typeof ValueTransient];

/**
 * The structural features of `elkgraph.ecore` that `ElkGraph.xtext` assigns. The TS `EObject` has no metamodel
 * (D4), so features are named by string; features of the metamodel that are not listed (the container references
 * `parent`, `containingNode`, the derived `hierarchical`, `hyperedge`, ...) are transient in the metamodel and so
 * always `YES` here.
 */
export const ElkFeature = {
  IDENTIFIER: 'identifier',
  X: 'x',
  Y: 'y',
  WIDTH: 'width',
  HEIGHT: 'height',
  TEXT: 'text',
  PROPERTIES: 'properties',
  LABELS: 'labels',
  PORTS: 'ports',
  CHILDREN: 'children',
  CONTAINED_EDGES: 'containedEdges',
  SOURCES: 'sources',
  TARGETS: 'targets',
  SECTIONS: 'sections',
  INCOMING_SHAPE: 'incomingShape',
  OUTGOING_SHAPE: 'outgoingShape',
  START_X: 'startX',
  START_Y: 'startY',
  END_X: 'endX',
  END_Y: 'endY',
  BEND_POINTS: 'bendPoints',
  OUTGOING_SECTIONS: 'outgoingSections',
  INCOMING_SECTIONS: 'incomingSections',
  INCOMING_EDGES: 'incomingEdges',
  OUTGOING_EDGES: 'outgoingEdges',
  KEY: 'key',
  VALUE: 'value',
} as const;
export type ElkFeature = (typeof ElkFeature)[keyof typeof ElkFeature];

/** How `eIsSet` and `defaultValueIsSerializeable` treat a feature. */
const Kind = {
  /** `EDouble` attribute, default `0.0`: unset iff `== 0.0` (`-0.0` is unset, `NaN` is set). */
  DOUBLE: 'double',
  /** `EString` attribute with default `null`: unset iff `null`; its default is not serialisable. */
  NULLABLE_STRING: 'nullableString',
  /** `EString` attribute with default `""` (`ElkLabel.text`). */
  EMPTY_STRING: 'emptyString',
  /** `EJavaObject` attribute with default `null` (`ElkPropertyToValueMapEntry.key`/`value`). */
  JAVA_OBJECT: 'javaObject',
  /** Single-valued reference, default `null`; references have no serialisable default. */
  REFERENCE: 'reference',
  /** Many-valued feature: set iff not empty. */
  MANY: 'many',
} as const;
type Kind = (typeof Kind)[keyof typeof Kind];

interface FeatureInfo {
  readonly getter: string;
  readonly kind: Kind;
}

const FEATURES: Readonly<Record<ElkFeature, FeatureInfo>> = {
  [ElkFeature.IDENTIFIER]: { getter: 'getIdentifier', kind: Kind.NULLABLE_STRING },
  [ElkFeature.X]: { getter: 'getX', kind: Kind.DOUBLE },
  [ElkFeature.Y]: { getter: 'getY', kind: Kind.DOUBLE },
  [ElkFeature.WIDTH]: { getter: 'getWidth', kind: Kind.DOUBLE },
  [ElkFeature.HEIGHT]: { getter: 'getHeight', kind: Kind.DOUBLE },
  [ElkFeature.TEXT]: { getter: 'getText', kind: Kind.EMPTY_STRING },
  [ElkFeature.PROPERTIES]: { getter: 'getProperties', kind: Kind.MANY },
  [ElkFeature.LABELS]: { getter: 'getLabels', kind: Kind.MANY },
  [ElkFeature.PORTS]: { getter: 'getPorts', kind: Kind.MANY },
  [ElkFeature.CHILDREN]: { getter: 'getChildren', kind: Kind.MANY },
  [ElkFeature.CONTAINED_EDGES]: { getter: 'getContainedEdges', kind: Kind.MANY },
  [ElkFeature.SOURCES]: { getter: 'getSources', kind: Kind.MANY },
  [ElkFeature.TARGETS]: { getter: 'getTargets', kind: Kind.MANY },
  [ElkFeature.SECTIONS]: { getter: 'getSections', kind: Kind.MANY },
  [ElkFeature.INCOMING_SHAPE]: { getter: 'getIncomingShape', kind: Kind.REFERENCE },
  [ElkFeature.OUTGOING_SHAPE]: { getter: 'getOutgoingShape', kind: Kind.REFERENCE },
  [ElkFeature.START_X]: { getter: 'getStartX', kind: Kind.DOUBLE },
  [ElkFeature.START_Y]: { getter: 'getStartY', kind: Kind.DOUBLE },
  [ElkFeature.END_X]: { getter: 'getEndX', kind: Kind.DOUBLE },
  [ElkFeature.END_Y]: { getter: 'getEndY', kind: Kind.DOUBLE },
  [ElkFeature.BEND_POINTS]: { getter: 'getBendPoints', kind: Kind.MANY },
  [ElkFeature.OUTGOING_SECTIONS]: { getter: 'getOutgoingSections', kind: Kind.MANY },
  [ElkFeature.INCOMING_SECTIONS]: { getter: 'getIncomingSections', kind: Kind.MANY },
  [ElkFeature.INCOMING_EDGES]: { getter: 'getIncomingEdges', kind: Kind.MANY },
  [ElkFeature.OUTGOING_EDGES]: { getter: 'getOutgoingEdges', kind: Kind.MANY },
  [ElkFeature.KEY]: { getter: 'getKey', kind: Kind.JAVA_OBJECT },
  [ElkFeature.VALUE]: { getter: 'getValue', kind: Kind.JAVA_OBJECT },
};

/** The many-valued features `ElkGraphTransientValueService.xtend` declares transient. */
const TRANSIENT_LISTS: ReadonlySet<ElkFeature> = new Set([
  ElkFeature.INCOMING_EDGES,
  ElkFeature.OUTGOING_EDGES,
  ElkFeature.INCOMING_SECTIONS,
]);

const DOUBLE_DEFAULT = 0;
const EMPTY_STRING_DEFAULT = '';

/** What the features' getters return, as far as `eIsSet` needs it. */
interface Sized {
  size(): number;
}

type Getters = Readonly<Record<string, () => unknown>>;

/**
 * Decides which feature values the sequencer emits: the port of ELK's `ElkGraphTransientValueService` over
 * Xtext's `LegacyTransientValueService`/`DefaultTransientValueService`. `eIsSet` is not ported (D4), so it is
 * evaluated here per feature kind, as the generated `eIsSet` does.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/serializer/ElkGraphTransientValueService.xtend
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/LegacyTransientValueService.java
 */
export class ElkGraphTransientValueService {
  /**
   * `YES` for the opposite ends `incomingEdges`, `outgoingEdges` and `incomingSections` (`:25-33`); otherwise the
   * legacy rule `isTransient(owner, feature, -1)`: a many-valued feature is transient when it is empty
   * (`!eIsSet`); `isCheckElementsIndividually` is never true, so the result is never `SOME`.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/LegacyTransientValueService.java:23-30
   */
  isListTransient(semanticObject: EObject, feature: ElkFeature): ListTransient {
    if (TRANSIENT_LISTS.has(feature)) return ListTransient.YES;
    return this.isSet(semanticObject, feature) ? ListTransient.NO : ListTransient.YES;
  }

  /** @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/LegacyTransientValueService.java:32-35 */
  isValueInListTransient(_semanticObject: EObject, _index: number, _feature: ElkFeature): boolean {
    return false;
  }

  /**
   * An unset feature whose default is serialisable (an attribute, except an `EString` whose default is `null`)
   * is `PREFERABLY` transient: the sequencer may skip it but, when the grammar forces a pair, writes the
   * default. Other unset features are `YES`; set ones are `NO`.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/LegacyTransientValueService.java:37-47
   */
  isValueTransient(semanticObject: EObject, feature: ElkFeature): ValueTransient {
    if (this.isSet(semanticObject, feature)) return ValueTransient.NO;
    return this.defaultValueIsSerializable(feature) ? ValueTransient.PREFERABLY : ValueTransient.YES;
  }

  /** `TransientValueService.defaultValueIsSerializeable`. */
  private defaultValueIsSerializable(feature: ElkFeature): boolean {
    const kind = FEATURES[feature].kind;
    return kind === Kind.DOUBLE || kind === Kind.EMPTY_STRING || kind === Kind.JAVA_OBJECT;
  }

  /** The generated `eIsSet(featureID)` of the feature's class. */
  isSet(semanticObject: EObject, feature: ElkFeature): boolean {
    const { getter, kind } = FEATURES[feature];
    // cast: every ElkGraph class of the grammar has the getter its feature names (the table above)
    const value = (semanticObject as unknown as Getters)[getter]!();
    switch (kind) {
      case Kind.DOUBLE:
        return value !== DOUBLE_DEFAULT;
      case Kind.EMPTY_STRING:
        return value !== EMPTY_STRING_DEFAULT;
      case Kind.MANY:
        return (value as Sized).size() > 0;
      default:
        return value !== null;
    }
  }
}
