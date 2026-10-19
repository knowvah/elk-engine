// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { LazyLinker } from '../../../../xtext/linking/lazy/LazyLinker.js';
import type { LazyEClass, LazyEPackage } from '../../../../xtext/linking/lazy/LazyLinkingMetamodel.js';
import type { EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import { ElkNodeImpl } from '../../../impl/ElkNodeImpl.js';
import { ClassName } from './ElkGraphJsonReferences.js';

/** The package of the proxy class: only its namespace URI is ever read (`LazyLinker` visits packages by it). */
const ELK_GRAPH_PACKAGE: LazyEPackage = {
  getNsURI: () => 'http://www.eclipse.org/elk/ElkGraph',
  getEClassifiers: () => [],
};

/**
 * `ElkNode`, the first instantiable `ElkConnectableShape` subclass in `elkgraph.ecore` (declaration order:
 * `ElkConnectableShape` is abstract, `ElkNode` follows it, `ElkPort` after that), which is what
 * `LazyLinker.getProxyType` computes through `findInstantiableCompatible` for `sources` and `targets`.
 */
const ELK_NODE_CLASS: LazyEClass = {
  getName: () => ClassName.ELK_NODE,
  isAbstract: () => false,
  isInterface: () => false,
  getEPackage: () => ELK_GRAPH_PACKAGE,
  isAssignableFrom: (subType) => subType.getName() === ClassName.ELK_NODE,
};

/**
 * `LazyLinker` for `.elkj`, which the Java binds unchanged (`DefaultRuntimeModule`); `src/xtext` cannot name
 * ElkGraph classes, so this subclass supplies what Xtext reads from the metamodel and the EMF factory:
 * - {@link getProxyType} answers the `ElkNode` class directly instead of searching the packages (the search result
 *   for every reference `LazyLinker` sees, because only `ElkConnectableShape` is the type of a linked reference);
 * - {@link createInstance} is `EcoreUtil.create(eClass)` for that class: a new `ElkNodeImpl`, which
 *   `LazyLinker.createProxy` then marks with the proxy URI (`eSetProxyURI`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyLinker.java:199-229
 */
export class ElkGraphJsonLazyLinker extends LazyLinker {
  protected override getProxyType(_obj: EObject, eRef: EReferenceInfo): LazyEClass {
    if (eRef.referenceType.name !== ClassName.ELK_CONNECTABLE_SHAPE) {
      throw new IllegalStateException(`No proxy type for references to '${eRef.referenceType.name}'.`);
    }
    return ELK_NODE_CLASS;
  }

  protected override createInstance(eClass: LazyEClass): InternalEObject {
    if (eClass !== ELK_NODE_CLASS) {
      throw new IllegalStateException(`No factory for '${eClass.getName()}'.`);
    }
    return new ElkNodeImpl();
  }
}
