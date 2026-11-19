// SPDX-License-Identifier: EPL-2.0
import { UnsupportedConfigurationException } from '../../../../core/UnsupportedConfigurationException.js';
import { HierarchyHandling } from '../../../../core/options/HierarchyHandling.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { ComponentOrderingStrategy } from '../../components/ComponentOrderingStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { GroupOrderStrategy } from '../../options/GroupOrderStrategy.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePromotionStrategy } from '../../options/NodePromotionStrategy.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';
import type { LGraph } from '../LGraph.js';
import type { LNode } from '../LNode.js';

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
 * The `switch (cycleBreaking)` of `ensureNoModelOrderStrategies`: the setting text of a cycle breaking strategy that
 * reads the model order data of the graph, or `null`.
 */
function modelOrderCycleBreakingSetting(nestedGraph: LGraph): string | null {
  const cycleBreaking = nestedGraph.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY);
  let setting: string | null = null;
  switch (cycleBreaking) {
    case CycleBreakingStrategy.MODEL_ORDER:
    case CycleBreakingStrategy.GREEDY_MODEL_ORDER:
    case CycleBreakingStrategy.SCC_CONNECTIVITY:
    case CycleBreakingStrategy.SCC_NODE_TYPE:
      setting = `${LayeredOptions.CYCLE_BREAKING_STRATEGY.getId()} ${cycleBreaking.toString()}`;
      break;
    case CycleBreakingStrategy.DFS_NODE_ORDER:
    case CycleBreakingStrategy.BFS_NODE_ORDER:
      if (
        nestedGraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
        GroupOrderStrategy.ENFORCED
      ) {
        setting =
          `${LayeredOptions.CYCLE_BREAKING_STRATEGY.getId()} ${cycleBreaking.toString()} with ` +
          `${LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY.getId()} ` +
          GroupOrderStrategy.ENFORCED.toString();
      }
      break;
    default:
  }
  return setting;
}

/**
 * Ensures that a nested graph laid out as part of its parent's hierarchy does not use a model order strategy that
 * reads {@link InternalProperties#MAX_MODEL_ORDER_NODES} or {@link InternalProperties#CB_NUM_MODEL_ORDER_GROUPS}.
 * Model order strategies are not supported with {@link HierarchyHandling#INCLUDE_CHILDREN}, since the model order
 * is assigned across all levels of the hierarchy, and the two properties are only computed for the top-level graph.
 * Without this check, these strategies fail with a `NullPointerException` while the nested graph is laid out.
 *
 * TS split: the Java's `switch (cycleBreaking)` is {@link modelOrderCycleBreakingSetting} (complexity limit); the
 * statement order is the Java's.
 *
 * @param lnode
 *            the node that represents the nested graph in its parent graph.
 * @param nestedGraph
 *            the nested graph.
 * @throws UnsupportedConfigurationException
 *             if the nested graph is configured to use such a model order strategy.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function ensureNoModelOrderStrategies(lnode: LNode, nestedGraph: LGraph): void {
  let setting = modelOrderCycleBreakingSetting(nestedGraph);

  const orderingStrategy = nestedGraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY);
  if (setting === null && orderingStrategy !== OrderingStrategy.NONE) {
    setting = `${LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY.getId()} ${orderingStrategy.toString()}`;
  }

  // Only the barycenter heuristic of the layer sweep crossing minimizer reads the model order
  if (
    setting === null &&
    nestedGraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER) &&
    nestedGraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY) === CrossingMinimizationStrategy.LAYER_SWEEP
  ) {
    setting = `${LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER.getId()} true`;
  }

  if (setting !== null) {
    throw new UnsupportedConfigurationException(
      `Node '${String(lnode.getDesignation())}' sets ${setting}` +
        ", but it is laid out as part of its parent's hierarchy (hierarchy handling " +
        `${HierarchyHandling.INCLUDE_CHILDREN.toString()}), which does not support model order strategies in ` +
        'nested graphs. Remove the option or lay this subgraph out with hierarchy handling ' +
        `${HierarchyHandling.SEPARATE_CHILDREN.toString()}.`,
    );
  }
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
