// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { URI } from '../../emf/common/util/URI.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import type { ResourceInternal } from '../../emf/ecore/resource/Resource.js';
import type { EcoreEMap } from '../../emf/ecore/util/EcoreEMap.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import { registerImpl } from '../../graph/ElkGraphPackage.js';
import type { ElkLabel } from '../../graph/ElkLabel.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../graph/properties/IPropertyHolder.js';
import type { PropertyMap } from '../../graph/properties/PropertyMap.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import type { Grid } from './Grid.js';

/** A row of the grid: Java's `ArrayList<ElkNode>`, whose empty cells hold `null`. */
type GridRow = (ElkNode | null)[];

/**
 * Java `ArrayList.get(index)`: an index outside `[0, size)` throws `IndexOutOfBoundsException` (a JS array yields
 * `undefined`). The message is the JVM's text as `topdownpacking.json` records it (the Javadoc leaves it unspecified).
 */
function listGet<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index]!;
}

/**
 * Java `ArrayList.add(index, element)`: inserts, shifting later elements right; an index outside `[0, size]` throws
 * `IndexOutOfBoundsException` (`Array.prototype.splice` clamps instead). The message is the JVM's text as
 * `topdownpacking.json` records it.
 */
function listAdd<T>(list: T[], index: number, element: T): void {
  if (index < 0 || index > list.length) {
    throw new IndexOutOfBoundsException(`Index: ${String(index)}, Size: ${String(list.length)}`);
  }
  list.splice(index, 0, element);
}

/**
 * An {@link ElkNode} that stores its children in a two-dimensional grid.
 *
 * Every member of the TS `ElkNode` interface chain (`ElkNode`, `ElkConnectableShape`, `ElkShape`, `ElkGraphElement`,
 * `EMapPropertyHolder`, `InternalEObject`, `EObject`, `IPropertyHolder`) delegates to the wrapped node, in Java's
 * order where Java has the member. The `InternalEObject` members (`eInternalContainer` … `eSetResource`) are not in
 * the Java class (Java's `ElkNode` extends `EObject` only); the TS interface requires them, so they delegate too.
 *
 * Java members without a TS counterpart (AD-11, D4: no reflective EMF, notifications or features), not ported:
 * `eContainingFeature` (:310), `eContainmentFeature` (:318), `eCrossReferences` (:350), `eGet(EStructuralFeature)`
 * (:358), `eGet(EStructuralFeature, boolean)` (:366), `eSet` (:374), `eIsSet` (:382), `eUnset` (:390), `eInvoke`
 * (:398), `eAdapters` (:407), `eDeliver` (:415), `eSetDeliver` (:423), `eNotify` (:431).
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/GridElkNode.java
 */
export class GridElkNode implements ElkNode, Grid<ElkNode> {
  // The grid is stored as a list of rows and each row contains a list of column entries for that row.
  private grid: GridRow[] | null = null;
  private rows: number = 0;
  private cols: number = 0;

  // wrapped ElkNode
  private readonly node: ElkNode;

  /**
   * Wraps an existing {@link ElkNode} in a grid wrapper.
   *
   * @param elkNode the base elk node
   */
  constructor(elkNode: ElkNode) {
    this.node = elkNode;
  }

  // ---- Grid<ElkNode> (GridElkNode.java:63-152) ----

  /** Inserts (Java `add(col, item)`, :73), so the row list grows past `cols`. */
  put(col: number, row: number, item: ElkNode): void {
    if (col >= this.cols || row >= this.rows) {
      throw new IndexOutOfBoundsException(
        `The grid has a size of (${String(this.cols)} x ${String(this.rows)}). The requested index of (${String(col)} x ${String(row)}) is out of bounds.`,
      );
    }

    listAdd(listGet(this.grid!, row), col, item);
  }

  get(col: number, row: number): ElkNode | null {
    if (col >= this.cols || row >= this.rows) {
      throw new IndexOutOfBoundsException(
        `The grid has a size of (${String(this.cols)} x ${String(this.rows)}). The requested index of (${String(col)} x ${String(row)}) is out of bounds.`,
      );
    }

    return listGet(listGet(this.grid!, row), col);
  }

  getRow(row: number): GridRow {
    if (row >= this.rows) {
      throw new IndexOutOfBoundsException(
        `The grid has a size of (${String(this.cols)} x ${String(this.rows)}). The requested row ${String(row)}) is out of bounds.`,
      );
    }
    return listGet(this.grid!, row);
  }

  getColumn(col: number): GridRow {
    if (col >= this.cols) {
      throw new IndexOutOfBoundsException(
        `The grid has a size of (${String(this.cols)} x ${String(this.rows)}). The requested column ${String(col)}) is out of bounds.`,
      );
    }
    const resultList: GridRow = [];
    for (let i = 0; i < this.rows; i++) {
      resultList.push(listGet(listGet(this.grid!, i), col));
    }
    return resultList;
  }

  getColumns(): number {
    return this.cols;
  }

  getRows(): number {
    return this.rows;
  }

  setGridSize(cols: number, rows: number): void {
    // initialize the backing arraylists and fill them with null
    this.cols = cols;
    this.rows = rows;
    // Java `new ArrayList<>(rows)` (:143) throws IllegalArgumentException for a negative capacity (Javadoc; the
    // message is the JVM's text, probed with jshell).
    if (rows < 0) {
      throw new IllegalArgumentException(`Illegal Capacity: ${String(rows)}`);
    }
    this.grid = [];

    for (let i = 0; i < rows; i++) {
      this.grid.push([]);
      for (let j = 0; j < cols; j++) {
        this.grid[i]!.push(null);
      }
    }
  }

  // ---- ElkConnectableShape, ElkShape, ElkGraphElement, EMapPropertyHolder (GridElkNode.java:154-280) ----

  getOutgoingEdges(): EList<ElkEdge> {
    return this.node.getOutgoingEdges();
  }

  getIncomingEdges(): EList<ElkEdge> {
    return this.node.getIncomingEdges();
  }

  getHeight(): number {
    return this.node.getHeight();
  }

  setHeight(value: number): void {
    this.node.setHeight(value);
  }

  getWidth(): number {
    return this.node.getWidth();
  }

  setWidth(value: number): void {
    this.node.setWidth(value);
  }

  getX(): number {
    return this.node.getX();
  }

  setX(value: number): void {
    this.node.setX(value);
  }

  getY(): number {
    return this.node.getY();
  }

  setY(value: number): void {
    this.node.setY(value);
  }

  setDimensions(width: number, height: number): void {
    this.node.setDimensions(width, height);
  }

  setLocation(x: number, y: number): void {
    this.node.setLocation(x, y);
  }

  getLabels(): EList<ElkLabel> {
    return this.node.getLabels();
  }

  getIdentifier(): string | null {
    return this.node.getIdentifier();
  }

  setIdentifier(value: string | null): void {
    this.node.setIdentifier(value);
  }

  getProperties(): EcoreEMap<IProperty<unknown>, unknown> {
    return this.node.getProperties();
  }

  // ---- EObject (GridElkNode.java:282-344) ----

  eClass(): EClass {
    return this.node.eClass();
  }

  eResource(): ResourceInternal | null {
    return this.node.eResource();
  }

  eContainer(): InternalEObject | null {
    return this.node.eContainer();
  }

  eContents(): EList<InternalEObject> {
    return this.node.eContents();
  }

  eAllContents(): IterableIterator<InternalEObject> {
    return this.node.eAllContents();
  }

  eIsProxy(): boolean {
    return this.node.eIsProxy();
  }

  // ---- IPropertyHolder (GridElkNode.java:435-473) ----

  /** Returns what the wrapped node returns (the wrapped node, not this wrapper), as Java does. */
  setProperty<T>(property: IProperty<T>, value: T | null): IPropertyHolder {
    return this.node.setProperty(property, value);
  }

  getProperty<T>(property: IProperty<T>): T {
    return this.node.getProperty(property);
  }

  hasProperty(property: IProperty<unknown>): boolean {
    return this.node.hasProperty(property);
  }

  copyProperties(holder: IPropertyHolder | null): IPropertyHolder {
    return this.node.copyProperties(holder);
  }

  getAllProperties(): PropertyMap {
    return this.node.getAllProperties();
  }

  // ---- ElkNode (GridElkNode.java:475-521) ----

  getPorts(): EList<ElkPort> {
    return this.node.getPorts();
  }

  getChildren(): EList<ElkNode> {
    return this.node.getChildren();
  }

  getParent(): ElkNode | null {
    return this.node.getParent();
  }

  setParent(value: ElkNode | null): void {
    this.node.setParent(value);
  }

  getContainedEdges(): EList<ElkEdge> {
    return this.node.getContainedEdges();
  }

  isHierarchical(): boolean {
    return this.node.isHierarchical();
  }

  // ---- InternalEObject (TS interface only; no Java member) ----

  eInternalContainer(): InternalEObject | null {
    return this.node.eInternalContainer();
  }

  eContainerFeatureID(): number {
    return this.node.eContainerFeatureID();
  }

  eBasicSetContainer(newContainer: InternalEObject | null, newContainerFeatureID: number): void {
    this.node.eBasicSetContainer(newContainer, newContainerFeatureID);
  }

  eBasicRemoveFromContainer(): void {
    this.node.eBasicRemoveFromContainer();
  }

  eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    this.node.eInverseAdd(otherEnd, featureID);
  }

  eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    this.node.eInverseRemove(otherEnd, featureID);
  }

  eProxyURI(): URI | null {
    return this.node.eProxyURI();
  }

  eSetProxyURI(uri: URI | null): void {
    this.node.eSetProxyURI(uri);
  }

  eResolveProxy(proxy: InternalEObject): EObject {
    return this.node.eResolveProxy(proxy);
  }

  eDirectResource(): ResourceInternal | null {
    return this.node.eDirectResource();
  }

  eInternalResource(): ResourceInternal | null {
    return this.node.eInternalResource();
  }

  eSetResource(resource: ResourceInternal | null): void {
    this.node.eSetResource(resource);
  }
}

// Java `gridElkNode instanceof <interface>` is true for ElkNode and each interface it extends (PK3).
registerImpl('ElkNode', GridElkNode);
registerImpl('ElkConnectableShape', GridElkNode);
registerImpl('ElkShape', GridElkNode);
registerImpl('ElkGraphElement', GridElkNode);
registerImpl('EMapPropertyHolder', GridElkNode);
