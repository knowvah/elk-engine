// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { HierarchyHandling } from '../../../core/options/HierarchyHandling.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { HIERARCHY_AWARE, type IHierarchyAwareLayoutProcessor } from '../IHierarchyAwareLayoutProcessor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import {
  countCurrentNumberOfCrossings,
  countCurrentNumberOfCrossingsNodePortOrder,
} from './LayerSweepCrossingMinimizerCounting.js';
import { sortPortsByDummyPositionsInLastLayer } from './LayerSweepCrossingMinimizerHierarchical.js';
import type { LayerSweepCrossingMinimizerState } from './LayerSweepCrossingMinimizerState.js';
import { sweepReducingCrossings } from './LayerSweepCrossingMinimizerSweep.js';
import { SweepCopy } from './SweepCopy.js';

/**
 * This class minimizes crossings by sweeping through a graph, holding the order of nodes in one layer fixed and
 * switching the nodes in the other layer. After each re-sorting step, the ports in the two current layers are sorted.
 *
 * By using a `LayerSweepTypeDecider` as called by the `GraphInfoHolder` initializing class, each graph can either be
 * dealt with _bottom-up_ or _hierarchically_.
 *
 * - bottom-up: the nodes of a child graph are sorted, then the order of ports of hierarchy border traversing edges
 *   are fixed. Then the parent graph is laid out, viewing the child graph as an atomic node.
 * - hierarchical: When reaching a node with a child graph marked as hierarchical: First the ports are sorted on the
 *   outside of the graph. Then the nodes on the inside are sorted by the order of the ports. Then the child graph is
 *   swept through. Then the ports of the parent node are sorted by the order of the nodes on the last layer of the
 *   child graph. Finally the sweep through the parent graph is continued.
 *
 * Therefore this is a _hierarchical_ processor which must have access to the root graph.
 *
 * Reference for the original layer sweep: Kozo Sugiyama, Shojiro Tagawa, and Mitsuhiko Toda. Methods for visual
 * understanding of hierarchical system structures. IEEE Transactions on Systems, Man and Cybernetics, 11(2):109–125,
 * February 1981.
 *
 * - Precondition: The graph has a proper layering, i.e. all long edges have been splitted; all nodes have at least
 *   fixed port sides.
 * - Postcondition: The order of nodes in each layer and the order of ports in each node are optimized to yield as few
 *   edge crossings as possible
 *
 * Sections (P1): the sweep (`:450-503`) is `LayerSweepCrossingMinimizerSweep`, the port ordering of the hierarchical
 * part (`:504-543`) `LayerSweepCrossingMinimizerHierarchical`, the crossing and model-order counting (`:326-448`)
 * `LayerSweepCrossingMinimizerCounting`, the small index helpers (`:557-607`)
 * `LayerSweepCrossingMinimizerSweepHelpers`; they work on `LayerSweepCrossingMinimizerState`, which holds the Java
 * fields they share. `CrossMinType` is `LayerSweepCrossingMinimizerCrossMinType` (M15). The class carries the 7a
 * `IHierarchyAwareLayoutProcessor` brand (C10).
 *
 * @author alan
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/LayerSweepCrossingMinimizer.java
 */
export class LayerSweepCrossingMinimizer
  implements ILayoutPhase<LayeredPhases, LGraph>, IHierarchyAwareLayoutProcessor
{
  readonly [HIERARCHY_AWARE] = true as const;

  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   *
   * @see LayerSweepCrossingMinimizer.java:673
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (LayerSweepCrossingMinimizer.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LONG_EDGE_SPLITTER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.IN_LAYER_CONSTRAINT_PROCESSOR)
      .after(LayeredPhases.P5_EDGE_ROUTING)
      .add(IntermediateProcessorStrategy.LONG_EDGE_JOINER));
  }

  /**
   * The Java fields `graphInfoHolders`, `graphsWhoseNodeOrderChanged`, `random` and `randomSeed`, set by `initialize`.
   */
  private state!: LayerSweepCrossingMinimizerState;
  private readonly crossMinType: CrossMinType;

  /**
   * Creates LayerSweepHierarchicalCrossingMinimizer using given minimizer type.
   *
   * @param cT the crossing minimizer 'type'
   * @see LayerSweepCrossingMinimizer.java:104
   */
  constructor(cT: CrossMinType) {
    this.crossMinType = cT;
  }

  /** @see LayerSweepCrossingMinimizer.java:109 */
  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin(`Minimize Crossings ${this.crossMinType.toString()}`, 1);

    // Short-circuit cases in which no crossings can be minimized. Note that in-layer edges may be subject to
    // crossing minimization if |layers| = 1 and that hierarchical crossing minimization may dive into a graph with
    // a single node. There can be graphs that consist only of empty layers, for example due to inside self-loops
    // with unconnected ports (see #298)
    const emptyGraph =
      layeredGraph.getLayers().length === 0 || layeredGraph.getLayers().every((layer) => layer.getNodes().length === 0);
    const singleNode = layeredGraph.getLayers().length === 1 && layeredGraph.getLayers()[0]!.getNodes().length === 1;
    const hierarchicalLayout =
      layeredGraph.getProperty(LayeredOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN;

    if (emptyGraph || (singleNode && !hierarchicalLayout)) {
      progressMonitor.done();
      return;
    }

    const graphsToSweepOn = this.initialize(layeredGraph);

    const minimizingMethod = this.chooseMinimizingMethod(graphsToSweepOn);

    this.minimizeCrossings(graphsToSweepOn, minimizingMethod);

    this.transferNodeAndPortOrdersToGraph();

    progressMonitor.done();
  }

  /** @see LayerSweepCrossingMinimizer.java:139 */
  private chooseMinimizingMethod(graphsToSweepOn: GraphInfoHolder[]): (gData: GraphInfoHolder) => void {
    const parent = graphsToSweepOn[0]!;
    if (!parent.crossMinDeterministic()) {
      return (gData) => this.compareDifferentRandomizedLayouts(gData);
    } else if (parent.crossMinAlwaysImproves()) {
      return (gData) => this.minimizeCrossingsNoCounter(gData);
    } else {
      return (gData) => {
        this.minimizeCrossingsWithCounter(gData);
      };
    }
  }

  /** @see LayerSweepCrossingMinimizer.java:150 */
  private minimizeCrossings(
    graphsToSweepOn: GraphInfoHolder[],
    minimizingMethod: (gData: GraphInfoHolder) => void,
  ): void {
    for (const gData of graphsToSweepOn) {
      if (gData.currentNodeOrder().length > 0) {
        minimizingMethod(gData);
        if (gData.hasParent()) {
          this.setPortOrderOnParentGraph(gData);
        }
      }
    }
  }

  /** @see LayerSweepCrossingMinimizer.java:162 */
  private setPortOrderOnParentGraph(gData: GraphInfoHolder): void {
    if (gData.hasExternalPorts() && gData.getBestSweep() !== null) {
      const bestSweep = gData.getBestSweep()!;
      // Sort ports on left and right side of the parent node
      sortPortsByDummyPositionsInLastLayer(bestSweep.nodes(), gData.parent()!, true);
      sortPortsByDummyPositionsInLastLayer(bestSweep.nodes(), gData.parent()!, false);
      gData.parent()!.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    }
  }

  /**
   * For use with any two-layer crossing minimizer which always improves crossings (e.g. two-sided greedy switch).
   *
   * @see LayerSweepCrossingMinimizer.java:173
   */
  private minimizeCrossingsNoCounter(gData: GraphInfoHolder): void {
    let isForwardSweep = this.state.random.nextBoolean();
    let improved = true;
    while (improved) {
      improved = false;
      improved = gData.crossMinimizer().setFirstLayerOrder(gData.currentNodeOrder(), isForwardSweep);
      improved = sweepReducingCrossings(this.state, gData, isForwardSweep, false) || improved;
      isForwardSweep = !isForwardSweep;
    }
    this.setCurrentlyBestNodeOrders();
  }

  /** @see LayerSweepCrossingMinimizer.java:185 */
  private compareDifferentRandomizedLayouts(gData: GraphInfoHolder): void {
    // Reset the seed, otherwise copies of hierarchical graphs in different parent nodes are
    // layouted differently.
    this.state.random.setSeed(this.state.randomSeed);

    // In order to only copy graphs whose node order has changed, save them in a set.
    this.state.graphsWhoseNodeOrderChanged.clear();

    // The Java condition repeats the node influence and never reads the port influence (kept as is).
    if (
      gData.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE) !== 0 ||
      gData.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE) !== 0
    ) {
      this.compareLayoutsWithNodePortOrderCounter(gData);
    } else {
      this.compareLayoutsWithCounter(gData);
    }
  }

  /** The first branch of `compareDifferentRandomizedLayouts` (`LayerSweepCrossingMinimizer.java:195-211`). */
  private compareLayoutsWithNodePortOrderCounter(gData: GraphInfoHolder): void {
    let bestCrossings = Number.MAX_VALUE;
    if (gData.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) !== OrderingStrategy.NONE) {
      // The first run should begin with a forward sweep.
      // If the order causes no additional crossings this preserves the current order.
      gData.lGraph().setProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER, true);
    }
    const thouroughness = gData.lGraph().getProperty(LayeredOptions.THOROUGHNESS);
    for (let i = 0; i < thouroughness; i++) {
      const crossings = this.minimizeCrossingsNodePortOrderWithCounter(gData);
      if (crossings < bestCrossings) {
        bestCrossings = crossings;
        this.saveAllNodeOrdersOfChangedGraphs();
        if (bestCrossings === 0) {
          break;
        }
      }
    }
  }

  /** The `else` branch of `compareDifferentRandomizedLayouts` (`LayerSweepCrossingMinimizer.java:212-230`). */
  private compareLayoutsWithCounter(gData: GraphInfoHolder): void {
    let bestCrossings = JavaInteger.MAX_VALUE;
    if (gData.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) !== OrderingStrategy.NONE) {
      // The first run should begin with a forward sweep.
      // If the order causes no additional crossings this preserves the current order.
      gData.lGraph().setProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER, true);
    }
    const thouroughness = gData.lGraph().getProperty(LayeredOptions.THOROUGHNESS);
    for (let i = 0; i < thouroughness; i++) {
      const crossings = this.minimizeCrossingsWithCounter(gData);
      if (crossings < bestCrossings) {
        bestCrossings = crossings;
        this.saveAllNodeOrdersOfChangedGraphs();
        if (bestCrossings === 0) {
          break;
        }
      }
    }
  }

  /** @see LayerSweepCrossingMinimizer.java:233 */
  private minimizeCrossingsWithCounter(gData: GraphInfoHolder): number {
    let isForwardSweep = this.state.random.nextBoolean();

    // If the first, initial ordering is already optimal, do not change anything.
    // If the initial order should be tried, model order should be active.
    // So if the initial ordering has no crossings, just do not change anything in the graph.
    // Normally a first sweep should change the order of not connected ports, which is bad.
    const initialCrossings = countCurrentNumberOfCrossings(this.state.graphInfoHolders, gData);
    if (initialCrossings === 0 && gData.lGraph().getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER)) {
      // E.g. model order is already correct.
      return 0;
    }

    isForwardSweep = this.setFirstLayerOrderUnlessInitialOrder(gData, isForwardSweep);
    sweepReducingCrossings(this.state, gData, isForwardSweep, true);
    this.updateInitialOrderTries(gData);
    let crossingsInGraph = countCurrentNumberOfCrossings(this.state.graphInfoHolders, gData);
    let oldNumberOfCrossings: number;
    do {
      this.setCurrentlyBestNodeOrders();

      if (crossingsInGraph === 0) {
        return 0;
      }

      isForwardSweep = !isForwardSweep;
      oldNumberOfCrossings = crossingsInGraph;
      sweepReducingCrossings(this.state, gData, isForwardSweep, false);
      crossingsInGraph = countCurrentNumberOfCrossings(this.state.graphInfoHolders, gData);
    } while (oldNumberOfCrossings > crossingsInGraph);

    return oldNumberOfCrossings;
  }

  /** @see LayerSweepCrossingMinimizer.java:279 */
  private minimizeCrossingsNodePortOrderWithCounter(gData: GraphInfoHolder): number {
    let isForwardSweep = this.state.random.nextBoolean();

    // If the first, initial ordering is already optimal, do not change anything.
    // If the initial order should be tried, model order should be active.
    // So if the initial ordering has no crossings, just do not change anything in the graph.
    // Normally a first sweep should change the order of not connected ports, which is bad.
    const initialCrossings = countCurrentNumberOfCrossingsNodePortOrder(this.state.graphInfoHolders, gData);
    if (initialCrossings === 0 && gData.lGraph().getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER)) {
      // E.g. model order is already correct.
      return 0;
    }

    isForwardSweep = this.setFirstLayerOrderUnlessInitialOrder(gData, isForwardSweep);
    sweepReducingCrossings(this.state, gData, isForwardSweep, true);
    this.updateInitialOrderTries(gData);
    let crossingsInGraph = countCurrentNumberOfCrossingsNodePortOrder(this.state.graphInfoHolders, gData);
    let oldNumberOfCrossings: number;
    do {
      this.setCurrentlyBestNodeOrders();

      if (crossingsInGraph === 0) {
        return 0;
      }

      isForwardSweep = !isForwardSweep;
      oldNumberOfCrossings = crossingsInGraph;
      sweepReducingCrossings(this.state, gData, isForwardSweep, false);
      crossingsInGraph = countCurrentNumberOfCrossingsNodePortOrder(this.state.graphInfoHolders, gData);
    } while (oldNumberOfCrossings > crossingsInGraph);

    return oldNumberOfCrossings;
  }

  /**
   * The `if`/`else` that follows the zero-crossings shortcut in both `minimizeCrossingsWithCounter`
   * (`LayerSweepCrossingMinimizer.java:246-252`) and `minimizeCrossingsNodePortOrderWithCounter` (`:292-298`), which
   * repeat it verbatim: the one helper serves both. Returns the sweep direction the Java `isForwardSweep` has after it.
   */
  private setFirstLayerOrderUnlessInitialOrder(gData: GraphInfoHolder, isForwardSweep: boolean): boolean {
    if (
      (!gData.lGraph().getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER) &&
        !gData.lGraph().getProperty(InternalProperties.SECOND_TRY_WITH_INITIAL_ORDER)) ||
      gData.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) === OrderingStrategy.NONE
    ) {
      gData.crossMinimizer().setFirstLayerOrder(gData.currentNodeOrder(), isForwardSweep);
      return isForwardSweep;
    }
    return gData.lGraph().getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER);
  }

  /**
   * The two `if`s after the first sweep in both counters (`LayerSweepCrossingMinimizer.java:254-260`, `:300-306`),
   * repeated verbatim in Java and shared here like `setFirstLayerOrderUnlessInitialOrder`.
   */
  private updateInitialOrderTries(gData: GraphInfoHolder): void {
    if (gData.lGraph().getProperty(InternalProperties.SECOND_TRY_WITH_INITIAL_ORDER)) {
      gData.lGraph().setProperty(InternalProperties.SECOND_TRY_WITH_INITIAL_ORDER, false);
    }
    if (gData.lGraph().getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER)) {
      gData.lGraph().setProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER, false);
      gData.lGraph().setProperty(InternalProperties.SECOND_TRY_WITH_INITIAL_ORDER, true);
    }
  }

  /** @see LayerSweepCrossingMinimizer.java:545 */
  private saveAllNodeOrdersOfChangedGraphs(): void {
    for (const graph of this.state.graphsWhoseNodeOrderChanged) {
      graph.setBestNodeNPortOrder(new SweepCopy(graph.currentlyBestNodeAndPortOrder()!));
    }
  }

  /** @see LayerSweepCrossingMinimizer.java:551 */
  private setCurrentlyBestNodeOrders(): void {
    for (const graph of this.state.graphsWhoseNodeOrderChanged) {
      graph.setCurrentlyBestNodeAndPortOrder(new SweepCopy(graph.currentNodeOrder()));
    }
  }

  /**
   * Traverses inclusion breadth-first and initializes each Graph. The `LinkedList` of graphs to sweep on is an array
   * (`add(0, e)` is `unshift`; AD-10).
   *
   * @see LayerSweepCrossingMinimizer.java:609
   */
  private initialize(rootGraph: LGraph): GraphInfoHolder[] {
    const graphInfoHolders: GraphInfoHolder[] = [];
    const random = rootGraph.getProperty(InternalProperties.RANDOM);
    const randomSeed = random.nextLong();
    this.state = { graphInfoHolders, graphsWhoseNodeOrderChanged: new Set(), random, randomSeed };
    const graphsToSweepOn: GraphInfoHolder[] = [];
    const graphs: LGraph[] = [rootGraph];
    let i = 0;
    while (i < graphs.length) {
      const graph = graphs[i]!;
      graph.id = i++;
      const gData = new GraphInfoHolder(graph, this.crossMinType, graphInfoHolders);
      graphs.push(...gData.childGraphs());
      graphInfoHolders.push(gData);
      if (gData.dontSweepInto()) {
        graphsToSweepOn.unshift(gData);
      }
    }

    this.state.graphsWhoseNodeOrderChanged = new Set();

    return graphsToSweepOn;
  }

  /** @see LayerSweepCrossingMinimizer.java:632 */
  private transferNodeAndPortOrdersToGraph(): void {
    for (const gD of this.state.graphInfoHolders) {
      const bestSweep = gD.getBestSweep();
      if (bestSweep !== null) {
        bestSweep.transferNodeAndPortOrdersToGraph(gD.lGraph(), true);
      }
    }
  }

  /** @see LayerSweepCrossingMinimizer.java:642 */
  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    const configuration = LayoutProcessorConfiguration.createFrom(
      LayerSweepCrossingMinimizer.INTERMEDIATE_PROCESSING_CONFIGURATION,
    );
    configuration.addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.PORT_LIST_SORTER);

    return configuration;
  }

  /**
   * @returns the graphData (null before the first run: the Java field is unset until `initialize`)
   * @see LayerSweepCrossingMinimizer.java:653
   */
  getGraphData(): GraphInfoHolder[] | null {
    return this.state === undefined ? null : this.state.graphInfoHolders;
  }
}
