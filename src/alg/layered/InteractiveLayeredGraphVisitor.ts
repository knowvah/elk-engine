// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkNode, type ElkNode } from '../../graph/ElkNode.js';
import type { IGraphElementVisitor } from '../../core/util/IGraphElementVisitor.js';
import { LAST_LAYER_INDEX, PSEUDO_POSITION_SPACING } from './InteractiveLayeredGraphVisitorConstants.js';
import { calcLayerNodes } from './InteractiveLayeredGraphVisitorLayers.js';
import {
  setCoordinateInLayoutDirection,
  setCoordinatesOrthogonalToLayoutDirection,
} from './InteractiveLayeredGraphVisitorPositions.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayerConstraint } from './options/LayerConstraint.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { OrderingStrategy } from './options/OrderingStrategy.js';

export { LAST_LAYER_INDEX, PSEUDO_POSITION_SPACING };

/**
 * Graph visitor which visits only the root node and recursively steps through the graph to set interactive options and
 * pseudo coordinates for the layered algorithm. Interactive layout works via two consecutive layout runs: the first is a
 * "normal" run, the second is configured using this graph visitor, which sets the interactive strategies for all phases
 * and assigns pseudo positions to all nodes based on their last position and the desired layer and position in the layer
 * expressed by the `LayerChoiceConstraint` and `PositionChoiceConstraint`.
 *
 * The Java helpers live in the prefixed files `InteractiveLayeredGraphVisitor{Constants,Lists,Chains,Layers,Positions}`
 * (the 500-line and 30-NLOC limits), in the order of the Java methods; this facade keeps `visit` and the three methods
 * that need no list handling.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:59
 */
export class InteractiveLayeredGraphVisitor implements IGraphElementVisitor {
  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:69 */
  static get PSEUDO_POSITION_SPACING(): number {
    return PSEUDO_POSITION_SPACING;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:77 */
  static get LAST_LAYER_INDEX(): number {
    return LAST_LAYER_INDEX;
  }

  /**
   * Visits all nodes and sets interactive options for the `layered` algorithm. This assumes that the `layered` algorithm
   * is the default algorithm.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:84
   */
  visit(element: ElkGraphElement): void {
    // Only apply to root of the graph
    if (isElkNode(element)) {
      this.setInteractiveOptionsAndPseudoPositions(element);
    }
  }

  /**
   * Sets pseudo positions and interactive strategies for the given graph. Java runs `setCoordinates(root)` and
   * `setInteractiveStrategies(root)` inside the loop over the children (`:120-121`), once per child; the test on the
   * algorithm is `LayeredOptions.ALGORITHM_ID.endsWith(algorithm)` (`:100`), not an equality. Both stay.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:97
   */
  private setInteractiveOptionsAndPseudoPositions(root: ElkNode): void {
    if (!root.getChildren().isEmpty()) {
      // the option has no default: unset is null
      const algorithm = root.getProperty(CoreOptions.ALGORITHM) as string | null;
      if (algorithm === null || LayeredOptions.ALGORITHM_ID.endsWith(algorithm)) {
        // Make sure that potential usages of the LayerConstraint are translated into
        // LayerChoiceConstraints
        for (const node of root.getChildren()) {
          if (node.hasProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
            const constraint = node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
            node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.NONE);
            translateLayerConstraint(node, constraint);
          }
          this.setCoordinates(root);
          this.setInteractiveStrategies(root);
        }
      }
    }
  }

  /**
   * Sets the coordinates of the nodes in the graph `root` according to the set constraints.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:132
   */
  private setCoordinates(root: ElkNode): void {
    const layers = calcLayerNodes(root.getChildren().toArray());
    const direction = root.getProperty(LayeredOptions.DIRECTION);
    setCoordinateInLayoutDirection(layers, direction);
    let layerId = 0;
    for (const layer of layers) {
      if (layer.length > 0) {
        setCoordinatesOrthogonalToLayoutDirection(layer, layerId, direction);
        layerId++;
      }
    }
  }

  /**
   * Sets the (semi) interactive strategies in the phases crossing minimization, layer assignment, cycle breaking for the
   * given parent node.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:865
   */
  private setInteractiveStrategies(parent: ElkNode): void {
    parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_SEMI_INTERACTIVE, true);
    parent.setProperty(LayeredOptions.LAYERING_STRATEGY, LayeringStrategy.INTERACTIVE);
    parent.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.INTERACTIVE);
    // Disable model order for the final run, since it destroys the ordering created by the constraints.
    parent.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.NONE);
    parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, false);
    parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.LAYER_SWEEP);
  }
}

/**
 * The `switch (constraint)` of `setInteractiveOptionsAndPseudoPositions` (`:107-118`): `FIRST` and `LAST` become a layer
 * choice constraint unless the node has one. Java's switch has no default arm, so the other constraints do nothing here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:107
 */
function translateLayerConstraint(node: ElkNode, constraint: LayerConstraint): void {
  switch (constraint) {
    case LayerConstraint.FIRST:
      if (!node.hasProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT)) {
        node.setProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT, 0);
      }
      break;
    case LayerConstraint.LAST:
      if (!node.hasProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT)) {
        node.setProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT, LAST_LAYER_INDEX);
      }
      break;
    default:
      break;
  }
}
