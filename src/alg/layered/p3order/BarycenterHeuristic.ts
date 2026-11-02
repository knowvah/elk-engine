// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import * as Float32 from '../../../java/lang/Float32.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { checkCast } from '../../../java/lang/JavaCast.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { Random } from '../../../java/util/Random.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';
import type { BarycenterHeuristicBarycenterState } from './BarycenterHeuristicBarycenterState.js';
import type { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import type { ICrossingMinimizationHeuristic } from './ICrossingMinimizationHeuristic.js';
import { insertionSort } from './ModelOrderBarycenterHeuristicInsertionSort.js';
import type { ClearsTransitiveOrdering, LNodeComparator } from './ModelOrderBarycenterHeuristicInsertionSort.js';

/** the amount of random value to add to each calculated barycenter. */
const RANDOM_AMOUNT: number = Float32.fromDouble(0.07);

/** Java's `ModelOrderBarycenterHeuristic` target of the cast in `minimizeCrossings`, see `ClearsTransitiveOrdering`. */
function isModelOrderBarycenterHeuristic(value: unknown): value is ClearsTransitiveOrdering {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { clearTransitiveOrdering?: unknown }).clearTransitiveOrdering === 'function'
  );
}

/**
 * One activation of `calculateBarycenter` on the explicit stack (C7): the position of the Java loops over the node's
 * ports, the fixed ports of the current port and the barycenter associates, and the node whose result the activation
 * waits for.
 */
interface BarycenterFrame {
  readonly node: LNode;
  readonly ports: Iterator<LPort>;
  /** The iterator over the fixed ports of the current free port, or `null` between two free ports. */
  fixedPorts: Iterator<LPort> | null;
  /** The iterator over the barycenter associates; `null` while the ports loop is running. */
  associates: Iterator<LNode> | null;
  /** The node a recursive call was made for, whose state is added once the call returns. */
  pending: LNode | null;
}

/**
 * Determines the node order of a given free layer. Uses heuristic methods to find an ordering that minimizes edge
 * crossings between the given free layer and a neighboring layer with fixed node order. The barycenter heuristic is
 * used here.
 *
 * The Java overload `minimizeCrossings(List<LNode>, boolean, boolean, boolean)` is `minimizeCrossingsInLayer` here
 * (translation-rules 6.5: its subclass override and the interface method of the same arity share a name in Java; the
 * suffix keeps the two apart without a run-time dispatch).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/BarycenterHeuristic.java
 */
export class BarycenterHeuristic implements ICrossingMinimizationHeuristic {
  /** the array of port ranks. */
  protected portRanks!: Float32Array;
  /** the random number generator. */
  protected readonly random: Random;
  /** the constraint resolver for ordering constraints. */
  protected constraintResolver: ForsterConstraintResolver;
  /** the barycenter values of every node in the graph, indexed by layer.id and node.id. */
  protected barycenterState!: BarycenterHeuristicBarycenterState[][];
  /** The Barycenter PortDistributor is used to ask for the port ranks. */
  protected readonly portDistributor: AbstractBarycenterPortDistributor;

  /**
   * Constructs a Barycenter heuristic for crossing minimization.
   *
   * @param constraintResolver the constraint resolver
   * @param random the random number generator
   * @param portDistributor calculates the port ranks for the barycenter heuristic.
   * @param graph current node order
   * @see BarycenterHeuristic.java:66
   */
  constructor(
    constraintResolver: ForsterConstraintResolver,
    random: Random,
    portDistributor: AbstractBarycenterPortDistributor,
    graph: LNode[][],
  ) {
    void graph; // unused in Java as well
    this.constraintResolver = constraintResolver;
    this.random = random;
    this.portDistributor = portDistributor;
  }

  /**
   * Don't use! Only public to be accessible by a test. Java overload `minimizeCrossings(List<LNode>, ...)`.
   *
   * @see BarycenterHeuristic.java:77
   */
  minimizeCrossingsInLayer(layer: LNode[], preOrdered: boolean, randomize: boolean, forward: boolean): void {
    if (randomize) {
      // Randomize barycenters (we don't need to update the edge count in this case;
      // there are no edges of interest since we're only concerned with one layer)
      // simply a permutation of nodes in layer
      this.randomizeBarycenters(layer);
    } else {
      // Calculate barycenters and assign barycenters to barycenterless node groups
      this.calculateBarycenters(layer, forward);
      this.fillInUnknownBarycenters(layer, preOrdered);
    }

    if (layer.length > 1) {
      // Sort the vertices according to their barycenters
      if (layer[0]!.getGraph()!.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER)) {
        insertionSort(
          layer,
          this.barycenterStateComparator,
          checkCast(
            this,
            isModelOrderBarycenterHeuristic,
            'org.eclipse.elk.alg.layered.p3order.ModelOrderBarycenterHeuristic',
          )!,
        );
      } else {
        // use comparator based on "<"
        layer.sort(this.barycenterStateComparator);
      }

      // Resolve ordering constraints
      this.constraintResolver.processConstraints(layer);
    }
  }

  /**
   * Randomize the order of nodes for the given layer.
   *
   * @param nodes a layer
   * @see BarycenterHeuristic.java:112
   */
  protected randomizeBarycenters(nodes: LNode[]): void {
    for (const node of nodes) {
      // Set barycenters only for nodeGroups containing a single node.
      this.stateOf(node).barycenter = this.random.nextDouble();
      this.stateOf(node).summedWeight = this.stateOf(node).barycenter!;
      this.stateOf(node).degree = 1;
    }
  }

  /**
   * Try to find appropriate barycenter values for node groups whose barycenter is undefined.
   *
   * @param nodes the nodeGroups to fill in barycenters for.
   * @param preOrdered whether the nodeGroups have been ordered in a previous run.
   * @see BarycenterHeuristic.java:129
   */
  protected fillInUnknownBarycenters(nodes: LNode[], preOrdered: boolean): void {
    // Determine placements for nodes with undefined barycenter value
    if (preOrdered) {
      this.fillInUnknownBarycentersPreOrdered(nodes);
    } else {
      this.fillInUnknownBarycentersRandomly(nodes);
    }
  }

  /** The `preOrdered` arm of {@link fillInUnknownBarycenters} (`BarycenterHeuristic.java:130-160`). */
  private fillInUnknownBarycentersPreOrdered(nodes: LNode[]): void {
    let lastValue = -1;
    const nodesIterator = new ArrayListIterator(nodes);

    while (nodesIterator.hasNext()) {
      const node = nodesIterator.next();
      let value = this.stateOf(node).barycenter;

      if (value === null) {
        // The barycenter is undefined - take the center of the previous value
        // and the next defined value in the list
        let nextValue = lastValue + 1;

        const nextNodeIterator = new ArrayListIterator(nodes, nodesIterator.nextIndex());
        while (nextNodeIterator.hasNext()) {
          const x = this.stateOf(nextNodeIterator.next()).barycenter;
          if (x !== null) {
            nextValue = x;
            break;
          }
        }

        value = (lastValue + nextValue) / 2;
        this.stateOf(node).barycenter = value;
        this.stateOf(node).summedWeight = value;
        this.stateOf(node).degree = 1;
      }

      lastValue = value;
    }
  }

  /** The `else` arm of {@link fillInUnknownBarycenters} (`BarycenterHeuristic.java:162-181`). */
  private fillInUnknownBarycentersRandomly(nodes: LNode[]): void {
    // No previous ordering - determine random placement for new nodes
    let maxBary = 0;
    for (const node of nodes) {
      if (this.stateOf(node).barycenter !== null) {
        maxBary = Math.max(maxBary, this.stateOf(node).barycenter!);
      }
    }

    maxBary += 2;
    for (const node of nodes) {
      if (this.stateOf(node).barycenter === null) {
        const value = this.random.nextFloat() * maxBary - 1;
        this.stateOf(node).barycenter = value;
        this.stateOf(node).summedWeight = value;
        this.stateOf(node).degree = 1;
      }
    }
  }

  /**
   * Calculate the barycenters of the given node groups.
   *
   * @param nodes the nodes
   * @param forward `true` if the current sweep moves forward
   * @see BarycenterHeuristic.java:191
   */
  protected calculateBarycenters(nodes: LNode[], forward: boolean): void {
    // Set all visited flags to false
    for (const node of nodes) {
      this.stateOf(node).visited = false;
    }

    for (const node of nodes) {
      // Calculate the node groups's new barycenter (may be null)
      this.calculateBarycenter(node, forward);
    }
  }

  /**
   * Calculate the barycenter of the given single-node node group. This method is able to handle in-layer edges, but it
   * may give incorrect results if the in-layer edges form a cycle. However, such cases do not occur in the present
   * implementation.
   *
   * The Java method recurses on the fixed nodes and barycenter associates that lie in the node's own layer (C7); this
   * port runs the same traversal on an explicit stack: each activation is a `BarycenterFrame` that resumes its loops
   * where the recursive call returned, adds the callee's state after it (the Java statements that follow each call),
   * and runs the Java epilogue (the random perturbation and the division) when its loops are exhausted. The order of
   * every addition and every `random.nextFloat()` draw is the Java order.
   *
   * @param node a node group consisting of a single node
   * @param forward `true` if the current sweep moves forward
   * @see BarycenterHeuristic.java:218
   */
  private calculateBarycenter(node: LNode, forward: boolean): void {
    const stack: BarycenterFrame[] = [];
    if (!this.enterBarycenter(node, stack)) {
      return;
    }
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.pending !== null) {
        // the statements that follow the recursive call
        this.addStateOf(frame.node, frame.pending);
        frame.pending = null;
      }
      const callee = this.nextCallee(frame, forward);
      if (callee === null) {
        this.finishBarycenter(frame.node);
        stack.pop();
      } else {
        frame.pending = callee;
        // an already visited callee returns at once; its state is added on the next turn
        this.enterBarycenter(callee, stack);
      }
    }
  }

  /**
   * The head of `calculateBarycenter`: the visited check and the reset of the node's state. Pushes the node's frame and
   * answers whether the node was not visited yet.
   */
  private enterBarycenter(node: LNode, stack: BarycenterFrame[]): boolean {
    // Check if the node group's barycenter was already computed
    if (this.stateOf(node).visited) {
      return false;
    } else {
      this.stateOf(node).visited = true;
    }

    this.stateOf(node).degree = 0;
    this.stateOf(node).summedWeight = 0.0;
    this.stateOf(node).barycenter = null;

    stack.push({
      node,
      ports: node.getPorts()[Symbol.iterator](),
      fixedPorts: null,
      associates: null,
      pending: null,
    });
    return true;
  }

  /**
   * Runs the loops of `calculateBarycenter` from the position stored in the frame up to the next recursive call and
   * answers its argument, or `null` when the loops are exhausted.
   */
  private nextCallee(frame: BarycenterFrame, forward: boolean): LNode | null {
    const node = frame.node;
    if (frame.associates === null) {
      const callee = this.nextPortCallee(frame, forward);
      if (callee !== null) {
        return callee;
      }
    }

    for (let associate = frame.associates!.next(); associate.done !== true; associate = frame.associates!.next()) {
      // Make sure the associate is in the same layer as this node
      if (node.getLayer() === associate.value.getLayer()) {
        // Find the associate's node group and calculate its barycenter
        return associate.value;
      }
    }
    return null;
  }

  /**
   * The loops over the node's ports and their fixed ports (`BarycenterHeuristic.java:231-255`): answers the node of the
   * next recursive call, or `null` after the loops ended, when the iterator over the barycenter associates is set.
   */
  private nextPortCallee(frame: BarycenterFrame, forward: boolean): LNode | null {
    const node = frame.node;
    for (;;) {
      if (frame.fixedPorts === null) {
        const freePort = frame.ports.next();
        if (freePort.done === true) {
          // Iterate over the node's barycenter associates
          const barycenterAssociates: LNode[] | null = node.getProperty(InternalProperties.BARYCENTER_ASSOCIATES);
          frame.associates = (barycenterAssociates ?? [])[Symbol.iterator]();
          return null;
        }
        const portIterable = forward ? freePort.value.getPredecessorPorts() : freePort.value.getSuccessorPorts();
        frame.fixedPorts = portIterable[Symbol.iterator]();
      }
      const fixedPort = frame.fixedPorts.next();
      if (fixedPort.done === true) {
        frame.fixedPorts = null;
        continue;
      }
      const callee = this.visitFixedPort(node, fixedPort.value);
      if (callee !== null) {
        return callee;
      }
    }
  }

  /**
   * The body of the inner port loop of `calculateBarycenter` (`BarycenterHeuristic.java:236-253`): answers the fixed
   * node to recurse on, or `null` after the rank was added.
   */
  private visitFixedPort(node: LNode, fixedPort: LPort): LNode | null {
    // If the node the fixed port belongs to is part of the free layer (thus, if
    // we have an in-layer edge), use that node's barycenter calculation instead
    const fixedNode = fixedPort.getNode()!;

    if (fixedNode.getLayer() === node.getLayer()) {
      // Self-loops are ignored
      if (fixedNode !== node) {
        // Find the fixed node's node group and calculate its barycenter
        return fixedNode;
      } // else { }
    } else {
      this.stateOf(node).summedWeight += this.portRanks[fixedPort.id]!;
      this.stateOf(node).degree++;
    }
    return null;
  }

  /** The statements after a recursive call: update this node group's values. */
  private addStateOf(node: LNode, callee: LNode): void {
    this.stateOf(node).degree = Int32.add(this.stateOf(node).degree, this.stateOf(callee).degree);
    this.stateOf(node).summedWeight += this.stateOf(callee).summedWeight;
  }

  /** The tail of `calculateBarycenter` (`BarycenterHeuristic.java:273-277`). */
  private finishBarycenter(node: LNode): void {
    if (this.stateOf(node).degree > 0) {
      // add a small random perturbation in order to increase diversity of solutions
      this.stateOf(node).summedWeight += Float32.sub(
        Float32.mul(this.random.nextFloat(), RANDOM_AMOUNT),
        Float32.div(RANDOM_AMOUNT, 2),
      );
      this.stateOf(node).barycenter = this.stateOf(node).summedWeight / this.stateOf(node).degree;
    }
  }

  /** @see BarycenterHeuristic.java:280 */
  protected stateOf(node: LNode): BarycenterHeuristicBarycenterState {
    return this.barycenterState[node.getLayer()!.id]![node.id]!;
  }

  /**
   * Compares two {@link LNode}s based on their barycenter values.
   *
   * @see BarycenterHeuristic.java:321
   */
  protected barycenterStateComparator: LNodeComparator = (n1, n2) => {
    const s1 = this.stateOf(n1);
    const s2 = this.stateOf(n2);
    if (s1.barycenter !== null && s2.barycenter !== null) {
      return doubleCompare(s1.barycenter, s2.barycenter);
    } else if (s1.barycenter !== null) {
      return -1;
    } else if (s2.barycenter !== null) {
      return 1;
    }
    return 0;
  };

  /** @see BarycenterHeuristic.java:336 */
  minimizeCrossings(order: LNode[][], freeLayerIndex: number, forwardSweep: boolean, isFirstSweep: boolean): boolean {
    if (!this.isFirstLayer(order, freeLayerIndex, forwardSweep)) {
      const fixedLayer = order[freeLayerIndex - this.changeIndex(forwardSweep)]!;
      this.portDistributor.calculatePortRanks(fixedLayer, this.portTypeFor(forwardSweep));
    }

    const firstNodeInLayer = order[freeLayerIndex]![0]!;
    const preOrdered = !isFirstSweep || this.isExternalPortDummy(firstNodeInLayer);

    const nodes: LNode[] = [...order[freeLayerIndex]!];
    this.minimizeCrossingsInLayer(nodes, preOrdered, false, forwardSweep);
    // apply the new ordering
    let index = 0;
    for (const nodeGroup of nodes) {
      order[freeLayerIndex]![index++] = nodeGroup;
    }

    return false; // Does not always improve.
  }

  /** @see BarycenterHeuristic.java:358 */
  setFirstLayerOrder(order: LNode[][], isForwardSweep: boolean): boolean {
    // if sweeping forward, startIndex = 0, else the last existing element of order
    const startIndex = this.startIndex(isForwardSweep, order.length);
    // extract first layer into List<LNode>
    const nodes: LNode[] = [...order[startIndex]!];
    // randomize nodes' barycenters
    this.minimizeCrossingsInLayer(nodes, false, true, isForwardSweep);
    // fill first layer with nodes
    let index = 0;
    for (const nodeGroup of nodes) {
      order[startIndex]![index++] = nodeGroup;
    }

    return false; // Does not always improve
  }

  /** @see BarycenterHeuristic.java:375 */
  private isExternalPortDummy(firstNode: LNode): boolean {
    return firstNode.getType() === NodeType.EXTERNAL_PORT;
  }

  /** @see BarycenterHeuristic.java:379 */
  private changeIndex(dir: boolean): number {
    return dir ? 1 : -1;
  }

  /** @see BarycenterHeuristic.java:383 */
  private portTypeFor(direction: boolean): PortType {
    return direction ? PortType.OUTPUT : PortType.INPUT;
  }

  /** @see BarycenterHeuristic.java:387 */
  private startIndex(dir: boolean, length: number): number {
    return dir ? 0 : Math.max(0, length - 1);
  }

  /** @see BarycenterHeuristic.java:391 */
  private isFirstLayer(nodeOrder: LNode[][], currentIndex: number, forwardSweep: boolean): boolean {
    return currentIndex === this.startIndex(forwardSweep, nodeOrder.length);
  }

  /** @see BarycenterHeuristic.java:397 */
  alwaysImproves(): boolean {
    return false;
  }

  /** @see BarycenterHeuristic.java:402 */
  isDeterministic(): boolean {
    return false;
  }

  /** @see BarycenterHeuristic.java:407 */
  initAfterTraversal(): void {
    this.barycenterState = this.constraintResolver.getBarycenterStates();
    this.portRanks = this.portDistributor.getPortRanks();
  }

  /** @see BarycenterHeuristic.java:413 */
  initAtLayerLevel(l: number, nodeOrder: LNode[][]): void {
    nodeOrder[l]![0]!.getLayer()!.id = l;
  }
}
