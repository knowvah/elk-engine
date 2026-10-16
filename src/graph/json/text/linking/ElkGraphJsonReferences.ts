// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type {
  LazyReferenceList,
  LazyLinkingResourceMetamodel,
} from '../../../../xtext/linking/lazy/LazyLinkingResourceTypes.js';
import type {
  LazyEClass,
  LazyEPackage,
  LazyEPackageRegistry,
  LazyLinkerMetamodel,
} from '../../../../xtext/linking/lazy/LazyLinkingMetamodel.js';
import type { EClassRef, EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import type { ElkConnectableShape } from '../../../ElkConnectableShape.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkEdgeSection } from '../../../ElkEdgeSection.js';

const MANY = -1;
const SINGLE = 1;

/** `EClass.getName()` of the classes the reflection facade tells apart. */
export const ClassName = {
  ELK_CONNECTABLE_SHAPE: 'ElkConnectableShape',
  ELK_NODE: 'ElkNode',
  ELK_PORT: 'ElkPort',
  ELK_EDGE: 'ElkEdge',
  ELK_EDGE_SECTION: 'ElkEdgeSection',
} as const;

function classRef(name: string, ...subclasses: string[]): EClassRef {
  const assignable = new Set([name, ...subclasses]);
  return { name, isAssignableFrom: (eClassName: string): boolean => assignable.has(eClassName) };
}

const ELK_CONNECTABLE_SHAPE_TYPE = classRef(ClassName.ELK_CONNECTABLE_SHAPE, ClassName.ELK_NODE, ClassName.ELK_PORT);
const ELK_EDGE_TYPE = classRef(ClassName.ELK_EDGE);
const ELK_EDGE_SECTION_TYPE = classRef(ClassName.ELK_EDGE_SECTION);

/** A plain, changeable, non-derived, non-transient, non-containment reference (`resolveProxies` defaults to true). */
function reference(name: string, referenceType: EClassRef, upperBound: number): EReferenceInfo {
  return {
    name,
    referenceType,
    upperBound,
    unique: true,
    containment: false,
    container: false,
    derived: false,
    changeable: true,
    transient: false,
  };
}

/**
 * The non-containment references of `elkgraph.ecore`, in feature order per class. A second copy of the `.elkt`
 * table (`src/graph/text/linking/ElkGraphReferences.ts`), which this bundle may not import (AD-8): `elkgraph.ecore`
 * is the single source of both, and the `ElkGraphPackage.Literals` of the Java are not ported (mission-2 D3).
 */
export const ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES: EReferenceInfo = reference('outgoingEdges', ELK_EDGE_TYPE, MANY);
export const ELK_CONNECTABLE_SHAPE__INCOMING_EDGES: EReferenceInfo = reference('incomingEdges', ELK_EDGE_TYPE, MANY);
export const ELK_EDGE__SOURCES: EReferenceInfo = reference('sources', ELK_CONNECTABLE_SHAPE_TYPE, MANY);
export const ELK_EDGE__TARGETS: EReferenceInfo = reference('targets', ELK_CONNECTABLE_SHAPE_TYPE, MANY);
export const ELK_EDGE_SECTION__OUTGOING_SHAPE: EReferenceInfo = reference(
  'outgoingShape',
  ELK_CONNECTABLE_SHAPE_TYPE,
  SINGLE,
);
export const ELK_EDGE_SECTION__INCOMING_SHAPE: EReferenceInfo = reference(
  'incomingShape',
  ELK_CONNECTABLE_SHAPE_TYPE,
  SINGLE,
);
export const ELK_EDGE_SECTION__OUTGOING_SECTIONS: EReferenceInfo = reference(
  'outgoingSections',
  ELK_EDGE_SECTION_TYPE,
  MANY,
);
export const ELK_EDGE_SECTION__INCOMING_SECTIONS: EReferenceInfo = reference(
  'incomingSections',
  ELK_EDGE_SECTION_TYPE,
  MANY,
);

const SHAPE_REFERENCES = [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, ELK_CONNECTABLE_SHAPE__INCOMING_EDGES];

/** The references of each class, by `EClass.getName()` (`getEAllReferences` minus containments and containers). */
const REFERENCES_BY_CLASS: ReadonlyMap<string, readonly EReferenceInfo[]> = new Map([
  [ClassName.ELK_NODE, SHAPE_REFERENCES],
  [ClassName.ELK_PORT, SHAPE_REFERENCES],
  [ClassName.ELK_EDGE, [ELK_EDGE__SOURCES, ELK_EDGE__TARGETS]],
  [
    ClassName.ELK_EDGE_SECTION,
    [
      ELK_EDGE_SECTION__OUTGOING_SHAPE,
      ELK_EDGE_SECTION__INCOMING_SHAPE,
      ELK_EDGE_SECTION__OUTGOING_SECTIONS,
      ELK_EDGE_SECTION__INCOMING_SECTIONS,
    ],
  ],
]);

/** The list of a multi-valued reference as the linker and the resource use it. */
interface UniqueList extends LazyReferenceList {
  addUnique(object: EObject): void;
  addAll(values: readonly EObject[]): boolean;
  clear(): void;
}

// casts below: the linker and the resource only hand an object the references listed for its class, and the
// getters of the model return the (resolving) `BasicEList` subclasses, which carry the `InternalEList` members
function listGetter<O>(get: (owner: O) => unknown): (obj: EObject) => UniqueList {
  return (obj) => get(obj as O) as UniqueList;
}

function singleGetter<O>(get: (owner: O) => EObject | null): (obj: EObject) => EObject | null {
  return (obj) => get(obj as O);
}

function singleSetter<O>(
  set: (owner: O, value: EObject | null) => void,
): (obj: EObject, value: EObject | null) => void {
  return (obj, value) => set(obj as O, value);
}

const LISTS: ReadonlyMap<EReferenceInfo, (obj: EObject) => UniqueList> = new Map([
  [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, listGetter((o: ElkConnectableShape) => o.getOutgoingEdges())],
  [ELK_CONNECTABLE_SHAPE__INCOMING_EDGES, listGetter((o: ElkConnectableShape) => o.getIncomingEdges())],
  [ELK_EDGE__SOURCES, listGetter((o: ElkEdge) => o.getSources())],
  [ELK_EDGE__TARGETS, listGetter((o: ElkEdge) => o.getTargets())],
  [ELK_EDGE_SECTION__OUTGOING_SECTIONS, listGetter((o: ElkEdgeSection) => o.getOutgoingSections())],
  [ELK_EDGE_SECTION__INCOMING_SECTIONS, listGetter((o: ElkEdgeSection) => o.getIncomingSections())],
]);

const SINGLES: ReadonlyMap<
  EReferenceInfo,
  { get: (obj: EObject) => EObject | null; set: (obj: EObject, value: EObject | null) => void }
> = new Map([
  [
    ELK_EDGE_SECTION__OUTGOING_SHAPE,
    {
      get: singleGetter((o: ElkEdgeSection) => o.getOutgoingShape()),
      set: singleSetter((o: ElkEdgeSection, v) => o.setOutgoingShape(v as ElkConnectableShape | null)),
    },
  ],
  [
    ELK_EDGE_SECTION__INCOMING_SHAPE,
    {
      get: singleGetter((o: ElkEdgeSection) => o.getIncomingShape()),
      set: singleSetter((o: ElkEdgeSection, v) => o.setIncomingShape(v as ElkConnectableShape | null)),
    },
  ],
]);

/** `EReference.getEContainingClass().getName()` of each reference above. */
const CONTAINING_CLASS: ReadonlyMap<EReferenceInfo, string> = new Map([
  [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, ClassName.ELK_CONNECTABLE_SHAPE],
  [ELK_CONNECTABLE_SHAPE__INCOMING_EDGES, ClassName.ELK_CONNECTABLE_SHAPE],
  [ELK_EDGE__SOURCES, ClassName.ELK_EDGE],
  [ELK_EDGE__TARGETS, ClassName.ELK_EDGE],
  [ELK_EDGE_SECTION__OUTGOING_SHAPE, ClassName.ELK_EDGE_SECTION],
  [ELK_EDGE_SECTION__INCOMING_SHAPE, ClassName.ELK_EDGE_SECTION],
  [ELK_EDGE_SECTION__OUTGOING_SECTIONS, ClassName.ELK_EDGE_SECTION],
  [ELK_EDGE_SECTION__INCOMING_SECTIONS, ClassName.ELK_EDGE_SECTION],
]);

const NOT_CONSULTED =
  'is not consulted: ElkGraphJsonLazyLinker overrides getProxyType, the only reader of the metamodel packages';

function listOf(obj: EObject, ref: EReferenceInfo): UniqueList {
  const access = LISTS.get(ref);
  if (access === undefined) throw new TypeError(`'${ref.name}' is not a multi-valued ElkGraph reference`);
  return access(obj);
}

function singleOf(ref: EReferenceInfo): NonNullable<ReturnType<typeof SINGLES.get>> {
  const access = SINGLES.get(ref);
  if (access === undefined) throw new TypeError(`'${ref.name}' is not a single-valued ElkGraph reference`);
  return access;
}

/**
 * The reflection of the lazy linker and of the lazy linking resource over `elkgraph.ecore`'s cross references
 * (`sources`, `targets`, the two section shapes and section lists, and the opposites `outgoingEdges` /
 * `incomingEdges`; all `resolveProxies`). The opposites are maintained by the model's own resolving lists, as in
 * EMF. Port-local: the TS `EObject` has no metamodel (mission-2 D4), so there is no Java counterpart.
 */
export class ElkGraphJsonReferences implements LazyLinkerMetamodel, LazyLinkingResourceMetamodel {
  getEAllReferences(obj: EObject): readonly EReferenceInfo[] {
    return REFERENCES_BY_CLASS.get(obj.eClass().getName()) ?? [];
  }

  /** The `crossReferences()` subset of the same list: containments and containers are not listed at all. */
  getCrossReferences(source: EObject): readonly EReferenceInfo[] {
    return this.getEAllReferences(source);
  }

  getReference(obj: EObject, featureName: string): EReferenceInfo | null {
    return this.getEAllReferences(obj).find((ref) => ref.name === featureName) ?? null;
  }

  isResolveProxies(_ref: EReferenceInfo): boolean {
    return true;
  }

  /** `eReference.getEContainingClass().getName()`. */
  getContainingClassName(ref: EReferenceInfo): string {
    const name = CONTAINING_CLASS.get(ref);
    if (name === undefined) throw new TypeError(`'${ref.name}' is not an ElkGraph cross reference`);
    return name;
  }

  /** A list is emptied (which removes the inverse ends); a single value is set to `null`. */
  eUnset(obj: EObject, ref: EReferenceInfo): void {
    if (SINGLES.has(ref)) {
      singleOf(ref).set(obj, null);
    } else {
      listOf(obj, ref).clear();
    }
  }

  eSet(obj: EObject, ref: EReferenceInfo, value: EObject): void {
    singleOf(ref).set(obj, value);
  }

  eGetList(obj: EObject, ref: EReferenceInfo): { addAll(values: readonly EObject[]): boolean } {
    return listOf(obj, ref);
  }

  getList(source: EObject, ref: EReferenceInfo): LazyReferenceList {
    return listOf(source, ref);
  }

  getOne(source: EObject, ref: EReferenceInfo): EObject | null {
    return singleOf(ref).get(source);
  }

  setOne(source: EObject, ref: EReferenceInfo, target: EObject): void {
    singleOf(ref).set(source, target);
  }

  /** `((InternalEList<EObject>) obj.eGet(ref, false)).addUnique(proxy)`: no duplicate check, the inverse is set. */
  addUnique(obj: EObject, ref: EReferenceInfo, proxy: EObject): void {
    listOf(obj, ref).addUnique(proxy);
  }

  getReferenceType(_ref: EReferenceInfo, _obj: EObject): LazyEClass {
    throw new IllegalStateException(`getReferenceType ${NOT_CONSULTED}`);
  }

  getMetamodelPackages(): readonly LazyEPackage[] {
    throw new IllegalStateException(`getMetamodelPackages ${NOT_CONSULTED}`);
  }

  getRegistry(): LazyEPackageRegistry {
    throw new IllegalStateException(`getRegistry ${NOT_CONSULTED}`);
  }
}
