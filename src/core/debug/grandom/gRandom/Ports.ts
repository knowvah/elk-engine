// SPDX-License-Identifier: EPL-2.0
import { ConstraintType } from './ConstraintType.js';
import type { DoubleQuantity } from './DoubleQuantity.js';
import type { Flow } from './Flow.js';
import type { Size } from './Size.js';

/**
 * The generated EMF class `Ports`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Ports.java
 */
export class Ports {
  #labels: boolean = false;
  #reUse: DoubleQuantity | null = null;
  #size: Size | null = null;
  #constraint: ConstraintType = ConstraintType.FREE;
  readonly #flow: Flow[] = [];

  isLabels(): boolean {
    return this.#labels;
  }

  setLabels(value: boolean): void {
    this.#labels = value;
  }

  getReUse(): DoubleQuantity | null {
    return this.#reUse;
  }

  setReUse(value: DoubleQuantity | null): void {
    this.#reUse = value;
  }

  getSize(): Size | null {
    return this.#size;
  }

  setSize(value: Size | null): void {
    this.#size = value;
  }

  getConstraint(): ConstraintType {
    return this.#constraint;
  }

  setConstraint(value: ConstraintType): void {
    this.#constraint = value;
  }

  getFlow(): Flow[] {
    return this.#flow;
  }
}
