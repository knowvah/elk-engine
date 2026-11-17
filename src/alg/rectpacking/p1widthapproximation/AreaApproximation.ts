// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { EList } from '../../../emf/common/util/EList.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { OptimizationGoal } from '../options/OptimizationGoal.js';
import { DrawingData } from '../util/DrawingData.js';
import { DrawingDataDescriptor } from '../util/DrawingDataDescriptor.js';
import { AreaFilter } from './AreaFilter.js';
import { AspectRatioFilter } from './AspectRatioFilter.js';
import type { BestCandidateFilter } from './BestCandidateFilter.js';
import { Calculations } from './Calculations.js';
import { ScaleMeasureFilter } from './ScaleMeasureFilter.js';

/**
 * The arguments of `calcValuesForOpt` that are the same for the four placement options of one rectangle (Java passes
 * them one by one; the repository limit is five parameters).
 */
interface PlacementContext {
  readonly toPlace: ElkNode;
  readonly lastPlaced: ElkNode;
  /** The current drawing containing width and height, besides others. */
  readonly drawing: DrawingData;
  /** The already placed rectangles. */
  readonly placedRects: readonly ElkNode[];
  readonly nodeNodeSpacing: number;
}

/** The position of `toPlace` and the size of the drawing after placing it (the locals of `calcValuesForOpt`). */
interface Candidate {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The four candidate drawings of one placement step (`opt1` to `opt4` of Java's `findBestCandidate`). */
type CandidateDrawings = readonly [DrawingData, DrawingData, DrawingData, DrawingData];

const isBelow = (option: DrawingDataDescriptor): boolean =>
  option === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_BELOW ||
  option === DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_BELOW;

const isRight = (option: DrawingDataDescriptor): boolean =>
  option === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT ||
  option === DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT;

const isLastPlaced = (option: DrawingDataDescriptor): boolean =>
  option === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT ||
  option === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_BELOW;

/**
 * The dereference of `findBestCandidate`'s result at `toPlace.setX(bestOpt.getNextXcoordinate())` (AreaApproximation.java:98):
 * Java throws a NullPointerException when no best option was found, the port a TypeError (elkgraph-model D10).
 */
function dereferenceBestOption(bestOpt: DrawingData | null): DrawingData {
  if (bestOpt === null) {
    throw new TypeError('Cannot invoke "DrawingData.getNextXcoordinate()" because "bestOpt" is null');
  }
  return bestOpt;
}

/**
 * Class that handles the first iteration of the algorithm, producing an approximated bounding box for the packing.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
 */
export class AreaApproximation {
  /** Desired aspect ratio. */
  private aspectRatio: number;
  /** Optimization goal. */
  private goal: OptimizationGoal;
  /** Shift when placing behind or below the last placed rectangle. */
  private lpShift: boolean;

  /**
   * Constructs an object that the first iteration can be executed on.
   *
   * @param aspectRatio The desired aspect ratio.
   * @param goal The optimization goal.
   * @param lpShift Whether a shift should happen after placing near the last placed node.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  constructor(aspectRatio: number, goal: OptimizationGoal, lpShift: boolean) {
    this.aspectRatio = aspectRatio;
    this.goal = goal;
    this.lpShift = lpShift;
  }

  /**
   * Calculates a drawing for the given rectangles according options set in the object creation of
   * {@link AreaApproximation}. This method also sets the coordinates for the rectangles.
   *
   * @param rectangles The rectangles to place.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @returns A drawing calculated by this methods algorithm.
   * @throws BasicIndexOutOfBoundsException if `rectangles` is empty (`get(0)`, AreaApproximation.java:70).
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  approxBoundingBox(rectangles: EList<ElkNode>, nodeNodeSpacing: number, padding: ElkPadding): DrawingData {
    // Place first box.
    const firstRect = rectangles.get(0);
    firstRect.setX(0);
    firstRect.setY(0);
    const placedRects: ElkNode[] = [];
    placedRects.push(firstRect);
    let lastPlaced = firstRect;
    let currentValues = new DrawingData(
      this.aspectRatio,
      firstRect.getWidth(),
      firstRect.getHeight(),
      DrawingDataDescriptor.WHOLE_DRAWING,
    );

    // Place the other boxes.
    for (let rectangleIdx = 1; rectangleIdx < rectangles.size(); rectangleIdx++) {
      const toPlace = rectangles.get(rectangleIdx);
      const context: PlacementContext = { toPlace, lastPlaced, drawing: currentValues, placedRects, nodeNodeSpacing };

      // Determine drawing metrics for different candidate positions/placement options
      const opts = this.calcValuesForAllOpts(context);

      const bestOpt = dereferenceBestOption(this.findBestCandidate(opts, toPlace, lastPlaced, padding));

      toPlace.setX(bestOpt.getNextXcoordinate());
      toPlace.setY(bestOpt.getNextYcoordinate());
      bestOpt.setPlacementOption(DrawingDataDescriptor.WHOLE_DRAWING);
      currentValues = bestOpt;
      lastPlaced = toPlace;
      placedRects.push(toPlace);
    }

    return currentValues;
  }

  /**
   * The four `calcValuesForOpt` calls of `approxBoundingBox` (opt1 to opt4, in this order), one per placement option.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private calcValuesForAllOpts(context: PlacementContext): CandidateDrawings {
    const opt1 = this.calcValuesForOpt(DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT, context);
    const opt2 = this.calcValuesForOpt(DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_BELOW, context);
    const opt3 = this.calcValuesForOpt(DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT, context);
    const opt4 = this.calcValuesForOpt(DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_BELOW, context);
    return [opt1, opt2, opt3, opt4];
  }

  /**
   * Determines according to the selected optimization goal, which option out of the given ones is the best.
   *
   * @param opts The options lastPlaced right, lastPlaced bottom, complete drawing right and complete drawing below
   *             (`opt1` to `opt4` in Java).
   * @param toPlace The rectangle to be placed on drawing area.
   * @param lastPlaced The rectangle that was placed last on the drawing area.
   * @returns Returns the best option out of the given ones or null, if there is no best option found.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private findBestCandidate(
    opts: CandidateDrawings,
    toPlace: ElkNode,
    lastPlaced: ElkNode,
    padding: ElkPadding,
  ): DrawingData | null {
    let candidates: DrawingData[] = [...opts];
    const filters = this.filtersForGoal();
    if (filters === null) {
      // Java: `filters` stays null for an unknown goal and the for-each dereferences it (a NullPointerException).
      throw new TypeError('Cannot invoke "java.util.List.iterator()" because "filters" is null');
    }

    // Filter the candidates according to the order of the filters using the strategy pattern.
    for (const filter of filters) {
      if (candidates.length > 1) {
        candidates = filter.filterList(candidates, this.aspectRatio, padding);
      }
    }

    // Only one candidate remains.
    if (candidates.length === 1) {
      return candidates[candidates.length - 1]!;
    }
    // Two or more options have the same value for every benchmark. These special cases are caught in the following.
    // If more than two options remain, for example for a rectangle without a size and no spacing between the
    // nodes, the first two are compared.
    if (candidates.length >= 2) {
      return this.checkSpecialCases(candidates[0]!, candidates[1]!, lastPlaced, toPlace);
    }
    return null;
  }

  /**
   * Sets the order of the filters according to the given goal (the `switch (goal)` of `findBestCandidate`).
   *
   * @returns The filters in order, or null for a goal without a case.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private filtersForGoal(): BestCandidateFilter[] | null {
    switch (this.goal) {
      // Sets the order of the filters according to the given goal.
      case OptimizationGoal.MAX_SCALE_DRIVEN:
        return [new ScaleMeasureFilter(), new AreaFilter(), new AspectRatioFilter()];
      case OptimizationGoal.ASPECT_RATIO_DRIVEN:
        return [new AspectRatioFilter(), new AreaFilter(), new ScaleMeasureFilter()];
      case OptimizationGoal.AREA_DRIVEN:
        return [new AreaFilter(), new ScaleMeasureFilter(), new AspectRatioFilter()];
      default:
        return null;
    }
  }

  /**
   * Checks the two options and their possible combinations after being sorted out be the packing strategies.
   * Determines the best option depending on the options given.
   *
   * @param drawing1 A drawing to compare.
   * @param drawing2 A drawing to compare.
   * @param lastPlaced The rectangle that was last placed before the two drawings were calculated.
   * @param toPlace The rectangle that was newly placed in the two drawings.
   * @returns The better drawing out of the two.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private checkSpecialCases(
    drawing1: DrawingData,
    drawing2: DrawingData,
    lastPlaced: ElkNode,
    toPlace: ElkNode,
  ): DrawingData {
    const firstOpt = drawing1.getPlacementOption();
    const secondOpt = drawing2.getPlacementOption();

    const firstOptLPBorCDB = isBelow(firstOpt);
    const secondOptLPBorCDB = isBelow(secondOpt);

    const firstOptLPRorCDR = isRight(firstOpt);
    const secondOptLPRorCDR = isRight(secondOpt);

    const firstOptLPRorLPB = isLastPlaced(firstOpt);
    const secondOptLPRorLPB = isLastPlaced(secondOpt);

    if (firstOptLPBorCDB && secondOptLPBorCDB) {
      // If placing it LPB and WDB produces the same values. Take WDB.
      if (drawing1.getPlacementOption() === DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_BELOW) {
        return drawing1;
      }
      return drawing2;
    } else if (firstOptLPRorCDR && secondOptLPRorCDR) {
      // If placing it LPR and WDR produces the same values. Take WDR.
      if (drawing1.getPlacementOption() === DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT) {
        return drawing1;
      }
      return drawing2;
    } else if (firstOptLPRorLPB && secondOptLPRorLPB) {
      return this.chooseLastPlacedOption(drawing1, drawing2, lastPlaced, toPlace);
    }

    return drawing1;
  }

  /**
   * The third branch of `checkSpecialCases`: if LPR AND LPB produce the same values, take the option producing less
   * area with the last placed rectangle and rectangle to place.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private chooseLastPlacedOption(
    drawing1: DrawingData,
    drawing2: DrawingData,
    lastPlaced: ElkNode,
    toPlace: ElkNode,
  ): DrawingData {
    let lprOpt: DrawingData;
    let lpbOpt: DrawingData;
    if (drawing1.getPlacementOption() === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT) {
      lprOpt = drawing1;
      lpbOpt = drawing2;
    } else {
      lprOpt = drawing2;
      lpbOpt = drawing1;
    }

    const areaLPR = Calculations.calculateAreaLPR(lastPlaced, toPlace, lprOpt);
    const areaLPB = Calculations.calculateAreaLPB(lastPlaced, toPlace, lpbOpt);

    if (areaLPR <= areaLPB) {
      if (drawing1.getPlacementOption() === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT) {
        return drawing1;
      }
      return drawing2;
    }
    if (drawing1.getPlacementOption() === DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_BELOW) {
      return drawing1;
    }
    return drawing2;
  }

  /**
   * Calculates drawing data for the given parameters including x and y coordinate for the rectangle toPlace.
   *
   * @param option The placement option the values are calculated for.
   * @param context The rectangle to be placed, the rectangle that was placed last, the current drawing, the already
   *                placed rectangles and the spacing between two nodes (separate parameters in Java).
   * @returns An {@link DrawingData} object containing the values after the rectangle would be placed.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private calcValuesForOpt(option: DrawingDataDescriptor, context: PlacementContext): DrawingData {
    let candidate: Candidate;
    switch (option) {
      case DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT:
        candidate = this.lastPlacedRight(context);
        break;
      case DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_BELOW:
        candidate = this.lastPlacedBelow(context);
        break;
      case DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT:
        candidate = this.wholeDrawingRight(context);
        break;
      case DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_BELOW:
        candidate = this.wholeDrawingBelow(context);
        break;
      default:
        throw new IllegalArgumentException('IllegalPlacementOption.');
    }

    // LPR and LPB have more values to be set in newDrawing.
    return new DrawingData(this.aspectRatio, candidate.width, candidate.height, option, candidate.x, candidate.y);
  }

  /**
   * The `CANDIDATE_POSITION_LAST_PLACED_RIGHT` case of `calcValuesForOpt`.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private lastPlacedRight(c: PlacementContext): Candidate {
    const drawingWidth = c.drawing.getDrawingWidth();
    const drawingHeight = c.drawing.getDrawingHeight();
    const x = c.lastPlaced.getX() + c.lastPlaced.getWidth() + c.nodeNodeSpacing;
    let y: number;
    if (this.lpShift) {
      y = Calculations.calculateYforLPR(x, c.placedRects, c.lastPlaced, c.nodeNodeSpacing);
    } else {
      y = c.lastPlaced.getY();
    }

    const width = Calculations.getWidthLPRorLPB(drawingWidth, x, c.toPlace.getWidth());
    const height = Calculations.getHeightLPRorLPB(drawingHeight, y, c.toPlace.getHeight());
    return { x, y, width, height };
  }

  /**
   * The `CANDIDATE_POSITION_LAST_PLACED_BELOW` case of `calcValuesForOpt`.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private lastPlacedBelow(c: PlacementContext): Candidate {
    const drawingWidth = c.drawing.getDrawingWidth();
    const drawingHeight = c.drawing.getDrawingHeight();
    const y = c.lastPlaced.getY() + c.lastPlaced.getHeight() + c.nodeNodeSpacing;
    let x: number;
    if (this.lpShift) {
      x = Calculations.calculateXforLPB(y, c.placedRects, c.lastPlaced, c.nodeNodeSpacing);
    } else {
      x = c.lastPlaced.getX();
    }

    const width = Calculations.getWidthLPRorLPB(drawingWidth, x, c.toPlace.getWidth());
    const height = Calculations.getHeightLPRorLPB(drawingHeight, y, c.toPlace.getHeight());
    return { x, y, width, height };
  }

  /**
   * The `CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT` case of `calcValuesForOpt`.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private wholeDrawingRight(c: PlacementContext): Candidate {
    const drawingWidth = c.drawing.getDrawingWidth();
    const drawingHeight = c.drawing.getDrawingHeight();
    const x = drawingWidth + c.nodeNodeSpacing;
    const y = 0;

    const width = drawingWidth + c.nodeNodeSpacing + c.toPlace.getWidth();
    const height = Math.max(drawingHeight, c.toPlace.getHeight());
    return { x, y, width, height };
  }

  /**
   * The `CANDIDATE_POSITION_WHOLE_DRAWING_BELOW` case of `calcValuesForOpt`.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaApproximation.java
   */
  private wholeDrawingBelow(c: PlacementContext): Candidate {
    const drawingWidth = c.drawing.getDrawingWidth();
    const drawingHeight = c.drawing.getDrawingHeight();
    const x = 0;
    const y = drawingHeight + c.nodeNodeSpacing;

    const width = Math.max(drawingWidth, c.toPlace.getWidth());
    const height = drawingHeight + c.nodeNodeSpacing + c.toPlace.getHeight();
    return { x, y, width, height };
  }
}
