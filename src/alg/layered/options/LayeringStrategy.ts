// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';

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

  /**
   * Creates the phase implementation. Every arm's class is ported in a later mission (L1): until then the arm throws
   * `UnsupportedOperationException` naming the class and the mission, with no import.
   */
  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this) {
      case LayeringStrategy.NETWORK_SIMPLEX:
        throw notPorted('NetworkSimplexLayerer', '7b');
      case LayeringStrategy.LONGEST_PATH:
        throw notPorted('LongestPathLayerer', '7b');
      case LayeringStrategy.COFFMAN_GRAHAM:
        throw notPorted('CoffmanGrahamLayerer', '7b');
      case LayeringStrategy.INTERACTIVE:
        throw notPorted('InteractiveLayerer', '7b');
      case LayeringStrategy.STRETCH_WIDTH:
        throw notPorted('StretchWidthLayerer', '7b');
      case LayeringStrategy.MIN_WIDTH:
        throw notPorted('MinWidthLayerer', '7b');
      case LayeringStrategy.LONGEST_PATH_SOURCE:
        throw notPorted('LongestPathSourceLayerer', '7b');
      case LayeringStrategy.BF_MODEL_ORDER:
        throw notPorted('BreadthFirstModelOrderLayerer', '7b');
      case LayeringStrategy.DF_MODEL_ORDER:
        throw notPorted('DepthFirstModelOrderLayerer', '7b');
      default:
        throw new IllegalArgumentException(`No implementation is available for the layerer ${this.toString()}`);
    }
  }
}

/** The L1 placeholder for a `create()` arm whose class is not ported yet. */
function notPorted(className: string, mission: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${className} is ported in mission ${mission}`);
}
