// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { EdgeLabelSideSelection } from '../options/EdgeLabelSideSelection.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { EndLabelPreprocessor } from './EndLabelPreprocessor.js';

/**
 * What the `smart` loop carries across the nodes of one layer (the Java keeps them in two locals): whether the next
 * dummy run is the topmost group of the layer, and how many label dummies the queue holds.
 */
interface SmartLayerState {
  topGroup: boolean;
  labelDummiesInQueue: number;
}

/**
 * Decides for each edge label whether to place it above or below its respective edge. How the decision is made
 * depends on the active edge label side selection strategy.
 *
 * Precondition: a properly layered graph with fixed port orders; port order is reflected in the way port lists are
 * sorted; center edge labels are not attached to edges, but to label dummy nodes. Postcondition: the placement side is
 * chosen for each label, and each label is annotated accordingly (in the case of center edge labels, the representing
 * dummy node is annotated with the placement side); label dummy nodes have their ports placed such that they extend
 * above or below their edge, depending on the side of their label. Slots: before phase 4. Same-slot dependencies:
 * `InLayerConstraintProcessor`, `LabelManagementProcessor`, `LabelDummySwitcher`.
 *
 * Java `assert` lines (`:200`, `:249`, `:347`, `:348`, `:436`, `:437`, `:438`) are omitted, as no `assert` helper exists.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelSideSelector.java
 */
export class LabelSideSelector implements ILayoutProcessor<LGraph> {
  /** @see LabelSideSelector.java:67 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    const mode = layeredGraph.getProperty(LayeredOptions.EDGE_LABELS_SIDE_SELECTION);
    monitor.begin(`Label side selection (${mode.toString()})`, 1);

    // Calculate all label sides depending on the given strategy
    switch (mode) {
      case EdgeLabelSideSelection.ALWAYS_UP:
        this.sameSide(layeredGraph, LabelSide.ABOVE);
        break;
      case EdgeLabelSideSelection.ALWAYS_DOWN:
        this.sameSide(layeredGraph, LabelSide.BELOW);
        break;
      case EdgeLabelSideSelection.DIRECTION_UP:
        this.basedOnDirection(layeredGraph, LabelSide.ABOVE);
        break;
      case EdgeLabelSideSelection.DIRECTION_DOWN:
        this.basedOnDirection(layeredGraph, LabelSide.BELOW);
        break;
      case EdgeLabelSideSelection.SMART_UP:
        this.smart(layeredGraph, LabelSide.ABOVE);
        break;
      case EdgeLabelSideSelection.SMART_DOWN:
        this.smart(layeredGraph, LabelSide.BELOW);
        break;
    }

    monitor.done();
  }

  // ////////////////////////////////////////////////////////////////////////////////////////
  // Simple Placement Strategies

  /**
   * Configures all labels to be placed on the given side.
   *
   * @see LabelSideSelector.java:103
   */
  private sameSide(graph: LGraph, labelSide: LabelSide): void {
    for (const layer of graph) {
      for (const node of layer) {
        if (node.getType() === NodeType.LABEL) {
          this.applyLabelSideNode(node, labelSide);
        }

        for (const edge of node.getOutgoingEdges()) {
          this.applyLabelSideEdge(edge, labelSide);
        }
      }
    }
  }

  /**
   * Configures all labels to be placed according to their edge's direction. If their edge points right, the labels
   * will be placed on the side passed to this method. Otherwise, they will be placed on the opposite side.
   *
   * @see LabelSideSelector.java:121
   */
  private basedOnDirection(graph: LGraph, sideForRightwardEdges: LabelSide): void {
    for (const layer of graph) {
      for (const node of layer) {
        if (node.getType() === NodeType.LABEL) {
          const side = this.doesEdgePointRightNode(node) ? sideForRightwardEdges : sideForRightwardEdges.opposite();
          this.applyLabelSideNode(node, side);
        }

        for (const edge of node.getOutgoingEdges()) {
          const side = this.doesEdgePointRightEdge(edge) ? sideForRightwardEdges : sideForRightwardEdges.opposite();
          this.applyLabelSideEdge(edge, side);
        }
      }
    }
  }

  // ////////////////////////////////////////////////////////////////////////////////////////
  // Smart Placement Strategy

  /**
   * Chooses label sides depending on certain patterns. If in doubt, uses the given default side.
   *
   * @see LabelSideSelector.java:148
   */
  private smart(graph: LGraph, defaultSide: LabelSide): void {
    // We will collect consecutive runs of certain dummy nodes while we iterate through layers
    const dummyNodeQueue = new LinkedList<LNode>();

    for (const layer of graph) {
      // The first call to any method
      const state: SmartLayerState = { topGroup: true, labelDummiesInQueue: 0 };

      for (const node of layer) {
        this.smartForNode(node, dummyNodeQueue, state, defaultSide);
      }

      // Do stuff with the nodes in the queue
      if (!dummyNodeQueue.isEmpty()) {
        this.smartForConsecutiveDummyNodeRun(
          dummyNodeQueue,
          state.labelDummiesInQueue,
          state.topGroup,
          true,
          defaultSide,
        );
      }
    }
  }

  /**
   * The body of the Java `switch (node.getType())` of `smart` (`:158-186`): `LABEL` falls through into `LONG_EDGE`,
   * `NORMAL` falls through into `default`.
   *
   * @see LabelSideSelector.java:158
   */
  private smartForNode(
    node: LNode,
    dummyNodeQueue: LinkedList<LNode>,
    state: SmartLayerState,
    defaultSide: LabelSide,
  ): void {
    const type = node.getType();
    if (type === NodeType.LABEL) {
      state.labelDummiesInQueue++;
      // Intended fall-through to add the label dummy to the queue
      dummyNodeQueue.add(node);
    } else if (type === NodeType.LONG_EDGE) {
      dummyNodeQueue.add(node);
    } else {
      if (type === NodeType.NORMAL) {
        this.smartForRegularNode(node, defaultSide);
      }

      // Intended fall-through to handle the most recent dummy node run, if any: Empty dummy node queue
      if (!dummyNodeQueue.isEmpty()) {
        this.smartForConsecutiveDummyNodeRun(
          dummyNodeQueue,
          state.labelDummiesInQueue,
          state.topGroup,
          false,
          defaultSide,
        );
      }

      // Reset things
      state.topGroup = false;
      state.labelDummiesInQueue = 0;
    }
  }

  /**
   * Assigns label sides to all label dummies in the given queue and empties the queue afterwards. The queue is
   * expected to not be empty. We also want to know whether this group consists of the topmost or of the bottommost
   * nodes in their layer (both can be true simultaneously). Decisions will be made, and they might depend on these
   * information.
   *
   * @see LabelSideSelector.java:198
   */
  private smartForConsecutiveDummyNodeRun(
    dummyNodes: LinkedList<LNode>,
    labelDummyCount: number,
    topGroup: boolean,
    bottomGroup: boolean,
    defaultSide: LabelSide,
  ): void {
    // We distinguish a number of special cases whose rules seem rather complicated.
    if (this.isTopLabelRun(dummyNodes, labelDummyCount, topGroup, bottomGroup)) {
      // The current run of dummy nodes is at the top of the layer, has only a single label dummy, and that label
      // dummy is at the top of the run; select the ABOVE side to ensure that its edge doesn't get too long
      this.applyLabelSideNode(dummyNodes.getFirst(), LabelSide.ABOVE);
    } else if (this.isBottomLabelRun(dummyNodes, labelDummyCount, topGroup, bottomGroup)) {
      // Symmetric to the previous case, only at the bottom of the layer
      this.applyLabelSideNode(dummyNodes.getLast(), LabelSide.BELOW);
    } else if (dummyNodes.size() === 2) {
      // There's only a run of two edges, so place the label of the first above its edge, and the label of the
      // second below its edge
      this.applyLabelSideNode(dummyNodes.removeFirst(), LabelSide.ABOVE);
      this.applyLabelSideNode(dummyNodes.removeFirst(), LabelSide.BELOW);
    } else {
      // Not one of the special cases above. Iterate over the dummy nodes and assign the default label side,
      // except if we find two consecutive label dummies that connect the same nodes (tight loops that can
      // happen in control flow diagrams)
      this.applyForDummyNodeRunWithSimpleLoops(dummyNodes, defaultSide);
    }

    // Ensure the list is cleared
    dummyNodes.clear();
  }

  /** The first branch's condition of `smartForConsecutiveDummyNodeRun` (complexity split, Java operand order). */
  private isTopLabelRun(
    dummyNodes: LinkedList<LNode>,
    labelDummyCount: number,
    topGroup: boolean,
    bottomGroup: boolean,
  ): boolean {
    return (
      topGroup &&
      (!bottomGroup || dummyNodes.size() > 1) &&
      labelDummyCount === 1 &&
      dummyNodes.getFirst().getType() === NodeType.LABEL
    );
  }

  /** The second branch's condition of `smartForConsecutiveDummyNodeRun` (complexity split, Java operand order). */
  private isBottomLabelRun(
    dummyNodes: LinkedList<LNode>,
    labelDummyCount: number,
    topGroup: boolean,
    bottomGroup: boolean,
  ): boolean {
    return (
      bottomGroup &&
      (!topGroup || dummyNodes.size() > 1) &&
      labelDummyCount === 1 &&
      dummyNodes.getLast().getType() === NodeType.LABEL
    );
  }

  /**
   * Takes a collection of dummy nodes that contains a given number of label dummy nodes and applies label sides to
   * label dummy nodes in the collection. Usually, that will be the default side. If, however, we find exactly two
   * consecutive label dummies that connect the same regular nodes, that's going to be a special case.
   *
   * The Java `labelDummyCount` parameter is unused by the method and is dropped.
   *
   * @see LabelSideSelector.java:243
   */
  private applyForDummyNodeRunWithSimpleLoops(dummyNodes: Iterable<LNode>, defaultSide: LabelSide): void {
    // We keep track of runs of consecutive label dummy nodes that connect the same two nodes
    const labelDummyRun: LNode[] = [];
    let prevLongEdgeSource: LNode | null = null;
    let prevLongEdgeTarget: LNode | null = null;

    for (const currentDummy of dummyNodes) {
      // Check if we are continuing a previous run
      const currLongEdgeSource = this.getLongEdgeEndNode(currentDummy, true);
      const currLongEdgeTarget = this.getLongEdgeEndNode(currentDummy, false);

      if (prevLongEdgeSource !== currLongEdgeSource || prevLongEdgeTarget !== currLongEdgeTarget) {
        // We're starting a new run
        this.applyLabelSidesToLabelDummyRun(labelDummyRun, defaultSide);

        prevLongEdgeSource = currLongEdgeSource;
        prevLongEdgeTarget = currLongEdgeTarget;
      }

      labelDummyRun.push(currentDummy);
    }

    // Assign label sides to whatever dummy nodes are left
    this.applyLabelSidesToLabelDummyRun(labelDummyRun, defaultSide);
  }

  /**
   * Returns either the long edge source or target node of the given label dummy. May be, but shouldn't be `null`.
   *
   * @see LabelSideSelector.java:277
   */
  private getLongEdgeEndNode(labelDummy: LNode, source: boolean): LNode | null {
    const endPort: LPort | null = labelDummy.getProperty(
      source ? InternalProperties.LONG_EDGE_SOURCE : InternalProperties.LONG_EDGE_TARGET,
    );

    return endPort === null ? null : endPort.getNode();
  }

  /**
   * Applies label sides to the given list of consecutive dummy nodes and empties that list afterwards.
   *
   * @see LabelSideSelector.java:290
   */
  private applyLabelSidesToLabelDummyRun(labelDummyRun: LNode[], defaultSide: LabelSide): void {
    if (labelDummyRun.length > 0) {
      // If the list contains exactly two label dummies, we place labels differently
      if (labelDummyRun.length === 2) {
        this.applyLabelSideNode(labelDummyRun[0]!, LabelSide.ABOVE);
        this.applyLabelSideNode(labelDummyRun[1]!, LabelSide.BELOW);
      } else {
        for (const dummyNode of labelDummyRun) {
          this.applyLabelSideNode(dummyNode, defaultSide);
        }
      }

      labelDummyRun.length = 0;
    }
  }

  /**
   * Assigns label sides to all end labels incident to this node. The assigned label sides depend on how many ports
   * there are on any given side.
   *
   * @see LabelSideSelector.java:310
   */
  private smartForRegularNode(node: LNode, defaultSide: LabelSide): void {
    // Iterate over the node's list of ports on each side. Remember the ones that have edges connected to them
    // and make the label side decision based on how many such ports there are
    const endLabelQueue = new LinkedList<LLabel[]>();
    let currentPortSide: PortSide | null = null;

    // This is where we assume that the list of ports is properly sorted
    for (const port of node.getPorts()) {
      if (port.getSide() !== currentPortSide) {
        if (!endLabelQueue.isEmpty()) {
          this.smartForRegularNodePortEndLabels(endLabelQueue, currentPortSide!, defaultSide);
        }

        endLabelQueue.clear();
        currentPortSide = port.getSide();
      }

      // Possibly add the port's end labels to our queue, if it has any
      const portEndLabels = EndLabelPreprocessor.gatherLabels(port);
      if (portEndLabels !== null) {
        endLabelQueue.add(portEndLabels);
      }
    }

    // Clear remaining ports
    if (!endLabelQueue.isEmpty()) {
      this.smartForRegularNodePortEndLabels(endLabelQueue, currentPortSide!, defaultSide);
    }
  }

  /**
   * Handle the end labels currently in the queue (which may get modified in the process).
   *
   * @see LabelSideSelector.java:343
   */
  private smartForRegularNodePortEndLabels(
    endLabelQueue: LinkedList<LLabel[]>,
    portSide: PortSide,
    defaultSide: LabelSide,
  ): void {
    if (endLabelQueue.size() === 2) {
      // What we're going to do depends on which port side we are traversing...
      if (portSide === PortSide.NORTH || portSide === PortSide.EAST) {
        this.applyLabelSideLabels(endLabelQueue.removeFirst(), LabelSide.ABOVE);
        this.applyLabelSideLabels(endLabelQueue.removeFirst(), LabelSide.BELOW);
      } else {
        this.applyLabelSideLabels(endLabelQueue.removeFirst(), LabelSide.BELOW);
        this.applyLabelSideLabels(endLabelQueue.removeFirst(), LabelSide.ABOVE);
      }
    } else {
      for (const labelList of endLabelQueue) {
        this.applyLabelSideLabels(labelList, defaultSide);
      }
    }
  }

  // ////////////////////////////////////////////////////////////////////////////////////////
  // Helper Methods

  /**
   * Applies the given label side to the given label dummy node. If necessary, its ports are moved to reserve space
   * for the label on the correct side. (Java overload `applyLabelSide(LNode, LabelSide)`.)
   *
   * @see LabelSideSelector.java:373
   */
  private applyLabelSideNode(labelDummy: LNode, side: LabelSide): void {
    // This method only does things to label dummy nodes
    if (labelDummy.getType() === NodeType.LABEL) {
      const effectiveSide = labelDummy.isInlineEdgeLabel() ? LabelSide.INLINE : side;

      labelDummy.setProperty(InternalProperties.LABEL_SIDE, effectiveSide);

      // If the label is not below the edge, the ports need to be moved
      if (effectiveSide !== LabelSide.BELOW) {
        this.movePorts(labelDummy, effectiveSide);
      }
    }
  }

  /** The ports-moving block of `applyLabelSide(LNode, LabelSide)` (`:386-407`; complexity split). */
  private movePorts(labelDummy: LNode, effectiveSide: LabelSide): void {
    const originEdge = labelDummy.getProperty(InternalProperties.ORIGIN) as LEdge;
    const thickness = originEdge.getProperty(LayeredOptions.EDGE_THICKNESS);

    // The new port position depends on the new placement
    let portPos = 0;
    if (effectiveSide === LabelSide.ABOVE) {
      portPos = labelDummy.getSize().y - Math.ceil(thickness / 2);
    } else if (effectiveSide === LabelSide.INLINE) {
      // The label dummy has a superfluous label-edge spacing
      portPos =
        Math.ceil(
          labelDummy.getSize().y - labelDummy.getGraph()!.getProperty(LayeredOptions.SPACING_EDGE_LABEL) - thickness,
        ) / 2.0;
      labelDummy.getSize().y -= labelDummy.getGraph()!.getProperty(LayeredOptions.SPACING_EDGE_LABEL);
      labelDummy.getSize().y -= thickness;
    }

    for (const port of labelDummy.getPorts()) {
      port.getPosition().y = portPos;
    }
  }

  /**
   * Applies the given label side to all labels of the given edge. (Java overload `applyLabelSide(LEdge, LabelSide)`.)
   *
   * @see LabelSideSelector.java:411
   */
  private applyLabelSideEdge(edge: LEdge, side: LabelSide): void {
    for (const label of edge.getLabels()) {
      label.setProperty(InternalProperties.LABEL_SIDE, side);
    }
  }

  /**
   * Applies the given label side to all labels in the list. (Java overload `applyLabelSide(List<LLabel>, LabelSide)`.)
   *
   * @see LabelSideSelector.java:420
   */
  private applyLabelSideLabels(labels: readonly LLabel[], side: LabelSide): void {
    for (const label of labels) {
      label.setProperty(InternalProperties.LABEL_SIDE, side);
    }
  }

  /**
   * Checks if the given particular edge will point right or left in the final drawing. The edge can either be a
   * regular edge or part of a long edge. In the latter case, this edge is assumed to point left if the original long
   * edge target is left of the original long edge source, and if this edge is marked to have been reversed.
   * (Java overload `doesEdgePointRight(LEdge)`.)
   *
   * @see LabelSideSelector.java:435
   */
  private doesEdgePointRightEdge(edge: LEdge): boolean {
    // cds: This method formerly used a much more complicated implementation that took the original
    // long edge source and target into account. However, this short implementation should be quite
    // enough...
    return !edge.getProperty(InternalProperties.REVERSED);
  }

  /**
   * Checks if the given label dummy node is part of an edge segment that will point right in the final drawing. We
   * assume that this is the case if at least one of the incident edges points rightwards according to
   * `doesEdgePointRightEdge`. (Java overload `doesEdgePointRight(LNode)`.)
   *
   * @see LabelSideSelector.java:451
   */
  private doesEdgePointRightNode(labelDummy: LNode): boolean {
    // Find incoming and outgoing edge
    const incoming = labelDummy.getIncomingEdges()[Symbol.iterator]().next().value as LEdge;
    const outgoing = labelDummy.getOutgoingEdges()[Symbol.iterator]().next().value as LEdge;

    return this.doesEdgePointRightEdge(incoming) || this.doesEdgePointRightEdge(outgoing);
  }
}
