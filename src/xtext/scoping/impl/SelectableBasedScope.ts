// SPDX-License-Identifier: EPL-2.0
import type { QualifiedName } from '../../naming/QualifiedName.js';
import * as Iterables from '../../../guava/Iterables.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { ISelectable } from '../../resource/ISelectable.js';
import type { EClassRef } from '../EReferenceInfo.js';
import type { IScope } from '../IScope.js';
import { AbstractScope } from './AbstractScope.js';

/**
 * A scope that asks a selectable for its elements, restricted to a type and an optional filter.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/SelectableBasedScope.java
 */
export class SelectableBasedScope extends AbstractScope {
  /** `createScope(outer, selectable, filter, type, ignoreCase)`; `outer` itself when nothing is selectable. */
  static createScope(
    outer: IScope,
    selectable: ISelectable | null,
    type: EClassRef,
    ignoreCase: boolean,
    filter: ((d: IEObjectDescription) => boolean) | null = null,
  ): IScope {
    if (selectable === null || selectable.isEmpty()) {
      return outer;
    }
    return new SelectableBasedScope(outer, selectable, filter, type, ignoreCase);
  }

  protected constructor(
    outer: IScope,
    private readonly selectable: ISelectable,
    private readonly filter: ((d: IEObjectDescription) => boolean) | null,
    private readonly type: EClassRef,
    ignoreCase: boolean,
  ) {
    super(outer, ignoreCase);
  }

  protected override getLocalElementsByName(name: QualifiedName): Iterable<IEObjectDescription> {
    const unfiltered = this.selectable.getExportedObjectsByName(this.type, name, this.isIgnoreCase());
    return this.filterLocalElements(unfiltered);
  }

  protected override getAllLocalElements(): Iterable<IEObjectDescription> {
    const unfiltered = this.selectable.getExportedObjectsByType(this.type);
    return this.filterLocalElements(unfiltered);
  }

  protected getSelectable(): ISelectable {
    return this.selectable;
  }

  protected getFilter(): ((d: IEObjectDescription) => boolean) | null {
    return this.filter;
  }

  protected filterLocalElements(unfiltered: Iterable<IEObjectDescription>): Iterable<IEObjectDescription> {
    if (this.filter !== null) {
      return Iterables.filter(unfiltered, this.filter);
    }
    return unfiltered;
  }
}
