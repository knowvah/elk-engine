// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { devAssert } from '../../../../java/lang/DevAssert.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { SelfHyperLoop } from './SelfHyperLoop.js';
import { SelfLoopEdge } from './SelfLoopEdge.js';
import { SelfLoopPort } from './SelfLoopPort.js';

/** ID of a port that hasn't been visited yet. */
const UNVISITED = 0;
/** ID of a port that has already been visited. */
const VISITED = 1;

/**
 * Holds all the information required to route self loops of a particular node. Each node with self loops has one of
 * these attached to it through the {@link InternalProperties.SELF_LOOP_HOLDER} property.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopHolder.java
 */
export class SelfLoopHolder {
  /** The node this instance belongs to. */
  private readonly lNode: LNode;
  /** List of the node's {@link SelfHyperLoop}s. */
  private readonly slHyperLoops: SelfHyperLoop[] = [];
  /**
   * Map of original ports to the {@link SelfLoopPort}s created to represent them. This is a `LinkedHashMap` in Java
   * (a JS `Map`: insertion order) because we need a stable iteration order over the values later on so that we create
   * {@link SelfHyperLoop}s in a predictable order, thus preventing self loops from reordering between layout runs.
   */
  private readonly slPorts = new Map<LPort, SelfLoopPort>();

  /** Whether at least one self loop port is currently hidden from its node. */
  private _arePortsHidden = false;
  /** The number of routing slots on each side of the node, indexed by {@link PortSide} ordinal. */
  private readonly routingSlotCount: number[] = new Array<number>(PortSide.values().length).fill(0);

  // Creation

  private constructor(node: LNode) {
    this.lNode = node;
  }

  /**
   * Creates a new {@link SelfLoopHolder} for the given node and sets its {@link InternalProperties.SELF_LOOP_HOLDER}
   * property accordingly. This method should only be called if {@link needsSelfLoopProcessing} returns `true`. (Java
   * line 87 `assert needsSelfLoopProcessing(lNode)` is a `devAssert`.)
   *
   * @param lNode the node to possibly install a {@link SelfLoopHolder} on.
   * @returns the created {@link SelfLoopHolder}.
   * @see SelfLoopHolder.java:86
   */
  static install(lNode: LNode): SelfLoopHolder {
    devAssert(() => SelfLoopHolder.needsSelfLoopProcessing(lNode));

    const holder = new SelfLoopHolder(lNode);
    lNode.setProperty(InternalProperties.SELF_LOOP_HOLDER, holder);

    holder.initialize();

    return holder;
  }

  /**
   * Checks if the given node is a regular node and has at least one self loop.
   *
   * @param lNode the node to check.
   * @returns `true` if a {@link SelfLoopHolder} should be created for this node.
   */
  static needsSelfLoopProcessing(lNode: LNode): boolean {
    if (lNode.getType() !== NodeType.NORMAL) {
      return false;
    }

    for (const edge of lNode.getOutgoingEdges()) {
      if (edge.isSelfLoop()) {
        return true;
      }
    }
    return false;
  }

  // Initialization

  /** Initializes everything by populating our data model. */
  private initialize(): void {
    const slEdges: SelfLoopEdge[] = [];

    // Create self loop edges and ports for every self loop
    for (const lEdge of this.lNode.getOutgoingEdges()) {
      if (lEdge.isSelfLoop()) {
        // Java evaluates the arguments left to right: source port first, then target port
        slEdges.push(
          new SelfLoopEdge(lEdge, this.selfLoopPortFor(lEdge.getSource()!), this.selfLoopPortFor(lEdge.getTarget()!)),
        );
      }
    }

    // Reset port IDs for the BFS we're about to run
    for (const slPort of this.slPorts.values()) {
      slPort.getLPort().id = UNVISITED;
    }

    // Run BFS at every port to gather the edges into hyperloops
    for (const slPort of this.slPorts.values()) {
      if (slPort.getLPort().id === UNVISITED) {
        this.slHyperLoops.push(this.initializeHyperLoop(slPort));
      }
    }
  }

  /** Returns the {@link SelfLoopPort} representation of the given port. Creates one if none exists yet. */
  private selfLoopPortFor(lport: LPort): SelfLoopPort {
    if (!this.slPorts.has(lport)) {
      this.slPorts.set(lport, new SelfLoopPort(lport));
    }

    return this.slPorts.get(lport)!;
  }

  /** Collects all self loops reachable from the given port and merges them into a hyper loop. */
  private initializeHyperLoop(slPort: SelfLoopPort): SelfHyperLoop {
    const slLoop = new SelfHyperLoop(this);

    // Run a BFS starting at the port (Java `LinkedList` used as a queue: `add` at the tail, `poll` at the head)
    const bfsQueue: SelfLoopPort[] = [];
    bfsQueue.push(slPort);

    while (bfsQueue.length > 0) {
      const currentSLPort = bfsQueue.shift()!;
      currentSLPort.getLPort().id = VISITED;

      // Add each outgoing edge to our hyper loop
      for (const slEdge of currentSLPort.getOutgoingSLEdges()) {
        slLoop.addSelfLoopEdge(slEdge);

        const slTargetPort = slEdge.getSLTarget();
        if (slTargetPort.getLPort().id === UNVISITED) {
          bfsQueue.push(slTargetPort);
        }
      }

      // Add each incoming edge to our hyper loop
      for (const slEdge of currentSLPort.getIncomingSLEdges()) {
        slLoop.addSelfLoopEdge(slEdge);

        const slSourcePort = slEdge.getSLSource();
        if (slSourcePort.getLPort().id === UNVISITED) {
          bfsQueue.push(slSourcePort);
        }
      }
    }

    return slLoop;
  }

  // Accessors

  /** Returns the {@link LNode} represented by this instance. */
  getLNode(): LNode {
    return this.lNode;
  }

  /** Returns the {@link SelfHyperLoop}s. */
  getSLHyperLoops(): SelfHyperLoop[] {
    return this.slHyperLoops;
  }

  /** Returns the map of {@link LPort}s to the {@link SelfLoopPort}s created for them. */
  getSLPortMap(): Map<LPort, SelfLoopPort> {
    return this.slPorts;
  }

  /**
   * Returns whether at least one self loop port is currently hidden from its node. Which one it is can be found by
   * iterating over our {@link SelfLoopPort}s and calling {@link SelfLoopPort.isHidden}.
   */
  arePortsHidden(): boolean {
    return this._arePortsHidden;
  }

  /** Sets whether at least one self loop port is currently hidden. */
  setPortsHidden(hidden: boolean): void {
    this._arePortsHidden = hidden;
  }

  /** Number of routing slots per side, indexed by {@link PortSide} ordinal. To be updated by clients. */
  getRoutingSlotCount(): number[] {
    return this.routingSlotCount;
  }
}
