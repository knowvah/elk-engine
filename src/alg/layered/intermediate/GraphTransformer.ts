// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { DirectionCongruency } from '../options/DirectionCongruency.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { Mode } from './GraphTransformerMode.js';
import { mirrorXNodes, mirrorXSpacing } from './GraphTransformerMirrorX.js';
import { mirrorYNodes, mirrorYSpacing } from './GraphTransformerMirrorY.js';
import {
  transposeEdgeLabelPlacement,
  transposeNodes,
  transposeSpacing,
  transposeVector,
} from './GraphTransformerTranspose.js';

/**
 * A layout processor that is able to perform transformations on the coordinates of a graph. Note that the Java enum
 * (`IntermediateProcessorStrategy.java:211-215`) gives `DIRECTION_PREPROCESSOR` the mode `TO_INPUT_DIRECTION` and
 * `DIRECTION_POSTPROCESSOR` the mode `TO_INTERNAL_LTR` (the names are swapped; the oracle rows prove it). Both
 * `DIRECTION_PREPROCESSOR` and `DIRECTION_POSTPROCESSOR` (the `Mode` constructor argument). The mirror X, mirror Y and
 * transpose groups of the Java live in the `GraphTransformerMirrorX`, `GraphTransformerMirrorY` and
 * `GraphTransformerTranspose` sections (complexity limits); the Java overloads are named `mirrorXNodes`,
 * `mirrorXVector`, `mirrorXSpacing` and their Y and `transpose*` twins.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java
 */
export class GraphTransformer implements ILayoutProcessor<LGraph> {
  /** the configured mode of the graph transformer. */
  readonly #mode: Mode;

  /**
   * Creates a graph transformer with the given mode.
   *
   * @param themode the transformation mode
   * @see GraphTransformer.java:67
   */
  constructor(themode: Mode) {
    this.#mode = themode;
  }

  /** @see GraphTransformer.java:72 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin(`Graph transformation (${this.#mode.toString()})`, 1);

    // We need to add all layerless nodes as well as all nodes in layers since this processor
    // is run twice -- once before layering, and once afterwards
    const nodes: LNode[] = [...layeredGraph.getLayerlessNodes()];
    for (const layer of layeredGraph.getLayers()) {
      nodes.push(...layer.getNodes());
    }

    // graph transformations for unusual layout directions
    const congruency = layeredGraph.getProperty(LayeredOptions.DIRECTION_CONGRUENCY);
    if (congruency === DirectionCongruency.READING_DIRECTION) {
      // --------------------------------------------------------------
      //          variant that preserves reading direction
      // --------------------------------------------------------------
      this.#readingDirection(layeredGraph, nodes);
    } else if (this.#mode === Mode.TO_INTERNAL_LTR) {
      // --------------------------------------------------------------
      //          to internally used left-to-right direction
      // --------------------------------------------------------------
      this.#toInternal(layeredGraph, nodes);
    } else {
      // --------------------------------------------------------------
      //                 back to original direction
      // --------------------------------------------------------------
      this.#toInput(layeredGraph, nodes);
    }

    monitor.done();
  }

  /** The `READING_DIRECTION` switch of `process` (`:88-104`). */
  #readingDirection(layeredGraph: LGraph, nodes: LNode[]): void {
    switch (layeredGraph.getProperty(LayeredOptions.DIRECTION)) {
      case Direction.LEFT:
        this.#mirrorAllX(layeredGraph, nodes);
        break;
      case Direction.DOWN:
        this.#transposeAll(layeredGraph, nodes);
        break;
      case Direction.UP:
        if (this.#mode === Mode.TO_INTERNAL_LTR) {
          this.#transposeAll(layeredGraph, nodes);
          this.#mirrorAllY(layeredGraph, nodes);
        } else {
          this.#mirrorAllY(layeredGraph, nodes);
          this.#transposeAll(layeredGraph, nodes);
        }
        break;
    }
  }

  /** The `TO_INTERNAL_LTR` switch of `process` (`:110-121`). */
  #toInternal(layeredGraph: LGraph, nodes: LNode[]): void {
    switch (layeredGraph.getProperty(LayeredOptions.DIRECTION)) {
      case Direction.LEFT:
        this.#mirrorAllX(layeredGraph, nodes);
        this.#mirrorAllY(layeredGraph, nodes);
        break;
      case Direction.DOWN:
        this.#rotate90Clockwise(layeredGraph, nodes);
        break;
      case Direction.UP:
        this.#rotate90CounterClockwise(layeredGraph, nodes);
        break;
    }
  }

  /** The `TO_INPUT_DIRECTION` switch of `process` (`:126-137`). */
  #toInput(layeredGraph: LGraph, nodes: LNode[]): void {
    switch (layeredGraph.getProperty(LayeredOptions.DIRECTION)) {
      case Direction.LEFT:
        this.#mirrorAllX(layeredGraph, nodes);
        this.#mirrorAllY(layeredGraph, nodes);
        break;
      case Direction.DOWN:
        this.#rotate90CounterClockwise(layeredGraph, nodes);
        break;
      case Direction.UP:
        this.#rotate90Clockwise(layeredGraph, nodes);
        break;
    }
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Convenience

  /** @see GraphTransformer.java:147 */
  #rotate90Clockwise(layeredGraph: LGraph, nodes: LNode[]): void {
    this.#transposeAll(layeredGraph, nodes);
    this.#mirrorAllX(layeredGraph, nodes);
  }

  /** @see GraphTransformer.java:152 */
  #rotate90CounterClockwise(layeredGraph: LGraph, nodes: LNode[]): void {
    this.#mirrorAllX(layeredGraph, nodes);
    this.#transposeAll(layeredGraph, nodes);
  }

  /** @see GraphTransformer.java:157 */
  #mirrorAllX(layeredGraph: LGraph, nodes: LNode[]): void {
    mirrorXNodes(nodes, layeredGraph);
    mirrorXSpacing(layeredGraph.getPadding());
    mirrorXSpacing(layeredGraph.getProperty(LayeredOptions.NODE_LABELS_PADDING));
  }

  /** @see GraphTransformer.java:163 */
  #mirrorAllY(layeredGraph: LGraph, nodes: LNode[]): void {
    mirrorYNodes(nodes, layeredGraph);
    mirrorYSpacing(layeredGraph.getPadding());
    mirrorYSpacing(layeredGraph.getProperty(LayeredOptions.NODE_LABELS_PADDING));
  }

  /** @see GraphTransformer.java:169 */
  #transposeAll(layeredGraph: LGraph, nodes: LNode[]): void {
    transposeNodes(nodes);
    transposeEdgeLabelPlacement(layeredGraph);
    transposeVector(layeredGraph.getOffset());
    transposeVector(layeredGraph.getSize());
    transposeSpacing(layeredGraph.getPadding());
    transposeSpacing(layeredGraph.getProperty(LayeredOptions.NODE_LABELS_PADDING));
  }
}
