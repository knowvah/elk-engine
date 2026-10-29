// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Tarjan } from '../graph/Tarjan.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { GroupModelOrderCalculator } from './GroupModelOrderCalculator.js';

/**
 * This Cycle Breaking Strategy relies on Tarjan's algorithm to find strongly connected components. It than selects the
 * node with the maximum model order in the strongly connected components and reverses its out-going edges to nodes in
 * the strongly connected component.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>no self loops</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>the graph has no cycles</dd>
 * </dl>
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/SCCModelOrderCycleBreaker.java
 */
export abstract class SCCModelOrderCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (SCCModelOrderCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER));
  }

  /** List of strongly connected components calculated by tarjan (Java `LinkedList<Set<LNode>>`). */
  protected stronglyConnectedComponents: Set<LNode>[] = [];

  /** Maps node to id of its strongly connected component (Java identity-hashed `HashMap`: AD-10, insertion order). */
  protected nodeToSCCID: Map<LNode, number> = new Map();

  /** The edges to reverse. */
  protected revEdges: LEdge[] = [];

  /** The graph. */
  protected graph!: LGraph;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return SCCModelOrderCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Model order cycle breaking', 1);

    this.graph = layeredGraph;

    // gather edges that point to the wrong direction
    this.revEdges = [];

    // One needs an offset to make sure that the model order of nodes with port constraints is
    // always lower/higher than that of other nodes.
    // E.g. A node with the LAST constraint needs to have a model order m = modelOrder + offset
    // such that m > m(n) with m(n) being the model order of a normal node n (without constraints).
    // Such that the highest model order has to be used as an offset
    const offset = Math.max(
      layeredGraph.getLayerlessNodes().length,
      layeredGraph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
    );

    while (true) {
      const t = new Tarjan(this.revEdges, this.stronglyConnectedComponents, this.nodeToSCCID);
      t.resetTarjan(layeredGraph);
      t.tarjan(layeredGraph);

      // If no Strongly connected components remain, the graph is acyclic.
      if (this.stronglyConnectedComponents.length === 0) {
        break;
      }

      // highest model order only incoming
      this.findNodes(offset, Int32.mul(offset, layeredGraph.getProperty(InternalProperties.CB_NUM_MODEL_ORDER_GROUPS)));

      this.reverseGatheredEdges(layeredGraph);

      this.stronglyConnectedComponents.length = 0;
      this.nodeToSCCID.clear();
      this.revEdges.length = 0;
    }

    monitor.done();
    monitor.log(`Execution Time: ${String(monitor.getExecutionTime())}`);
  }

  /** `:112-118`: reverse the gathered edges. */
  private reverseGatheredEdges(layeredGraph: LGraph): void {
    for (const edge of this.revEdges) {
      edge.reverse(layeredGraph, false);
      edge
        .getSource()!
        .getNode()!
        .setProperty(
          LayeredOptions.LAYERING_LAYER_ID,
          Int32.add(edge.getSource()!.getNode()!.getProperty(LayeredOptions.LAYERING_LAYER_ID), 1),
        );
      layeredGraph.setProperty(InternalProperties.CYCLIC, true);
    }
  }

  /**
   * Find the nodes with the highest model order or group model order to reverse all its outgoing edges.
   *
   * @param offset Helper value to calculate constraint partitions. This has to be higher than model order such that
   *          "offset * primary criterion + secondary criterion" works.
   * @param bigOffset `offset` times the number of cycle breaking model order groups.
   */
  findNodes(offset: number, bigOffset: number): void {
    // All strongly connected components have one maximum element for which we can reverse all outgoing edges.
    for (let i = 0; i < this.stronglyConnectedComponents.length; i++) {
      const max = this.findMaximum(this.stronglyConnectedComponents[i]!, offset, bigOffset);
      for (const edge of max!.getOutgoingEdges()) {
        // Reverse all edges to the same strongly connected component.
        if (this.stronglyConnectedComponents[i]!.has(edge.getTarget()!.getNode()!)) {
          this.revEdges.push(edge);
        }
      }
    }
  }

  /** `:137-161`: the node with the maximum (group) model order of a component, `null` for an empty one. */
  private findMaximum(component: ReadonlySet<LNode>, offset: number, bigOffset: number): LNode | null {
    let max: LNode | null = null;
    const calculator = new GroupModelOrderCalculator();
    let maxModelOrder = JavaInteger.MIN_VALUE;
    for (const n of component) {
      // Check whether model order or the group model order is the primary criterion.
      // If it is group model order, we need to handle this differently.
      const enforceGroupModelOrder =
        this.graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
        GroupOrderStrategy.ENFORCED;
      if (max === null) {
        // Case first element
        max = n;
        maxModelOrder = enforceGroupModelOrder
          ? calculator.computeConstraintGroupModelOrder(n, bigOffset, offset)
          : calculator.computeConstraintModelOrder(n, offset);
      } else {
        // Find a new maximum if possible.
        const modelOrderCurrent = enforceGroupModelOrder
          ? calculator.computeConstraintGroupModelOrder(n, bigOffset, offset)
          : calculator.computeConstraintModelOrder(n, offset);
        if (maxModelOrder < modelOrderCurrent) {
          max = n;
          maxModelOrder = modelOrderCurrent;
        }
      }
    }
    return max;
  }
}
