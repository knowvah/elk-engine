// SPDX-License-Identifier: EPL-2.0
// @staged 7g
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import type { LEdge } from '../../graph/LEdge.js';

/**
 * Staged class (L1): mission 7a ports only `getLEdge()` (read by `LGraphAdapters`); every other member, including the
 * constructor, throws until mission 7g ports the class.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopEdge.java
 */
export class SelfLoopEdge {
  /** The original edge represented by this instance. */
  private readonly lEdge!: LEdge;

  constructor() {
    throw staged('SelfLoopEdge');
  }

  /** Returns the original edge represented by this instance. */
  getLEdge(): LEdge {
    return this.lEdge;
  }

  getSLHyperLoop(): never {
    throw staged('SelfLoopEdge.getSLHyperLoop');
  }

  setSLHyperLoop(): never {
    throw staged('SelfLoopEdge.setSLHyperLoop');
  }

  getSLSource(): never {
    throw staged('SelfLoopEdge.getSLSource');
  }

  getSLTarget(): never {
    throw staged('SelfLoopEdge.getSLTarget');
  }

  isInline(): never {
    throw staged('SelfLoopEdge.isInline');
  }

  getLabelSide(): never {
    throw staged('SelfLoopEdge.getLabelSide');
  }
}

function staged(member: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${member} is ported in mission 7g`);
}
