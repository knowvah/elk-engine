// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { Property } from '../../graph/properties/Property.js';
import type { OutlineNode } from './p2relative/OutlineNode.js';

/**
 * Container for property definitions for the VertiFlex algorithm. The Java private constructor has no TypeScript
 * counterpart; the class only holds statics.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/InternalProperties.java
 */
export class InternalProperties {
  /** Defines the left outline of this subtree. */
  static readonly LEFT_OUTLINE: IProperty<OutlineNode> = new Property<OutlineNode>('LEFT_OUTLINE');

  /** Defines the right outline of this subtree. */
  static readonly RIGHT_OUTLINE: IProperty<OutlineNode> = new Property<OutlineNode>('RIGHT_OUTLINE');

  /** Defines the maximum depth of outlines. This is the lowest point of the outline in the tree layout. */
  static readonly OUTLINE_MAX_DEPTH: IProperty<number> = new Property<number>('OUTLINE_MAX_DEPTH');

  /** Defines the canvas of the tree. */
  static readonly MIN_X: IProperty<number> = new Property<number>('MIN_X');

  /** Defines the canvas of the tree. */
  static readonly MAX_X: IProperty<number> = new Property<number>('MAX_X');

  /** Defines the canvas of the tree. */
  static readonly MIN_Y: IProperty<number> = new Property<number>('MIN_Y');

  /** Defines the canvas of the tree. */
  static readonly MAX_Y: IProperty<number> = new Property<number>('MAX_Y');

  /** The root node of the graph. */
  static readonly ROOT_NODE: IProperty<ElkNode> = new Property<ElkNode>('root');

  /** Defines the bendpoint of an edge. */
  static readonly EDGE_BEND_HEIGHT: IProperty<number> = new Property<number>('EDGE_BEND_HEIGHT');

  /** Stores the model order of nodes. Smaller values come before larger values. */
  static readonly NODE_MODEL_ORDER: IProperty<number> = new Property<number>('Node Model Order');
}
