// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { AbstractRandomListAccessor } from '../util/AbstractRandomListAccessor.js';
import type { ILayoutProcessorFactory } from './ILayoutProcessorFactory.js';

/**
 * Configuration of the processors a layout phase needs, expressed relative to the phases of an algorithm: each slot
 * holds the processors to run before a phase (slot `ordinal`) or after it (slot `ordinal + 1`).
 *
 * @typeParam P the enumeration of phases (Java: `P extends Enum<P>`)
 * @typeParam G type of the graph the processors work on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/LayoutProcessorConfiguration.java
 */
export class LayoutProcessorConfiguration<P extends { ordinal(): number }, G> extends AbstractRandomListAccessor<
  Set<ILayoutProcessorFactory<G>>
> {
  #currentIndex = -1;

  // Creation

  /** Creates a new, empty configuration. */
  static create<P extends { ordinal(): number }, G>(): LayoutProcessorConfiguration<P, G> {
    return new LayoutProcessorConfiguration<P, G>();
  }

  /** Creates a new configuration containing everything in the given one. */
  static createFrom<P extends { ordinal(): number }, G>(
    source: LayoutProcessorConfiguration<P, G>,
  ): LayoutProcessorConfiguration<P, G> {
    return new LayoutProcessorConfiguration<P, G>().addAll(source);
  }

  private constructor() {
    super();
    this.clear();
  }

  // Processor Assembly

  /** Package-visible in Java. */
  clear(): this {
    this.clearList();
    this.#currentIndex = -1;
    return this;
  }

  before(phase: P): this {
    this.#currentIndex = phase.ordinal();
    return this;
  }

  after(phase: P): this {
    this.#currentIndex = phase.ordinal() + 1;
    return this;
  }

  /** @throws IllegalStateException if neither `before` nor `after` was called first */
  add(processor: ILayoutProcessorFactory<G>): this {
    if (this.#currentIndex < 0) {
      throw new IllegalStateException('Did not call before(...) or after(...) before calling add(...).');
    }

    this.#doAdd(this.#currentIndex, processor);
    return this;
  }

  addBefore(phase: P, processor: ILayoutProcessorFactory<G>): this {
    // Calls to add(...) after this method without calling before(...) or after(...) will usually not do
    // what people want them to, so make sure that we have no valid current index
    this.#currentIndex = -1;

    this.#doAdd(phase.ordinal(), processor);
    return this;
  }

  addAfter(phase: P, processor: ILayoutProcessorFactory<G>): this {
    // Calls to add(...) after this method without calling before(...) or after(...) will usually not do
    // what people want them to, so make sure that we have no valid current index
    this.#currentIndex = -1;

    this.#doAdd(phase.ordinal() + 1, processor);
    return this;
  }

  #doAdd(index: number, processor: ILayoutProcessorFactory<G>): void {
    this.getListItem(index).add(processor);
  }

  addAll(configuration: LayoutProcessorConfiguration<P, G>): this {
    for (let i = 0; i < configuration.getListSize(); i++) {
      for (const processor of configuration.getListItem(i)) {
        this.getListItem(i).add(processor);
      }
    }
    return this;
  }

  // Processor List Building

  /** Returns a copy of the processors to run before the given phase. */
  processorsBefore(phase: P): Set<ILayoutProcessorFactory<G>> {
    return this.#processors(phase.ordinal());
  }

  /** Returns a copy of the processors to run after the given phase. */
  processorsAfter(phase: P): Set<ILayoutProcessorFactory<G>> {
    return this.#processors(phase.ordinal() + 1);
  }

  // Java: Sets.newHashSet(...) of identity-hashed factories; insertion order here (P2, AD-10).
  #processors(index: number): Set<ILayoutProcessorFactory<G>> {
    return new Set(this.getListItem(index));
  }

  // Utilities

  protected override provideDefault(): Set<ILayoutProcessorFactory<G>> {
    return new Set();
  }
}
