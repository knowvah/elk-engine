// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../core/alg/LayoutProcessorConfiguration.js';
import type { ElkPadding } from '../../core/math/ElkPadding.js';
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import * as Int32 from '../../java/lang/Int32.js';
import { d2i } from '../../java/lang/JavaMath.js';
import type { GridElkNode } from './GridElkNode.js';
import type { INodeArranger } from './INodeArranger.js';
import type { TopdownPackingPhases } from './TopdownPackingPhases.js';
import { TopdownpackingOptions } from './options/TopdownpackingOptions.js';

/** The locals of `process` its placement loop reads (`placeNodes`). */
interface Placement {
  readonly nodes: readonly ElkNode[];
  readonly cols: number;
  readonly padding: ElkPadding;
  readonly nodeNodeSpacing: number;
}

/**
 * Places nodes in a grid using the sizes provided by their parent node.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/LeftRightTopDownNodePlacer.java
 */
export class LeftRightTopDownNodePlacer implements ILayoutPhase<TopdownPackingPhases, GridElkNode>, INodeArranger {
  process(layoutGraph: GridElkNode, progressMonitor: IElkProgressMonitor): void {
    // Start progress monitor
    progressMonitor.begin('Node placement', 1);
    progressMonitor.log(`Node placement began for node ${String(layoutGraph.getIdentifier())}`);

    const padding = layoutGraph.getProperty(TopdownpackingOptions.PADDING);
    const nodeNodeSpacing = layoutGraph.getProperty(TopdownpackingOptions.SPACING_NODE_NODE);

    // In case the graph dimensions have not been set yet, set them now, this is needed for the standalone usage
    const graphSize = this.getPredictedSize(layoutGraph);
    layoutGraph.setDimensions(
      Math.max(layoutGraph.getWidth(), graphSize.x),
      Math.max(layoutGraph.getHeight(), graphSize.y),
    );

    // Get the list of nodes to lay out
    const nodes: ElkNode[] = [...layoutGraph.getChildren()];

    // Compute number of rows and columns to use to arrange nodes to maintain the aspect ratio
    // This corresponds to filling up a square grid and removing empty empty rows at the bottom
    const cols = d2i(Math.ceil(Math.sqrt(nodes.length)));
    let rows: number;
    if (nodes.length > Int32.sub(Int32.mul(cols, cols), cols) || cols === 0) {
      rows = cols;
    } else {
      // N <= W^2 - W
      rows = Int32.sub(cols, 1);
    }
    // set size of grid
    layoutGraph.setGridSize(cols, rows);

    progressMonitor.log(
      `${String(layoutGraph.getIdentifier())}\nPlacing ${String(nodes.length)} nodes in ${String(cols)} columns.`,
    );
    progressMonitor.done();
    progressMonitor.log('Node Arrangement done!');

    // Place the nodes
    this.placeNodes(layoutGraph, { nodes, cols, padding, nodeNodeSpacing }, progressMonitor);

    progressMonitor.log('Node Placing done!');

    // End the progress monitor
    progressMonitor.logGraph(layoutGraph, 'Graph after node placement');
    progressMonitor.done();
  }

  /**
   * The placement loop of `process` (LeftRightTopDownNodePlacer.java:73-108), split out of `process` for the
   * function-size limit; statements and their order unchanged. `placement` carries the locals of `process` the loop
   * reads.
   */
  private placeNodes(layoutGraph: GridElkNode, placement: Placement, progressMonitor: IElkProgressMonitor): void {
    const { nodes, cols, padding, nodeNodeSpacing } = placement;
    let currX = padding.left;
    let currY = padding.top;
    let currentCol = 0;
    let currentRow = 0;

    // get hierarchical node sizes from parent for this layout
    const desiredNodeWidth = layoutGraph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH);
    const aspectRatio = layoutGraph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO);

    for (const node of nodes) {
      // Set the node's size
      node.setDimensions(desiredNodeWidth, desiredNodeWidth / aspectRatio);
      // Set the node's coordinates
      node.setX(currX);
      node.setY(currY);
      progressMonitor.log(`currX: ${doubleToString(currX)}`);
      progressMonitor.log(`currY: ${doubleToString(currY)}`);
      // Store node's grid position
      layoutGraph.put(currentCol, currentRow, node);

      progressMonitor.logGraph(
        layoutGraph,
        `${String(node.getIdentifier())} placed in (${String(currentCol)}|${String(currentRow)})`,
      );

      // Advance the coordinates
      currX += node.getWidth() + nodeNodeSpacing;
      currentCol = Int32.add(currentCol, 1);

      // go to next row if no space left
      // sizes are pre-computed so that everything fits nicely
      if (currentCol >= cols) {
        currX = padding.left;
        currY += desiredNodeWidth / aspectRatio + nodeNodeSpacing;
        currentCol = 0;
        currentRow = Int32.add(currentRow, 1);
      }
    }
  }

  getLayoutProcessorConfiguration(graph: GridElkNode): LayoutProcessorConfiguration<TopdownPackingPhases, GridElkNode> {
    return LayoutProcessorConfiguration.create<TopdownPackingPhases, GridElkNode>();
  }

  getPredictedSize(graph: ElkNode): KVector {
    // get values for calculation
    const numberOfChildren = graph.getChildren().size();
    const padding = graph.getProperty(TopdownpackingOptions.PADDING);
    const nodeNodeSpacing = graph.getProperty(TopdownpackingOptions.SPACING_NODE_NODE);
    const hierarchicalNodeWidth = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH);
    const hierarchicalNodeAspectRatio = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO);

    const cols = d2i(Math.ceil(Math.sqrt(numberOfChildren)));
    const requiredWidth =
      cols * hierarchicalNodeWidth + padding.left + padding.right + Int32.sub(cols, 1) * nodeNodeSpacing;
    let rows: number;
    if (numberOfChildren > Int32.sub(Int32.mul(cols, cols), cols) || cols === 0) {
      rows = cols;
    } else {
      // N <= W^2 - W
      rows = Int32.sub(cols, 1);
    }
    const requiredHeight =
      (rows * hierarchicalNodeWidth) / hierarchicalNodeAspectRatio +
      padding.top +
      padding.bottom +
      Int32.sub(rows, 1) * nodeNodeSpacing;
    return new KVector(requiredWidth, requiredHeight);
  }
}
