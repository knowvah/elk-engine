// SPDX-License-Identifier: EPL-2.0
// @staged 7g
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import type { SelfLoopEdge } from './SelfLoopEdge.js';

/**
 * Staged class (L1): mission 7a ports only `getIncomingSLEdges()` and `getOutgoingSLEdges()` (read by
 * `LGraphAdapters`); every other member, including the constructor, throws until mission 7g ports the class.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopPort.java
 */
export class SelfLoopPort {
  /** Incoming self loop edges. */
  private readonly incomingSLEdges: SelfLoopEdge[] = [];
  /** Outgoing self loop edges. */
  private readonly outgoingSLEdges: SelfLoopEdge[] = [];

  constructor() {
    throw staged('SelfLoopPort');
  }

  getLPort(): never {
    throw staged('SelfLoopPort.getLPort');
  }

  hadOnlySelfLoops(): never {
    throw staged('SelfLoopPort.hadOnlySelfLoops');
  }

  isHidden(): never {
    throw staged('SelfLoopPort.isHidden');
  }

  setHidden(): never {
    throw staged('SelfLoopPort.setHidden');
  }

  /** Returns the list of incoming self loop edges. */
  getIncomingSLEdges(): SelfLoopEdge[] {
    return this.incomingSLEdges;
  }

  /** Returns the list of outgoing self loop edges. */
  getOutgoingSLEdges(): SelfLoopEdge[] {
    return this.outgoingSLEdges;
  }

  getSLNetFlow(): never {
    throw staged('SelfLoopPort.getSLNetFlow');
  }
}

function staged(member: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${member} is ported in mission 7g`);
}
