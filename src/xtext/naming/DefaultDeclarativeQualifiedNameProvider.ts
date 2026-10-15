// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EcoreUtil } from '../../emf/ecore/util/EcoreUtil.js';
import * as Strings from '../util/Strings.js';
import { Tuples } from '../util/Tuples.js';
import type { IResourceScopeCache } from '../util/IResourceScopeCache.js';
import { AbstractImpl } from './IQualifiedNameProvider.AbstractImpl.js';
import type { IQualifiedNameConverter } from './IQualifiedNameConverter.js';
import type { QualifiedName } from './QualifiedName.js';

/** The cache key tag of a computed name (`Tuples.pair(obj, "fqn")`). */
const FQN_CACHE_TAG = 'fqn';

/**
 * Computes the fully qualified name of an EObject by first asking {@link qualifiedName} (Java: the
 * reflective `PolymorphicDispatcher` over the `qualifiedName(T)` methods of the provider), and if
 * that yields nothing, the `name` attribute appended to the container's qualified name.
 *
 * Dispatch replacement: a subclass overrides `qualifiedName` with a guarded `instanceof` chain,
 * most specific type first (the TS form of Xtext's dispatch). As the Java dispatcher does, every
 * exception thrown by `qualifiedName` is swallowed and means "no name" (`NullErrorHandler`);
 * only engine faults (`RangeError`, the analogue of Java's `Error`) propagate.
 *
 * Resource handle: the Java `obj.eResource()` is the root container, because every `.elkt`
 * resource has exactly one root content object. Caching is {@link IResourceScopeCache}.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/naming/DefaultDeclarativeQualifiedNameProvider.java
 */
export class DefaultDeclarativeQualifiedNameProvider extends AbstractImpl {
  constructor(
    private readonly converter: IQualifiedNameConverter,
    private readonly cache: IResourceScopeCache,
  ) {
    super();
  }

  /**
   * `SimpleAttributeResolver.newResolver(String.class, "name")` looks up an EClass feature `name`;
   * ElkGraph has none (`elkgraph.ecore`: `grep 'name="name"'` is empty, the naming attribute is
   * `identifier`), so the resolver finds nothing.
   */
  protected getResolver(): (obj: EObject) => string | null {
    return () => null;
  }

  getFullyQualifiedName(obj: EObject): QualifiedName | null {
    return this.getOrComputeFullyQualifiedName(obj);
  }

  protected getOrComputeFullyQualifiedName(obj: EObject): QualifiedName | null {
    // cast: every object of a model is an InternalEObject (decision D4); the root is the resource
    const resource = EcoreUtil.getRootContainer(obj as InternalEObject);
    return this.cache.get(Tuples.pair(obj, FQN_CACHE_TAG), resource, () => this.computeFullyQualifiedName(obj));
  }

  /** Default for the `qualifiedName` dispatcher: no name. Override for the types that have one. */
  protected qualifiedName(_ele: EObject): QualifiedName | null {
    return null;
  }

  protected getConverter(): IQualifiedNameConverter {
    return this.converter;
  }

  protected computeFullyQualifiedName(obj: EObject): QualifiedName | null {
    const qualifiedNameFromDispatcher = this.invokeDispatcher(obj);
    if (qualifiedNameFromDispatcher !== null) {
      return qualifiedNameFromDispatcher;
    }
    return this.computeFullyQualifiedNameFromNameAttribute(obj);
  }

  /**
   * `PolymorphicDispatcher.invoke` with `NullErrorHandler`: only a `java.lang.Error` propagates
   * (`PolymorphicDispatcher.java:304-307`), here the engine's `RangeError` (stack overflow); every Java exception,
   * all under `RuntimeException` (AD-16a), and the `TypeError` standing for an NPE give `null`.
   */
  private invokeDispatcher(obj: EObject): QualifiedName | null {
    try {
      return this.qualifiedName(obj);
    } catch (e) {
      if (e instanceof RangeError) {
        throw e;
      }
      return null;
    }
  }

  protected computeFullyQualifiedNameFromNameAttribute(obj: EObject): QualifiedName | null {
    const name = this.getResolver()(obj);
    if (Strings.isEmpty(name)) {
      return null;
    }
    const qualifiedNameFromConverter = this.converter.toQualifiedName(name);
    for (let parent = obj.eContainer(); parent !== null; parent = parent.eContainer()) {
      const parentsQualifiedName = this.getFullyQualifiedName(parent);
      if (parentsQualifiedName !== null) {
        return parentsQualifiedName.append(qualifiedNameFromConverter);
      }
    }
    return qualifiedNameFromConverter;
  }
}
