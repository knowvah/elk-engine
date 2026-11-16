// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { Random } from '../../../java/util/Random.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TNode } from '../graph/TNode.js';

/**
 * Property definitions for the T layouter. A Java `Property<Double>` default `0d` is the number 0; `List<TEdge>`
 * (`new LinkedList`) stays a `LinkedList` and `List<TNode>` (`new ArrayList`) is an array (AD-10).
 *
 * @author sor
 * @author sgu
 * @author jnc
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/options/InternalProperties.java
 */
export class InternalProperties {
  /** The original object from which a graph element was created. */
  static readonly ORIGIN: IProperty<unknown> = new Property<unknown>('origin');

  /** Random number generator for the algorithm. */
  static readonly RANDOM: IProperty<Random> = new Property<Random>('random');

  /** The longest path length of a node in the nesting tree of a compound graph. */
  static readonly DEPTH: IProperty<number> = new Property<number>('DEPTH', 0);

  /** The maximal fan out of a node in the nesting tree of a compound graph. */
  static readonly FAN: IProperty<number> = new Property<number>('FAN', 0);

  /** The number of descendants of the node. */
  static readonly DESCENDANTS: IProperty<number> = new Property<number>('DESCENDANTS', 0);

  /** This is a root. */
  static readonly ROOT: IProperty<boolean> = new Property<boolean>('ROOT', false);

  /** the lefthand node at the same level. */
  static readonly LEFTNEIGHBOR: IProperty<TNode | null> = new Property<TNode | null>('LEFTNEIGHBOR', null);

  /** the righthand node at the same level. */
  static readonly RIGHTNEIGHBOR: IProperty<TNode | null> = new Property<TNode | null>('RIGHTNEIGHBOR', null);

  /** the lefthand node at the same level with the same parent. */
  static readonly LEFTSIBLING: IProperty<TNode | null> = new Property<TNode | null>('LEFTSIBLING', null);

  /** the righthand node with the same parent. */
  static readonly RIGHTSIBLING: IProperty<TNode | null> = new Property<TNode | null>('RIGHTSIBLING', null);

  /** This is a dummy node. */
  static readonly DUMMY: IProperty<boolean> = new Property<boolean>('DUMMY', false);

  /** The level out of a node in the nesting tree of a compound graph. */
  static readonly LEVEL: IProperty<number> = new Property<number>('LEVEL', 0);

  /** A list containing all edges that were marked to remove in the treeing phase. */
  static readonly REMOVABLE_EDGES: IProperty<LinkedList<TEdge>> = new Property<LinkedList<TEdge>>(
    'REMOVABLE_EDGES',
    new LinkedList<TEdge>(),
  );

  /** The x coordinate of the node in the level. */
  static readonly XCOOR: IProperty<number> = new Property<number>('XCOOR', 0);

  /** The y coordinate of the node in the level. */
  static readonly YCOOR: IProperty<number> = new Property<number>('YCOOR', 0);

  /** The y height of the nodes level. */
  static readonly LEVELHEIGHT: IProperty<number> = new Property<number>('LEVELHEIGHT', 0);

  /** The min position of the nodes level in the current layout direction. */
  static readonly LEVELMIN: IProperty<number> = new Property<number>('LEVELMIN', 0);

  /** The max position of the nodes level in the current layout direction. */
  static readonly LEVELMAX: IProperty<number> = new Property<number>('LEVELMAX', 0);

  /** The min x position of the nodes within this graph. */
  static readonly GRAPH_XMIN: IProperty<number> = new Property<number>('GRAPH_XMIN', 0);

  /** The min y position of the nodes within this graph. */
  static readonly GRAPH_YMIN: IProperty<number> = new Property<number>('GRAPH_YMIN', 0);

  /** The maximum x coordinate any nodes reaches with its position and size within this graph. */
  static readonly GRAPH_XMAX: IProperty<number> = new Property<number>('GRAPH_XMAX', 0);

  /** The maximum y coordinate any nodes reaches with its position and size within this graph. */
  static readonly GRAPH_YMAX: IProperty<number> = new Property<number>('GRAPH_YMAX', 0);

  /** Is set to true by the compaction processor if the nodes level changed. */
  static readonly COMPACT_LEVEL_ASCENSION: IProperty<boolean> = new Property<boolean>('COMPACT_LEVEL_ASCENSION', false);

  /** Is set to the lowest dependent node if there is one. */
  static readonly COMPACT_CONSTRAINTS: IProperty<TNode[]> = new Property<TNode[]>('COMPACT_CONSTRAINTS', []);

  /**
   * Id of of a real node. This Indicates the block by the most significant letters and level of the node by the
   * length of the string.
   */
  static readonly ID: IProperty<string> = new Property<string>('ID', '');

  /** Is the node a root of a tree. */
  static readonly POSITION: IProperty<number> = new Property<number>('POSITION', 0);

  /** A preliminary x-coordinate. */
  static readonly PRELIM: IProperty<number> = new Property<number>('PRELIM', 0);

  /** A modifier x-coordinate. */
  static readonly MODIFIER: IProperty<number> = new Property<number>('MODIFIER', 0);

  /** Upper left corner of the graph's bounding box. */
  static readonly BB_UPLEFT: IProperty<KVector | null> = new Property<KVector | null>('boundingBox.upLeft');

  /** Lower right corner of the graph's bounding box. */
  static readonly BB_LOWRIGHT: IProperty<KVector | null> = new Property<KVector | null>('boundingBox.lowRight');

  /** Hidden default constructor. */
  private constructor() {}
}
