// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import type { Pair } from '../../../../core/util/Pair.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { CGroup } from './CGroup.js';
import type { CGraph } from './CGraph.js';
import type { CNode } from './CNode.js';
import type { ICompactionAlgorithm } from './ICompactionAlgorithm.js';
import type { IConstraintCalculationAlgorithm } from './IConstraintCalculationAlgorithm.js';
import type { ILockFunction } from './ILockFunction.js';
import { DEFAULT_SPACING_HANDLER, type ISpacingsHandler } from './ISpacingsHandler.js';
import { LongestPathCompaction } from './LongestPathCompaction.js';
import { transformForDirectionChange } from './OneDimensionalCompactorDirections.js';
import { calculateConstraintsForCGroups, reverseConstraints } from './OneDimensionalCompactorConstraints.js';
import { calculateGroupOffsets, mirrorHitboxes, transposeHitboxes } from './OneDimensionalCompactorTransforms.js';
import { QuadraticConstraintCalculation } from './QuadraticConstraintCalculation.js';
import { ScanlineConstraintCalculator } from './ScanlineConstraintCalculator.js';

/** The simple class name used in the Java exception messages (`getClass().getSimpleName()`). */
const SIMPLE_NAME = 'OneDimensionalCompactor';

/**
 * Implements the compaction of a {@link CGraph}. This includes the creation of a constraint graph
 * and its subsequent compaction. The facade of the section modules `OneDimensionalCompactor*.ts` (P1).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/OneDimensionalCompactor.java
 */
export class OneDimensionalCompactor {
  /** Longest path-based compaction strategy. */
  static readonly LONGEST_PATH_COMPACTION: ICompactionAlgorithm = new LongestPathCompaction();
  /** Constraint calculation using a scanline technique. */
  static readonly SCANLINE_CONSTRAINTS: IConstraintCalculationAlgorithm = new ScanlineConstraintCalculator();
  /** Constraint calculation by pair-wise comparison of CNodes. */
  static readonly QUADRATIC_CONSTRAINTS: IConstraintCalculationAlgorithm = new QuadraticConstraintCalculation();

  /** Currently used compaction algorithm. */
  private compactionAlgorithm: ICompactionAlgorithm = OneDimensionalCompactor.LONGEST_PATH_COMPACTION;
  /** Currently used instance of the constraint calculation algorithm. */
  private constraintAlgorithm: IConstraintCalculationAlgorithm = OneDimensionalCompactor.SCANLINE_CONSTRAINTS;

  /** the {@link CGraph}. */
  cGraph: CGraph;
  /** A function evaluating for the passed direction if the node may be moved in that direction. */
  lockFun: ILockFunction | null = null;
  /** How spacings are determined. */
  spacingsHandler: ISpacingsHandler = DEFAULT_SPACING_HANDLER;

  /** compacting in this direction. */
  direction: Direction = Direction.UNDEFINED;
  /** flag indicating whether the {@link finish} method has been called. */
  private finished = false;

  /**
   * Initializes the fields of the {@link OneDimensionalCompactor}.
   *
   * @param cGraph the graph to compact
   */
  constructor(cGraph: CGraph) {
    this.cGraph = cGraph;

    // for any pre-specified groups, deduce the offset of the elements
    this.calculateGroupOffsets();

    // the compaction operates solely on CGroups,
    // thus, we wrap any plain CNodes into a CGroup
    for (const n of cGraph.cNodes) {
      if (n.cGroup === null) {
        CGroup.of().nodes(n).create(cGraph);
      }

      // remember the situation before compaction
      n.hitboxPreCompaction = new ElkRectangle(n.hitbox);
    }
  }

  /**
   * Sets the spacing handler to the passed handler. Not using this method results in the
   * {@link DEFAULT_SPACING_HANDLER} being used.
   *
   * @param handler the {@link ISpacingsHandler} to use.
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  setSpacingsHandler(handler: ISpacingsHandler): OneDimensionalCompactor {
    this.spacingsHandler = handler;
    return this;
  }

  /**
   * @param compactor the compaction algorithm to be used.
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  setCompactionAlgorithm(compactor: ICompactionAlgorithm): OneDimensionalCompactor {
    this.compactionAlgorithm = compactor;
    return this;
  }

  /**
   * @param theConstraintAlgorithm the constraintAlgorithm to set.
   * @returns this instance of {@link OneDimensionalCompactor}.
   */
  setConstraintAlgorithm(theConstraintAlgorithm: IConstraintCalculationAlgorithm): OneDimensionalCompactor {
    this.constraintAlgorithm = theConstraintAlgorithm;
    return this;
  }

  /**
   * Compacts the graph in the specified direction.
   *
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  compact(): OneDimensionalCompactor {
    if (this.finished) {
      throw new IllegalStateException(`The ${SIMPLE_NAME} instance has been finished already.`);
    }

    // if no direction was specified the direction defaults to LEFT
    if (this.direction === Direction.UNDEFINED) {
      this.changeDirection(Direction.LEFT);
    }

    // prepare compaction by resetting initial outDegree value for groups
    for (const g of this.cGraph.cGroups) {
      g.outDegree = g.outDegreeReal;
    }
    // ... and resetting nodes' positions
    for (const n of this.cGraph.cNodes) {
      n.startPos = Number.NEGATIVE_INFINITY;
    }

    // perform the actual compaction
    this.compactionAlgorithm.compact(this);

    return this;
  }

  /**
   * Call this method to indicate to the compacter that the compaction is finished now. No further
   * compaction steps are allowed. As a result, the direction is changed to the compactors natural
   * LEFT direction. In other words, if coordinates have been mirrored or transposed, they are
   * back to the original orientation now.
   *
   * @returns this instance of {@link OneDimensionalCompactor}. Note that the only use case after
   *         this call is to print debug output.
   */
  finish(): OneDimensionalCompactor {
    this.changeDirection(Direction.LEFT);
    this.finished = true;

    return this;
  }

  /**
   * Changes the direction for compaction by transforming the hitboxes.
   *
   * @param dir the new direction
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  changeDirection(dir: Direction): OneDimensionalCompactor {
    if (this.finished) {
      throw new IllegalStateException(`The ${SIMPLE_NAME} instance has been finished already.`);
    }

    // prohibits vertical compaction if the graph has edges, because vertical and horizontal
    // segments would interchange
    if (!this.cGraph.supports(dir)) {
      throw new RuntimeException(`The direction ${dir.toString()} is not supported by the CGraph instance.`);
    }

    // short-circuit if nothing todo
    if (dir === this.direction) {
      return this;
    }

    const oldDirection = this.direction;
    this.direction = dir;

    // executes required transformations and calculates constraints
    // if the graph is compacted in opposing directions the constraints are reversed instead of
    // being recalculated and CNodes are locked
    transformForDirectionChange(oldDirection, dir, {
      mirrorHitboxes: () => {
        this.mirrorHitboxes();
      },
      transposeHitboxes: () => {
        this.transposeHitboxes();
      },
      calculateConstraints: () => {
        this.calculateConstraints();
      },
      reverseConstraints: () => {
        this.reverseConstraints();
      },
    });

    return this;
  }

  /**
   * The two Java overloads `isLocked(CGroup, Direction)` and `isLocked(CNode, Direction)` are one
   * method, told apart by `instanceof`.
   *
   * For a {@link CGroup}: iterates the {@link CNode}s of this group and returns `true` as soon as a node is
   * locked in the passed `direction`. Otherwise returns `false`.
   *
   * For a {@link CNode}: `true` if the node may **not** move in the passed direction. `false` otherwise.
   *
   * @param groupOrNode the group or node
   * @param dir the direction
   * @returns whether the group or node is locked in the passed direction
   */
  isLocked(groupOrNode: CGroup | CNode, dir: Direction): boolean {
    if (groupOrNode instanceof CGroup) {
      for (const n of groupOrNode.cNodes) {
        if (this.isLocked(n, dir)) {
          return true;
        }
      }
      return false;
    }
    if (this.lockFun !== null) {
      return this.lockFun.isLocked(groupOrNode, dir);
    }
    return false;
  }

  /**
   * Sets a function specifying locks. May be `null` in which case all nodes
   * are allowed to move arbitrarily.
   *
   * @param fun the lock function
   * @returns this instance of {@link OneDimensionalCompactor}.
   */
  setLockFunction(fun: ILockFunction | null): OneDimensionalCompactor {
    this.lockFun = fun;
    return this;
  }

  /**
   * Initiates a recalculation of all constraints. Usually this method does not have to be called
   * manually since {@link changeDirection} either recalculates or reversed
   * constraints as necessary.
   *
   * @returns this instance of a {@link OneDimensionalCompactor}.
   */
  forceConstraintsRecalculation(): OneDimensionalCompactor {
    this.calculateConstraints();
    return this;
  }

  /**
   * For each {@link CGroup} g of the {@link CGroup} to be compacted, calculates the offsets of
   * g's nodes. It shouldn't be necessary to call this method in the common case since it's either
   * called by the constructor or for certain direction changes in {@link changeDirection}.
   *
   * The method assures that a group's `reference` is always the left-most
   * element (i.e. the one with the lowest x-coordinate). As a consequence, all offsets
   * (in x) are positive.
   *
   * @returns this instance of a {@link OneDimensionalCompactor}.
   */
  calculateGroupOffsets(): OneDimensionalCompactor {
    calculateGroupOffsets(this.cGraph);
    return this;
  }

  //////////////////////////////////////////// PRIVATE API ////////////////////////////////////////////

  /** Mirrors hitboxes horizontally. */
  private mirrorHitboxes(): void {
    mirrorHitboxes(this.cGraph);
  }

  /** Transposes hitboxes. */
  private transposeHitboxes(): void {
    transposeHitboxes(this.cGraph);
  }

  private calculateConstraints(): void {
    // resetting constraints
    for (const cNode of this.cGraph.cNodes) {
      cNode.constraints.length = 0;
    }

    // apply any precalculated constraints
    let cstrs: Pair<CNode, CNode>[];
    if (this.direction.isHorizontal()) {
      cstrs = this.cGraph.predefinedHorizontalConstraints;
    } else {
      cstrs = this.cGraph.predefinedVerticalConstraints;
    }
    cstrs.forEach((p) => {
      if (this.direction === Direction.LEFT || this.direction === Direction.UP) {
        (p.getFirst() as CNode).constraints.push(p.getSecond() as CNode);
      } else {
        (p.getSecond() as CNode).constraints.push(p.getFirst() as CNode);
      }
    });

    // run the specified constraint calculation algorithm
    this.constraintAlgorithm.calculateConstraints(this);

    // update the "external" constraints of the groups
    calculateConstraintsForCGroups(this.cGraph);
  }

  /**
   * If the graph is compacted twice in opposing directions, the constraints can be reversed to
   * avoid recalculating them. Also the {@link CNode}s' starting position is reset to be ready for
   * another compaction.
   */
  private reverseConstraints(): void {
    reverseConstraints(this.cGraph);
  }
}
