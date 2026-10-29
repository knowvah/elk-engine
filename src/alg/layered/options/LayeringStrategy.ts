// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { BreadthFirstModelOrderLayerer } from '../p2layers/BreadthFirstModelOrderLayerer.js';
import { CoffmanGrahamLayerer } from '../p2layers/CoffmanGrahamLayerer.js';
import { DepthFirstModelOrderLayerer } from '../p2layers/DepthFirstModelOrderLayerer.js';
import { InteractiveLayerer } from '../p2layers/InteractiveLayerer.js';
import { LongestPathLayerer } from '../p2layers/LongestPathLayerer.js';
import { LongestPathSourceLayerer } from '../p2layers/LongestPathSourceLayerer.js';
import { MinWidthLayerer } from '../p2layers/MinWidthLayerer.js';
import { NetworkSimplexLayerer } from '../p2layers/NetworkSimplexLayerer.js';
import { StretchWidthLayerer } from '../p2layers/StretchWidthLayerer.js';

/**
 * Enumeration of and factory for the different available layering strategies.
 *
 * `@AdvancedPropertyValue`: `COFFMAN_GRAHAM`, `INTERACTIVE`; `@ExperimentalPropertyValue`: `STRETCH_WIDTH`,
 * `MIN_WIDTH`, `BF_MODEL_ORDER`, `DF_MODEL_ORDER`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/LayeringStrategy.java
 */
export class LayeringStrategy implements ILayoutPhaseFactory<LayeredPhases, LGraph> {
  /** All nodes will be layered with minimal edge length by using the network-simplex-algorithm. */
  static readonly NETWORK_SIMPLEX: LayeringStrategy = new LayeringStrategy('NETWORK_SIMPLEX', 0);
  /** All nodes will be layered according to the longest path to any sink. */
  static readonly LONGEST_PATH: LayeringStrategy = new LayeringStrategy('LONGEST_PATH', 1);
  /** All nodes will be layered according to the longest path to any source. */
  static readonly LONGEST_PATH_SOURCE: LayeringStrategy = new LayeringStrategy('LONGEST_PATH_SOURCE', 2);
  /** Allows to restrict the number of original nodes in any layer. Essentially solves a
   * precedence-constrained scheduling problem. */
  static readonly COFFMAN_GRAHAM: LayeringStrategy = new LayeringStrategy('COFFMAN_GRAHAM', 3);
  /** Nodes are put into layers according to their relative position. The actual positions as given in the
   * input diagram are considered here. This means that if the user moves a node, that movement is reflected in the
   * layering of the graph. */
  static readonly INTERACTIVE: LayeringStrategy = new LayeringStrategy('INTERACTIVE', 4);
  /** Nodes are put into Layers according to the average out-degree and their rank. Similar to
   * {@link LayeringStrategy.LONGEST_PATH}, however, tries to reduce the maximum number of nodes per layer. */
  static readonly STRETCH_WIDTH: LayeringStrategy = new LayeringStrategy('STRETCH_WIDTH', 5);
  /** Implementation of the 'MinWidth' heuristic for solving the NP-hard minimum-width layering problem with
   * consideration of dummy nodes. */
  static readonly MIN_WIDTH: LayeringStrategy = new LayeringStrategy('MIN_WIDTH', 6);
  /** Assumes an intended breadth first model order of nodes and creates layers accordingly. No node with a
   * higher model order is in a layer before a node with a lower model order. Dummy labels are only placed in layers
   * between real nodes. */
  static readonly BF_MODEL_ORDER: LayeringStrategy = new LayeringStrategy('BF_MODEL_ORDER', 7);
  /** Assumes an intended depth first model order of nodes and creates layers accordingly. Nodes are placed in
   * the next layer until a node does not connect the previous layer. Dummy labels are only placed in layers between
   * real nodes. */
  static readonly DF_MODEL_ORDER: LayeringStrategy = new LayeringStrategy('DF_MODEL_ORDER', 8);

  static readonly #VALUES: readonly LayeringStrategy[] = [
    LayeringStrategy.NETWORK_SIMPLEX,
    LayeringStrategy.LONGEST_PATH,
    LayeringStrategy.LONGEST_PATH_SOURCE,
    LayeringStrategy.COFFMAN_GRAHAM,
    LayeringStrategy.INTERACTIVE,
    LayeringStrategy.STRETCH_WIDTH,
    LayeringStrategy.MIN_WIDTH,
    LayeringStrategy.BF_MODEL_ORDER,
    LayeringStrategy.DF_MODEL_ORDER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayeringStrategy[] {
    return LayeringStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayeringStrategy {
    const found = LayeringStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.LayeringStrategy.${name}`,
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

  compareTo(other: LayeringStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this) {
      case LayeringStrategy.NETWORK_SIMPLEX:
        return new NetworkSimplexLayerer();
      case LayeringStrategy.LONGEST_PATH:
        return new LongestPathLayerer();
      case LayeringStrategy.COFFMAN_GRAHAM:
        return new CoffmanGrahamLayerer();
      case LayeringStrategy.INTERACTIVE:
        return new InteractiveLayerer();
      case LayeringStrategy.STRETCH_WIDTH:
        return new StretchWidthLayerer();
      case LayeringStrategy.MIN_WIDTH:
        return new MinWidthLayerer();
      case LayeringStrategy.LONGEST_PATH_SOURCE:
        return new LongestPathSourceLayerer();
      case LayeringStrategy.BF_MODEL_ORDER:
        return new BreadthFirstModelOrderLayerer();
      case LayeringStrategy.DF_MODEL_ORDER:
        return new DepthFirstModelOrderLayerer();
      default:
        throw new IllegalArgumentException(`No implementation is available for the layerer ${this.toString()}`);
    }
  }
}
