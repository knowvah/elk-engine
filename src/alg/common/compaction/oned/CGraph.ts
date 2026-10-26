// SPDX-License-Identifier: EPL-2.0
import type { Direction } from '../../../../core/options/Direction.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import type { Pair } from '../../../../core/util/Pair.js';
import type { CGroup } from './CGroup.js';
import type { CNode } from './CNode.js';

/**
 * Representation of a constraint graph that can be compacted using the {@link OneDimensionalCompactor}.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/CGraph.java
 */
export class CGraph {
  // Variables are public for convenience reasons
  /** the list of {@link CNode}s modeling the constraints in this graph. */
  cNodes: CNode[] = [];
  /** groups of elements that are supposed to stay in the configuration they are. */
  cGroups: CGroup[] = [];
  /** the directions that are supported for compaction. */
  private readonly supportedDirections: EnumSet<Direction>;

  /**
   * static constraints between pairs of {@link CNode}s that are to be added by the
   * {@link OneDimensionalCompactor}. Depending on the compaction direction, the constraints may be
   * applied in reverse.
   */
  predefinedHorizontalConstraints: Pair<CNode, CNode>[] = [];
  /**
   * static constraints between pairs of {@link CNode}s that are to be added by the
   * {@link OneDimensionalCompactor}. Depending on the compaction direction, the constraints may be
   * applied in reverse.
   */
  predefinedVerticalConstraints: Pair<CNode, CNode>[] = [];

  /**
   * Constructor sets the supported directions.
   *
   * @param supportedDirections the directions that are supported for compaction
   */
  constructor(supportedDirections: EnumSet<Direction>) {
    this.supportedDirections = supportedDirections;
  }

  /**
   * If the {@link CGraph} supports compaction in the direction specified by the parameter.
   *
   * @param direction the direction to check
   * @returns if compaction is supported
   */
  supports(direction: Direction): boolean {
    return this.supportedDirections.contains(direction);
  }
}
