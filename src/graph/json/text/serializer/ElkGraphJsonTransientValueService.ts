// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';

/** Xtext `ITransientValueService.ListTransient`. @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/ITransientValueService.java */
export const ListTransient = { YES: 'YES', NO: 'NO', SOME: 'SOME' } as const;
export type ListTransient = (typeof ListTransient)[keyof typeof ListTransient];

/** Xtext `ITransientValueService.ValueTransient`. @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/ITransientValueService.java */
export const ValueTransient = { YES: 'YES', PREFERABLY: 'PREFERABLY', NO: 'NO' } as const;
export type ValueTransient = (typeof ValueTransient)[keyof typeof ValueTransient];

/**
 * The structural features of `elkgraph.ecore` that `ElkGraphJson.xtext` assigns, plus the ones the generated
 * constraints bound to zero values (`ElkEdge.sections`). The TS `EObject` has no metamodel (D4), so features are
 * named by string; the features of the metamodel that are not listed (the container references, the derived
 * `hierarchical`, `hyperedge`, ...) are transient in the metamodel and so never written.
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
  INCOMING_SECTIONS: 'incomingSections',
  INCOMING_EDGES: 'incomingEdges',
  OUTGOING_EDGES: 'outgoingEdges',
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
  [ElkFeature.INCOMING_SECTIONS]: { getter: 'getIncomingSections', kind: Kind.MANY },
  [ElkFeature.INCOMING_EDGES]: { getter: 'getIncomingEdges', kind: Kind.MANY },
  [ElkFeature.OUTGOING_EDGES]: { getter: 'getOutgoingEdges', kind: Kind.MANY },
};

/** The many-valued features `ElkGraphJsonTransientValueService.xtend` declares transient. */
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
 * Decides which feature values the sequencer emits: the port of ELK's `ElkGraphJsonTransientValueService` over
 * Xtext's `LegacyTransientValueService`. `eIsSet` is not ported (D4), so it is evaluated here per feature kind, as
 * the generated `eIsSet` does. The `.elkj` language shares the Xtend class of `.elkt` in everything but its package.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/serializer/ElkGraphJsonTransientValueService.xtend
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/LegacyTransientValueService.java
 */
export class ElkGraphJsonTransientValueService {
  /**
   * `YES` for the opposite ends `incomingEdges`, `outgoingEdges` and `incomingSections`; otherwise the legacy
   * rule: a many-valued feature is transient when it is empty (`!eIsSet`); `isCheckElementsIndividually` is never
   * true, so the result is never `SOME`.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/LegacyTransientValueService.java:23-30
   */
  isListTransient(semanticObject: EObject, feature: ElkFeature): ListTransient {
    if (TRANSIENT_LISTS.has(feature)) return ListTransient.YES;
    return this.isSet(semanticObject, feature) ? ListTransient.NO : ListTransient.YES;
  }

  /**
   * An unset feature whose default is serialisable (a double, or the empty label text) is `PREFERABLY` transient:
   * the sequencer prefers to skip it. Other unset features are `YES`; set ones are `NO`.
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
    return kind === Kind.DOUBLE || kind === Kind.EMPTY_STRING;
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
