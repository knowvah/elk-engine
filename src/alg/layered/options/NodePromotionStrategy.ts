// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/NodePromotionStrategy.java
 * Java annotations kept as comments: NIKOLOV_IMPROVED: @AdvancedPropertyValue; NIKOLOV_IMPROVED_PIXEL: @AdvancedPropertyValue; DUMMYNODE_PERCENTAGE: @AdvancedPropertyValue; NODECOUNT_PERCENTAGE: @AdvancedPropertyValue; NO_BOUNDARY: @AdvancedPropertyValue.
 */
export class NodePromotionStrategy {
  static readonly NONE: NodePromotionStrategy = new NodePromotionStrategy('NONE', 0);
  static readonly NIKOLOV: NodePromotionStrategy = new NodePromotionStrategy('NIKOLOV', 1);
  static readonly NIKOLOV_PIXEL: NodePromotionStrategy = new NodePromotionStrategy('NIKOLOV_PIXEL', 2);
  static readonly NIKOLOV_IMPROVED: NodePromotionStrategy = new NodePromotionStrategy('NIKOLOV_IMPROVED', 3);
  static readonly NIKOLOV_IMPROVED_PIXEL: NodePromotionStrategy = new NodePromotionStrategy(
    'NIKOLOV_IMPROVED_PIXEL',
    4,
  );
  static readonly DUMMYNODE_PERCENTAGE: NodePromotionStrategy = new NodePromotionStrategy('DUMMYNODE_PERCENTAGE', 5);
  static readonly NODECOUNT_PERCENTAGE: NodePromotionStrategy = new NodePromotionStrategy('NODECOUNT_PERCENTAGE', 6);
  static readonly NO_BOUNDARY: NodePromotionStrategy = new NodePromotionStrategy('NO_BOUNDARY', 7);
  static readonly MODEL_ORDER_LEFT_TO_RIGHT: NodePromotionStrategy = new NodePromotionStrategy(
    'MODEL_ORDER_LEFT_TO_RIGHT',
    8,
  );
  static readonly MODEL_ORDER_RIGHT_TO_LEFT: NodePromotionStrategy = new NodePromotionStrategy(
    'MODEL_ORDER_RIGHT_TO_LEFT',
    9,
  );

  static readonly #VALUES: readonly NodePromotionStrategy[] = [
    NodePromotionStrategy.NONE,
    NodePromotionStrategy.NIKOLOV,
    NodePromotionStrategy.NIKOLOV_PIXEL,
    NodePromotionStrategy.NIKOLOV_IMPROVED,
    NodePromotionStrategy.NIKOLOV_IMPROVED_PIXEL,
    NodePromotionStrategy.DUMMYNODE_PERCENTAGE,
    NodePromotionStrategy.NODECOUNT_PERCENTAGE,
    NodePromotionStrategy.NO_BOUNDARY,
    NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT,
    NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodePromotionStrategy[] {
    return NodePromotionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodePromotionStrategy {
    const found = NodePromotionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.NodePromotionStrategy.${name}`,
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

  compareTo(other: NodePromotionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
