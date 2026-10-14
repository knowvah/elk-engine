// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { IDiagnosticProducer } from '../../diagnostics/IDiagnosticProducer.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import { AbstractLinker } from './AbstractLinker.js';
import { LinkingDiagnosticProducer } from './LinkingDiagnosticProducer.js';
import type { ReferenceAccess } from './ReferenceAccess.js';

/**
 * A linker that clears every non-containment reference before it links. Not ported: the debug timing,
 * the stopwatch, the deprecated `clearAllReferences`, and the resource-dependent parts of
 * `beforeModelLinked` (`LazyLinkingResource.clearLazyProxyInformation` and `ImportedNamesAdapter.clear`
 * are no-ops for a resource that is neither lazy nor adapter-carrying) and of
 * `createDiagnosticProducer(consumer, resource)` (`XtextResource.wrap` is a pass-through here), so
 * `isClearAllReferencesRequired` takes no resource. `shouldCheckParentNode` and
 * `isContainedInFragmentRule` walk the node model and the grammar: not reached, because the node-children
 * walk of `Linker.ensureLinked` (65-84, fragments included) is the parser's source-order grouping of each
 * object's own cross-reference nodes.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/AbstractCleaningLinker.java
 */
export abstract class AbstractCleaningLinker extends AbstractLinker {
  protected readonly referenceAccess: ReferenceAccess;

  protected constructor(referenceAccess: ReferenceAccess) {
    super();
    this.referenceAccess = referenceAccess;
  }

  override linkModel(model: EObject, diagnosticsConsumer: IDiagnosticConsumer): void {
    this.beforeModelLinked(model, diagnosticsConsumer);
    this.doLinkModel(model, diagnosticsConsumer);
    this.afterModelLinked(model, diagnosticsConsumer);
  }

  protected afterModelLinked(_model: EObject, _diagnosticsConsumer: IDiagnosticConsumer): void {
    // clients may override
  }

  protected abstract doLinkModel(model: EObject, diagnosticsConsumer: IDiagnosticConsumer): void;

  protected beforeModelLinked(_model: EObject, _diagnosticsConsumer: IDiagnosticConsumer): void {
    // no lazy-proxy information or imported-names adapter to clear for this resource type
  }

  protected isClearAllReferencesRequired(): boolean {
    return true;
  }

  /** The model, then its contents pre-order (`AbstractTreeIterator` over `eContents()`). */
  protected *getAllLinkableContents(model: EObject): IterableIterator<EObject> {
    const children = model.eContents();
    yield model;
    for (const child of children) yield* this.getAllLinkableContents(child);
  }

  protected clearReferences(obj: EObject): void {
    for (const ref of this.referenceAccess.getEAllReferences(obj)) this.clearReference(obj, ref);
  }

  protected clearReference(obj: EObject, ref: EReferenceInfo): void {
    if (!ref.containment && !ref.container && !ref.derived && ref.changeable && !ref.transient) {
      this.referenceAccess.eUnset(obj, ref);
    }
  }

  protected createDiagnosticProducer(consumer: IDiagnosticConsumer): IDiagnosticProducer {
    return new LinkingDiagnosticProducer(consumer);
  }
}
