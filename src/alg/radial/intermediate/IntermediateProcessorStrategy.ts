// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { ILayoutProcessorFactory } from '../../../core/alg/ILayoutProcessorFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CalculateGraphSize } from './CalculateGraphSize.js';
import { EdgeAngleCalculator } from './EdgeAngleCalculator.js';
import { GeneralCompactor } from './compaction/GeneralCompactor.js';
import { RadiusExtensionOverlapRemoval } from './overlaps/RadiusExtensionOverlapRemoval.js';
import { GeneralRotator } from './rotation/GeneralRotator.js';

/**
 * The list of intermediate processors. Listed by slot: after phase 1 (`OVERLAP_REMOVAL`, `COMPACTION`), before phase 2
 * (`ROTATION`, `GRAPH_SIZE_CALCULATION`), after phase 2 (`OUTGOING_EDGE_ANGLES`).
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/IntermediateProcessorStrategy.java
 */
export class IntermediateProcessorStrategy implements ILayoutProcessorFactory<ElkNode> {
  /** Remove the overlaps from the graph. */
  static readonly OVERLAP_REMOVAL: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'OVERLAP_REMOVAL',
    0,
  );
  /** Compact the current layout. */
  static readonly COMPACTION: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('COMPACTION', 1);
  /** Rotate the final layout. */
  static readonly ROTATION: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('ROTATION', 2);
  /** Calculate the graph size to the new values. */
  static readonly GRAPH_SIZE_CALCULATION: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'GRAPH_SIZE_CALCULATION',
    3,
  );
  /** Store a target angle on child nodes to leave space for an edge coming from the root to the center of the child node. */
  static readonly OUTGOING_EDGE_ANGLES: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'OUTGOING_EDGE_ANGLES',
    4,
  );

  static readonly #VALUES: readonly IntermediateProcessorStrategy[] = [
    IntermediateProcessorStrategy.OVERLAP_REMOVAL,
    IntermediateProcessorStrategy.COMPACTION,
    IntermediateProcessorStrategy.ROTATION,
    IntermediateProcessorStrategy.GRAPH_SIZE_CALCULATION,
    IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES,
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
        `No enum constant org.eclipse.elk.alg.radial.intermediate.IntermediateProcessorStrategy.${name}`,
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

  /** Creates the processor implementation. */
  create(): ILayoutProcessor<ElkNode> {
    switch (this) {
      case IntermediateProcessorStrategy.OVERLAP_REMOVAL:
        return new RadiusExtensionOverlapRemoval();
      case IntermediateProcessorStrategy.COMPACTION:
        return new GeneralCompactor();
      case IntermediateProcessorStrategy.ROTATION:
        return new GeneralRotator();
      case IntermediateProcessorStrategy.GRAPH_SIZE_CALCULATION:
        return new CalculateGraphSize();
      case IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES:
        return new EdgeAngleCalculator();
      default:
        throw new IllegalArgumentException(
          `No implementation is available for the layout processor ${this.toString()}`,
        );
    }
  }
}
