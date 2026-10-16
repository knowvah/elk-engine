// SPDX-License-Identifier: EPL-2.0
import { BasicEList } from '../../../emf/common/util/BasicEList.js';
import type { EList } from '../../../emf/common/util/EList.js';
import type { URI } from '../../../emf/common/util/URI.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../emf/ecore/InternalEObject.js';
import type { ResourceDiagnostic } from '../../../emf/ecore/resource/Resource.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import * as JavaObjects from '../../../java/util/JavaObjects.js';
import type { DiagnosticMessage } from '../../diagnostics/DiagnosticMessage.js';
import { Severity } from '../../diagnostics/Severity.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import { IllegalNodeException } from '../impl/IllegalNodeException.js';
import type { LinkingHelper } from '../impl/LinkingHelper.js';
import { XtextLinkingDiagnostic } from '../impl/XtextLinkingDiagnostic.js';
import type {
  ILinkingDiagnosticContext,
  ILinkingDiagnosticMessageProviderExtended,
} from '../ILinkingDiagnosticMessageProvider.js';
import type { ILinkingService } from '../ILinkingService.js';
import type { LazyProxyInformation } from './ILazyLinkingResource.js';
import { DiagnosticMessageContext } from './LazyLinkingResourceDiagnosticContext.js';
import { LazyLinkingResourceBase } from './LazyLinkingResourceBase.js';
import { isMany } from './LazyLinkingMetamodel.js';
import {
  checkCanceled,
  NULL_CANCEL_INDICATOR,
  propagateAsErrorIfCancelException,
  type CancelIndicator,
} from './LazyLinkingResourceCancel.js';
import { ExceptionDiagnostic } from './LazyLinkingResourceExceptionDiagnostic.js';
import {
  CyclicLinkingException,
  LazyProxyTriple,
  tripleEquals,
  type LazyLinkingResourceMetamodel,
} from './LazyLinkingResourceTypes.js';
import type { LazyURIEncoder } from './LazyURIEncoder.js';

const DEFAULT_CYCLIC_LINKING_DETECTION_COUNTER_LIMIT = 100;
const NO_URI = 'the resource has no URI';

/** The injected collaborators of `LazyLinkingResource` (Java field injection; here the constructor). */
export interface LazyLinkingResourceServices {
  readonly linkingService: ILinkingService;
  readonly encoder: LazyURIEncoder;
  /** Both Java fields `diagnosticMessageProvider` and `linkingDiagnosticMessageProvider` (one Guice binding). */
  readonly diagnosticMessageProvider: ILinkingDiagnosticMessageProviderExtended;
  readonly linkingHelper: LinkingHelper;
}

/**
 * A resource whose cross references are lazy proxies (`|n` fragments): the first access of a proxy asks
 * the linking service, records one linking diagnostic per unresolvable fragment, and
 * {@link resolveLazyCrossReferences} resolves all of them.
 *
 * Omissions (decision D13): `doLoad` with `OPTION_RESOLVE_ALL` and `doLinking` with the eager-linking
 * flag (`eagerLinking`, `isEagerLinking`/`setEagerLinking`); no caller passes either. The `log.error`
 * calls (logging is not ported), the Guice `@Named`/`@Inject(optional)` bindings (the counter limit is
 * the protected field `cyclicLinkingDectectionCounterLimit`, default 100) and `synchronized` are not
 * ported; `source.eSetDeliver(false/true)` is dropped (no notifications). `UNRESOLVEABLE_PROXIES_KEY` and
 * `CYCLIC_LINKING_DECTECTION_COUNTER_LIMIT` have no use without the cache and Guice.
 *
 * Port-local substitutes:
 * - `getCache().get(UNRESOLVEABLE_PROXIES_KEY, this, ...)` (`OnChangeEvictingCache`, which drops the set on
 *   any model change) is the plain field `unresolvableURIFragments`: the port has no change notifications.
 * - `XtextResource` subset on `ResourceImpl`: `isValidationDisabled`/`setValidationDisabled` (clearing
 *   errors and warnings) and the proxy-information list, both in `LazyLinkingResourceBase` (a split for the
 *   500-line file limit; the list's
 *   `getParseResultWrapper().toProxyInformation(...)` is `Tuples.create` (a {@link LazyProxyTriple}). The
 *   parse result, serializer, unloader, cache, language name and modification stamp are not ported.
 * - The metamodel reflection (`crossReferences()`, `eGet`/`eSet`, class names) is {@link LazyLinkingResourceMetamodel}.
 * - `EcoreUtil.getAllContents(this, true)` walks the root contents and `eAllContents()`; containment
 *   lists resolve no proxies in the port.
 * - `WrappedException` is a `RuntimeException` with the original as cause; `OperationCanceledManager`
 *   is the functions in `LazyLinkingResourceCancel`; `CancelIndicator` likewise.
 * - The list `contains`/`remove` of Java use `equals`; `ResourceImpl`'s plain lists compare identity, so the
 *   diagnostic list operations here search with `Objects.equals`.
 * - Overloads are renamed: `getEObject(String, Triple)` is {@link getEObjectForTriple},
 *   `createAndAddDiagnostic(Triple, IllegalNodeException)` is {@link createAndAddIllegalNodeDiagnostic},
 *   `getLazyProxyInformation()` (the list) is {@link getLazyProxyInformationList}.
 * - `doResolveLazyCrossReference` is split at its `isMany` branches into
 *   {@link resolveLazyCrossReferenceList}, {@link resolveLazyCrossReferenceOne} and {@link resolveLazyProxy}.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyLinkingResource.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/XtextResource.java
 */
export class LazyLinkingResource extends LazyLinkingResourceBase {
  protected cyclicLinkingDectectionCounterLimit: number = DEFAULT_CYCLIC_LINKING_DETECTION_COUNTER_LIMIT;
  /** @since 2.4: the triples being resolved, in insertion order (Java `LinkedHashSet`). */
  protected resolving: LazyProxyInformation[] = [];

  readonly #metamodel: LazyLinkingResourceMetamodel;
  #linkingService: ILinkingService;
  #encoder: LazyURIEncoder;
  #diagnosticMessageProvider: ILinkingDiagnosticMessageProviderExtended;
  #linkingHelper: LinkingHelper;
  #cyclicLinkingDetectionCounter = 0;
  readonly #unresolvableURIFragments = new Set<string>();

  constructor(uri: URI | null, metamodel: LazyLinkingResourceMetamodel, services: LazyLinkingResourceServices) {
    super(uri);
    this.#metamodel = metamodel;
    this.#linkingService = services.linkingService;
    this.#encoder = services.encoder;
    this.#diagnosticMessageProvider = services.diagnosticMessageProvider;
    this.#linkingHelper = services.linkingHelper;
  }

  /**
   * Resolves any lazy cross references in this resource, adding issues for unresolvable elements to this
   * resource. The walk is pre-order over the contents, the cross references of each object in metamodel
   * order.
   *
   * @see LazyLinkingResource.java:135-150
   */
  resolveLazyCrossReferences(mon: CancelIndicator | null): void {
    const monitor = mon ?? NULL_CANCEL_INDICATOR;
    for (const source of this.getAllContents()) {
      checkCanceled(monitor);
      for (const crossRef of this.#metamodel.getCrossReferences(source)) {
        checkCanceled(monitor);
        this.resolveLazyCrossReference(source, crossRef);
      }
    }
  }

  /** `EcoreUtil.getAllContents(this, true)`: every root, then its descendants, pre-order. */
  private *getAllContents(): IterableIterator<InternalEObject> {
    for (const root of this.getContents()) {
      yield root;
      yield* root.eAllContents();
    }
  }

  /** @see LazyLinkingResource.java:158-162 */
  protected resolveLazyCrossReference(source: EObject, crossRef: EReferenceInfo): void {
    if (this.isPotentialLazyCrossReference(crossRef)) {
      this.doResolveLazyCrossReference(source, crossRef);
    }
  }

  /** @see LazyLinkingResource.java:170-214 */
  protected doResolveLazyCrossReference(source: EObject, crossRef: EReferenceInfo): void {
    if (isMany(crossRef)) {
      this.resolveLazyCrossReferenceList(source, crossRef);
    } else {
      this.resolveLazyCrossReferenceOne(source, crossRef);
    }
  }

  /** The `crossRef.isMany()` branch of `doResolveLazyCrossReference`. */
  protected resolveLazyCrossReferenceList(source: EObject, crossRef: EReferenceInfo): void {
    const list = this.#metamodel.getList(source, crossRef);
    for (let i = 0; i < list.size(); i++) {
      const target = this.resolveLazyProxy(list.basicGet(i));
      if (target !== null) {
        list.setUnique(i, target);
      }
    }
  }

  /** The single-valued branch of `doResolveLazyCrossReference`. */
  protected resolveLazyCrossReferenceOne(source: EObject, crossRef: EReferenceInfo): void {
    const proxy = this.#metamodel.getOne(source, crossRef);
    if (proxy !== null) {
      const target = this.resolveLazyProxy(proxy);
      if (target !== null) {
        this.#metamodel.setOne(source, crossRef, target);
      }
    }
  }

  /**
   * The nested checks both branches share: a proxy of this resource with a cross-link fragment resolves
   * through {@link getEObject}; anything else, or a failure, yields `null`.
   */
  protected resolveLazyProxy(proxy: EObject): EObject | null {
    const internal = proxy as InternalEObject;
    if (!internal.eIsProxy()) {
      return null;
    }
    const proxyURI = internal.eProxyURI() as URI;
    if (!this.requireURI().equals(proxyURI.trimFragment())) {
      return null;
    }
    const fragment = proxyURI.fragment();
    return this.getEncoder().isCrossLinkFragment(this, fragment) ? this.getEObject(fragment as string) : null;
  }

  private requireURI(): URI {
    const uri = this.getURI();
    if (uri === null) {
      throw new TypeError(NO_URI);
    }
    return uri;
  }

  /**
   * `true` if the feature may hold a proxy that has to be resolved.
   *
   * @see LazyLinkingResource.java:224-227
   */
  protected isPotentialLazyCrossReference(feature: EReferenceInfo): boolean {
    return !feature.derived && !feature.transient && this.#metamodel.isResolveProxies(feature);
  }

  /** @see LazyLinkingResource.java:230-245 */
  override getEObject(uriFragment: string): EObject | null {
    try {
      if (this.getEncoder().isCrossLinkFragment(this, uriFragment)) {
        const triple = this.getEncoder().decode(this, uriFragment);
        return this.getEObjectForTriple(uriFragment, triple);
      }
    } catch (e) {
      if (!(e instanceof RuntimeException || e instanceof TypeError)) {
        throw e;
      }
      propagateAsErrorIfCancelException(e);
      this.getErrors().add(new ExceptionDiagnostic(e));
      // WrappedException: the Javadoc states that it is thrown; EcoreUtil.resolve ignores it.
      throw new RuntimeException(e.message, { cause: e });
    }
    return super.getEObject(uriFragment);
  }

  /** `getEObject(String, Triple)`. @see LazyLinkingResource.java:250-311 */
  protected getEObjectForTriple(uriFragment: string, triple: LazyProxyInformation): EObject | null {
    this.#cyclicLinkingDetectionCounter++;
    if (this.#cyclicLinkingDetectionCounter > this.cyclicLinkingDectectionCounterLimit) {
      if (!this.addResolving(triple)) {
        return this.handleCyclicResolution(triple);
      }
    }
    try {
      return this.linkTriple(uriFragment, triple);
    } catch (ex) {
      if (ex instanceof IllegalNodeException) {
        this.createAndAddIllegalNodeDiagnostic(triple, ex);
        return null;
      }
      throw ex;
    } finally {
      if (this.#cyclicLinkingDetectionCounter > this.cyclicLinkingDectectionCounterLimit) {
        this.removeResolving(triple);
      }
      this.#cyclicLinkingDetectionCounter--;
    }
  }

  /** The body of the Java `try` block of `getEObject(String, Triple)`, up to the cyclic-linking catch. */
  private linkTriple(uriFragment: string, triple: LazyProxyInformation): EObject | null {
    const unresolveableProxies = this.getUnresolvableURIFragments();
    if (unresolveableProxies.has(uriFragment)) {
      return null;
    }
    try {
      return this.linkReference(uriFragment, triple, unresolveableProxies);
    } catch (e) {
      if (e instanceof CyclicLinkingException && tripleEquals(e.triple, triple)) {
        this.markUnresolved(uriFragment, triple, unresolveableProxies);
        return null;
      }
      throw e;
    }
  }

  private linkReference(
    uriFragment: string,
    triple: LazyProxyInformation,
    unresolveableProxies: Set<string>,
  ): EObject | null {
    const reference = triple.getSecond();
    const linkedObjects = this.getLinkingService().getLinkedObjects(
      triple.getFirst(),
      reference,
      triple.getThird() as ICrossReferenceNode,
    );
    if (linkedObjects.length === 0) {
      this.markUnresolved(uriFragment, triple, unresolveableProxies);
      return null;
    }
    if (linkedObjects.length > 1) {
      throw new IllegalStateException(`linkingService returned more than one object for fragment ${uriFragment}`);
    }
    const result = linkedObjects[0] as EObject;
    if (!reference.referenceType.isAssignableFrom(result.eClass().getName())) {
      this.markUnresolved(uriFragment, triple, unresolveableProxies);
      return null;
    }
    // remove previously added error markers, since everything should be fine now
    unresolveableProxies.delete(uriFragment);
    this.removeDiagnostic(triple);
    return result;
  }

  /** The repeated tail of the failure branches: cache the fragment (if cacheable), add the diagnostic. */
  private markUnresolved(uriFragment: string, triple: LazyProxyInformation, unresolveableProxies: Set<string>): void {
    if (this.isUnresolveableProxyCacheable(triple)) {
      unresolveableProxies.add(uriFragment);
    }
    this.createAndAddDiagnostic(triple);
  }

  private addResolving(triple: LazyProxyInformation): boolean {
    if (this.resolving.some((candidate) => tripleEquals(candidate, triple))) {
      return false;
    }
    this.resolving.push(triple);
    return true;
  }

  private removeResolving(triple: LazyProxyInformation): void {
    const index = this.resolving.findIndex((candidate) => tripleEquals(candidate, triple));
    if (index !== -1) {
      this.resolving.splice(index, 1);
    }
  }

  /** @since 2.1. @see LazyLinkingResource.java:316-318 */
  protected isUnresolveableProxyCacheable(_triple: LazyProxyInformation): boolean {
    return true;
  }

  /** @see LazyLinkingResource.java:320-322 */
  protected handleCyclicResolution(triple: LazyProxyInformation): EObject {
    throw new CyclicLinkingException(
      `Cyclic resolution of lazy links : ${this.getReferences(triple, this.resolving)} in resource '${String(this.getURI())}'.`,
      triple,
    );
  }

  /** @see LazyLinkingResource.java:324-335 */
  protected getReferences(triple: LazyProxyInformation, resolving: readonly LazyProxyInformation[]): string {
    let buffer = '';
    let found = false;
    for (const triple2 of resolving) {
      found = found || tripleEquals(triple2, triple);
      if (found) {
        buffer += `${this.getQualifiedName(triple2.getSecond())}->`;
      }
    }
    return buffer + this.getQualifiedName(triple.getSecond());
  }

  private getQualifiedName(eReference: EReferenceInfo): string {
    return `${this.#metamodel.getContainingClassName(eReference)}.${eReference.name}`;
  }

  /** @see LazyLinkingResource.java:369-379 */
  protected createAndAddDiagnostic(triple: LazyProxyInformation): void {
    if (this.isValidationDisabled()) {
      return;
    }
    this.addDiagnostic(triple, this.createDiagnosticMessage(triple));
  }

  /** `createAndAddDiagnostic(Triple, IllegalNodeException)`. @see LazyLinkingResource.java:384-395 */
  protected createAndAddIllegalNodeDiagnostic(triple: LazyProxyInformation, ex: IllegalNodeException): void {
    if (this.isValidationDisabled()) {
      return;
    }
    const context = this.createDiagnosticMessageContext(triple);
    this.addDiagnostic(triple, this.#diagnosticMessageProvider.getIllegalNodeMessage(context, ex));
  }

  /** The shared tail of both `createAndAddDiagnostic` overloads. */
  private addDiagnostic(triple: LazyProxyInformation, message: DiagnosticMessage | null): void {
    if (message !== null) {
      const list = this.getDiagnosticList(message);
      const diagnostic = this.createDiagnostic(triple, message);
      if (this.indexOfEqual(list, diagnostic) === -1) {
        list.add(diagnostic);
      }
    }
  }

  /** @see LazyLinkingResource.java:397-407 */
  protected removeDiagnostic(triple: LazyProxyInformation): void {
    // return early if there's nothing to remove
    if (this.getErrors().isEmpty() && this.getWarnings().isEmpty()) {
      return;
    }
    const message = this.createDiagnosticMessage(triple);
    const list = this.getDiagnosticList(message);
    if (!list.isEmpty()) {
      const diagnostic = this.createDiagnostic(triple, message as DiagnosticMessage);
      const index = this.indexOfEqual(list, diagnostic);
      if (index !== -1) {
        list.removeAt(index);
      }
    }
  }

  private indexOfEqual(list: EList<ResourceDiagnostic>, diagnostic: ResourceDiagnostic): number {
    return list.toArray().findIndex((candidate) => JavaObjects.equals(candidate, diagnostic));
  }

  /** @see LazyLinkingResource.java:409-413 */
  protected createDiagnostic(triple: LazyProxyInformation, message: DiagnosticMessage): ResourceDiagnostic {
    return new XtextLinkingDiagnostic(
      triple.getThird(),
      message.getMessage(),
      message.getIssueCode(),
      message.getIssueData(),
    );
  }

  /** @see LazyLinkingResource.java:415-427 */
  protected getDiagnosticList(message: DiagnosticMessage | null): EList<ResourceDiagnostic> {
    if (message !== null) {
      switch (message.getSeverity()) {
        case Severity.ERROR:
          return this.getErrors();
        case Severity.WARNING:
          return this.getWarnings();
        default:
          throw new Error(`Unexpected severity: ${String(message.getSeverity())}`);
      }
    }
    return new BasicEList<ResourceDiagnostic>();
  }

  /** @see LazyLinkingResource.java:429-433 */
  protected createDiagnosticMessage(triple: LazyProxyInformation): DiagnosticMessage | null {
    const context = this.createDiagnosticMessageContext(triple);
    return this.#diagnosticMessageProvider.getUnresolvedProxyMessage(context);
  }

  /** @see LazyLinkingResource.java:435-437 */
  protected createDiagnosticMessageContext(triple: LazyProxyInformation): ILinkingDiagnosticContext {
    return new DiagnosticMessageContext(triple, this.#linkingHelper);
  }

  setLinkingService(linkingService: ILinkingService): void {
    this.#linkingService = linkingService;
  }

  getLinkingService(): ILinkingService {
    return this.#linkingService;
  }

  setEncoder(encoder: LazyURIEncoder): void {
    this.#encoder = encoder;
  }

  getEncoder(): LazyURIEncoder {
    return this.#encoder;
  }

  getDiagnosticMessageProvider(): ILinkingDiagnosticMessageProviderExtended {
    return this.#diagnosticMessageProvider;
  }

  setDiagnosticMessageProvider(diagnosticMessageProvider: ILinkingDiagnosticMessageProviderExtended): void {
    this.#diagnosticMessageProvider = diagnosticMessageProvider;
  }

  getLinkingHelper(): LinkingHelper {
    return this.#linkingHelper;
  }

  setLinkingHelper(linkingHelper: LinkingHelper): void {
    this.#linkingHelper = linkingHelper;
  }

  /**
   * Marks the given proxy as unresolvable: further attempts to resolve it through {@link getEObject}
   * yield `null`.
   *
   * @see LazyLinkingResource.java:484-490
   */
  markUnresolvable(referenced: EObject): void {
    const proxy = referenced as InternalEObject;
    if (!proxy.eIsProxy()) {
      throw new IllegalArgumentException('Cannot mark an instance as unresolvable if it is already resolved');
    }
    this.getUnresolvableURIFragments().add((proxy.eProxyURI() as URI).fragment() as string);
  }

  /** @see LazyLinkingResource.java:495-504 */
  protected getUnresolvableURIFragments(): Set<string> {
    return this.#unresolvableURIFragments;
  }
}
