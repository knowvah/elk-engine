// SPDX-License-Identifier: EPL-2.0
import type { LPort } from '../../graph/LPort.js';
import type { SelfLoopEdge } from './SelfLoopEdge.js';

/**
 * A port which is an end point of at least one self loop. The Java constructor is package-private; TypeScript has no
 * package scope, so it is public here and only `SelfLoopHolder` calls it.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopPort.java
 */
export class SelfLoopPort {
  /** Port represented by this instance. */
  private readonly lPort: LPort;
  /** Whether the port was only incident to self loop edges. */
  private readonly _hadOnlySelfLoops: boolean;
  /** List of incoming self loops. */
  private readonly incomingSLEdges: SelfLoopEdge[] = [];
  /** List of outgoing self loops. */
  private readonly outgoingSLEdges: SelfLoopEdge[] = [];

  /** Whether the original {@link LPort} is currently hidden from its node. */
  private _isHidden = false;

  /**
   * Creates a new instance to represent the given port. (Java line 38 `assert lPort.getConnectedEdges().iterator().hasNext()`
   * is omitted: assertions are off.)
   *
   * @see SelfLoopPort.java:37
   */
  constructor(lPort: LPort) {
    this.lPort = lPort;

    // Check if the port is only incident to self loops
    let allSelfLoops = true;
    for (const edge of lPort.getConnectedEdges()) {
      if (!edge.isSelfLoop()) {
        allSelfLoops = false;
        break;
      }
    }
    this._hadOnlySelfLoops = allSelfLoops;
  }

  // Accessors

  /** Returns the {@link LPort} this {@link SelfLoopPort} was created for. */
  getLPort(): LPort {
    return this.lPort;
  }

  /**
   * Returns whether the port represented by this instance was only incident to self loop edges. That may influence the
   * decision of whether or not to hide the port from its original node.
   */
  hadOnlySelfLoops(): boolean {
    return this._hadOnlySelfLoops;
  }

  /** Returns whether the original {@link LPort} is currently hidden from its node. */
  isHidden(): boolean {
    return this._isHidden;
  }

  /** Sets whether the original {@link LPort} is currently hidden from its node. */
  setHidden(hidden: boolean): void {
    this._isHidden = hidden;
  }

  /** Returns the list of incoming {@link SelfLoopEdge}s. */
  getIncomingSLEdges(): SelfLoopEdge[] {
    return this.incomingSLEdges;
  }

  /** Returns the list of outgoing {@link SelfLoopEdge}s. */
  getOutgoingSLEdges(): SelfLoopEdge[] {
    return this.outgoingSLEdges;
  }

  /**
   * Returns the port's self loop net flow. This is the number of self loop edges entering the port minus the number of
   * self loop edges leaving it.
   */
  getSLNetFlow(): number {
    return this.incomingSLEdges.length - this.outgoingSLEdges.length;
  }
}
