// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../math/KVector.js';
import type { JavaInterfaceToken } from '../../java/lang/JavaClass.js';
import { javaInterface } from '../../java/lang/JavaClass.js';

/**
 * Knows how to resize a label to a given target width.
 *
 * During layout, a layout algorithm may discover that the size of a label considerably increases
 * the size of a diagram. If the label (or a parent) has a label manager attached, the manager may
 * be called to try and shorten the label to a given target width. The new size is returned to the
 * layout algorithm to work with. Of course, the changes to the label's text need to actually be
 * applied after automatic layout. How that works depends on the visualization framework used.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/labels/ILabelManager.java
 */
export interface ILabelManager {
  /**
   * Tries to shorten the label to keep it narrower than the given target width. This may increase
   * the label's height. The new dimensions of the label are returned for the layout algorithm to
   * work with.
   *
   * @param label the label to shorten
   * @param targetWidth the width the label's new dimensions should try not to exceed
   * @returns the label's dimensions after shortening or `null` if the label has not been shortened
   */
  manageLabelSize(label: unknown, targetWidth: number): KVector | null;
}

/** The class object (`ILabelManager.class`) of the interface. */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ILabelManager: JavaInterfaceToken = javaInterface('ILabelManager');
