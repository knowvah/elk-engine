// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../emf/ecore/InternalEObject.js';
import { EcoreUtil } from '../../../emf/ecore/util/EcoreUtil.js';
import type { IQualifiedNameConverter } from '../../naming/IQualifiedNameConverter.js';
import type { IQualifiedNameProvider } from '../../naming/IQualifiedNameProvider.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { ISelectable } from '../../resource/ISelectable.js';
import * as Strings from '../../util/Strings.js';
import type { IResourceScopeCache } from '../../util/IResourceScopeCache.js';
import { Tuples } from '../../util/Tuples.js';
import type { EReferenceInfo } from '../EReferenceInfo.js';
import type { ICaseInsensitivityHelper } from '../ICaseInsensitivityHelper.js';
import type { IGlobalScopeProvider } from '../IGlobalScopeProvider.js';
import type { IScope } from '../IScope.js';
import { scopedElementsFor } from '../Scopes.js';
import { AbstractGlobalScopeDelegatingScopeProvider } from './AbstractGlobalScopeDelegatingScopeProvider.js';
import { ImportNormalizer } from './ImportNormalizer.js';
import { ImportScope } from './ImportScope.js';
import { MultimapBasedSelectable } from './MultimapBasedSelectable.js';
import { SelectableBasedScope } from './SelectableBasedScope.js';
import type { EClassRef } from '../EReferenceInfo.js';

/** Cache key of the descriptions of a whole resource. */
const ALL_DESCRIPTIONS_KEY = 'internalGetAllDescriptions';
/** Tag of the cache key of the import resolvers of one element. */
const IMPORTS_KEY_TAG = 'imports';
const WILDCARD = '*';

/**
 * The scope of a cross reference: the descriptions of the whole resource, looked up by their full
 * name from anywhere, and below them one `ImportScope` per container on the way down, which makes
 * the contents of that container visible by their names relative to the container's own name (so
 * the nearest container wins, and a sibling's child needs its qualified name).
 *
 * Resource handle: the Java `eResource()` is the root container of the object, and the single
 * root is `res.getContents().get(0)`; so a resource is its root `EObject` and always exists.
 * With no `importedNamespace` attribute in the ElkGraph metamodel (`grep importedNamespace
 * elkgraph.ecore` is empty) the import resolvers are always empty, and without implicit imports
 * only the resource-level and the per-container scopes exist. Tracking of imported names
 * (`ImportedNamesAdapter`) is not ported: it never changes a result.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.java
 */
export class ImportedNamespaceAwareLocalScopeProvider extends AbstractGlobalScopeDelegatingScopeProvider {
  constructor(
    globalScopeProvider: IGlobalScopeProvider,
    private readonly qualifiedNameProvider: IQualifiedNameProvider,
    private readonly qualifiedNameConverter: IQualifiedNameConverter,
    caseInsensitivityHelper: ICaseInsensitivityHelper,
    private readonly cache: IResourceScopeCache,
  ) {
    super(globalScopeProvider, caseInsensitivityHelper);
  }

  getQualifiedNameProvider(): IQualifiedNameProvider {
    return this.qualifiedNameProvider;
  }

  getQualifiedNameConverter(): IQualifiedNameConverter {
    return this.qualifiedNameConverter;
  }

  override getScope(context: EObject, reference: EReferenceInfo): IScope {
    let result: IScope;
    const container = context.eContainer();
    if (container !== null) {
      result = this.getScope(container, reference);
    } else {
      result = this.getResourceScope(context, reference);
    }
    return this.getLocalElementsScope(result, context, reference);
  }

  /** `getResourceScope(Resource, EReference)`; the resource is its root object. */
  protected getResourceScope(res: EObject, reference: EReferenceInfo): IScope {
    const context = res;
    let globalScope = this.getGlobalScope(res, reference);
    const normalizers = this.getImplicitImports(this.isIgnoreCase(reference));
    if (normalizers.length > 0) {
      globalScope = this.createImportScope(
        globalScope,
        normalizers,
        null,
        reference.referenceType,
        this.isIgnoreCase(reference),
      );
    }
    return this.getResourceScopeOf(globalScope, context, reference);
  }

  protected getImplicitImports(_ignoreCase: boolean): readonly ImportNormalizer[] {
    return [];
  }

  /** `getResourceScope(IScope, EObject, EReference)`. */
  protected getResourceScopeOf(parent: IScope, context: EObject, reference: EReferenceInfo): IScope {
    const allDescriptions = this.getAllDescriptions(resourceOf(context));
    return SelectableBasedScope.createScope(
      parent,
      allDescriptions,
      reference.referenceType,
      this.isIgnoreCase(reference),
    );
  }

  protected getImportedNamespaceResolvers(context: EObject, ignoreCase: boolean): readonly ImportNormalizer[] {
    const key = Tuples.pair(Tuples.pair(context, ignoreCase), IMPORTS_KEY_TAG);
    return this.cache.get(key, resourceOf(context), () =>
      this.internalGetImportedNamespaceResolvers(context, ignoreCase),
    );
  }

  protected internalGetImportedNamespaceResolvers(context: EObject, ignoreCase: boolean): readonly ImportNormalizer[] {
    const importedNamespaceResolvers: ImportNormalizer[] = [];
    for (const child of context.eContents()) {
      const value = this.getImportedNamespace(child);
      const resolver = this.createImportedNamespaceResolver(value, ignoreCase);
      if (resolver !== null) {
        importedNamespaceResolvers.push(resolver);
      }
    }
    return importedNamespaceResolvers;
  }

  /**
   * The value of the String attribute `importedNamespace` of `object`. The ElkGraph metamodel
   * has no such feature, so the Java reflective lookup always yields `null`.
   */
  protected getImportedNamespace(_object: EObject): string | null {
    return null;
  }

  protected createImportedNamespaceResolver(namespace: string | null, ignoreCase: boolean): ImportNormalizer | null {
    if (Strings.isEmpty(namespace)) {
      return null;
    }
    const importedNamespace = this.qualifiedNameConverter.toQualifiedName(namespace);
    if ((importedNamespace as QualifiedName | null) === null || importedNamespace.isEmpty()) {
      return null;
    }
    const lastSegment = importedNamespace.getLastSegment();
    const hasWildCard = ignoreCase
      ? lastSegment.toLowerCase() === this.getWildCard().toLowerCase()
      : lastSegment === this.getWildCard();
    if (hasWildCard) {
      if (importedNamespace.getSegmentCount() <= 1) {
        return null;
      }
      return this.doCreateImportNormalizer(importedNamespace.skipLast(1), true, ignoreCase);
    }
    return this.doCreateImportNormalizer(importedNamespace, false, ignoreCase);
  }

  protected doCreateImportNormalizer(
    importedNamespace: QualifiedName,
    wildcard: boolean,
    ignoreCase: boolean,
  ): ImportNormalizer {
    return new ImportNormalizer(importedNamespace, wildcard, ignoreCase);
  }

  protected getLocalElementsScope(parent: IScope, context: EObject, reference: EReferenceInfo): IScope {
    let result = parent;
    const allDescriptions = this.getAllDescriptions(resourceOf(context));
    const name = this.getQualifiedNameOfLocalElement(context);
    const ignoreCase = this.isIgnoreCase(reference);
    const type = reference.referenceType;
    const namespaceResolvers = this.getImportedNamespaceResolvers(context, ignoreCase);
    if (namespaceResolvers.length > 0) {
      if (this.isRelativeImport() && name !== null && !name.isEmpty()) {
        const localNormalizer = this.doCreateImportNormalizer(name, true, ignoreCase);
        result = this.createImportScope(result, [localNormalizer], allDescriptions, type, ignoreCase);
      }
      result = this.createImportScope(result, namespaceResolvers, null, type, ignoreCase);
    }
    if (name !== null) {
      const localNormalizer = this.doCreateImportNormalizer(name, true, ignoreCase);
      result = this.createImportScope(result, [localNormalizer], allDescriptions, type, ignoreCase);
    }
    return result;
  }

  protected createImportScope(
    parent: IScope,
    namespaceResolvers: readonly ImportNormalizer[],
    importFrom: ISelectable | null,
    type: EClassRef,
    ignoreCase: boolean,
  ): ImportScope {
    return new ImportScope(namespaceResolvers, parent, importFrom, type, ignoreCase);
  }

  protected getQualifiedNameOfLocalElement(context: EObject): QualifiedName | null {
    return this.qualifiedNameProvider.getFullyQualifiedName(context);
  }

  protected isRelativeImport(): boolean {
    return true;
  }

  protected getAllDescriptions(resource: EObject): ISelectable {
    return this.cache.get(ALL_DESCRIPTIONS_KEY, resource, () => this.internalGetAllDescriptions(resource));
  }

  /** All objects of the resource, root first and then its contents in pre-order. */
  protected internalGetAllDescriptions(resource: EObject): ISelectable {
    const allContents: Iterable<EObject> = {
      *[Symbol.iterator](): Iterator<EObject> {
        yield resource;
        yield* resource.eAllContents();
      },
    };
    const allDescriptions: Iterable<IEObjectDescription> = scopedElementsFor(allContents, (from) =>
      this.qualifiedNameProvider.apply(from),
    );
    return new MultimapBasedSelectable(allDescriptions);
  }

  getWildCard(): string {
    return WILDCARD;
  }
}

/** The Java `eResource()`: the root container, see the class comment. */
function resourceOf(object: EObject): EObject {
  // cast: every object of a model is an InternalEObject (decision D4)
  return EcoreUtil.getRootContainer(object as InternalEObject);
}
