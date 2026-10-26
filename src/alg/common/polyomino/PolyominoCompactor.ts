// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import { HighLevelSortingCriterion } from '../compaction/options/HighLevelSortingCriterion.js';
import { LowLevelSortingCriterion } from '../compaction/options/LowLevelSortingCriterion.js';
import { PolyominoOptions } from '../compaction/options/PolyominoOptions.js';
import { TraversalStrategy } from '../compaction/options/TraversalStrategy.js';
import { CornerCasesGreaterThanRestComparator } from './PolyominoCompactorCornerCasesGreaterThanRestComparator.js';
import { MinNumOfExtensionDirectionsComparator } from './PolyominoCompactorMinNumOfExtensionDirectionsComparator.js';
import { MinNumOfExtensionsComparator } from './PolyominoCompactorMinNumOfExtensionsComparator.js';
import { MinPerimeterComparator } from './PolyominoCompactorMinPerimeterComparator.js';
import { MinPerimeterComparatorWithShape } from './PolyominoCompactorMinPerimeterComparatorWithShape.js';
import { SingleExtensionSideGreaterThanRestComparator } from './PolyominoCompactorSingleExtensionSideGreaterThanRestComparator.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import type { PlanarGrid } from './structures/PlanarGrid.js';
import type { Polyomino } from './structures/Polyomino.js';
import type { Polyominoes } from './structures/Polyominoes.js';
import { SuccessorCombination } from './SuccessorCombination.js';
import { SuccessorJitter } from './SuccessorJitter.js';
import { SuccessorLineByLine } from './SuccessorLineByLine.js';
import { SuccessorManhattan } from './SuccessorManhattan.js';
import { SuccessorMaxNormWindingInMathPosSense } from './SuccessorMaxNormWindingInMathPosSense.js';
import { SuccessorQuadrantsGeneric } from './SuccessorQuadrantsGeneric.js';

/**
 * Implementation of a packing algorithm based on using polyominoes (i. e. low resolution representations of shapes
 * like nodes, components, graphs, etc.).
 *
 * The approach is based on: Freivalds, K., Dogrusoz, U. and Kikusts, P. Disconnected Graph Layout and the Polyomino
 * Packing Approach. in Mutzel, P., Jünger, M. and Leipert, S. (Eds.). Graph Drawing: 9th International Symposium, GD
 * 2001 Vienna, Austria, September 23-26, 2001 Revised Papers. Springer Berlin Heidelberg, Berlin, Heidelberg, 2002,
 * 378-39. DOI: 10.1007/3-540-45848-4_30
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class PolyominoCompactor {
  /**
   * Places polyominoes close together, in order to achieve a minimum area, based on the heuristic algorithm
   * PackPolyominoes from the paper.
   */
  packPolyominoes<P extends Polyomino>(polyHolder: Polyominoes<P>): void {
    const polys = polyHolder.getPolyominoes();
    const grid = polyHolder.getGrid();

    PolyominoCompactor.sortPolyominoes(polys, polyHolder);

    // 2. Initialize cost function. Implemented as a PolyominoSuccessor (Java: BiFunction) for future
    // interchangeability with different metrics.
    const successorBasedOnCost = PolyominoCompactor.createSuccessor(
      polyHolder.getProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY),
    );

    PolyominoCompactor.placePolyominoes(polys, grid, successorBasedOnCost);
  }

  /** Step 1 of {@link packPolyominoes}: sorts the polyominoes by the configured criteria. */
  private static sortPolyominoes<P extends Polyomino>(polys: P[], polyHolder: Polyominoes<P>): void {
    // 1. Sort polyominoes by some strategy
    switch (polyHolder.getProperty(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT)) {
      case LowLevelSortingCriterion.BY_SIZE: {
        const cmp = new MinPerimeterComparator();
        polys.sort((a, b) => cmp.compare(b, a)); // reversed()
        break;
      }
      case LowLevelSortingCriterion.BY_SIZE_AND_SHAPE:
      default: {
        const cmp = new MinPerimeterComparatorWithShape();
        polys.sort((a, b) => cmp.compare(b, a)); // reversed()
        break;
      }
    }

    PolyominoCompactor.sortHighLevel(polys, polyHolder);
  }

  /** The second `switch` of step 1 of {@link packPolyominoes}. */
  private static sortHighLevel<P extends Polyomino>(polys: P[], polyHolder: Polyominoes<P>): void {
    switch (polyHolder.getProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT)) {
      case HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST: {
        const minExt = new MinNumOfExtensionsComparator();
        const single = new SingleExtensionSideGreaterThanRestComparator();
        const corner = new CornerCasesGreaterThanRestComparator();
        polys.sort((a, b) => minExt.compare(a, b));
        polys.sort((a, b) => single.compare(a, b));
        polys.sort((a, b) => corner.compare(a, b));
        break;
      }
      case HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST:
      default: {
        const minExt = new MinNumOfExtensionsComparator();
        const minDir = new MinNumOfExtensionDirectionsComparator();
        polys.sort((a, b) => minExt.compare(a, b));
        polys.sort((a, b) => minDir.compare(a, b));
      }
    }
  }

  /** Steps 3 to 5 of {@link packPolyominoes}: places each polyomino at the first free trial position. */
  private static placePolyominoes(
    polys: Polyomino[],
    grid: PlanarGrid,
    successorBasedOnCost: PolyominoSuccessor,
  ): void {
    for (const poly of polys) {
      // 3. Start placement of each polyomino at the center of the grid
      let offX = 0;
      let offY = 0;
      let next = new Pair<number, number>(offX, offY);

      // 4. Until no polyomino cell intersects with another polyomino already placed ...
      while (grid.intersectsWithCenterBased(poly, offX, offY)) {
        // ... get next trial position based on cost function
        next = successorBasedOnCost.apply(next, poly);
        offX = next.getFirst() as number;
        offY = next.getSecond() as number;
      }
      // 5. When a valid position is found, mark all new cells in the underlying grid and save the position of the
      // polyomino's center relative to the grid's center
      grid.addFilledCellsFrom(poly, offX, offY);
    }
  }

  /** The traversal-strategy `switch` of step 2 of {@link packPolyominoes}. */
  private static createSuccessor(strategy: TraversalStrategy): PolyominoSuccessor {
    switch (strategy) {
      case TraversalStrategy.SPIRAL:
        return new SuccessorMaxNormWindingInMathPosSense();
      case TraversalStrategy.LINE_BY_LINE:
        return new SuccessorLineByLine();
      case TraversalStrategy.MANHATTAN:
        return new SuccessorManhattan();
      case TraversalStrategy.JITTER:
        return new SuccessorJitter();
      case TraversalStrategy.QUADRANTS_MANHATTAN:
        return new SuccessorQuadrantsGeneric(new SuccessorManhattan());
      case TraversalStrategy.QUADRANTS_LINE_BY_LINE:
        return new SuccessorQuadrantsGeneric(new SuccessorLineByLine());
      case TraversalStrategy.COMBINE_LINE_BY_LINE_MANHATTAN:
        return new SuccessorCombination(
          new SuccessorQuadrantsGeneric(new SuccessorLineByLine()),
          new SuccessorQuadrantsGeneric(new SuccessorManhattan()),
        );
      case TraversalStrategy.COMBINE_JITTER_MANHATTAN:
        return new SuccessorCombination(
          new SuccessorQuadrantsGeneric(new SuccessorJitter()),
          new SuccessorQuadrantsGeneric(new SuccessorManhattan()),
        );
      case TraversalStrategy.QUADRANTS_JITTER:
      default:
        return new SuccessorQuadrantsGeneric(new SuccessorJitter());
    }
  }
}
