// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../../../core/options/PortSide.js';
import type { LEdge } from '../../graph/LEdge.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { SelfHyperLoop } from './SelfHyperLoop.js';
import type { SelfLoopPort } from './SelfLoopPort.js';

/**
 * Represents a single self loop edge. The Java constructor and `setSLHyperLoop` are package-private; TypeScript has no
 * package scope, so both are public here and only `SelfLoopHolder` and `SelfHyperLoop` call them.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopEdge.java
 */
export class SelfLoopEdge {
  /** The edge represented by this instance. */
  private readonly lEdge: LEdge;
  /** The self hyper loop this edge belongs to. */
  private slHyperLoop: SelfHyperLoop | null = null;
  /** The edge's source port. */
  private readonly slSource: SelfLoopPort;
  /** The edge's target port. */
  private readonly slTarget: SelfLoopPort;

  /**
   * Creates a new instance that represents the given edge. Also adds the instance to the source and target port's list
   * of incoming and outgoing edges. (Java lines 38-40, the three `assert`s, are omitted: assertions are off.)
   *
   * @see SelfLoopEdge.java:37
   */
  constructor(lEdge: LEdge, slSource: SelfLoopPort, slTarget: SelfLoopPort) {
    this.lEdge = lEdge;
    this.slSource = slSource;
    this.slTarget = slTarget;

    slSource.getOutgoingSLEdges().push(this);
    slTarget.getIncomingSLEdges().push(this);
  }

  // Accessors

  /** Returns the edge represented by this instance. */
  getLEdge(): LEdge {
    return this.lEdge;
  }

  /**
   * Returns the {@link SelfHyperLoop} this edge belongs to. This will only be `null` shortly after creation, but gets set
   * to a non-`null` value during self loop initialization.
   */
  getSLHyperLoop(): SelfHyperLoop | null {
    return this.slHyperLoop;
  }

  /** Sets the {@link SelfHyperLoop} this edge should belong to. (Java line 68 `assert` omitted.) */
  setSLHyperLoop(slLoop: SelfHyperLoop): void {
    this.slHyperLoop = slLoop;
  }

  /** Returns the edge's source port. */
  getSLSource(): SelfLoopPort {
    return this.slSource;
  }

  /** Returns the edge's target port. */
  getSLTarget(): SelfLoopPort {
    return this.slTarget;
  }

  isInline(): boolean {
    for (const label of this.lEdge.getLabels()) {
      if (label.getProperty(LayeredOptions.EDGE_LABELS_INLINE)) {
        return true;
      }
    }
    return false;
  }

  /** Java dereferences `slHyperLoop` and its labels without a null check: a missing one is a `TypeError`. */
  getLabelSide(): PortSide | null {
    return this.slHyperLoop!.getSLLabels()!.getSide();
  }
}
