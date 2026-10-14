// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import * as Iterables from '../../../guava/Iterables.js';
import { HashMultimap } from '../../../guava/HashMultimap.js';
import { LinkedHashMultimap } from '../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../guava/Multimap.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { hashable, identity } from '../../../java/util/HashStrategy.js';
import { JavaHashSet } from '../../../java/util/JavaHashSet.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import { AliasedEObjectDescription } from '../../resource/impl/AliasedEObjectDescription.js';
import type { ISelectable } from '../../resource/ISelectable.js';
import type { EClassRef } from '../EReferenceInfo.js';
import type { IScope } from '../IScope.js';
import { AbstractScope } from './AbstractScope.js';
import type { ImportNormalizer } from './ImportNormalizer.js';
import { ScopeBasedSelectable } from './ScopeBasedSelectable.js';

/**
 * Makes the elements of an `ISelectable` (by default: the parent scope) visible under the names
 * the import normalizers give them. A name reachable through two different normalizers is
 * ambiguous and visible under neither. Reverse lookups compare by identity, see
 * {@link AbstractScope}: the Java URI test of `getLocalElementsByEObject` is the dead arm.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/ImportScope.java
 */
export class ImportScope extends AbstractScope {
  private readonly normalizers: readonly ImportNormalizer[];
  private readonly importFrom: ISelectable | null;
  private readonly type: EClassRef;

  constructor(
    namespaceResolvers: readonly ImportNormalizer[],
    parent: IScope,
    importFrom: ISelectable | null,
    type: EClassRef,
    ignoreCase: boolean,
  ) {
    super(parent, ignoreCase);
    this.type = type;
    this.normalizers = this.removeDuplicates(namespaceResolvers);
    this.importFrom = importFrom;
  }

  protected removeDuplicates(namespaceResolvers: readonly ImportNormalizer[]): ImportNormalizer[] {
    const list: ImportNormalizer[] = [];
    for (const importNormalizer of namespaceResolvers) {
      if (!list.some((existing) => existing.equals(importNormalizer))) {
        list.push(importNormalizer);
      }
    }
    return list;
  }

  override toString(): string {
    return `${this.constructor.name}[${this.normalizers.join(', ')}] imports from ${String(this.importFrom)} for type ${this.type.name}`;
  }

  override getAllElements(): Iterable<IEObjectDescription> {
    const globalElements = this.getParent().getAllElements();
    const aliased = this.getAllLocalElements();
    const elements = new JavaHashSet<QualifiedName>(hashable<QualifiedName>());
    for (const from of aliased) {
      elements.add(this.getIgnoreCaseAwareQualifiedName(from));
    }
    return Iterables.concat(
      aliased,
      Iterables.filter(globalElements, (input) => !elements.contains(this.getIgnoreCaseAwareQualifiedName(input))),
    );
  }

  protected getIgnoreCaseAwareQualifiedName(from: IEObjectDescription): QualifiedName {
    return this.isIgnoreCase() ? from.getName().toLowerCase() : from.getName();
  }

  protected override getAllLocalElements(): Iterable<IEObjectDescription> {
    const exportedObjects = this.getImportFrom().getExportedObjectsByType(this.type);
    return this.getAliasedElements(exportedObjects);
  }

  protected override getLocalElementsByEObject(object: EObject): Iterable<IEObjectDescription> {
    const candidates = this.getImportFrom().getExportedObjectsByObject(object);
    const aliasedElements = this.getAliasedElements(candidates);
    // make sure that the element is returned when asked by name.
    return Iterables.filter(aliasedElements, (input) => {
      const description = this.getSingleLocalElementByName(input.getName());
      if (description === null) {
        return false;
      }
      // Java: `|| input.getEObjectURI().equals(description.getEObjectURI())`, which for distinct
      // objects of one resource tree is false.
      return description.getEObjectOrProxy() === input.getEObjectOrProxy();
    });
  }

  protected getAliasedElements(candidates: Iterable<IEObjectDescription>): Iterable<IEObjectDescription> {
    const keyToDescription: Multimap<QualifiedName, IEObjectDescription> = LinkedHashMultimap.create(
      hashable<QualifiedName>(),
      identity<IEObjectDescription>(),
    );
    const keyToNormalizer: Multimap<QualifiedName, ImportNormalizer> = HashMultimap.create(
      hashable<QualifiedName>(),
      hashable<ImportNormalizer>(),
    );
    for (const imported of candidates) {
      this.addAliases(imported, keyToDescription, keyToNormalizer);
    }
    for (const name of keyToNormalizer.keySet()) {
      if (keyToNormalizer.get(name).size > 1) {
        keyToDescription.removeAll(name);
      }
    }
    return keyToDescription.values();
  }

  private addAliases(
    imported: IEObjectDescription,
    keyToDescription: Multimap<QualifiedName, IEObjectDescription>,
    keyToNormalizer: Multimap<QualifiedName, ImportNormalizer>,
  ): void {
    const fullyQualifiedName = imported.getName();
    for (const normalizer of this.normalizers) {
      const alias = normalizer.deresolve(fullyQualifiedName);
      if (alias !== null) {
        const key = this.isIgnoreCase() ? alias.toLowerCase() : alias;
        keyToDescription.put(key, new AliasedEObjectDescription(alias, imported));
        keyToNormalizer.put(key, normalizer);
      }
    }
  }

  protected override getSingleLocalElementByName(name: QualifiedName): IEObjectDescription | null {
    const first = this.getLocalElementsByName(name)[Symbol.iterator]().next();
    return first.done === true ? null : first.value;
  }

  /** A list (the `Collection` shortcut of {@link AbstractScope.getElements} applies). */
  protected override getLocalElementsByName(name: QualifiedName): IEObjectDescription[] {
    const result: IEObjectDescription[] = [];
    let resolvedQualifiedName: QualifiedName | null = null;
    const importFrom = this.getImportFrom();
    for (const normalizer of this.normalizers) {
      const resolvedName = normalizer.resolve(name);
      if (resolvedName === null) {
        continue;
      }
      const resolvedElements = importFrom.getExportedObjectsByName(this.type, resolvedName, this.isIgnoreCase());
      for (const resolvedElement of resolvedElements) {
        if (resolvedQualifiedName === null) {
          resolvedQualifiedName = resolvedName;
        } else if (
          !resolvedQualifiedName.equals(resolvedName) &&
          (result[0] as IEObjectDescription).getEObjectOrProxy() !== resolvedElement.getEObjectOrProxy()
        ) {
          return [];
        }
        result.push(this.aliasOf(normalizer, resolvedElement));
      }
    }
    return result;
  }

  private aliasOf(normalizer: ImportNormalizer, resolvedElement: IEObjectDescription): IEObjectDescription {
    const alias = normalizer.deresolve(resolvedElement.getName());
    if (alias === null) {
      throw new IllegalStateException(
        `Couldn't deresolve ${resolvedElement.getName().toString()} with import ${normalizer.toString()}`,
      );
    }
    return new AliasedEObjectDescription(alias, resolvedElement);
  }

  protected getImportFrom(): ISelectable {
    return this.importFrom ?? new ScopeBasedSelectable(this.getParent());
  }
}
