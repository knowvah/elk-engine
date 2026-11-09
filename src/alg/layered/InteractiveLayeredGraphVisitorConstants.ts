// SPDX-License-Identifier: EPL-2.0
import { MAX_VALUE } from '../../java/lang/JavaInteger.js';

/**
 * Since nodes should not overlap and their width and height are only the width and height of the previous layout run, nodes
 * are placed with this spacing. It is a Java `int`: an `int * int` product wraps (`Int32.mul`), a `double + int` sum does not.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:69
 */
export const PSEUDO_POSITION_SPACING: number = MAX_VALUE;

/**
 * The index of the last layer: a `layerConstraint` of `LAST` is translated into a `layerChoiceConstraint` of this value.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:77
 */
export const LAST_LAYER_INDEX: number = MAX_VALUE;
