// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { Linker } from '../../../xtext/linking/impl/Linker.js';
import type { EReferenceInfo } from '../../../xtext/scoping/EReferenceInfo.js';
import {
  ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
  ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
  ELK_EDGE_SECTION__INCOMING_SECTIONS,
} from './ElkGraphReferences.js';

/** Set of opposite references that are _not_ considered by the ElkGraph text syntax. */
const OPPOSITE_REFS: ReadonlySet<EReferenceInfo> = new Set([
  ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
  ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
  ELK_EDGE_SECTION__INCOMING_SECTIONS,
]);

/**
 * The Xtext linker that leaves the opposite ends of the cross references alone when it clears an object.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/linking/ElkGraphLinker.xtend
 */
export class ElkGraphLinker extends Linker {
  protected override clearReference(obj: EObject, ref: EReferenceInfo): void {
    // Fix for #170, where otherwise eOpposites aren't loaded properly in elkt files
    if (!OPPOSITE_REFS.has(ref)) {
      super.clearReference(obj, ref);
    }
  }
}
