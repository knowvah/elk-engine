// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../emf/common/util/EList.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { ReferenceAccess } from '../../../xtext/linking/impl/ReferenceAccess.js';
import type { EClassRef, EReferenceInfo } from '../../../xtext/scoping/EReferenceInfo.js';
import type { ElkConnectableShape } from '../../ElkConnectableShape.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';

const MANY = -1;
const SINGLE = 1;

/** `EClass.getName()` of the classes the reflection facade tells apart. */
const ClassName = {
  ELK_CONNECTABLE_SHAPE: 'ElkConnectableShape',
  ELK_NODE: 'ElkNode',
  ELK_PORT: 'ElkPort',
  ELK_EDGE: 'ElkEdge',
  ELK_EDGE_SECTION: 'ElkEdgeSection',
} as const;

/** A class named by `EClass.getName()` together with the names of the classes that are assignable to it. */
function classRef(name: string, ...subclasses: string[]): EClassRef {
  const assignable = new Set([name, ...subclasses]);
  return { name, isAssignableFrom: (eClassName: string): boolean => assignable.has(eClassName) };
}

const ELK_CONNECTABLE_SHAPE_TYPE = classRef(ClassName.ELK_CONNECTABLE_SHAPE, ClassName.ELK_NODE, ClassName.ELK_PORT);
const ELK_EDGE_TYPE = classRef(ClassName.ELK_EDGE);
const ELK_EDGE_SECTION_TYPE = classRef(ClassName.ELK_EDGE_SECTION);

/** A plain, changeable, non-derived, non-transient, non-containment reference. */
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
 * The non-containment references of `elkgraph.ecore` (the `ElkGraphPackage.Literals` of the Java are not
 * ported, mission-2 D3). Containment and container references are not listed: the linker never clears them.
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

/** The references of each class, by `EClass.getName()` (`getEAllReferences` minus containments). */
const REFERENCES_BY_CLASS: ReadonlyMap<string, readonly EReferenceInfo[]> = new Map([
  [ClassName.ELK_NODE, [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, ELK_CONNECTABLE_SHAPE__INCOMING_EDGES]],
  [ClassName.ELK_PORT, [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, ELK_CONNECTABLE_SHAPE__INCOMING_EDGES]],
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

/** What the facade does with one multi-valued reference. */
interface ListAccess {
  list(obj: EObject): { addAll(values: readonly EObject[]): boolean; clear(): void };
}

/** What the facade does with one single-valued reference. */
interface SingleAccess {
  set(obj: EObject, value: EObject | null): void;
}

// casts below: the linker only hands an object the references `getEAllReferences` listed for its class, and
// only objects the scope's reference-type filter admitted as values
function listAccess<O extends EObject, T extends EObject>(get: (owner: O) => EList<T>): ListAccess {
  return {
    list: (obj) => {
      const list = get(obj as O);
      return { addAll: (values) => list.addAll(values as readonly T[]), clear: () => list.clear() };
    },
  };
}

function singleAccess<O extends EObject, T extends EObject>(set: (owner: O, value: T | null) => void): SingleAccess {
  return { set: (obj, value) => set(obj as O, value as T | null) };
}

const LIST_ACCESS: ReadonlyMap<EReferenceInfo, ListAccess> = new Map([
  [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, listAccess((o: ElkConnectableShape) => o.getOutgoingEdges())],
  [ELK_CONNECTABLE_SHAPE__INCOMING_EDGES, listAccess((o: ElkConnectableShape) => o.getIncomingEdges())],
  [ELK_EDGE__SOURCES, listAccess((o: ElkEdge) => o.getSources())],
  [ELK_EDGE__TARGETS, listAccess((o: ElkEdge) => o.getTargets())],
  [ELK_EDGE_SECTION__OUTGOING_SECTIONS, listAccess((o: ElkEdgeSection) => o.getOutgoingSections())],
  [ELK_EDGE_SECTION__INCOMING_SECTIONS, listAccess((o: ElkEdgeSection) => o.getIncomingSections())],
]);

const SINGLE_ACCESS: ReadonlyMap<EReferenceInfo, SingleAccess> = new Map([
  [
    ELK_EDGE_SECTION__OUTGOING_SHAPE,
    singleAccess((o: ElkEdgeSection, v: ElkConnectableShape | null) => o.setOutgoingShape(v)),
  ],
  [
    ELK_EDGE_SECTION__INCOMING_SHAPE,
    singleAccess((o: ElkEdgeSection, v: ElkConnectableShape | null) => o.setIncomingShape(v)),
  ],
]);

function listOf(obj: EObject, ref: EReferenceInfo): ReturnType<ListAccess['list']> {
  const access = LIST_ACCESS.get(ref);
  if (access === undefined) throw new TypeError(`'${ref.name}' is not a multi-valued ElkGraph reference`);
  return access.list(obj);
}

/**
 * The reflection of the linker and the scope provider over `elkgraph.ecore`'s five cross references
 * (`sources`, `targets`, `incomingShape`, `outgoingShape`, `outgoingSections`) and their opposites. The
 * opposites are maintained by the model's own lists, as in EMF. Port-local: the TS `EObject` has no
 * metamodel (mission-2 D4), so there is no Java counterpart.
 */
export class ElkGraphReferences implements ReferenceAccess {
  getEAllReferences(obj: EObject): readonly EReferenceInfo[] {
    return REFERENCES_BY_CLASS.get(obj.eClass().getName()) ?? [];
  }

  getReference(obj: EObject, featureName: string): EReferenceInfo | null {
    return this.getEAllReferences(obj).find((ref) => ref.name === featureName) ?? null;
  }

  /** A list is emptied (which removes the inverse ends); a single value is set to `null`. */
  eUnset(obj: EObject, ref: EReferenceInfo): void {
    const single = SINGLE_ACCESS.get(ref);
    if (single === undefined) {
      listOf(obj, ref).clear();
    } else {
      single.set(obj, null);
    }
  }

  eSet(obj: EObject, ref: EReferenceInfo, value: EObject): void {
    const single = SINGLE_ACCESS.get(ref);
    if (single === undefined) throw new TypeError(`'${ref.name}' is not a single-valued ElkGraph reference`);
    single.set(obj, value);
  }

  eGetList(obj: EObject, ref: EReferenceInfo): { addAll(values: readonly EObject[]): boolean } {
    return listOf(obj, ref);
  }
}
