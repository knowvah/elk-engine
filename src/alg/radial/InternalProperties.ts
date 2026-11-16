// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { Property } from '../../graph/properties/Property.js';

/**
 * The internal properties of the radial layouter. Properties which are used throughout the code but doesn't need to be
 * public are stored here.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/InternalProperties.java
 */
export class InternalProperties {
  /** The root node of the graph. */
  static readonly ROOT_NODE: IProperty<ElkNode> = new Property<ElkNode>('root');

  private constructor() {}
}
