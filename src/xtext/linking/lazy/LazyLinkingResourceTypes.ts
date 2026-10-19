// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { LazyProxyInformation } from './ILazyLinkingResource.js';

/**
 * `org.eclipse.xtext.util.Triple` as `Tuples.create(obj, ref, node)` builds it. Equal when the three
 * members are the same (Java compares with `Object.equals`; ELK-side objects, references and nodes
 * define none, so equality is identity).
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Triple.java
 */
export class LazyProxyTriple implements LazyProxyInformation {
  readonly #first: EObject;
  readonly #second: EReferenceInfo;
  readonly #third: INode;

  constructor(first: EObject, second: EReferenceInfo, third: INode) {
    this.#first = first;
    this.#second = second;
    this.#third = third;
  }

  getFirst(): EObject {
    return this.#first;
  }

  getSecond(): EReferenceInfo {
    return this.#second;
  }

  getThird(): INode {
    return this.#third;
  }
}

/** `Triple.equals` over any {@link LazyProxyInformation}. */
export function tripleEquals(a: LazyProxyInformation, b: LazyProxyInformation): boolean {
  return a === b || (a.getFirst() === b.getFirst() && a.getSecond() === b.getSecond() && a.getThird() === b.getThird());
}

/**
 * `LazyLinkingResource.CyclicLinkingException` (Java `AssertionError`, whose JS counterpart is `Error`).
 * Exposed at module level instead of as a static nested class.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyLinkingResource.java:62-71
 */
export class CyclicLinkingException extends Error {
  readonly triple: LazyProxyInformation;

  constructor(detailMessage: string, triple: LazyProxyInformation) {
    super(detailMessage);
    this.name = 'AssertionError';
    this.triple = triple;
  }
}

/**
 * The reflection `resolveLazyCrossReferences` and the error messages need on the language's metamodel
 * (`EObject` has none, decision D4). The language implements it, as it does `LazyLinkerMetamodel`.
 */
export interface LazyLinkingResourceMetamodel {
  /** `((EClassImpl.FeatureSubsetSupplier) source.eClass().getEAllStructuralFeatures()).crossReferences()`; empty when `null`. */
  getCrossReferences(source: EObject): readonly EReferenceInfo[];
  /** `eRef.isResolveProxies()`. */
  isResolveProxies(ref: EReferenceInfo): boolean;
  /** `eReference.getEContainingClass().getName()`. */
  getContainingClassName(ref: EReferenceInfo): string;
  /** `(InternalEList<EObject>) source.eGet(ref)` of a many-valued reference. */
  getList(source: EObject, ref: EReferenceInfo): LazyReferenceList;
  /** `(EObject) source.eGet(ref, false)` of a single-valued reference. */
  getOne(source: EObject, ref: EReferenceInfo): EObject | null;
  /** `source.eSet(ref, target)` of a single-valued reference. */
  setOne(source: EObject, ref: EReferenceInfo, target: EObject): void;
}

/** The `InternalEList<EObject>` members `doResolveLazyCrossReference` calls. */
export interface LazyReferenceList {
  size(): number;
  basicGet(index: number): EObject;
  setUnique(index: number, object: EObject): EObject;
}
