// SPDX-License-Identifier: EPL-2.0
import type { IComponent } from './IComponent.js';

/**
 * A set of {@link IComponent}s.
 *
 * @typeParam N the type of the contained nodes
 * @typeParam E the type of the contained edges
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/IConnectedComponents.java
 */
export interface IConnectedComponents<N, E> extends Iterable<IComponent<N, E>> {
  /** @returns the components */
  getComponents(): IComponent<N, E>[];

  /** @returns whether any of the components contains external extensions */
  isContainsExternalExtensions(): boolean;
}
