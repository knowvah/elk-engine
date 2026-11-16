// SPDX-License-Identifier: EPL-2.0
import type { IComponent } from '../compaction/components/IComponent.js';
import type { IConnectedComponents } from '../compaction/components/IConnectedComponents.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';

/**
 * Implementation of the {@link IConnectedComponents} interface. Holds the components and whether the
 * overall graph contains external edges.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:593
 */
export class ComponentsCompactorInternalConnectedComponents implements IConnectedComponents<LNode, Set<LEdge>> {
  private components: IComponent<LNode, Set<LEdge>>[] = [];
  private containsExternalPorts = false;

  [Symbol.iterator](): Iterator<IComponent<LNode, Set<LEdge>>> {
    return this.components[Symbol.iterator]();
  }

  getComponents(): IComponent<LNode, Set<LEdge>>[] {
    return this.components;
  }

  isContainsExternalExtensions(): boolean {
    return this.containsExternalPorts;
  }
}
