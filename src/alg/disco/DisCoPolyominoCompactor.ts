// SPDX-License-Identifier: EPL-2.0
import { PolyominoOptions } from '../common/compaction/options/PolyominoOptions.js';
import { PolyominoCompactor } from '../common/polyomino/PolyominoCompactor.js';
import type { PlanarGrid } from '../common/polyomino/structures/PlanarGrid.js';
import { Polyominoes } from '../common/polyomino/structures/Polyominoes.js';
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import * as Int32 from '../../java/lang/Int32.js';
import type { DCComponent } from './graph/DCComponent.js';
import type { DCGraph } from './graph/DCGraph.js';
import type { ICompactor } from './ICompactor.js';
import { DisCoOptions } from './options/DisCoOptions.js';
import { DCPolyomino } from './structures/DCPolyomino.js';

/**
 * Implementation of a connected components layout algorithm based on using polyominoes (i. e. low resolution
 * representations) derived from each connected component.
 *
 * The approach is based on: Freivalds, K., Dogrusoz, U. and Kikusts, P. Disconnected Graph Layout and the Polyomino
 * Packing Approach. in Mutzel, P., Junger, M. and Leipert, S. (Eds.). Graph Drawing: 9th International Symposium, GD
 * 2001 Vienna, Austria, September 23-26, 2001 Revised Papers. Springer Berlin Heidelberg, Berlin, Heidelberg, 2002,
 * 378-39. DOI: 10.1007/3-540-45848-4_30
 *
 * `applyToDCGraph` computes in `int` where the Java does (`Int32`): the `extBoundary*InRange` rows wrap in 32 bits.
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoPolyominoCompactor.java
 */
export class DisCoPolyominoCompactor implements ICompactor {
  // /////////////////////////////////////////////////////////////////////////////
  // Variables

  /**
   * number of spatial units of the {@link DCGraph} covered by the witdh (and height) of a discrete grid cell used for
   * creating polyominoes.
   */
  private gridCellSizeX: number = 0;
  private gridCellSizeY: number = 0;
  /** upper bound on the size of a grid cell, 100 is taken as a recommendation from the paper. */
  private readonly upperBound: number = 100.0;
  /** Graph to compact. */
  private cmpGraph!: DCGraph;
  /** Polyominoes representing each one {@link DCComponent} of the given {@link DCGraph}. */
  private polys!: DCPolyomino[];
  /** finite grid representing the infinite planar grid N x N on which the {@link DCPolyomino polyominoes} are placed. */
  private grid!: PlanarGrid;
  /** Desired aspect ratio of the final layout (width by height). */
  private aspectRatio: number | null = null;

  /** Determines whether holes in polyominoes are to be filled. */
  private fill: boolean = false;

  // /////////////////////////////////////////////////////////////////////////////
  // Implemenation of interface method

  /** @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoPolyominoCompactor.java */
  compact(graph: DCGraph): void {
    // Initialization
    this.cmpGraph = graph;
    this.polys = [];

    // Computation of the ideal step size of the discrete grid in relation to the original graphs resolution.
    const gridCellRecommendation = this.computeCellSize(this.cmpGraph);
    this.gridCellSizeX = gridCellRecommendation;
    this.gridCellSizeY = gridCellRecommendation;

    this.fill = this.cmpGraph.getProperty(PolyominoOptions.POLYOMINO_FILL);
    this.aspectRatio = this.cmpGraph.getProperty(CoreOptions.ASPECT_RATIO) as number | null;
    if (this.aspectRatio === null) {
      this.aspectRatio = 1.0;
    }

    if (this.aspectRatio > 1.0) {
      // Width greater than height
      this.gridCellSizeX *= this.aspectRatio;
    } else {
      this.gridCellSizeY /= this.aspectRatio;
    }

    // 1.) Convert DCComponents into polyominoes and generate a grid large enough to contain them all after
    // packing.
    this.createPolyominoes();
    // 2.) Do the actual layout of the polyominoes.
    this.packPolyominoes();

    // 3.) Apply layout back to the DCGraph
    this.applyToDCGraph();

    // Used for visual debugging purposes only.
    this.cmpGraph.setProperty(DisCoOptions.DEBUG_DISCO_POLYS, this.polys);
  }

  // /////////////////////////////////////////////////////////////////////////////
  // Private submethods

  /**
   * Computes the optimal step size for the polyomino grid, satisfying this equation from the paper.
   *
   * (c*n-1)*l^2 - (sum from i=1 to n: (W_i + H_i) * l) - (sum from i=1 to n: W_i * H_i) = 0
   *
   * with c: upper bound on the avarage size of a polyomino (given as 100 in the paper), l: grid step (result of this
   * method), n: number of connected components of the {@link DCGraph}, W_i / H_i: width / height of
   * {@link DCComponent} i.
   *
   * @param graph input graph to compute optimal step size for
   * @returns optimal step size
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoPolyominoCompactor.java
   */
  private computeCellSize(graph: DCGraph): number {
    let sumTerm = 0.0;
    let prodTerm = 0.0;
    const comps = graph.getComponents();
    const numOfComps = comps.size;

    for (const comp of comps) {
      const bounds = comp.getDimensionsOfBoundingRectangle();
      const width = bounds.x;
      const height = bounds.y;
      sumTerm += width + height;
      prodTerm += width * height;
    }

    // Numerator of positive solution of quadratic equation (the negative solution is is not interesting for us, as
    // step size should be positive)
    const four = 4.0;
    const numerator =
      Math.sqrt(four * this.upperBound * numOfComps * prodTerm - four * prodTerm + sumTerm * sumTerm) + sumTerm;
    const denominator = 2 * (this.upperBound * numOfComps - 1.0);

    // Shouldn't happen with reasonable values for parameter "bound", ignore denominator just in case
    if (denominator === 0.0) {
      return numerator;
    }
    return numerator / denominator;
  }

  /**
   * Creates polyominoes from all {@link DCComponent DCComponents} of the {@link DCGraph} to compact. Prerequisite:
   * `computeCellSize` must have been called before this method.
   *
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoPolyominoCompactor.java
   */
  private createPolyominoes(): void {
    const comps = this.cmpGraph.getComponents();

    for (const comp of comps) {
      const poly = new DCPolyomino(comp, this.gridCellSizeX, this.gridCellSizeY);
      this.polys.push(poly);
    }
  }

  /**
   * Places polyominoes close together, in order to achieve a minimum area for the final drawing, based on the
   * heuristic algorithm PackPolyominoes from the paper. Prerequisite: `createPolyominoes` must have been called.
   * Only the aspect ratio and the fill flag reach the holder: its sort and traversal options are not forwarded, as in
   * the Java (twelve goldens pin that).
   *
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoPolyominoCompactor.java
   */
  private packPolyominoes(): void {
    // Id is for debugging purposes only (s. DisCoDebugView).
    let id = 0;
    for (const poly of this.polys) {
      poly.setId(id);
      id++;
    }

    // Use the more generic polyomino compactor which isn't restricted to components
    const polyHolder = new Polyominoes<DCPolyomino>(this.polys, this.aspectRatio!, this.fill);
    new PolyominoCompactor().packPolyominoes(polyHolder);

    this.polys = polyHolder.getPolyominoes();
    this.grid = polyHolder.getGrid();
  }

  /**
   * Sets an offset to the {@link DCComponent DCComponents} of the given graph indicating a vector, which yields its
   * new absolute position after packing, if added to its original coordinates. Prerequisite: `packPolyominoes` must
   * have been called before this method.
   *
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoPolyominoCompactor.java
   */
  private applyToDCGraph(): void {
    // Crop base grid to the bounding box of all filled/marked cells.
    const gridCrop = this.grid.getFilledBounds();
    // Compute width and height of the minimum bounding box of the new layout and set the the dimensions of the
    // graph accordingly. The coordinates are thereby translated from the discrete integer coordinates of the low
    // resolution polyominoes back to the real coordinates of the DCGraph.
    const padding = this.cmpGraph.getProperty(DisCoOptions.PADDING);
    const paddingHori = padding.getHorizontal();
    const paddingVert = padding.getVertical();
    const parentWidth = gridCrop.getThird() * this.gridCellSizeX + paddingHori;
    const parentHeight = gridCrop.getFourth() * this.gridCellSizeY + paddingVert;
    this.cmpGraph.setDimensions(new KVector(parentWidth, parentHeight));

    for (const poly of this.polys) {
      // Compute the position of the upper left corner of each polyomino relative to the upper left corner of the
      // bounding box of all filled/marked cells of the base grid.
      const absoluteIntPositionX = Int32.sub(poly.getX(), gridCrop.getFirst());
      const absoluteIntPositionY = Int32.sub(poly.getY(), gridCrop.getSecond());

      // Compute new position of DCComponent
      const absolutePositionOnCanvas = new KVector(absoluteIntPositionX, absoluteIntPositionY)
        .scale(poly.getCellSizeX(), poly.getCellSizeY())
        .add(poly.getOffset());
      // Get original coordinates of DCCopmponent (These will not be updated, as so far all classes implementing
      // the IGraphTransformer only use the offsets of the components to layout their underlying graph structures.
      const originalCoordinates = poly.getRepresentee().getMinCorner();
      // Set offset of new position relative to the original position of the component
      poly.getRepresentee().setOffset(absolutePositionOnCanvas.sub(originalCoordinates));
    }
  }
}
