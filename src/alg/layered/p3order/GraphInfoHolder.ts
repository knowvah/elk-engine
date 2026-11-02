// SPDX-License-Identifier: EPL-2.0
import type { Random } from '../../../java/util/Random.js';
import { GreedySwitchHeuristic } from '../intermediate/greedyswitch/GreedySwitchHeuristic.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';
import { BarycenterHeuristic } from './BarycenterHeuristic.js';
import { AllCrossingsCounter } from './counting/AllCrossingsCounter.js';
import { init, type IInitializable } from './counting/IInitializable.js';
import { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import type { ICrossingMinimizationHeuristic } from './ICrossingMinimizationHeuristic.js';
import * as ISweepPortDistributor from './ISweepPortDistributor.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { LayerSweepTypeDecider } from './LayerSweepTypeDecider.js';
import { MedianHeuristic } from './MedianHeuristic.js';
import { ModelOrderBarycenterHeuristic } from './ModelOrderBarycenterHeuristic.js';
import { SweepCopy } from './SweepCopy.js';

/**
 * Collects data needed for cross minimization and port distribution.
 *
 * Must be initialized using `IInitializable.init`!
 *
 * @author alan
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/GraphInfoHolder.java
 */
export class GraphInfoHolder implements IInitializable {
  /** Raw graph data. */
  readonly #lGraph: LGraph;

  /** Saved node orders. */
  readonly #currentNodeOrder: LNode[][];
  #currentlyBestNodeAndPortOrder: SweepCopy | null = null;
  private bestNodeAndPortOrder: SweepCopy | null = null;
  #portPositions: Int32Array | null = null;

  /** Processing type information. */
  private readonly useBottomUp: boolean;

  /** Hierarchy access. */
  readonly #childGraphs: LGraph[];
  readonly #hasExternalPorts: boolean;
  readonly #hasParent: boolean;
  readonly #parentGraphData: GraphInfoHolder | null;
  readonly #parent: LNode | null;
  private readonly layerSweepTypeDecider: LayerSweepTypeDecider;

  /** Pre-initialized auxiliary objects. */
  #crossMinimizer!: ICrossingMinimizationHeuristic;
  readonly #portDistributor: ISweepPortDistributor.ISweepPortDistributor;
  private readonly crossingsCounter: AllCrossingsCounter;
  private nPorts = 0;

  /**
   * Create object collecting information about a graph.
   *
   * @param graph The graph
   * @param crossMinType The CrossMinimizer
   * @param graphs the complete list of all graphs in the hierarchy
   * @see GraphInfoHolder.java:80
   */
  constructor(graph: LGraph, crossMinType: CrossMinType, graphs: GraphInfoHolder[]) {
    this.#lGraph = graph;
    this.#currentNodeOrder = graph.toNodeArray();

    // Hierarchy information.
    this.#parent = this.#lGraph.getParentNode();
    this.#hasParent = this.#parent !== null;
    this.#parentGraphData = this.#hasParent ? graphs[this.#parent!.getGraph()!.id]! : null;
    const graphProperties = graph.getProperty(InternalProperties.GRAPH_PROPERTIES);
    this.#hasExternalPorts = graphProperties.contains(GraphProperties.EXTERNAL_PORTS);
    this.#childGraphs = [];

    // Init all objects needing initialization by graph traversal.
    this.crossingsCounter = new AllCrossingsCounter(this.#currentNodeOrder);
    const random = this.#lGraph.getProperty(InternalProperties.RANDOM);
    this.#portDistributor = ISweepPortDistributor.create(crossMinType, random, this.#currentNodeOrder);
    this.layerSweepTypeDecider = new LayerSweepTypeDecider(this);
    const initializables: IInitializable[] = [
      this,
      this.crossingsCounter,
      this.layerSweepTypeDecider,
      this.#portDistributor,
    ];

    this.#crossMinimizer = this.createCrossMinimizer(crossMinType, graph, random, initializables);
    initializables.push(this.#crossMinimizer);

    // Apply Initializer.
    init(initializables, this.#currentNodeOrder);

    // calculate whether we need to use bottom up or sweep into this graph.
    this.useBottomUp = this.layerSweepTypeDecider.useBottomUp();
  }

  /**
   * The `if`/`else` chain of the Java constructor that picks the heuristic (`GraphInfoHolder.java:100-116`); the
   * constraint resolver is added to `initializables` before the heuristic, as there.
   */
  private createCrossMinimizer(
    crossMinType: CrossMinType,
    graph: LGraph,
    random: Random,
    initializables: IInitializable[],
  ): ICrossingMinimizationHeuristic {
    const order = this.#currentNodeOrder;
    const distributor = this.#portDistributor as AbstractBarycenterPortDistributor;
    if (
      crossMinType === CrossMinType.BARYCENTER &&
      !graph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER)
    ) {
      const constraintResolver = this.newConstraintResolver(initializables);
      return new BarycenterHeuristic(constraintResolver, random, distributor, order);
    } else if (
      crossMinType === CrossMinType.BARYCENTER &&
      graph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER)
    ) {
      const constraintResolver = this.newConstraintResolver(initializables);
      return new ModelOrderBarycenterHeuristic(constraintResolver, random, distributor, order);
    } else if (crossMinType === CrossMinType.MEDIAN) {
      return new MedianHeuristic(random);
    } else {
      return new GreedySwitchHeuristic(crossMinType, this);
    }
  }

  /** The two lines that create and register the `ForsterConstraintResolver`, repeated in both barycenter branches. */
  private newConstraintResolver(initializables: IInitializable[]): ForsterConstraintResolver {
    const constraintResolver = new ForsterConstraintResolver(this.#currentNodeOrder);
    initializables.push(constraintResolver);
    return constraintResolver;
  }

  /**
   * @returns the processRecursively
   * @see GraphInfoHolder.java:129
   */
  dontSweepInto(): boolean {
    return this.useBottomUp;
  }

  /**
   * @returns the lGraph
   * @see GraphInfoHolder.java:136
   */
  lGraph(): LGraph {
    return this.#lGraph;
  }

  /**
   * @returns the currentNodeOrder
   * @see GraphInfoHolder.java:143
   */
  currentNodeOrder(): LNode[][] {
    return this.#currentNodeOrder;
  }

  /**
   * @returns the currentlyBestNodeAndPortOrder
   * @see GraphInfoHolder.java:150
   */
  currentlyBestNodeAndPortOrder(): SweepCopy | null {
    return this.#currentlyBestNodeAndPortOrder;
  }

  /**
   * @param currentlyBestNodeAndPortOrder the currentlyBestNodeAndPortOrder to set
   * @see GraphInfoHolder.java:158
   */
  setCurrentlyBestNodeAndPortOrder(currentlyBestNodeAndPortOrder: SweepCopy): void {
    this.#currentlyBestNodeAndPortOrder = currentlyBestNodeAndPortOrder;
  }

  /**
   * @returns the bestNodeNPortOrder
   * @see GraphInfoHolder.java:165
   */
  bestNodeNPortOrder(): SweepCopy | null {
    return this.bestNodeAndPortOrder;
  }

  /**
   * @param bestNodeNPortOrder the bestNodeNPortOrder to set
   * @see GraphInfoHolder.java:173
   */
  setBestNodeNPortOrder(bestNodeNPortOrder: SweepCopy): void {
    this.bestNodeAndPortOrder = bestNodeNPortOrder;
  }

  /**
   * @returns the crossCounter
   * @see GraphInfoHolder.java:180
   */
  crossCounter(): AllCrossingsCounter {
    return this.crossingsCounter;
  }

  /**
   * @returns the crossMinimizer
   * @see GraphInfoHolder.java:187
   */
  crossMinimizer(): ICrossingMinimizationHeuristic {
    return this.#crossMinimizer;
  }

  /**
   * @returns the portDistributor
   * @see GraphInfoHolder.java:194
   */
  portDistributor(): ISweepPortDistributor.ISweepPortDistributor {
    return this.#portDistributor;
  }

  /**
   * @returns the parent
   * @see GraphInfoHolder.java:201
   */
  parent(): LNode | null {
    return this.#parent;
  }

  /**
   * @returns the hasParent
   * @see GraphInfoHolder.java:208
   */
  hasParent(): boolean {
    return this.#hasParent;
  }

  /**
   * @returns child graphs
   * @see GraphInfoHolder.java:215
   */
  childGraphs(): LGraph[] {
    return this.#childGraphs;
  }

  /**
   * @returns whether this graph's parent node has external ports.
   * @see GraphInfoHolder.java:222
   */
  hasExternalPorts(): boolean {
    return this.#hasExternalPorts;
  }

  /** @see GraphInfoHolder.java:227 */
  toString(): string {
    return `[${this.#currentNodeOrder.map((layer) => `[${layer.map((node) => node.toString()).join(', ')}]`).join(', ')}]`;
  }

  /**
   * @returns Copy of node order for currently best sweep.
   * @see GraphInfoHolder.java:234
   */
  getBestSweep(): SweepCopy | null {
    return this.#crossMinimizer.isDeterministic() ? this.currentlyBestNodeAndPortOrder() : this.bestNodeNPortOrder();
  }

  /**
   * @returns the parentGraphData
   * @see GraphInfoHolder.java:241
   */
  parentGraphData(): GraphInfoHolder | null {
    return this.#parentGraphData;
  }

  /** @see GraphInfoHolder.java:248 */
  crossMinDeterministic(): boolean {
    return this.#crossMinimizer.isDeterministic();
  }

  /**
   * @returns whether this CrossingMinimizer always improves
   * @see GraphInfoHolder.java:255
   */
  crossMinAlwaysImproves(): boolean {
    return this.#crossMinimizer.alwaysImproves();
  }

  /**
   * Return port position array of the necessary length. Each algorithm must initialize the actual positions
   * separately.
   *
   * @returns port position array
   * @see GraphInfoHolder.java:265
   */
  portPositions(): Int32Array {
    return this.#portPositions!;
  }

  /** @see GraphInfoHolder.java:270 */
  initAtNodeLevel(l: number, n: number, nodeOrder: LNode[][]): void {
    const node = nodeOrder[l]![n]!;
    const nestedGraph = node.getNestedGraph();
    if (nestedGraph !== null) {
      this.#childGraphs.push(nestedGraph);
    }
  }

  /** @see GraphInfoHolder.java:279 */
  initAtPortLevel(_l: number, _n: number, _p: number, _nodeOrder: LNode[][]): void {
    this.nPorts++;
  }

  /** @see GraphInfoHolder.java:284 */
  initAfterTraversal(): void {
    this.#portPositions = new Int32Array(this.nPorts);
  }
}
