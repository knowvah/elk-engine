// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { ComponentOrderingStrategy } from '../../components/ComponentOrderingStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePromotionStrategy } from '../../options/NodePromotionStrategy.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';

/** The "Import Entry Points" helpers that decide whether model order is set. */

/** The `modelOrderLayering` condition of `needsModelOrderBasedOnParent`. */
function usesModelOrderLayering(elkgraph: ElkNode): boolean {
  const layering = elkgraph.getProperty(LayeredOptions.LAYERING_STRATEGY);
  const promotion = elkgraph.getProperty(LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY);
  return (
    layering === LayeringStrategy.BF_MODEL_ORDER ||
    layering === LayeringStrategy.DF_MODEL_ORDER ||
    promotion === NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT ||
    promotion === NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT
  );
}

/** The `modelOrderCrossingMinimization` condition of `needsModelOrderBasedOnParent`. */
function usesModelOrderCrossingMinimization(elkgraph: ElkNode): boolean {
  return (
    // Maybe add the explicit strategies here
    elkgraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) !== OrderingStrategy.NONE ||
    elkgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER) ||
    // Maybe add the explicit strategies here
    elkgraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS) !== ComponentOrderingStrategy.NONE ||
    elkgraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE) !== 0 ||
    elkgraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_PORT_INFLUENCE) !== 0
  );
}

/**
 * Calculates whether the parent graph of an element would need model order to be set.
 *
 * @param elkgraph The graph.
 * @return True, if model order should be set.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function needsModelOrderBasedOnParent(elkgraph: ElkNode): boolean {
  // Java reads the strategy once per comparison; the property read has no side effect for an enum. The constants are
  // read here, not at module level: the strategy enums import the phase classes, which import LayeredOptions, which
  // reaches this module through LayeredLayoutProvider, so a module-level read would run before the enum initialises.
  const cycleBreaking = elkgraph.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY);
  const modelOrderCycleBreaking =
    cycleBreaking === CycleBreakingStrategy.MODEL_ORDER ||
    cycleBreaking === CycleBreakingStrategy.BFS_NODE_ORDER ||
    cycleBreaking === CycleBreakingStrategy.DFS_NODE_ORDER ||
    cycleBreaking === CycleBreakingStrategy.GREEDY_MODEL_ORDER ||
    cycleBreaking === CycleBreakingStrategy.SCC_CONNECTIVITY ||
    cycleBreaking === CycleBreakingStrategy.SCC_NODE_TYPE;
  const modelOrderLayering = usesModelOrderLayering(elkgraph);
  const modelOrderCrossingMinimization = usesModelOrderCrossingMinimization(elkgraph);
  return modelOrderCycleBreaking || modelOrderLayering || modelOrderCrossingMinimization;
}

/**
 * Calculates whether a node needs to have a model order set.
 *
 * @param child The node.
 * @return True, if model order should be set.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function needsModelOrder(child: ElkNode): boolean {
  const elkgraph = child.getParent() as ElkNode;
  return (
    needsModelOrderBasedOnParent(elkgraph) && !child.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_NO_MODEL_ORDER)
  );
}

/**
 * Checks if the given node has any inside self loops.
 *
 * @param elknode the node to check for inside self loops.
 * @return `true` if the node has inside self loops, `false` otherwise.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function hasInsideSelfLoops(elknode: ElkNode): boolean {
  if (elknode.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE)) {
    for (const edge of ElkGraphUtil.allOutgoingEdges(elknode)) {
      if (edge.isSelfloop()) {
        if (edge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO)) {
          return true;
        }
      }
    }
  }

  return false;
}
