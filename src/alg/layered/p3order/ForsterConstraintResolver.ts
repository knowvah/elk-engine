// SPDX-License-Identifier: EPL-2.0
import * as Float32 from '../../../java/lang/Float32.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { identity } from '../../../java/util/HashStrategy.js';
import { LinkedHashMultimap } from '../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../guava/Multimap.js';
import { Pair } from '../../../core/util/Pair.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { BarycenterHeuristicBarycenterState } from './BarycenterHeuristicBarycenterState.js';
import { ForsterConstraintResolverConstraintGroup, removeFirst } from './ForsterConstraintResolverConstraintGroup.js';
import type { IInitializable } from './counting/IInitializable.js';

/**
 * Detects and resolves violated constraints. Inspired by
 *
 * - Michael Forster. A fast and simple heuristic for constrained two-level crossing reduction. In _Graph Drawing_,
 *   volume 3383 of LNCS, pp. 206-216. Springer, 2005.
 *
 * This constraint resolver relies on the assumption that all node groups have well-defined barycenter values and are
 * already sorted by these barycenter values.
 *
 * Must be initialized using `IInitializable.init`!
 *
 * The Java overloads `initAtNodeLevel(LNode, boolean)` and `processConstraints(List, boolean)` are private here as
 * `initAtNodeLevelOf` and `processConstraintsStage` (neither is recursive: each is called by the like-named method of
 * the interface or public API with different arguments); the inner class `ConstraintGroup` is
 * `ForsterConstraintResolverConstraintGroup` (M15).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/ForsterConstraintResolver.java
 */
export class ForsterConstraintResolver implements IInitializable {
  /** Whether there are successor constraints between non-dummies. */
  private constraintsBetweenNonDummies = false;
  /**
   * the layout units for handling dummy nodes for north / south ports. Java `LinkedHashMultimap` over identity-hashed
   * nodes (AD-10): insertion order, per key and across keys.
   */
  private layoutUnits: Multimap<LNode, LNode>;
  /** the barycenter values of every node in the graph, indexed by layer.id and node.id. */
  private barycenterStates: BarycenterHeuristicBarycenterState[][];
  /** the constraint groups, indexed by layer.id and node.id. */
  private constraintGroups: ForsterConstraintResolverConstraintGroup[][];

  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Initialisation

  /**
   * Creates a new instance which must be initialized using `IInitializable.init`.
   *
   * @param currentNodeOrder the current node order
   * @see ForsterConstraintResolver.java:65
   */
  constructor(currentNodeOrder: LNode[][]) {
    if (currentNodeOrder.length > 0 && currentNodeOrder[0]!.length > 0) {
      this.constraintsBetweenNonDummies = currentNodeOrder[0]![0]!
        .getGraph()!
        .getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES);
    }
    this.barycenterStates = new Array<BarycenterHeuristicBarycenterState[]>(currentNodeOrder.length);
    this.constraintGroups = new Array<ForsterConstraintResolverConstraintGroup[]>(currentNodeOrder.length);
    this.layoutUnits = LinkedHashMultimap.create<LNode, LNode>(identity<LNode>(), identity<LNode>());
  }

  /** @see ForsterConstraintResolver.java:76 */
  initAtLayerLevel(l: number, nodeOrder: LNode[][]): void {
    this.barycenterStates[l] = new Array<BarycenterHeuristicBarycenterState>(nodeOrder[l]!.length);
    this.constraintGroups[l] = new Array<ForsterConstraintResolverConstraintGroup>(nodeOrder[l]!.length);
  }

  /** @see ForsterConstraintResolver.java:82 */
  initAtNodeLevel(l: number, n: number, nodeOrder: LNode[][]): void {
    this.initAtNodeLevelOf(nodeOrder[l]![n]!, true);
  }

  /**
   * Inits data structures for the given node. Java overload `initAtNodeLevel(LNode, boolean)`.
   *
   * @param node the node for which to initialize the data structures.
   * @param fullInit if `true`, this will also initialize barycenter states and layout units. This only needs to be
   *   done once, when the resolver is first initialized. The layout units remain stable, and the barycenter states are
   *   updated while the resolver is running.
   * @see ForsterConstraintResolver.java:96
   */
  private initAtNodeLevelOf(node: LNode, fullInit: boolean): void {
    const layerIndex = node.getLayer()!.id;
    const nodeIndex = node.id;

    this.constraintGroups[layerIndex]![nodeIndex] = new ForsterConstraintResolverConstraintGroup(this, node);

    if (fullInit) {
      this.barycenterStates[layerIndex]![nodeIndex] = new BarycenterHeuristicBarycenterState(node);

      const layoutUnit: LNode | null = node.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);
      if (layoutUnit !== null) {
        this.layoutUnits.put(layoutUnit, node);
      }
    }
  }

  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessors

  /**
   * Returns the barycenter states.
   *
   * @see ForsterConstraintResolver.java:118
   */
  getBarycenterStates(): BarycenterHeuristicBarycenterState[][] {
    return this.barycenterStates;
  }

  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Constraint Processing

  /**
   * Finds and handles violated in-layer successor constraints.
   *
   * @param nodes list of nodes to handle constraints for.
   * @see ForsterConstraintResolver.java:131
   */
  processConstraints(nodes: LNode[]): void {
    // If there are successor constraints between regular (or normal) nodes, we have to apply a two-stage process:
    // in stage 1, we resolve constraints between the normal nodes. In stage 2, we ensure that all of their north /
    // south port dummies are in order and that no layout units overlap. For the latter to work properly, we need
    // the order of normal nodes to be fixed, hence the first stage.
    if (this.constraintsBetweenNonDummies) {
      this.processConstraintsStage(nodes, true);
      nodes.forEach((node) => this.initAtNodeLevelOf(node, false));
    }

    this.processConstraintsStage(nodes, false);
  }

  /** Java overload `processConstraints(List<LNode>, boolean)`. @see ForsterConstraintResolver.java:144 */
  private processConstraintsStage(nodes: LNode[], onlyBetweenNormalNodes: boolean): void {
    const groups: ForsterConstraintResolverConstraintGroup[] = [];
    for (const node of nodes) {
      groups.push(this.constraintGroups[node.getLayer()!.id]![node.id]!);
    }

    // Build the constraints graph
    this.buildConstraintsGraph(groups, onlyBetweenNormalNodes);

    // Find violated vertices
    let violatedConstraint: Pair<
      ForsterConstraintResolverConstraintGroup,
      ForsterConstraintResolverConstraintGroup
    > | null = null;
    while ((violatedConstraint = this.findViolatedConstraint(groups)) !== null) {
      this.handleViolatedConstraint(violatedConstraint.getFirst()!, violatedConstraint.getSecond()!, groups);
    }

    // Apply the determined order
    nodes.length = 0;
    for (const group of groups) {
      for (const node of group.getNodes()) {
        nodes.push(node);
        this.stateOf(node).barycenter = group.getBarycenter();
      }
    }
  }

  /**
   * Build the constraint graph for the given vertices. The constraint graph is created from the predefined
   * _in-layer successor constraints_ and the _layout units_.
   *
   * @param groups the array of single-node vertices sorted by their barycenter values.
   * @see ForsterConstraintResolver.java:176
   */
  private buildConstraintsGraph(
    groups: ForsterConstraintResolverConstraintGroup[],
    onlyBetweenNormalNodes: boolean,
  ): void {
    // Reset the constraint fields
    for (const group of groups) {
      group.resetOutgoingConstraints();
      group.incomingConstraintsCount = 0;
    }

    // Iterate through the vertices, adding the necessary constraints
    let lastNonDummyNode: LNode | null = null;
    for (const group of groups) {
      // at this stage all groups should consist of a single node
      const node = group.getNode();

      // We may want to skip this
      if (onlyBetweenNormalNodes && node.getType() !== NodeType.NORMAL) {
        continue;
      }

      // Add the constraints given by the vertex's node
      this.addSuccessorConstraints(group, node, onlyBetweenNormalNodes);

      // Check if we're processing a a normal, none-dummy node. If this is the case, we may want to insert
      // additional constraints between the previous normal node's layout unit and the current node's layout
      // unit to be sure they won't mix. This requires that the normal nodes won't change order, however.
      if (!onlyBetweenNormalNodes && node.getType() === NodeType.NORMAL) {
        // If we already processed another normal, non-dummy node, we need to add
        // constraints from all of that other node's layout unit's vertices to this
        // node's layout unit's vertices
        if (lastNonDummyNode !== null) {
          this.addLayoutUnitConstraints(lastNonDummyNode, node);
        }

        lastNonDummyNode = node;
      }
    }
  }

  /** The successor loop of `buildConstraintsGraph` (`ForsterConstraintResolver.java:195-200`). */
  private addSuccessorConstraints(
    group: ForsterConstraintResolverConstraintGroup,
    node: LNode,
    onlyBetweenNormalNodes: boolean,
  ): void {
    for (const successor of node.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS)) {
      if (!onlyBetweenNormalNodes || successor.getType() === NodeType.NORMAL) {
        group.getOutgoingConstraints().push(this.groupOf(successor));
        this.groupOf(successor).incomingConstraintsCount++;
      }
    }
  }

  /** The nested loops of `buildConstraintsGraph` (`ForsterConstraintResolver.java:210-215`). */
  private addLayoutUnitConstraints(lastNonDummyNode: LNode, node: LNode): void {
    for (const lastUnitNode of this.layoutUnits.get(lastNonDummyNode)) {
      for (const currentUnitNode of this.layoutUnits.get(node)) {
        this.groupOf(lastUnitNode).getOutgoingConstraints().push(this.groupOf(currentUnitNode));
        this.groupOf(currentUnitNode).incomingConstraintsCount++;
      }
    }
  }

  /**
   * Returns a violated constraint, if any is left. Constraint violation detection is based on the barycenter values of
   * the node groups, hence it is a critical requirement that the node groups are sorted by their barycenter values.
   *
   * @param groups list of vertices.
   * @returns the two vertices whose constraint is violated, or `null` if none could be found. The two vertices are
   *   returned in the order they should appear in, not in the order that violates their constraint.
   * @see ForsterConstraintResolver.java:233
   */
  private findViolatedConstraint(
    groups: ForsterConstraintResolverConstraintGroup[],
  ): Pair<ForsterConstraintResolverConstraintGroup, ForsterConstraintResolverConstraintGroup> | null {
    const activeGroups = this.findSources(groups);

    // Iterate through the active node groups to find one with violated constraints
    if (activeGroups !== null) {
      while (activeGroups.length > 0) {
        const group = activeGroups.shift()!;

        // See if we can find a violated constraint
        if (group.hasIncomingConstraints()) {
          const violated = this.findViolatedPredecessor(group, groups);
          if (violated !== null) {
            return violated;
          }
        }

        // No violated constraints; add outgoing constraints to the respective incoming list
        for (const successor of group.getOutgoingConstraints()) {
          const successorIncomingList = successor.getIncomingConstraints();
          successorIncomingList.unshift(group);

          if (successor.incomingConstraintsCount === successorIncomingList.length) {
            activeGroups.push(successor);
          }
        }
      }
    }

    // No violated constraints found
    return null;
  }

  /**
   * The first loop of `findViolatedConstraint` (`ForsterConstraintResolver.java:236-250`): resets the incoming
   * constraints and answers the sources of the constraint graph, or `null` if there is none.
   */
  private findSources(
    groups: ForsterConstraintResolverConstraintGroup[],
  ): ForsterConstraintResolverConstraintGroup[] | null {
    let activeGroups: ForsterConstraintResolverConstraintGroup[] | null = null;

    // Iterate through the constrained vertices
    // Java also tracks `lastValue = group.getBarycenter()` for `assert group.getBarycenter() != null &&
    // group.getBarycenter() >= lastValue` (ForsterConstraintResolver.java:237-239); assertions are disabled by default
    // and omitted (translation-rules 6.8), and the variable is read by nothing else.
    for (const group of groups) {
      group.resetIncomingConstraints();

      // Find sources of the constraint graph to start the constraints check
      if (group.hasOutgoingConstraints() && group.incomingConstraintsCount === 0) {
        if (activeGroups === null) {
          activeGroups = [];
        }
        activeGroups.push(group);
      }
    }
    return activeGroups;
  }

  /** The predecessor loop of `findViolatedConstraint` (`ForsterConstraintResolver.java:259-270`). */
  private findViolatedPredecessor(
    group: ForsterConstraintResolverConstraintGroup,
    groups: ForsterConstraintResolverConstraintGroup[],
  ): Pair<ForsterConstraintResolverConstraintGroup, ForsterConstraintResolverConstraintGroup> | null {
    for (const predecessor of group.getIncomingConstraints()) {
      // `Double.floatValue()` is a primitive `float`, so `==` compares values (C6)
      if (Float32.fromDouble(predecessor.getBarycenter()!) === Float32.fromDouble(group.getBarycenter()!)) {
        if (groups.indexOf(predecessor) > groups.indexOf(group)) {
          // The predecessor has equal barycenter, but higher index
          return Pair.of(predecessor, group);
        }
      } else if (predecessor.getBarycenter()! > group.getBarycenter()!) {
        // The predecessor has greater barycenter and thus also higher index
        return Pair.of(predecessor, group);
      }
    }
    return null;
  }

  /**
   * Handles the case of a violated constraint. The node groups must be sorted by their barycenter values. After this
   * method has finished, the list of node groups is smaller by one element, since two node groups have been unified,
   * but the list is still correctly sorted by barycenter values.
   *
   * @param firstNodeGroup the node group with violated outgoing constraint
   * @param secondNodeGroup the node group with violated incoming constraint
   * @param nodeGroups the list of vertices
   * @see ForsterConstraintResolver.java:303
   */
  private handleViolatedConstraint(
    firstNodeGroup: ForsterConstraintResolverConstraintGroup,
    secondNodeGroup: ForsterConstraintResolverConstraintGroup,
    nodeGroups: ForsterConstraintResolverConstraintGroup[],
  ): void {
    // Create a new vertex from the two constrain-violating vertices; this also
    // automatically calculates the new vertex's barycenter value
    const newNodeGroup = new ForsterConstraintResolverConstraintGroup(this, firstNodeGroup, secondNodeGroup);
    // Java asserts that the new barycenter lies within `BARYCENTER_EQUALITY_DELTA` (0.0001f, declared at
    // ForsterConstraintResolver.java:289, read only by these asserts) of both groups' barycenters
    // (ForsterConstraintResolver.java:309-310); omitted with the constant (translation-rules 6.8)

    // Iterate through the vertices. Remove the old vertices. Insert the new one
    // according to the barycenter value, thereby keeping the list sorted. Along
    // the way, constraint relationships will be updated
    const nodeGroupIterator = new ArrayListIterator(nodeGroups);
    let alreadyInserted = false;
    while (nodeGroupIterator.hasNext()) {
      const nodeGroup = nodeGroupIterator.next();

      if (nodeGroup === firstNodeGroup || nodeGroup === secondNodeGroup) {
        // Remove the two node groups with violated constraint from the list
        nodeGroupIterator.remove();
      } else if (!alreadyInserted && nodeGroup.getBarycenter()! > newNodeGroup.getBarycenter()!) {
        // If we haven't inserted the new node group into the list already, do that now.
        // Note: we're not calling next() again. This means that during the next iteration,
        // we will again be looking at the current node group. But then, alreadyInserted will
        // be true and we can look at that node group's outgoing constraints.
        nodeGroupIterator.previous();
        nodeGroupIterator.add(newNodeGroup);

        alreadyInserted = true;
      } else if (nodeGroup.hasOutgoingConstraints()) {
        // Check if the vertex has any constraints with the former two vertices
        const firstNodeGroupConstraint = removeFirst(nodeGroup.getOutgoingConstraints(), firstNodeGroup);
        const secondNodeGroupConstraint = removeFirst(nodeGroup.getOutgoingConstraints(), secondNodeGroup);

        if (firstNodeGroupConstraint || secondNodeGroupConstraint) {
          nodeGroup.getOutgoingConstraints().push(newNodeGroup);
          newNodeGroup.incomingConstraintsCount++;
        }
      }
    }

    // If we haven't inserted the new node group already, add it to the end
    if (!alreadyInserted) {
      nodeGroups.push(newNodeGroup);
    }
  }

  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Utilities

  /** @see ForsterConstraintResolver.java:353 */
  private groupOf(node: LNode): ForsterConstraintResolverConstraintGroup {
    return this.constraintGroups[node.getLayer()!.id]![node.id]!;
  }

  /**
   * Private in Java, used by the inner class `ConstraintGroup` (a separate file here), hence not `private`.
   *
   * @see ForsterConstraintResolver.java:357
   */
  stateOf(node: LNode): BarycenterHeuristicBarycenterState {
    return this.barycenterStates[node.getLayer()!.id]![node.id]!;
  }
}
