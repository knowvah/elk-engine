// SPDX-License-Identifier: EPL-2.0
import { BasicEList } from '../../../src/emf/common/util/BasicEList.js';
import type { EList } from '../../../src/emf/common/util/EList.js';
import type { EClass } from '../../../src/emf/ecore/EClass.js';
import type { EObject } from '../../../src/emf/ecore/EObject.js';
import type { IQualifiedNameConverter } from '../../../src/xtext/naming/IQualifiedNameConverter.js';
import type { IQualifiedNameProvider } from '../../../src/xtext/naming/IQualifiedNameProvider.js';
import { QualifiedName } from '../../../src/xtext/naming/QualifiedName.js';
import type { IEObjectDescription } from '../../../src/xtext/resource/IEObjectDescription.js';
import { ResourceScopeCache } from '../../../src/xtext/util/ResourceScopeCache.js';
import type { EClassRef, EReferenceInfo } from '../../../src/xtext/scoping/EReferenceInfo.js';
import { CaseInsensitivityHelper } from '../../../src/xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../../src/xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../../src/xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';

/**
 * Test-only toy model for the scoping tests (a tree of identified nodes, the shape of ElkGraph
 * containment). Not part of the library surface.
 */
export const NODE_CLASS_NAME = 'Node';
const NODE_CLASS: EClass = { getName: (): string => NODE_CLASS_NAME };

/** A node; `id === null` is an unnamed node (like an ElkGraph root without `graph <id>`). */
export class Node implements EObject {
  parent: Node | null = null;
  readonly children: Node[];

  constructor(
    readonly id: string | null,
    ...children: Node[]
  ) {
    this.children = children;
    for (const child of children) child.parent = this;
  }

  eClass(): EClass {
    return NODE_CLASS;
  }

  eContainer(): Node | null {
    return this.parent;
  }

  /** The `InternalEObject` surface `EcoreUtil.getRootContainer` reads. */
  eInternalContainer(): Node | null {
    return this.parent;
  }

  eContents(): EList<EObject> {
    const list = new BasicEList<EObject>();
    for (const child of this.children) list.add(child);
    return list;
  }

  /** Pre-order, like `EObject.eAllContents`. */
  eAllContents(): IterableIterator<EObject> {
    return this.preOrder();
  }

  private *preOrder(): IterableIterator<EObject> {
    for (const child of this.children) {
      yield child;
      yield* child.preOrder();
    }
  }

  /** `node('a', ...)` shorthand. */
  static of(id: string | null, ...children: Node[]): Node {
    return new Node(id, ...children);
  }
}

/** A reference to any node, case-sensitive, with the flags of a plain cross reference. */
export const NODE_TYPE: EClassRef = {
  name: NODE_CLASS_NAME,
  isAssignableFrom: (eClassName: string): boolean => eClassName === NODE_CLASS_NAME,
};

export const NODE_REFERENCE: EReferenceInfo = {
  name: 'target',
  referenceType: NODE_TYPE,
  upperBound: 1,
  unique: true,
  containment: false,
  container: false,
  derived: false,
  changeable: true,
  transient: false,
};

/** The qualified name of a node: the parent's name plus the id; none for an unnamed node. */
export const nodeNameProvider: IQualifiedNameProvider = {
  getFullyQualifiedName(obj: EObject): QualifiedName | null {
    const node = obj as Node;
    if (node.id === null) return null;
    const parentName = node.parent === null ? null : nodeNameProvider.getFullyQualifiedName(node.parent);
    return parentName === null ? QualifiedName.create(node.id) : parentName.append(node.id);
  },
  apply(from: EObject): QualifiedName | null {
    return nodeNameProvider.getFullyQualifiedName(from);
  },
};

export const dotConverter: IQualifiedNameConverter = {
  toString: (name) => name.toString(),
  toQualifiedName: (text) => QualifiedName.createFromList(text.split('.')),
};

/** The Xtext provider chain without an ELK-specific delegate. */
export function newScopeProvider(ignoreCase = false): ImportedNamespaceAwareLocalScopeProvider {
  return new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    nodeNameProvider,
    dotConverter,
    new CaseInsensitivityHelper(ignoreCase),
    new ResourceScopeCache(),
  );
}

/** `QualifiedName` of a dotted text. */
export function qn(text: string): QualifiedName {
  return QualifiedName.createFromList(text.split('.'));
}

/** The names of descriptions, in iteration order. */
export function namesOf(descriptions: Iterable<IEObjectDescription>): string[] {
  return [...descriptions].map((d) => d.getName().toString());
}
