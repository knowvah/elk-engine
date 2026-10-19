// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ReferenceAccess } from '../impl/ReferenceAccess.js';

const UNBOUNDED = -1;
const UNSPECIFIED = -2;
const SINGLE_VALUED = 1;

/** `EStructuralFeature.isMany()`: upper bound above 1, unbounded or unspecified. */
export function isMany(ref: EReferenceInfo): boolean {
  return ref.upperBound > SINGLE_VALUED || ref.upperBound === UNBOUNDED || ref.upperBound === UNSPECIFIED;
}

/**
 * A node of the node-model tree: the `INode`/`ICompositeNode` navigation the long fragment form needs.
 * Port-local; the port's `INode` is flat (the parser keeps cross-reference occurrences, not a tree).
 */
export interface ILazyNode extends INode {
  getParent(): ILazyNode | null;
  /** `ICompositeNode.getFirstChild()`; throws `ClassCastException` on a leaf, as Java's cast does. */
  getFirstChild(): ILazyNode | null;
  getNextSibling(): ILazyNode | null;
  hasNextSibling(): boolean;
}

/** An `EClass` with the flags and package link `LazyLinker.findInstantiableCompatible` reads. */
export interface LazyEClass extends EClass {
  isAbstract(): boolean;
  isInterface(): boolean;
  getEPackage(): LazyEPackage;
  /** `EcoreUtil2.isAssignableFrom(this, subType)`. */
  isAssignableFrom(subType: LazyEClass): boolean;
}

export interface LazyEPackage {
  getNsURI(): string;
  /** The `EClass` members of `getEClassifiers()` in declaration order (other classifiers are skipped by `instanceof EClass`). */
  getEClassifiers(): readonly LazyEClass[];
}

/** The part of `EPackage.Registry` the linker reads. */
export interface LazyEPackageRegistry {
  keySet(): readonly string[];
  getEPackage(nsURI: string): LazyEPackage;
}

/**
 * The reflection on metamodel and node model the long fragment form of `LazyURIEncoder` uses
 * (`eClass().getFeatureID`, `eContainmentFeature`, `eGet`, `NodeModelUtils.getNode`). Port-local:
 * `EObject` has no metamodel (decision D4). The language implements it.
 */
export interface LazyURIEncoderMetamodel {
  /** `NodeModelUtils.getNode(obj)`. */
  getNode(obj: EObject): ILazyNode | null;
  /** The tree view of a node handed to `encode`. */
  toTreeNode(node: INode): ILazyNode;
  /** `obj.eContainmentFeature()`. */
  eContainmentFeature(obj: EObject): EReferenceInfo | null;
  /** `eClass.getFeatureID(ref)`. */
  getFeatureID(eClass: EClass, ref: EReferenceInfo): number;
  /** `(EReference) eClass.getEStructuralFeature(featureId)`. */
  getEStructuralFeature(eClass: EClass, featureId: number): EReferenceInfo;
  /** `(EObject) obj.eGet(ref)` for a single-valued reference. */
  eGetOne(obj: EObject, ref: EReferenceInfo): EObject;
  /** `(List<?>) obj.eGet(ref)` for a many-valued reference. */
  eGetMany(obj: EObject, ref: EReferenceInfo): readonly EObject[];
}

/**
 * What `LazyLinker` reads beyond `ReferenceAccess`: the `EReference` flag, the unique add on the
 * reference list, the metamodel for the proxy type, and the registry. Port-local.
 */
export interface LazyLinkerMetamodel extends ReferenceAccess {
  /** `eRef.isResolveProxies()`. */
  isResolveProxies(ref: EReferenceInfo): boolean;
  /** `((InternalEList<EObject>) obj.eGet(ref, false)).addUnique(proxy)`. */
  addUnique(obj: EObject, ref: EReferenceInfo, proxy: EObject): void;
  /** `ecoreGenericsUtil.getReferenceType(eRef, obj.eClass())`. */
  getReferenceType(ref: EReferenceInfo, obj: EObject): LazyEClass;
  /** The `EPackage`s of `GrammarUtil.allMetamodelDeclarations(grammarAccess.getGrammar())`, in order. */
  getMetamodelPackages(): readonly LazyEPackage[];
  getRegistry(): LazyEPackageRegistry;
}
