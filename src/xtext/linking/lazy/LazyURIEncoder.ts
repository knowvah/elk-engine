// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../emf/common/util/EList.js';
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { ResourceInternal } from '../../../emf/ecore/resource/Resource.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { valueOf as parseInt } from '../../../java/lang/JavaInteger.js';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import { StringBuilder } from '../../../java/lang/StringBuilder.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import { split as stringsSplit } from '../../util/Strings.js';
import { eResourceOf, isLazyLinkingResource } from './ILazyLinkingResource.js';
import type { LazyProxyInformation } from './ILazyLinkingResource.js';
import { isMany } from './LazyLinkingMetamodel.js';
import type { ILazyNode, LazyURIEncoderMetamodel } from './LazyLinkingMetamodel.js';

const PARENT_STEP = '..';

/**
 * Encodes the triple (object, reference, node) of a lazy cross reference into a URI fragment and decodes
 * it again. `USE_INDEXED_FRAGMENTS_BINDING` becomes the `useIndexFragment` constructor flag (Guice's
 * optional `@Named` boolean, default `false`; `DefaultRuntimeModule` binds `true`). Both the index form
 * (`|n`) and the long form (`|::path::feature::nodepath`) are ported. `Strings.split` is
 * the `src/xtext/util/Strings` port; `Integer.parseInt` is `JavaInteger.valueOf`. Overloads are renamed:
 * `getNode(INode, String)` is {@link getNodeAtPath}. The metamodel and the node tree come from
 * {@link LazyURIEncoderMetamodel}.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyURIEncoder.java:74-270
 */
export class LazyURIEncoder {
  /** @see LazyURIEncoder.java:41 */
  static readonly XTEXT_LINK = '|';
  /** @see LazyURIEncoder.java:46 */
  static readonly SEP = '::';
  /** @see LazyURIEncoder.java:51 */
  static readonly USE_INDEXED_FRAGMENTS_BINDING = 'org.eclipse.xtext.linking.lazy.LazyURIEncoder.isUseIndexFragment';

  readonly #metamodel: LazyURIEncoderMetamodel;
  readonly #useIndexFragment: boolean;

  constructor(metamodel: LazyURIEncoderMetamodel, useIndexFragment = false) {
    this.#metamodel = metamodel;
    this.#useIndexFragment = useIndexFragment;
  }

  isUseIndexFragment(context: unknown): boolean {
    return this.#useIndexFragment && isLazyLinkingResource(context);
  }

  /** Encodes the three parameters so that {@link decode} returns them from the resource. */
  encode(obj: EObject, ref: EReferenceInfo, node: INode): string {
    if (this.isUseIndexFragment(eResourceOf(obj))) {
      return this.getIndexFragment(obj, ref, node);
    }
    const fragment = new StringBuilder().append(LazyURIEncoder.XTEXT_LINK).append(LazyURIEncoder.SEP);
    this.appendShortFragment(obj, fragment);
    fragment.append(LazyURIEncoder.SEP);
    fragment.append(this.toShortExternalForm(obj.eClass(), ref)).append(LazyURIEncoder.SEP);
    this.getRelativePath(fragment, this.#metamodel.getNode(obj), this.#metamodel.toTreeNode(node));
    return fragment.toString();
  }

  protected getIndexFragment(obj: EObject, ref: EReferenceInfo, node: INode): string {
    const resource = eResourceOf(obj);
    if (!isLazyLinkingResource(resource)) {
      throw new IllegalStateException(`Context object must be contained in a LazyLinkingResource : ${resource}`);
    }
    const idx = resource.addLazyProxyInformation(obj, ref, node);
    return LazyURIEncoder.XTEXT_LINK + String(idx);
  }

  appendShortFragment(obj: EObject, target: StringBuilder): void {
    const containmentFeature = this.#metamodel.eContainmentFeature(obj);
    if (containmentFeature === null) {
      const contents: EList<EObject> = (eResourceOf(obj) as ResourceInternal).getContents();
      target.append(String(contents.indexOf(obj)));
      return;
    }
    const container = obj.eContainer() as EObject;
    this.appendShortFragment(container, target);
    target.append('.').append(String(this.#metamodel.getFeatureID(container.eClass(), containmentFeature)));
    if (isMany(containmentFeature)) {
      const list = this.#metamodel.eGetMany(container, containmentFeature);
      target.append('.').append(String(list.indexOf(obj)));
    }
  }

  toShortExternalForm(clazz: EClass, ref: EReferenceInfo): string {
    return String(this.#metamodel.getFeatureID(clazz, ref));
  }

  /** Decodes `uriFragment`; see {@link encode}. */
  decode(res: ResourceInternal, uriFragment: string): LazyProxyInformation {
    if (this.isUseIndexFragment(res)) {
      return this.getLazyProxyInformation(res, uriFragment);
    }
    const split = stringsSplit(uriFragment, LazyURIEncoder.SEP);
    const source = this.resolveShortFragment(res, split[1] as string);
    const ref = this.fromShortExternalForm(source.eClass(), split[2] as string);
    const compositeNode = this.#metamodel.getNode(source);
    if (compositeNode === null) {
      throw new IllegalStateException("Couldn't resolve lazy link, because no node model is attached.");
    }
    const textNode = this.getNodeAtPath(compositeNode, split[3] as string);
    return { getFirst: () => source, getSecond: () => ref, getThird: () => textNode };
  }

  protected getLazyProxyInformation(res: ResourceInternal, uriFragment: string): LazyProxyInformation {
    if (!isLazyLinkingResource(res)) {
      throw new IllegalArgumentException('Given resource not a LazyLinkingResource');
    }
    const idx = this.getIndex(uriFragment);
    return res.getLazyProxyInformation(idx) as LazyProxyInformation;
  }

  getIndex(uriFragment: string): number {
    try {
      return parseInt(uriFragment.substring(LazyURIEncoder.XTEXT_LINK.length));
    } catch (e) {
      if (!(e instanceof RuntimeException)) throw e;
      const failure = new IllegalArgumentException(`Couldn't parse index from fragment '${uriFragment}'`);
      failure.cause = e; // the Java constructor takes the cause; the shim's takes the message only
      throw failure;
    }
  }

  resolveShortFragment(res: ResourceInternal, shortFragment: string): EObject {
    const split = stringsSplit(shortFragment, '.');
    let result: EObject = res.getContents().get(parseInt(split[0] as string));
    let splitIdx = 1;
    while (splitIdx < split.length) {
      const featureId = parseInt(split[splitIdx++] as string);
      const reference = this.#metamodel.getEStructuralFeature(result.eClass(), featureId);
      if (isMany(reference)) {
        const list = this.#metamodel.eGetMany(result, reference);
        result = list[parseInt(split[splitIdx++] as string)] as EObject;
      } else {
        result = this.#metamodel.eGetOne(result, reference);
      }
    }
    return result;
  }

  fromShortExternalForm(clazz: EClass, shortForm: string): EReferenceInfo {
    return this.#metamodel.getEStructuralFeature(clazz, parseInt(shortForm));
  }

  /** Public in Java only to be testable. Appends the path from `parserNode` to `node`. */
  getRelativePath(result: StringBuilder, parserNode: ILazyNode | null, node: ILazyNode): void {
    if (parserNode === node) return;
    if (this.isAncestor(parserNode as ILazyNode, node)) {
      const parent = node.getParent() as ILazyNode;
      this.getRelativePath(result, parserNode, parent);
      let idx = 0;
      let child = parent.getFirstChild() as ILazyNode;
      while (child !== node && child.hasNextSibling()) {
        idx++;
        child = child.getNextSibling() as ILazyNode;
      }
      result.append('/').append(String(idx));
    } else {
      result.append(`/${PARENT_STEP}`);
      this.getRelativePath(result, (parserNode as ILazyNode).getParent(), node);
    }
  }

  protected isAncestor(parent: ILazyNode, child: ILazyNode): boolean {
    for (let node: ILazyNode | null = child; node !== null; node = node.getParent()) {
      if (node === parent) return true;
    }
    return false;
  }

  /** `getNode(EObject, String)`: the node a fragment of `object` designates. */
  getNode(object: EObject, fragment: string): INode {
    const resource = eResourceOf(object);
    if (this.isUseIndexFragment(resource)) {
      return this.decode(resource as ResourceInternal, fragment).getThird();
    }
    const compositeNode = this.#metamodel.getNode(object);
    if (compositeNode === null) {
      throw new IllegalStateException("Couldn't resolve lazy link, because no node model is attached.");
    }
    return this.getNodeAtPath(compositeNode, stringsSplit(fragment, LazyURIEncoder.SEP)[3] as string);
  }

  /** `getNode(INode, String)`: walks a `/`-separated path of child indexes and `..` steps. Public in Java only to be testable. */
  getNodeAtPath(node: ILazyNode, path: string): ILazyNode {
    let result = node;
    for (const segment of stringsSplit(path, '/')) {
      const trimmed = segment.trim();
      if (trimmed.length === 0) continue;
      if (trimmed === PARENT_STEP) {
        const parent = result.getParent();
        if (parent === null) throw new IllegalStateException('node has no parent');
        result = parent;
      } else {
        result = this.childAt(result, parseInt(segment));
      }
    }
    return result;
  }

  private childAt(parent: ILazyNode, index: number): ILazyNode {
    if (index < 0) return parent;
    let child = parent.getFirstChild() as ILazyNode;
    for (let remaining = index; remaining > 0; remaining--) child = child.getNextSibling() as ILazyNode;
    return child;
  }

  isCrossLinkFragment(_res: unknown, s: string | null): boolean {
    return s !== null && s.startsWith(LazyURIEncoder.XTEXT_LINK);
  }
}
