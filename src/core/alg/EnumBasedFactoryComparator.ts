// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessorFactory } from './ILayoutProcessorFactory.js';

/** An enumeration constant as far as this comparator is concerned. */
interface EnumLike {
  compareTo(other: EnumLike): number;
}

/**
 * Compares layout processor factories that are constants of the same enumeration by their ordinals.
 *
 * @typeParam G type of the graph the factories' processors work on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/EnumBasedFactoryComparator.java
 */
export class EnumBasedFactoryComparator<G> {
  compare(factory1: ILayoutProcessorFactory<G>, factory2: ILayoutProcessorFactory<G>): number {
    // The Java elkjs-exclude block (EnumBasedFactoryComparator.java:40-47) is dropped (P3, M2).
    // Callers guarantee that both factories are constants of one enumeration (Java throws otherwise).
    return (factory1 as unknown as EnumLike).compareTo(factory2 as unknown as EnumLike);
  }
}
