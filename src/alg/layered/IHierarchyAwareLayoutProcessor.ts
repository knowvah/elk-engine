// SPDX-License-Identifier: EPL-2.0

/**
 * Marker interface to mark processors that access the complete hierarchy. In this case, when
 * `LayeredOptions.HIERARCHY_HANDLING` is set to `HierarchyHandling.INCLUDE_CHILDREN`, all the processing will be
 * executed recursively for all processors preceding this one and this processor will have access to the root graph.
 *
 * Java tests `instanceof IHierarchyAwareLayoutProcessor`; a TS interface vanishes at run time, so implementers carry
 * the {@link HIERARCHY_AWARE} brand and callers use {@link isHierarchyAwareLayoutProcessor} (translation-rules §6.6).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/IHierarchyAwareLayoutProcessor.java
 */
export interface IHierarchyAwareLayoutProcessor {
  readonly [HIERARCHY_AWARE]: true;
}

/** The brand an {@link IHierarchyAwareLayoutProcessor} implementation declares. */
export const HIERARCHY_AWARE: unique symbol = Symbol('IHierarchyAwareLayoutProcessor');

/** Java `o instanceof IHierarchyAwareLayoutProcessor`. */
export function isHierarchyAwareLayoutProcessor(o: unknown): o is IHierarchyAwareLayoutProcessor {
  return (
    typeof o === 'object' && o !== null && (o as Partial<IHierarchyAwareLayoutProcessor>)[HIERARCHY_AWARE] === true
  );
}
