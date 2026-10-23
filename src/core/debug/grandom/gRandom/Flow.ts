// SPDX-License-Identifier: EPL-2.0
import type { DoubleQuantity } from './DoubleQuantity.js';
import { FlowType } from './FlowType.js';
import { Side } from './Side.js';

/**
 * The generated EMF class `Flow`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Flow.java
 */
export class Flow {
  #flowType: FlowType = FlowType.INCOMING;
  #side: Side = Side.NORTH;
  #amount: DoubleQuantity | null = null;

  getFlowType(): FlowType {
    return this.#flowType;
  }

  setFlowType(value: FlowType): void {
    this.#flowType = value;
  }

  getSide(): Side {
    return this.#side;
  }

  setSide(value: Side): void {
    this.#side = value;
  }

  getAmount(): DoubleQuantity | null {
    return this.#amount;
  }

  setAmount(value: DoubleQuantity | null): void {
    this.#amount = value;
  }
}
