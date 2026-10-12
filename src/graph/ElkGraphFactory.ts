// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../java/lang/IllegalStateException.js';
import type { ElkBendPoint } from './ElkBendPoint.js';
import type { ElkEdge } from './ElkEdge.js';
import type { ElkEdgeSection } from './ElkEdgeSection.js';
import type { ElkLabel } from './ElkLabel.js';
import type { ElkNode } from './ElkNode.js';
import { type ElkGraphPackage, isInstance } from './ElkGraphPackage.js';
import type { ElkPort } from './ElkPort.js';

/**
 * The factory of the model. Java extends EMF's `EFactory`, whose reflective `create(EClass)` etc.
 * are not ported (D4).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java
 */
export interface ElkGraphFactory {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java */
  createElkLabel(): ElkLabel;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java */
  createElkNode(): ElkNode;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java */
  createElkPort(): ElkPort;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java */
  createElkEdge(): ElkEdge;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java */
  createElkBendPoint(): ElkBendPoint;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java */
  createElkEdgeSection(): ElkEdgeSection;

  /**
   * The package; constants only in the port (D3).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java
   */
  getElkGraphPackage(): typeof ElkGraphPackage;
}

/**
 * Holds the singleton Java initializes as `ElkGraphFactory.eINSTANCE = ElkGraphFactoryImpl.init()`.
 * The impl module (T9) fills it at load; the interface module cannot import the impl.
 */
const holder: { instance: ElkGraphFactory | null } = { instance: null };

/**
 * Sets the factory singleton. Called once by the `ElkGraphFactoryImpl` module at load.
 *
 * @internal
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
 */
export function setElkGraphFactoryInstance(factory: ElkGraphFactory): void {
  holder.instance = factory;
}

/**
 * The static side of the interface: `ElkGraphFactory.eINSTANCE`, the singleton factory. Reading it
 * before the impl module has loaded throws `IllegalStateException` (Java initializes it with the
 * interface).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java
 */
export const ElkGraphFactory: { readonly eINSTANCE: ElkGraphFactory } = {
  get eINSTANCE(): ElkGraphFactory {
    if (holder.instance === null) {
      throw new IllegalStateException('ElkGraphFactory.eINSTANCE is not set: load ElkGraphFactoryImpl first');
    }
    return holder.instance;
  },
};

/**
 * Java `o instanceof ElkGraphFactory` (D3); the impl registers itself in T9.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphFactory.java
 */
export function isElkGraphFactory(o: unknown): o is ElkGraphFactory {
  return isInstance('ElkGraphFactory', o);
}
