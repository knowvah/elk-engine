// SPDX-License-Identifier: EPL-2.0

/**
 * The generated EMF class `DoubleQuantity`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/DoubleQuantity.java
 */
export class DoubleQuantity {
  #quant: number | null = null;
  #min: number | null = null;
  #minMax: boolean = false;
  #max: number | null = null;
  #mean: number | null = null;
  #gaussian: boolean = false;
  #stddv: number | null = null;

  getQuant(): number | null {
    return this.#quant;
  }

  setQuant(value: number | null): void {
    this.#quant = value;
  }

  getMin(): number | null {
    return this.#min;
  }

  setMin(value: number | null): void {
    this.#min = value;
  }

  isMinMax(): boolean {
    return this.#minMax;
  }

  setMinMax(value: boolean): void {
    this.#minMax = value;
  }

  getMax(): number | null {
    return this.#max;
  }

  setMax(value: number | null): void {
    this.#max = value;
  }

  getMean(): number | null {
    return this.#mean;
  }

  setMean(value: number | null): void {
    this.#mean = value;
  }

  isGaussian(): boolean {
    return this.#gaussian;
  }

  setGaussian(value: boolean): void {
    this.#gaussian = value;
  }

  getStddv(): number | null {
    return this.#stddv;
  }

  setStddv(value: number | null): void {
    this.#stddv = value;
  }
}
