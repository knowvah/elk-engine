// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { ILayoutProcessorFactory } from '../../../core/alg/ILayoutProcessorFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { TGraph } from '../graph/TGraph.js';
import { CompactionProcessor } from './CompactionProcessor.js';
import { DirectionProcessor } from './DirectionProcessor.js';
import { FanProcessor } from './FanProcessor.js';
import { GraphBoundsProcessor } from './GraphBoundsProcessor.js';
import { LevelCoordinatesProcessor } from './LevelCoordinatesProcessor.js';
import { LevelHeightProcessor } from './LevelHeightProcessor.js';
import { LevelProcessor } from './LevelProcessor.js';
import { NeighborsProcessor } from './NeighborsProcessor.js';
import { NodePositionProcessor } from './NodePositionProcessor.js';
import { RootProcessor } from './RootProcessor.js';
import { Untreeifyer } from './Untreeifyer.js';

/**
 * Definition of available intermediate layout processors for the tree layouter. This enumeration also serves as a
 * factory for intermediate layout processors. The constants are listed by the earliest slot in which they can
 * sensibly be used; the order in which they are listed is determined by the dependencies on other processors.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/IntermediateProcessorStrategy.java
 */
export class IntermediateProcessorStrategy implements ILayoutProcessorFactory<TGraph> {
  // Before Phase 2

  /** Determine the root of a given graph. */
  static readonly ROOT_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('ROOT_PROC', 0);

  /** Compute the fanout of each node in a given graph. */
  static readonly FAN_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('FAN_PROC', 1);

  /** Compute the level of each node in a given graph. */
  static readonly LEVEL_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('LEVEL_PROC', 2);

  // Before Phase 2 and 3

  /** Determine the local neighbors of each node in a given graph. */
  static readonly NEIGHBORS_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'NEIGHBORS_PROC',
    3,
  );

  // Before Phase 3

  /** Determine the height of each level in the given graph. */
  static readonly LEVEL_HEIGHT: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('LEVEL_HEIGHT', 4);

  // Before Phase 4

  /** Applies the layout direction. */
  static readonly DIRECTION_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'DIRECTION_PROC',
    5,
  );

  /** Set the coordinates for each node in a given graph. */
  static readonly NODE_POSITION_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'NODE_POSITION_PROC',
    6,
  );

  /** Applies compaction post processing to the graph. */
  static readonly COMPACTION_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'COMPACTION_PROC',
    7,
  );

  /** Determine the height of each level in the given graph. */
  static readonly LEVEL_COORDS: IntermediateProcessorStrategy = new IntermediateProcessorStrategy('LEVEL_COORDS', 8);

  /** Sets the graphs x/y max/min properties. */
  static readonly GRAPH_BOUNDS_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'GRAPH_BOUNDS_PROC',
    9,
  );

  // After Phase 4

  /** Reinsert edges that were removed for treeifying. */
  static readonly DETREEIFYING_PROC: IntermediateProcessorStrategy = new IntermediateProcessorStrategy(
    'DETREEIFYING_PROC',
    10,
  );

  static readonly #VALUES: readonly IntermediateProcessorStrategy[] = [
    IntermediateProcessorStrategy.ROOT_PROC,
    IntermediateProcessorStrategy.FAN_PROC,
    IntermediateProcessorStrategy.LEVEL_PROC,
    IntermediateProcessorStrategy.NEIGHBORS_PROC,
    IntermediateProcessorStrategy.LEVEL_HEIGHT,
    IntermediateProcessorStrategy.DIRECTION_PROC,
    IntermediateProcessorStrategy.NODE_POSITION_PROC,
    IntermediateProcessorStrategy.COMPACTION_PROC,
    IntermediateProcessorStrategy.LEVEL_COORDS,
    IntermediateProcessorStrategy.GRAPH_BOUNDS_PROC,
    IntermediateProcessorStrategy.DETREEIFYING_PROC,
  ];

  static readonly #FACTORIES: ReadonlyMap<IntermediateProcessorStrategy, () => ILayoutProcessor<TGraph>> = new Map([
    [IntermediateProcessorStrategy.ROOT_PROC, () => new RootProcessor()],
    [IntermediateProcessorStrategy.FAN_PROC, () => new FanProcessor()],
    [IntermediateProcessorStrategy.LEVEL_PROC, () => new LevelProcessor()],
    [IntermediateProcessorStrategy.NEIGHBORS_PROC, () => new NeighborsProcessor()],
    [IntermediateProcessorStrategy.LEVEL_HEIGHT, () => new LevelHeightProcessor()],
    [IntermediateProcessorStrategy.LEVEL_COORDS, () => new LevelCoordinatesProcessor()],
    [IntermediateProcessorStrategy.DIRECTION_PROC, () => new DirectionProcessor()],
    [IntermediateProcessorStrategy.NODE_POSITION_PROC, () => new NodePositionProcessor()],
    [IntermediateProcessorStrategy.COMPACTION_PROC, () => new CompactionProcessor()],
    [IntermediateProcessorStrategy.GRAPH_BOUNDS_PROC, () => new GraphBoundsProcessor()],
    [IntermediateProcessorStrategy.DETREEIFYING_PROC, () => new Untreeifyer()],
  ]);

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
        `No enum constant org.eclipse.elk.alg.mrtree.intermediate.IntermediateProcessorStrategy.${name}`,
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
   * Creates an instance of the layout processor described by this instance.
   *
   * @return the layout processor.
   */
  create(): ILayoutProcessor<TGraph> {
    // The Java `switch (this)` as a lookup (a 12-way switch exceeds the CCN limit): one constructor per constant, called
    // only here, in the Java case order; a constant outside the table reaches the Java `default`.
    const factory = IntermediateProcessorStrategy.#FACTORIES.get(this);
    if (factory === undefined) {
      throw new IllegalArgumentException(`No implementation is available for the layout processor ${this.toString()}`);
    }
    return factory();
  }
}
