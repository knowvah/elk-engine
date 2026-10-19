// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { ManyInverse } from '../../emf/ecore/util/EObjectWithInverseResolvingEList.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import { ElkShapeImpl } from './ElkShapeImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Connectable Shape</b></em>'. The edge lists are
 * `EObjectWithInverseResolvingEList.ManyInverse` as in Java (D13): `get` resolves proxy edges.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java
 */
export abstract class ElkConnectableShapeImpl extends ElkShapeImpl implements ElkConnectableShape {
  /**
   * The cached value of the '{@link getOutgoingEdges() <em>Outgoing Edges</em>}' reference list.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java
   */
  protected outgoingEdges: ManyInverse<ElkEdge> | null = null;

  /**
   * The cached value of the '{@link getIncomingEdges() <em>Incoming Edges</em>}' reference list.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java
   */
  protected incomingEdges: ManyInverse<ElkEdge> | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_CONNECTABLE_SHAPE;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java */
  getOutgoingEdges(): ManyInverse<ElkEdge> {
    if (this.outgoingEdges === null) {
      this.outgoingEdges = new ManyInverse<ElkEdge>(
        this,
        ElkGraphPackage.ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
        ElkGraphPackage.ELK_EDGE__SOURCES,
      );
    }
    return this.outgoingEdges;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java */
  getIncomingEdges(): ManyInverse<ElkEdge> {
    if (this.incomingEdges === null) {
      this.incomingEdges = new ManyInverse<ElkEdge>(
        this,
        ElkGraphPackage.ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
        ElkGraphPackage.ELK_EDGE__TARGETS,
      );
    }
    return this.incomingEdges;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES:
        this.getOutgoingEdges().basicAdd(otherEnd as ElkEdge);
        return;
      case ElkGraphPackage.ELK_CONNECTABLE_SHAPE__INCOMING_EDGES:
        this.getIncomingEdges().basicAdd(otherEnd as ElkEdge);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkConnectableShapeImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES:
        this.getOutgoingEdges().basicRemove(otherEnd as ElkEdge);
        return;
      case ElkGraphPackage.ELK_CONNECTABLE_SHAPE__INCOMING_EDGES:
        this.getIncomingEdges().basicRemove(otherEnd as ElkEdge);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)
}

registerImpl('ElkConnectableShape', ElkConnectableShapeImpl);
