// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LeftRightTopDownNodePlacer } from './LeftRightTopDownNodePlacer.js';
import type { GridElkNode } from './GridElkNode.js';
import type { TopdownPackingPhases } from './TopdownPackingPhases.js';

/**
 * Node arrangement strategy to use during topdown packing algorithm.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/NodeArrangementStrategy.java
 */
export class NodeArrangementStrategy implements ILayoutPhaseFactory<TopdownPackingPhases, GridElkNode> {
  /** Places nodes from left to right, top to bottom in a grid. */
  static readonly LEFT_RIGHT_TOP_DOWN_NODE_PLACER: NodeArrangementStrategy = new NodeArrangementStrategy(
    'LEFT_RIGHT_TOP_DOWN_NODE_PLACER',
    0,
  );

  static readonly #VALUES: readonly NodeArrangementStrategy[] = [
    NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodeArrangementStrategy[] {
    return NodeArrangementStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodeArrangementStrategy {
    const found = NodeArrangementStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.topdownpacking.NodeArrangementStrategy.${name}`,
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

  compareTo(other: NodeArrangementStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<TopdownPackingPhases, GridElkNode> {
    switch (this) {
      case NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER:
        return new LeftRightTopDownNodePlacer();
      default:
        throw new IllegalArgumentException(`No implementation is available for the node placer ${this.toString()}`);
    }
  }
}
