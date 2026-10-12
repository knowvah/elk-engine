// SPDX-License-Identifier: EPL-2.0
import type { ElkBendPoint } from '../ElkBendPoint.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import { type ElkGraphFactory, setElkGraphFactoryInstance } from '../ElkGraphFactory.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkLabel } from '../ElkLabel.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import type { IProperty } from '../properties/IProperty.js';
import { ElkBendPointImpl } from './ElkBendPointImpl.js';
import { ElkEdgeImpl } from './ElkEdgeImpl.js';
import { ElkEdgeSectionImpl } from './ElkEdgeSectionImpl.js';
import { ElkLabelImpl } from './ElkLabelImpl.js';
import { ElkNodeImpl } from './ElkNodeImpl.js';
import { ElkPortImpl } from './ElkPortImpl.js';
import { ElkPropertyToValueMapEntryImpl } from './ElkPropertyToValueMapEntryImpl.js';

/**
 * An implementation of the model <b>Factory</b>. Java extends EMF's `EFactoryImpl`; its reflective
 * `create(EClass)`, `createFromString(EDataType, String)` and `convertToString(EDataType, Object)`
 * dispatch on `getClassifierID()`, which the port's `EClass` stand-in does not have (D3), and are not
 * ported (D4). The `EDataType` parameters of the four data-type methods are kept, untyped (D3), and
 * unused as in Java. The deprecated static `getPackage()` returns `ElkGraphPackage.eINSTANCE`, which
 * is not ported (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
 */
export class ElkGraphFactoryImpl implements ElkGraphFactory {
  /**
   * Creates the default factory implementation. Java first asks `EPackage.Registry.INSTANCE` for a
   * registered factory; the port has no package registry (D3), so it always creates one.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
   */
  static init(): ElkGraphFactory {
    return new ElkGraphFactoryImpl();
  }

  // create(EClass), createFromString(EDataType, String), convertToString(EDataType, Object): not ported (D4)

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkLabel(): ElkLabel {
    const elkLabel = new ElkLabelImpl();
    return elkLabel;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkNode(): ElkNode {
    const elkNode = new ElkNodeImpl();
    return elkNode;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkPort(): ElkPort {
    const elkPort = new ElkPortImpl();
    return elkPort;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkEdge(): ElkEdge {
    const elkEdge = new ElkEdgeImpl();
    return elkEdge;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkBendPoint(): ElkBendPoint {
    const elkBendPoint = new ElkBendPointImpl();
    return elkBendPoint;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkEdgeSection(): ElkEdgeSection {
    const elkEdgeSection = new ElkEdgeSectionImpl();
    return elkEdgeSection;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java */
  createElkPropertyToValueMapEntry(): ElkPropertyToValueMapEntryImpl {
    const elkPropertyToValueMapEntry = new ElkPropertyToValueMapEntryImpl();
    return elkPropertyToValueMapEntry;
  }

  /**
   * Deserialization requires the layout meta data service to be present and can thus not happen in
   * this plug-in. This method thus always returns `null`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
   */
  createIPropertyFromString(_eDataType: unknown, _initialValue: string | null): IProperty<unknown> | null {
    return null;
  }

  /**
   * Serializes `IProperty` instances to their ID.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
   */
  convertIPropertyToString(_eDataType: unknown, instanceValue: unknown): string {
    return (instanceValue as IProperty<unknown>).getId();
  }

  /**
   * Deserialization requires the layout meta data service to be present and can thus not happen in
   * this plug-in. This method thus always returns `null`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
   */
  createPropertyValueFromString(_eDataType: unknown, _initialValue: string | null): unknown {
    return null;
  }

  /**
   * Serializes property values by calling `toString()` (a `null` value fails with a `TypeError`, as
   * Java's NPE; a JS number prints without Java's `.0`, D10-style text divergence).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
   */
  convertPropertyValueToString(_eDataType: unknown, instanceValue: unknown): string {
    return (instanceValue as { toString(): string }).toString();
  }

  /**
   * The package; constants only in the port (D3).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
   */
  getElkGraphPackage(): typeof ElkGraphPackage {
    return ElkGraphPackage;
  }
}

// Java: `ElkGraphFactory eINSTANCE = ElkGraphFactoryImpl.init();` in the interface.
setElkGraphFactoryInstance(ElkGraphFactoryImpl.init());
registerImpl('ElkGraphFactory', ElkGraphFactoryImpl);
