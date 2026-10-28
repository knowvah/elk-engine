// SPDX-License-Identifier: EPL-2.0
// @staged 7g
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import type { LPort } from '../../graph/LPort.js';
import type { SelfLoopPort } from './SelfLoopPort.js';

/**
 * Staged class (L1): mission 7a ports only `getSLPortMap()` (read by `LGraphAdapters`); every other member, including
 * the private constructor and the `install` factory, throws until mission 7g ports the class. Return types of the
 * throwing members are `never` so that no further unported type is referenced.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopHolder.java
 */
export class SelfLoopHolder {
  /** Map of all self loop ports (Java `LinkedHashMap`: insertion order). */
  private readonly slPorts = new Map<LPort, SelfLoopPort>();

  private constructor() {
    throw staged('SelfLoopHolder');
  }

  static install(): never {
    throw staged('SelfLoopHolder.install');
  }

  static needsSelfLoopProcessing(): never {
    throw staged('SelfLoopHolder.needsSelfLoopProcessing');
  }

  getLNode(): never {
    throw staged('SelfLoopHolder.getLNode');
  }

  getSLHyperLoops(): never {
    throw staged('SelfLoopHolder.getSLHyperLoops');
  }

  /** Returns the map of ports to self loop ports. */
  getSLPortMap(): Map<LPort, SelfLoopPort> {
    return this.slPorts;
  }

  arePortsHidden(): never {
    throw staged('SelfLoopHolder.arePortsHidden');
  }

  setPortsHidden(): never {
    throw staged('SelfLoopHolder.setPortsHidden');
  }

  getRoutingSlotCount(): never {
    throw staged('SelfLoopHolder.getRoutingSlotCount');
  }
}

function staged(member: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${member} is ported in mission 7g`);
}
