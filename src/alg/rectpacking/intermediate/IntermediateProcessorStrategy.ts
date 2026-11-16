// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { ILayoutProcessorFactory } from '../../../core/alg/ILayoutProcessorFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { InteractiveNodeReorderer } from './InteractiveNodeReorderer.js';
import { MinSizePostProcessor } from './MinSizePostProcessor.js';
import { MinSizePreProcessor } from './MinSizePreProcessor.js';
import { NodeSizeReorderer } from './NodeSizeReorderer.js';

/**
 * Definition of available intermediate layout processors for the layered layouter. This enumeration also serves as a
 * factory for intermediate layout processors.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/IntermediateProcessorStrategy.java
 */
export class IntermediateProcessorStrategy implements ILayoutProcessorFactory<ElkNode> {
  /*
   * In this enumeration, intermediate layout processors are listed by the earliest slot in which
   * they can sensibly be used. The order in which they are listed is determined by the
   * dependencies on other processors.
   */

  /* Before Phase 1 */
  static readonly NODE_SIZE_REORDERER: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'NODE_SIZE_REORDERER',
    0,
  );
  static readonly INTERACTIVE_NODE_REORDERER: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'INTERACTIVE_NODE_REORDERER',
    1,
  );
  static readonly MIN_SIZE_PRE_PROCESSOR: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'MIN_SIZE_PRE_PROCESSOR',
    2,
  );

  /* Before Phase 2 */
  static readonly MIN_SIZE_POST_PROCESSOR: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'MIN_SIZE_POST_PROCESSOR',
    3,
  );

  static readonly #VALUES: readonly IntermediateProcessorStrategy[] = [
    IntermediateProcessorStrategy.NODE_SIZE_REORDERER,
    IntermediateProcessorStrategy.INTERACTIVE_NODE_REORDERER,
    IntermediateProcessorStrategy.MIN_SIZE_PRE_PROCESSOR,
    IntermediateProcessorStrategy.MIN_SIZE_POST_PROCESSOR,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly IntermediateProcessorStrategy[] {
    return IntermediateProcessorStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): IntermediateProcessorStrategy {
    const found = IntermediateProcessorStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.intermediate.IntermediateProcessorStrategy.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: IntermediateProcessorStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates the processor implementation.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/IntermediateProcessorStrategy.java
   */
  create(): ILayoutProcessor<ElkNode> {
    switch (this) {
      case IntermediateProcessorStrategy.NODE_SIZE_REORDERER:
        return new NodeSizeReorderer();
      case IntermediateProcessorStrategy.INTERACTIVE_NODE_REORDERER:
        return new InteractiveNodeReorderer();
      case IntermediateProcessorStrategy.MIN_SIZE_PRE_PROCESSOR:
        return new MinSizePreProcessor();
      case IntermediateProcessorStrategy.MIN_SIZE_POST_PROCESSOR:
        return new MinSizePostProcessor();
      default:
        // Java: `default: break;` then `return null;` (unreachable, all four constants are handled). The port's
        // `ILayoutProcessorFactory` contract is non-null, hence the cast (precedent: WhiteSpaceEliminationStrategy).
        return null as unknown as ILayoutProcessor<ElkNode>;
    }
  }
}
