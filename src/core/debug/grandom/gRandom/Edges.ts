// SPDX-License-Identifier: EPL-2.0
import type { DoubleQuantity } from './DoubleQuantity.js';

/**
 * The generated EMF class `Edges`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Edges.java
 */
export class Edges {
  #density: boolean = false;
  #total: boolean = false;
  #relative: boolean = false;
  #outbound: boolean = false;
  #NEdges: DoubleQuantity | null = null;
  #labels: boolean = false;
  #selfLoops: boolean = false;

  isDensity(): boolean {
    return this.#density;
  }

  setDensity(value: boolean): void {
    this.#density = value;
  }

  isTotal(): boolean {
    return this.#total;
  }

  setTotal(value: boolean): void {
    this.#total = value;
  }

  isRelative(): boolean {
    return this.#relative;
  }

  setRelative(value: boolean): void {
    this.#relative = value;
  }

  isOutbound(): boolean {
    return this.#outbound;
  }

  setOutbound(value: boolean): void {
    this.#outbound = value;
  }

  getNEdges(): DoubleQuantity | null {
    return this.#NEdges;
  }

  setNEdges(value: DoubleQuantity | null): void {
    this.#NEdges = value;
  }

  isLabels(): boolean {
    return this.#labels;
  }

  setLabels(value: boolean): void {
    this.#labels = value;
  }

  isSelfLoops(): boolean {
    return this.#selfLoops;
  }

  setSelfLoops(value: boolean): void {
    this.#selfLoops = value;
  }
}
