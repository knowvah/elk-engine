// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { IDiagnosticProducer } from '../../diagnostics/IDiagnosticProducer.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { INodeModel } from '../../nodemodel/INodeModel.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type {
  ILinkingDiagnosticContext,
  ILinkingDiagnosticMessageProviderExtended,
} from '../ILinkingDiagnosticMessageProvider.js';
import type { ILinkingService } from '../ILinkingService.js';
import { AbstractCleaningLinker } from './AbstractCleaningLinker.js';
import { IllegalNodeException } from './IllegalNodeException.js';
import type { LinkingHelper } from './LinkingHelper.js';
import type { ReferenceAccess } from './ReferenceAccess.js';

const SINGLE_VALUED = 1;

/**
 * The eager linker: right after load every cross reference is resolved or reported. Guice injection is
 * constructor parameters. Not ported: `setDefaultValues` / `canSetDefaultValues` / `setDefaultValue` /
 * `setDefaultValueImpl` (the last is an empty hook that `ElkGraphLinker` does not override, so the loop
 * has no observable effect), the `handledReferences` set that only feeds it, the trailing
 * `producer.setNode(compositeNode)` (every node is set before it is read), the `addAllUnique` arm of the
 * list path (needs `links.size() > 1`, but `DefaultLinkingService` returns at most one object), and the
 * logging.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/Linker.java
 */
export class Linker extends AbstractCleaningLinker {
  readonly #linkingService: ILinkingService;
  readonly #diagnosticMessageProvider: ILinkingDiagnosticMessageProviderExtended;
  readonly #linkingHelper: LinkingHelper;
  readonly #nodeModel: INodeModel;

  constructor(
    linkingService: ILinkingService,
    diagnosticMessageProvider: ILinkingDiagnosticMessageProviderExtended,
    linkingHelper: LinkingHelper,
    referenceAccess: ReferenceAccess,
    nodeModel: INodeModel,
  ) {
    super(referenceAccess);
    this.#linkingService = linkingService;
    this.#diagnosticMessageProvider = diagnosticMessageProvider;
    this.#linkingHelper = linkingHelper;
    this.#nodeModel = nodeModel;
  }

  ensureLinked(obj: EObject, producer: IDiagnosticProducer): void {
    const nodes = this.#nodeModel.getCrossReferenceNodes(obj);
    if (nodes === null) return;
    for (const node of nodes) {
      producer.setNode(node);
      this.ensureIsLinked(obj, node, producer);
    }
  }

  protected createDiagnosticContext(
    obj: EObject,
    eRef: EReferenceInfo | null,
    node: ICrossReferenceNode,
  ): ILinkingDiagnosticContext {
    const linkingHelper = this.#linkingHelper;
    return {
      getContext: (): EObject => obj,
      getReference: (): EReferenceInfo | null => eRef,
      getLinkText: (): string | null => linkingHelper.getCrossRefNodeAsString(node, true),
    };
  }

  protected getLinkedObject(obj: EObject, eRef: EReferenceInfo, node: ICrossReferenceNode): readonly EObject[] {
    return this.#linkingService.getLinkedObjects(obj, eRef, node);
  }

  protected isNullValidResult(_obj: EObject, _eRef: EReferenceInfo, _node: ICrossReferenceNode): boolean {
    return false;
  }

  protected beforeEnsureIsLinked(_obj: EObject, _eRef: EReferenceInfo, _producer: IDiagnosticProducer): void {
    // may be overridden by clients
  }

  protected ensureIsLinked(obj: EObject, node: ICrossReferenceNode, producer: IDiagnosticProducer): void {
    const eRef = this.referenceAccess.getReference(obj, node.feature);
    if (eRef === null) {
      const context = this.createDiagnosticContext(obj, eRef, node);
      producer.addDiagnostic(this.#diagnosticMessageProvider.getIllegalCrossReferenceMessage(context, node.feature));
      return;
    }
    this.beforeEnsureIsLinked(obj, eRef, producer);
    producer.setTarget(obj, eRef);
    try {
      this.linkReference(obj, eRef, node, producer);
    } catch (e) {
      if (!(e instanceof IllegalNodeException)) throw e;
      const context = this.createDiagnosticContext(obj, eRef, node);
      producer.addDiagnostic(this.#diagnosticMessageProvider.getIllegalNodeMessage(context, e));
    }
  }

  /** Resolves one reference and stores or reports the result. */
  private linkReference(
    obj: EObject,
    eRef: EReferenceInfo,
    node: ICrossReferenceNode,
    producer: IDiagnosticProducer,
  ): void {
    const links = this.getLinkedObject(obj, eRef, node);
    if (links.length === 0) {
      if (!this.isNullValidResult(obj, eRef, node)) {
        const context = this.createDiagnosticContext(obj, eRef, node);
        // a provider answers `null` when an unresolved reference is fine; Java would pass it on and fail
        const message = this.#diagnosticMessageProvider.getUnresolvedProxyMessage(context);
        if (message !== null) producer.addDiagnostic(message);
      }
      return;
    }
    if (eRef.upperBound >= 0 && links.length > eRef.upperBound) {
      this.reportBoundsViolation(obj, eRef, node, links.length, producer);
      return;
    }
    if (eRef.upperBound === SINGLE_VALUED) {
      this.referenceAccess.eSet(obj, eRef, links[0]!);
    } else {
      this.addToList(obj, eRef, node, links, producer);
    }
  }

  /** The list path: `eRef.getUpperBound() == -1 || eRef.getUpperBound() < links.size`. */
  private addToList(
    obj: EObject,
    eRef: EReferenceInfo,
    node: ICrossReferenceNode,
    links: readonly EObject[],
    producer: IDiagnosticProducer,
  ): void {
    if (!this.referenceAccess.eGetList(obj, eRef).addAll(links)) {
      this.reportBoundsViolation(obj, eRef, node, links.length, producer);
    }
  }

  private reportBoundsViolation(
    obj: EObject,
    eRef: EReferenceInfo,
    node: ICrossReferenceNode,
    size: number,
    producer: IDiagnosticProducer,
  ): void {
    const context = this.createDiagnosticContext(obj, eRef, node);
    producer.addDiagnostic(this.#diagnosticMessageProvider.getViolatedBoundsConstraintMessage(context, size));
  }

  protected override doLinkModel(model: EObject, consumer: IDiagnosticConsumer): void {
    this.ensureModelLinked(model, this.createDiagnosticProducer(consumer));
  }

  protected ensureModelLinked(model: EObject, producer: IDiagnosticProducer): void {
    const clearAllReferencesRequired = this.isClearAllReferencesRequired();
    for (const next of this.getAllLinkableContents(model)) {
      if (clearAllReferencesRequired) this.clearReferences(next);
      this.ensureLinked(next, producer);
    }
  }

  getLinkingService(): ILinkingService {
    return this.#linkingService;
  }

  getDiagnosticMessageProvider(): ILinkingDiagnosticMessageProviderExtended {
    return this.#diagnosticMessageProvider;
  }

  getLinkingHelper(): LinkingHelper {
    return this.#linkingHelper;
  }
}
