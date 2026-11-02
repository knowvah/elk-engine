// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';

/**
 * Property for the maximal priority of incoming edges. Java's private `LinearSegmentsNodePlacer.INPUT_PRIO`; the id is
 * kept because it appears in the `changed` lists of the oracle rows. C6 audit: the value is read as an `int` into
 * `Math.max` and compared with `>=`, never with `==` on a box, so plain numbers carry it.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/LinearSegmentsNodePlacer.java:172
 */
export const INPUT_PRIO: IProperty<number> = new Property<number>('linearSegments.inputPrio', 0);

/**
 * Property for the maximal priority of outgoing edges. Java's private `LinearSegmentsNodePlacer.OUTPUT_PRIO`; see
 * {@link INPUT_PRIO} for the id and the C6 audit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/LinearSegmentsNodePlacer.java:174
 */
export const OUTPUT_PRIO: IProperty<number> = new Property<number>('linearSegments.outputPrio', 0);
