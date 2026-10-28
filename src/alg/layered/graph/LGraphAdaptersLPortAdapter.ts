// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import type { PortSide } from '../../../core/options/PortSide.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import type { SelfLoopEdge } from '../intermediate/loops/SelfLoopEdge.js';
import type { SelfLoopPort } from '../intermediate/loops/SelfLoopPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { AbstractLShapeAdapter } from './LGraphAdaptersAbstractLShapeAdapter.js';
import { LEdgeAdapter } from './LGraphAdaptersLEdgeAdapter.js';
import { LLabelAdapter } from './LGraphAdaptersLLabelAdapter.js';
import type { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';
import type { LPort } from './LPort.js';

/**
 * Adapter for {@link LPort}s.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class LPortAdapter extends AbstractLShapeAdapter<LPort> implements GraphAdapters.PortAdapter<LPort> {
  /** List of cached label adapters. */
  private labelAdapters: GraphAdapters.LabelAdapter<unknown>[] | null = null;
  /** List of cached edge adapters for incoming edges. */
  private incomingEdgeAdapters: GraphAdapters.EdgeAdapter<unknown>[] | null = null;
  /** List of cached edge adapters for outgoing edges. */
  private outgoingEdgeAdapters: GraphAdapters.EdgeAdapter<unknown>[] | null = null;
  /**
   * Whether to simulate that edges are directly connected to north south ports instead of to north/south port
   * dummies.
   */
  private transparentNorthSouthEdges: boolean;

  /**
   * Creates a new adapter for the given port.
   *
   * @param element the port to be adapted.
   * @param transparentNorthSouthEdges whether to simulate that edges are directly connected to north south ports
   *   instead of to north/south port dummies.
   */
  constructor(element: LPort, transparentNorthSouthEdges: boolean) {
    super(element);
    this.transparentNorthSouthEdges = transparentNorthSouthEdges;
  }

  getSide(): PortSide {
    return this.element.getSide();
  }

  getLabels(): Iterable<GraphAdapters.LabelAdapter<unknown>> {
    if (this.labelAdapters === null) {
      this.labelAdapters = [];
      for (const l of this.element.getLabels()) {
        this.labelAdapters.push(new LLabelAdapter(l));
      }
    }
    return this.labelAdapters;
  }

  getMargin(): ElkMargin {
    const lmargins = this.element.getMargin();
    return new ElkMargin(lmargins.getTop(), lmargins.getRight(), lmargins.getBottom(), lmargins.getLeft());
  }

  setMargin(margin: ElkMargin): void {
    this.element.getMargin().setLeft(margin.getLeft());
    this.element.getMargin().setTop(margin.getTop());
    this.element.getMargin().setRight(margin.getRight());
    this.element.getMargin().setBottom(margin.getBottom());
  }

  getIncomingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    if (this.transparentNorthSouthEdges && this.element.getNode()!.getType() === NodeType.NORTH_SOUTH_PORT) {
      return [];
    } else if (this.incomingEdgeAdapters === null) {
      this.incomingEdgeAdapters = [];
      for (const e of this.element.getIncomingEdges()) {
        this.incomingEdgeAdapters.push(new LEdgeAdapter(e));
      }
      if (this.transparentNorthSouthEdges) {
        const portDummy = this.element.getProperty(InternalProperties.PORT_DUMMY) as LNode | null;
        if (portDummy !== null) {
          for (const e of portDummy.getIncomingEdges()) {
            this.incomingEdgeAdapters.push(new LEdgeAdapter(e));
          }
        }
      }
      // Add the incoming edge from the self loop holder if asked for one.
      this.addSelfLoopEdges(this.incomingEdgeAdapters, (slp) => slp.getIncomingSLEdges());
    }
    return this.incomingEdgeAdapters;
  }

  getOutgoingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    if (this.transparentNorthSouthEdges && this.element.getNode()!.getType() === NodeType.NORTH_SOUTH_PORT) {
      return [];
    } else if (this.outgoingEdgeAdapters === null) {
      this.outgoingEdgeAdapters = [];
      for (const e of this.element.getOutgoingEdges()) {
        this.outgoingEdgeAdapters.push(new LEdgeAdapter(e));
      }
      if (this.transparentNorthSouthEdges) {
        const portDummy = this.element.getProperty(InternalProperties.PORT_DUMMY) as LNode | null;
        if (portDummy !== null) {
          for (const e of portDummy.getOutgoingEdges()) {
            this.outgoingEdgeAdapters.push(new LEdgeAdapter(e));
          }
        }
      }
      // Add the outgoing edge from the self loop holder if asked for one.
      this.addSelfLoopEdges(this.outgoingEdgeAdapters, (slp) => slp.getOutgoingSLEdges());
    }
    return this.outgoingEdgeAdapters;
  }

  /**
   * The self loop holder block shared by the Java `getIncomingEdges` and `getOutgoingEdges` (split out for the
   * complexity limit; `pick` selects `getIncomingSLEdges` or `getOutgoingSLEdges`). Unreachable in mission 7a:
   * nothing sets `SELF_LOOP_HOLDER` before mission 7g.
   */
  private addSelfLoopEdges(
    target: GraphAdapters.EdgeAdapter<unknown>[],
    pick: (slp: SelfLoopPort) => SelfLoopEdge[],
  ): void {
    if (this.element.getNode()!.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
      const slh = this.element.getNode()!.getProperty(InternalProperties.SELF_LOOP_HOLDER);
      const slp = slh.getSLPortMap().get(this.element);
      if (slp !== undefined) {
        for (const sle of pick(slp)) {
          target.push(new LEdgeAdapter(sle.getLEdge()));
        }
      }
    }
  }

  hasCompoundConnections(): boolean {
    return this.element.getProperty(InternalProperties.INSIDE_CONNECTIONS);
  }
}
