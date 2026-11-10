// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../../../core/util/Pair.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import type { ICompactionAlgorithm } from './algs/ICompactionAlgorithm.js';
import type { IConstraintCalculationAlgorithm } from './algs/IConstraintCalculationAlgorithm.js';
import { LongestPathCompaction } from './algs/LongestPathCompaction.js';
import { QuadraticConstraintCalculation } from './algs/QuadraticConstraintCalculation.js';
import { ScanlineConstraintCalculator } from './algs/ScanlineConstraintCalculator.js';
import type { CGraph } from './CGraph.js';
import { CGroup } from './CGroup.js';
import type { CNode } from './CNode.js';
import { DEFAULT_SPACING_HANDLER, type ISpacingsHandler } from './ISpacingsHandler.js';
import { calculateConstraintsForCGroups, reverseConstraints } from './OneDimensionalCompactorConstraints.js';
import { drawHitboxes } from './OneDimensionalCompactorDebug.js';
import { transformForDirectionChange } from './OneDimensionalCompactorDirections.js';
import { calculateGroupOffsets, mirrorHitboxes, transposeHitboxes } from './OneDimensionalCompactorTransforms.js';

/** The simple class name used in the Java exception messages (`getClass().getSimpleName()`). */
const SIMPLE_NAME = 'OneDimensionalCompactor';

/**
 * A function that sets the {@link CNode.reposition} flag according to the direction (Java
 * `Function<Pair<CNode, Direction>, Boolean>`).
 */
export type LockingStrategy = (pair: Pair<CNode, Direction>) => boolean;

/**
 * Implements the compaction of a {@link CGraph}. This includes the creation of a constraint graph
 * and its subsequent compaction. The facade of the section modules `OneDimensionalCompactor*.ts`
 * (the 500-line and complexity limits split the Java class there).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/OneDimensionalCompactor.java
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
  /** compacting in this direction. */
  direction: Direction = Direction.UNDEFINED;
  /** a function that sets the {@link CNode.reposition} flag according to the direction. */
  private lockingStrategy: LockingStrategy = null as never;
  /** flag indicating whether the {@link finish} method has been called. */
  private finished = false;
  /** How spacings are determined. */
  spacingsHandler: ISpacingsHandler<CNode> = DEFAULT_SPACING_HANDLER;

  /**
   * Initializes the fields of the {@link OneDimensionalCompactor}.
   *
   * @param cGraph the graph to compact
   */
  constructor(cGraph: CGraph) {
    this.cGraph = cGraph;
    // the default locking strategy locks CNodes if they are not constrained
    this.setLockingStrategy((pair) => !(((pair.getFirst() as CNode).cGroup as CGroup).outDegree === 0));

    // for any pre-specified groups, deduce the offset of the elements
    this.calculateGroupOffsets();

    // the compaction operates solely on CGroups,
    // thus, we wrap any plain CNodes into a CGroup
    for (const n of cGraph.cNodes) {
      if (n.cGroup === null) {
        const group = new CGroup(n);
        cGraph.cGroups.push(group);
      }
    }
  }

  /**
   * Sets the spacing handler to the passed handler. Not using this method results in the
   * {@link DEFAULT_SPACING_HANDLER} being used.
   *
   * @param handler the {@link ISpacingsHandler} to use.
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  setSpacingsHandler(handler: ISpacingsHandler<CNode>): OneDimensionalCompactor {
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

    // prepare compaction by setting initial outDegree value for groups
    // iterates once over all constraints
    for (const g of this.cGraph.cGroups) {
      g.outDegree = 0;
    }

    for (const n of this.cGraph.cNodes) {
      // reset any previously calculated start positions
      n.startPos = Number.NEGATIVE_INFINITY;

      for (const incN of n.constraints) {
        (incN.cGroup as CGroup).outDegree++;
      }
    }

    // perform the actual compaction
    this.compactionAlgorithm.compact(this);

    // remove all locks
    for (const node of this.cGraph.cNodes) {
      node.reposition = true;
    }

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
   * Sets the function to lock cGraph.cNodes. Does not apply the strategy yet, to do so, call
   * {@link applyLockingStrategy}.
   *
   * @param strategy a function that returns the required state for the reposition flag of a
   *            {@link CNode} according to the direction
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  setLockingStrategy(strategy: LockingStrategy): OneDimensionalCompactor {
    this.lockingStrategy = strategy;
    return this;
  }

  /**
   * Locks nodes according to the currently set locking strategy and the passed direction (the
   * current direction when omitted; Java overloads `applyLockingStrategy()` and
   * `applyLockingStrategy(Direction)`). After the next call to {@link compact}, all locks are removed
   * again.
   *
   * @param dir the {@link Direction} for the locks to be set.
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  applyLockingStrategy(dir: Direction = this.direction): OneDimensionalCompactor {
    for (const cGroup of this.cGraph.cGroups) {
      cGroup.reposition = true;
    }

    for (const cNode of this.cGraph.cNodes) {
      cNode.reposition = this.lockingStrategy(Pair.of(cNode, dir));

      (cNode.cGroup as CGroup).reposition &&= this.lockingStrategy(Pair.of(cNode, dir));
    }

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
   * The method assures that a groups `reference` is always the left-most
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

  /* -----------------------------------------------------------------------------------------------
   * ////////////////////////////////////////// DEBUGGING //////////////////////////////////////////
   * ----------------------------------------------------------------------------------------------- */

  // elkjs-exclude-start
  /**
   * For debugging. Writes hitboxes to svg.
   *
   * @param monitor the monitor that logs the svg
   * @param name filename
   * @returns this instance of {@link OneDimensionalCompactor}
   */
  drawHitboxes(monitor: IElkProgressMonitor, name: string): OneDimensionalCompactor {
    drawHitboxes(this.cGraph, monitor, name);
    return this;
  }
  // elkjs-exclude-end
}
