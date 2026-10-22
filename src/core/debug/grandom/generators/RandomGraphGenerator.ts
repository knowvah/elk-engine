// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import { shuffle } from '../../../../java/util/Collections.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import { Random } from '../../../../java/util/Random.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import type { Configuration } from '../gRandom/Configuration.js';
import { ConfigurationParser } from './ConfigurationParser.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import type { RandVal } from './RandVal.js';
import {
  connect,
  connected,
  connectRandomlyAndConditional,
  determineOutgoingEdges,
  type EdgeCondition,
  findNodeWithDFS,
  removeIsolatedNodes,
} from './RandomGraphGeneratorConnect.js';
import { createIndependentSet, distributePorts } from './RandomGraphGeneratorElements.js';
import { determineEdgeCount, generateAnyGraph, generateByGraphType } from './RandomGraphGeneratorTypes.js';

/**
 * Java would throw a `NullPointerException` on dereferencing `null` (translation rules, D10: a
 * `TypeError` here). Narrows the value for the checked sites where the Java relies on that.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function nonNull<T>(value: T | null): T {
  if (value === null) {
    throw new TypeError('Unexpected null (a NullPointerException in the Java original)');
  }
  return value;
}

/**
 * The random graph generator for ELK graphs.
 *
 * The Java class is split by section into helper files (mission decision D4): the element
 * creation, connection and rewiring methods are exported functions taking the generator as their
 * first parameter (`RandomGraphGeneratorElements.ts`, `...Connect.ts`, `...Rewire.ts`). The state
 * fields are `private` in Java and non-private here so those helpers can reach them.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export class RandomGraphGenerator {
  /**
   * minimal separation of ports (a Java `float`).
   *
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  static readonly PORT_SEPARATION: number = Math.fround(7.0);

  /**
   * the maximal number of iterations for distributing edges (`private` in Java).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  static readonly MAX_ITER: number = 12;

  /**
   * the generator options holder; `null` until `generate` assigns it, as in Java.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  options: GeneratorOptions | null = null;

  /**
   * the random number generator used to generate the graph.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  random: Random;

  /**
   * the counter used to generate node labels.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  nodeLabelCounter: number = 0;

  /**
   * the counter used to generate port labels.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  portLabelCounter: number = 0;

  /**
   * the maximal hierarchy level.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  maxHierarchyLevel: number = 0;

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Constructor

  /**
   * Create a random graph generator with given random number generator.
   *
   * @param random a random number generator
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  constructor(random: Random) {
    this.random = random;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Random Graph Generation API

  /**
   * Generate a random graph based on the given generator options. (Java overload
   * `generate(GeneratorOptions)`; told apart from the configuration overload by the argument's runtime
   * type: translation rule 6.5.)
   *
   * @param opts the generator options
   * @returns the generated graph
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  generate(opts: GeneratorOptions): ElkNode;
  /**
   * Creates a number of random graphs based on the supplied configuration.
   *
   * @param config the configuration
   * @returns the generated graphs
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  generate(config: Configuration): ElkNode[];
  generate(optsOrConfig: GeneratorOptions | Configuration): ElkNode | ElkNode[] {
    if (optsOrConfig instanceof GeneratorOptions) {
      return this.generateFromOptions(optsOrConfig);
    }
    return this.generateFromConfiguration(optsOrConfig);
  }

  /** Java `generate(GeneratorOptions)`. */
  private generateFromOptions(opts: GeneratorOptions): ElkNode {
    // reset the generator
    this.nodeLabelCounter = 0;
    this.portLabelCounter = 0;
    this.options = opts;
    // generate the graph
    const parent = ElkGraphUtil.createGraph();
    this.maxHierarchyLevel = this.get(GeneratorOptions.MAX_HIERARCHY_LEVEL).intVal(this.random);
    if (this.get(GeneratorOptions.SMALL_HIERARCHY)) {
      const atomicNodesOnLevels = this.addHierarchicalNodes(parent);
      this.connectAtomicNodesOnDifferentLevels(atomicNodesOnLevels);
      return parent;
    } else {
      return this.makeGraph(parent);
    }
  }

  /** Java `generate(Configuration)`. */
  private generateFromConfiguration(config: Configuration): ElkNode[] {
    const generated: ElkNode[] = [];

    // Parse configuration
    this.random = this.randomGeneratorFromConfig(config);
    const opts = ConfigurationParser.parse(config, this.random);

    // Generate graphs
    const graphCount = Math.max(1, config.getSamples());
    for (let i = 0; i < graphCount; i++) {
      generated.push(this.generateFromOptions(opts));
    }

    return generated;
  }

  /**
   * Returns a new random number generator initialized with a seed as specified by the supplied configuration.
   *
   * @param config the configuration
   * @returns a new random number generator
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  randomGeneratorFromConfig(config: Configuration): Random {
    const seed = config.getSeed();
    if (seed === null) {
      return new Random();
    } else {
      return new Random(seed);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Implementation

  /**
   * @param parent the root of the hierarchy
   * @returns the atomic nodes of every generated level, grouped by their parent
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  addHierarchicalNodes(parent: ElkNode): ElkNode[][] {
    // List that contains all the generated children(children of the same node are in the same
    // sublist)
    const atomicNodes: ElkNode[][] = [];
    const allGraphs = new LinkedList<ElkNode>();

    // the graphs in the actual level(that should get children)
    allGraphs.addFirst(parent);
    for (let i = 0; i < this.maxHierarchyLevel; i++) {
      const hierarchicalNodes: ElkNode[] = [];
      while (!allGraphs.isEmpty()) {
        const p = allGraphs.removeFirst();
        this.makeGraph(p);
        // Must copy list, because eclipse EList cannot be shuffled.
        if (!p.getChildren().isEmpty()) {
          atomicNodes.push(p.getChildren().toArray());
        }
        // Do not add more hierarchical nodes on lowest level.
        if (i < this.maxHierarchyLevel - 1) {
          const numHierarch = this.get(GeneratorOptions.NUMBER_HIERARCHICAL_NODES).intVal(this.random);
          hierarchicalNodes.push(...createIndependentSet(this, p, numHierarch));
        }
      }
      for (const node of hierarchicalNodes) {
        allGraphs.addFirst(node);
      }
    }
    return atomicNodes;
  }

  /**
   * The first half of Java `connectAtomicNodesOnDifferentLevels`: the number of edges to create
   * across the levels.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  determineCrossHierarchyCount(atomicNodes: readonly ElkNode[][]): number {
    const exactRelativeHier = this.get(GeneratorOptions.EXACT_RELATIVE_HIER) as RandVal | null;
    if (exactRelativeHier === null) {
      return this.get(GeneratorOptions.CROSS_HIER).intVal(this.random);
    }
    const newHashSet = new Set<ElkEdge>();
    for (const level of atomicNodes) {
      for (const node of level) {
        for (const edge of node.getIncomingEdges()) newHashSet.add(edge);
        for (const edge of node.getOutgoingEdges()) newHashSet.add(edge);
      }
    }
    return d2i(newHashSet.size * exactRelativeHier.val(this.random));
  }

  /**
   * @param atomicNodes the atomic nodes of every level
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  connectAtomicNodesOnDifferentLevels(atomicNodes: readonly ElkNode[][]): void {
    const numCrossHier = this.determineCrossHierarchyCount(atomicNodes);
    if (atomicNodes.length < 2) {
      return;
    }
    for (let i = 0; i < numCrossHier; i++) {
      if (atomicNodes.length > 1) {
        this.connectSampledNodes(atomicNodes);
      }
    }
  }

  /**
   * The body of the loop of Java `connectAtomicNodesOnDifferentLevels`: connects a random node of one
   * random level to a random node of another.
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  connectSampledNodes(atomicNodes: readonly ElkNode[][]): void {
    const levels = this.sample(atomicNodes, 2);
    const source = this.sample(nonNull(levels[0] ?? null), 1)[0];
    const target = this.sample(nonNull(levels[1] ?? null), 1)[0];
    connect(this, nonNull(source ?? null), nonNull(target ?? null));
  }

  /**
   * Shuffles a copy of the list with the unseeded one-argument `Collections.shuffle` (D7) and
   * returns its first `number` elements.
   *
   * @param list the list to sample from
   * @param number the number of elements
   * @returns the sample
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  sample<T>(list: readonly T[], number: number): T[] {
    const shuffleThis = [...list];
    shuffle(shuffleThis);
    if (number > list.length) {
      return shuffleThis;
    }
    return shuffleThis.slice(0, number);
  }

  /**
   * @param graph the graph to fill
   * @returns the graph
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  makeGraph(graph: ElkNode): ElkNode {
    if (!this.get(GeneratorOptions.ENABLE_HIERARCHY)) {
      this.set(GeneratorOptions.HIERARCHY_CHANCE, Math.fround(0.0));
      this.set(GeneratorOptions.CROSS_HIERARCHY_EDGES, false);
    }

    // initialize basic properties
    const n = this.get(GeneratorOptions.NUMBER_OF_NODES).intVal(this.random);
    const m = determineEdgeCount(this, n);
    generateByGraphType(this, graph, n, m);

    // remove isolated nodes if requested
    if (!this.get(GeneratorOptions.ISOLATED_NODES)) {
      removeIsolatedNodes(graph);
    }

    // if ports require a predefined position, assign it to all ports
    if (
      this.get(GeneratorOptions.ENABLE_PORTS) &&
      this.get(GeneratorOptions.PORT_CONSTRAINTS) === PortConstraints.FIXED_POS
    ) {
      const nodeQueue = new LinkedList<ElkNode>();
      nodeQueue.add(graph);
      do {
        const node = nodeQueue.removeFirst();
        distributePorts(this, node);
        nodeQueue.addAll(node.getChildren());
      } while (!nodeQueue.isEmpty());
    }

    return graph;
  }

  /**
   * @param n the number of nodes
   * @param m the number of edges
   * @param graph the graph to fill
   * @returns the generated nodes
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  generateCustomGraph(n: number, m: number, graph: ElkNode): ElkNode[] {
    let generatedNodes: ElkNode[];
    switch (this.get(GeneratorOptions.EDGE_DETERMINATION)) {
      case EdgeDetermination.OUTGOING:
        generatedNodes = generateAnyGraph(this, graph, n, 0);
        break;
      default:
        generatedNodes = generateAnyGraph(this, graph, n, m, 0);
    }

    // TODO-alan consider removal
    if (this.get(GeneratorOptions.CROSS_HIERARCHY_EDGES)) {
      // create edges randomly across the whole compound graph, crossing hierarchy borders
      switch (this.get(GeneratorOptions.EDGE_DETERMINATION)) {
        case EdgeDetermination.OUTGOING: {
          const outgoingEdges = determineOutgoingEdges(this, generatedNodes, this.get(GeneratorOptions.OUTGOING_EDGES));
          connectRandomlyAndConditional(this, generatedNodes, outgoingEdges, this.basicCondition);
          break;
        }
        default: {
          let createdEdges = 0;
          let iterations = 0;
          do {
            const outgoingEdges = determineOutgoingEdges(this, generatedNodes, m - createdEdges);
            createdEdges += connectRandomlyAndConditional(this, generatedNodes, outgoingEdges, this.basicCondition);
            iterations++;
          } while (createdEdges < m && iterations < RandomGraphGenerator.MAX_ITER);
        }
      }
    }

    return generatedNodes;
  }

  /**
   * the basic condition which cares for self-loops, multi-edges and cycles (a field initialised
   * with an anonymous class in Java).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  readonly basicCondition: EdgeCondition = {
    evaluate: (node1: ElkNode, node2: ElkNode): boolean => {
      if (!this.get(GeneratorOptions.SELF_LOOPS) && node1 === node2) {
        return false;
      }
      if (!this.get(GeneratorOptions.MULTI_EDGES) && connected(node1, node2)) {
        return false;
      }
      if (!this.get(GeneratorOptions.CYCLES) && findNodeWithDFS(node2, node1)) {
        return false;
      }
      return true;
    },
  };

  /**
   * Returns a random integer number in the given range (including the boundaries). The Java
   * `assert from <= to` is disabled in the JVM by default and omitted (no dev-assert helper exists).
   *
   * @param from the minimal number
   * @param to the maximal number
   * @returns a random integer number
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  randomInt(from: number, to: number): number {
    return from + this.random.nextInt(to - from + 1);
  }

  /**
   * Determine whether the given node is a hypernode.
   *
   * @param node a node
   * @returns true if the node is a hypernode
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  static isHypernode(node: ElkNode): boolean {
    return node.getProperty(CoreOptions.HYPERNODE);
  }

  /**
   * The value of an option; a `null` options holder is a `NullPointerException` in Java (`TypeError`).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  get<T>(property: IProperty<T>): T {
    return nonNull(this.options).getProperty(property);
  }

  /**
   * Sets an option; a `null` options holder is a `NullPointerException` in Java (`TypeError`).
   *
   * @internal
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
   */
  set<T>(property: IProperty<T>, val: T): void {
    nonNull(this.options).setProperty(property, val);
  }
}
