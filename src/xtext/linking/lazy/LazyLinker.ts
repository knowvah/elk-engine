// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../emf/ecore/InternalEObject.js';
import { EcoreUtil } from '../../../emf/ecore/util/EcoreUtil.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { IDiagnosticProducer } from '../../diagnostics/IDiagnosticProducer.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { INode } from '../../nodemodel/INode.js';
import type { INodeModel } from '../../nodemodel/INodeModel.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import { AbstractCleaningLinker } from '../impl/AbstractCleaningLinker.js';
import { eResourceOf } from './ILazyLinkingResource.js';
import { isMany } from './LazyLinkingMetamodel.js';
import type { LazyEClass, LazyEPackage, LazyLinkerMetamodel } from './LazyLinkingMetamodel.js';
import type { LazyURIEncoder } from './LazyURIEncoder.js';

/**
 * The queued links of references that do not resolve proxies: per (object, feature) the nodes in text order.
 * Stands for `Multimap<EStructuralFeature.Setting, INode>` keyed by `SettingDelegate` (equal when object and
 * feature are equal); iteration is insertion order (Java's is hash order, unobservable here).
 */
export type SettingsToLink = Map<EObject, Map<string, { ref: EReferenceInfo; nodes: ICrossReferenceNode[] }>>;

/**
 * The linker that installs proxies instead of resolving: right after load every cross reference is a
 * proxy whose URI fragment indexes the recorded triple, resolved on first access.
 *
 * Port-local substitutes and omissions:
 * - The node-model walk of `installProxies` (the `CrossReference` grammar elements among a node's children,
 *   fragment rules and the parent check included) is `INodeModel.getCrossReferenceNodes(obj)`, the parser's
 *   source-order grouping of each object's own cross-reference nodes (the same substitution `Linker`
 *   documents). Equivalence: Xtext visits an object's cross-reference nodes in text order, and
 *   `doLinkModel` visits objects pre-order, so the call order of `createProxy` (hence the `|n` indexes)
 *   is pre-order over objects, then text order within an object, in both. `hasLeafNodes` is `true`: the
 *   parser records only references backed by tokens.
 * - The `IllegalStateException` for a missing reference omits Java's containing-parser-rule clause (the
 *   grammar is not available); `afterCreateAndSetProxy` loses its `CrossReference` parameter.
 * - `OnChangeEvictingCache.execWithoutCacheClear` is dropped (no change notifications, nothing to evict);
 *   `isClearAllReferencesRequired` takes no resource (see `AbstractCleaningLinker`).
 * - Logging, the setters (`setRegistry`, `setEncoder`, `setGrammarAccess`; Guice injection is the
 *   constructor), `getCache`, and the catch of `WrappedException` around registry package loading
 *   (not ported; registry packages are resolved objects) are not ported.
 * - `EcoreUtil.create(eClass)` is the overridable {@link createInstance}; the base throws, because the
 *   reflective EMF factory is not ported. The language subclass overrides it, or `createProxy`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyLinker.java:90-312
 */
export class LazyLinker extends AbstractCleaningLinker {
  readonly #encoder: LazyURIEncoder;
  readonly #nodeModel: INodeModel;
  readonly #metamodel: LazyLinkerMetamodel;
  readonly #instantiableSubTypes = new Map<LazyEClass, LazyEClass>();

  constructor(metamodel: LazyLinkerMetamodel, nodeModel: INodeModel, encoder: LazyURIEncoder) {
    super(metamodel);
    this.#metamodel = metamodel;
    this.#nodeModel = nodeModel;
    this.#encoder = encoder;
  }

  protected override doLinkModel(model: EObject, consumer: IDiagnosticConsumer): void {
    const settingsToLink: SettingsToLink = new Map();
    const producer = this.createDiagnosticProducer(consumer);
    const clearAllReferencesRequired = this.isClearAllReferencesRequired();
    for (const eObject of this.getAllLinkableContents(model)) {
      if (clearAllReferencesRequired) this.clearReferences(eObject);
      this.installProxies(eObject, producer, settingsToLink);
    }
    this.installQueuedLinks(settingsToLink);
  }

  protected installProxies(obj: EObject, producer: IDiagnosticProducer, settingsToLink: SettingsToLink): void {
    const nodes = this.#nodeModel.getCrossReferenceNodes(obj);
    if (nodes === null) return;
    if (this.referenceAccess.getEAllReferences(obj).every((ref) => ref.containment)) return;
    for (const node of nodes) {
      if (!this.hasLeafNodes(node)) continue;
      producer.setNode(node);
      const eRef = this.referenceAccess.getReference(obj, node.feature);
      if (eRef === null) {
        throw new IllegalStateException(
          `Couldn't find EReference for crossreference '${obj.eClass().getName()}::${node.feature}'.`,
        );
      }
      if (!this.#metamodel.isResolveProxies(eRef)) {
        this.queueLink(settingsToLink, obj, eRef, node);
      } else {
        this.createAndSetProxy(obj, node, eRef);
        this.afterCreateAndSetProxy(obj, node, eRef, producer);
      }
    }
  }

  private queueLink(
    settingsToLink: SettingsToLink,
    obj: EObject,
    eRef: EReferenceInfo,
    node: ICrossReferenceNode,
  ): void {
    let byFeature = settingsToLink.get(obj);
    if (byFeature === undefined) settingsToLink.set(obj, (byFeature = new Map()));
    let entry = byFeature.get(eRef.name);
    if (entry === undefined) byFeature.set(eRef.name, (entry = { ref: eRef, nodes: [] }));
    entry.nodes.push(node);
  }

  protected afterCreateAndSetProxy(
    _obj: EObject,
    _node: INode,
    _eRef: EReferenceInfo,
    _producer: IDiagnosticProducer,
  ): void {
    // clients may override
  }

  protected hasLeafNodes(_node: INode): boolean {
    return true;
  }

  protected installQueuedLinks(settingsToLink: SettingsToLink): void {
    for (const [eObject, byFeature] of settingsToLink) {
      for (const { ref, nodes } of byFeature.values()) {
        if (isMany(ref)) {
          const list = this.referenceAccess.eGetList(eObject, ref);
          for (const node of nodes) {
            const proxy = this.createProxy(eObject, node, ref);
            list.addAll([EcoreUtil.resolveFromObject(proxy, eObject as InternalEObject)]);
          }
        } else {
          const proxy = this.createProxy(eObject, nodes[0] as INode, ref);
          this.referenceAccess.eSet(eObject, ref, EcoreUtil.resolveFromObject(proxy, eObject as InternalEObject));
        }
      }
    }
  }

  protected createAndSetProxy(obj: EObject, node: INode, eRef: EReferenceInfo): void {
    const proxy = this.createProxy(obj, node, eRef);
    if (isMany(eRef)) {
      this.#metamodel.addUnique(obj, eRef, proxy);
    } else {
      this.referenceAccess.eSet(obj, eRef, proxy);
    }
  }

  protected createProxy(obj: EObject, node: INode, eRef: EReferenceInfo): EObject {
    const resource = eResourceOf(obj);
    if (resource === null) throw new IllegalStateException('object must be contained in a resource');
    const uri = resource.getURI() as NonNullable<ReturnType<typeof resource.getURI>>;
    const encodedLink = uri.appendFragment(this.#encoder.encode(obj, eRef, node));
    const referenceType = this.getProxyType(obj, eRef);
    const proxy = this.createInstance(referenceType);
    proxy.eSetProxyURI(encodedLink);
    return proxy;
  }

  /** `EcoreUtil.create(eClass)`; the reflective EMF factory is not ported, so a language subclass supplies it. */
  protected createInstance(eClass: LazyEClass): InternalEObject {
    throw new IllegalStateException(`No factory for '${eClass.getName()}': override createInstance or createProxy`);
  }

  protected getProxyType(obj: EObject, eRef: EReferenceInfo): LazyEClass {
    const referenceType = this.#metamodel.getReferenceType(eRef, obj);
    let instantiableType = this.#instantiableSubTypes.get(referenceType);
    if (instantiableType === undefined) {
      instantiableType = this.findInstantiableCompatible(referenceType);
      this.#instantiableSubTypes.set(referenceType, instantiableType);
    }
    return instantiableType;
  }

  protected findInstantiableCompatible(eType: LazyEClass): LazyEClass {
    if (eType.isAbstract() || eType.isInterface()) {
      const eClass = this.findSubTypeInEPackage(eType.getEPackage(), eType);
      if (eClass !== null) return eClass;
      return this.globalFindInstantiableCompatible(eType);
    }
    return eType;
  }

  protected globalFindInstantiableCompatible(eType: LazyEClass): LazyEClass {
    const visitedPackages = new Set<string>([eType.getEPackage().getNsURI()]);
    for (const ePackage of this.#metamodel.getMetamodelPackages()) {
      if (this.visit(visitedPackages, ePackage.getNsURI())) {
        const result = this.findSubTypeInEPackage(ePackage, eType);
        if (result !== null) return result;
      }
    }
    const registry = this.#metamodel.getRegistry();
    for (const nsURI of [...registry.keySet()]) {
      if (this.visit(visitedPackages, nsURI)) {
        const result = this.findSubTypeInEPackage(registry.getEPackage(nsURI), eType);
        if (result !== null) return result;
      }
    }
    throw new IllegalStateException(
      `Could not find an instantiable subtype for type: '${eType.getName()}' (${eType.getEPackage().getNsURI()}).`,
    );
  }

  /** `Set.add`: whether `nsURI` was new. */
  private visit(visited: Set<string>, nsURI: string): boolean {
    if (visited.has(nsURI)) return false;
    visited.add(nsURI);
    return true;
  }

  protected findSubTypeInEPackage(ePackage: LazyEPackage, superType: LazyEClass): LazyEClass | null {
    for (const c of ePackage.getEClassifiers()) {
      if (this.isInstantiatableSubType(c, superType)) return c;
    }
    return null;
  }

  private isInstantiatableSubType(c: LazyEClass, superType: LazyEClass): boolean {
    return !c.isAbstract() && !c.isInterface() && superType.isAssignableFrom(c);
  }

  getEncoder(): LazyURIEncoder {
    return this.#encoder;
  }

  getRegistry(): ReturnType<LazyLinkerMetamodel['getRegistry']> {
    return this.#metamodel.getRegistry();
  }
}
