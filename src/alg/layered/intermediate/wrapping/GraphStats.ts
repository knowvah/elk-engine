// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from '../../../../java/util/NoSuchElementException.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';

/** Java's `double[]` / `boolean[]` element access outside the array throws; a JavaScript array answers `undefined`. */
function checkArrayIndex(index: number, length: number): void {
  if (index < 0 || index >= length) {
    throw new ArrayIndexOutOfBoundsException(`Index ${index} out of bounds for length ${length}`);
  }
}

/**
 * `layers.subList(lowIdx, highIdx)` as a copy (only read here). The `List.subList` Javadoc names an
 * `IndexOutOfBoundsException` for an illegal endpoint index value.
 */
function subList(layers: readonly Layer[], lowIdx: number, highIdx: number): Layer[] {
  if (lowIdx < 0 || highIdx > layers.length || lowIdx > highIdx) {
    throw new IndexOutOfBoundsException(`fromIndex ${lowIdx}, toIndex ${highIdx}, size ${layers.length}`);
  }
  return layers.slice(lowIdx, highIdx);
}

/**
 * Java `stream.reduce(fun).get()`: a left fold without identity; an empty stream throws on `get()`.
 */
function reduceGet(values: readonly number[], fun: (a: number, b: number) => number): number {
  if (values.length === 0) {
    throw new NoSuchElementException('No value present');
  }
  let acc = values[0]!;
  for (let i = 1; i < values.length; i++) {
    acc = fun(acc, values[i]!);
  }
  return acc;
}

/**
 * Collects (lazily) some information about a layered graph. For instance: longest path and maximum width and height of
 * a layer.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/GraphStats.java
 */
export class GraphStats {
  readonly graph: LGraph;
  private spacing = 0;
  private inLayerSpacing = 0;

  // computed during instantiation
  readonly dar: number;
  readonly longestPath: number;

  // computed on demand (Java boxed `Double`, null until computed)
  private maxWidth: number | null = null;
  private maxHeight: number | null = null;
  private sumWidth: number | null = null;

  private widths: number[] | null = null;
  private heights: number[] | null = null;

  private cutsAllowed: boolean[] | null = null;

  /** Initialize new stats object, most of the internal data are not yet initialized. */
  constructor(graph: LGraph) {
    this.graph = graph;

    // since the graph direction may be horizontal (default) or vertical,
    //  the desired aspect ration must be adjusted correspondingly
    //  (ELK internally always assumes left to right, however the
    //  aspect ratio is not adjusted during graph import)
    const dir = graph.getProperty(LayeredOptions.DIRECTION);
    const aspectRatio = graph.getProperty(LayeredOptions.ASPECT_RATIO);
    const correction = graph.getProperty(LayeredOptions.WRAPPING_CORRECTION_FACTOR);
    if (dir === Direction.LEFT || dir === Direction.RIGHT || dir === Direction.UNDEFINED) {
      this.dar = aspectRatio * correction;
    } else {
      this.dar = 1 / (aspectRatio * correction);
    }

    this.spacing = graph.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS);
    this.inLayerSpacing = graph.getProperty(LayeredOptions.SPACING_NODE_NODE);

    this.longestPath = graph.getLayers().length;
  }

  // ------------------------------------------------------------------------------------------- //
  // Approximations
  // ------------------------------------------------------------------------------------------- //

  /** @returns the max width of any node of the layer. */
  getApproximateLayerWidth(l: Layer): number {
    return this.determineLayerWidth(l);
  }

  /** @returns the approximate width of the _current_ layering (the sum of each layer's width). */
  getApproximateLayeringWidth(): number {
    return this.getSumWidth();
  }

  /** @returns the approximate width of the _new_ layering that would be created if the `cuts` were applied. */
  getApproximateChunkBasedLayeringWidth(cuts: readonly number[]): number {
    if (cuts.length === 0) {
      return this.getApproximateLayeringWidth();
    }
    let width = 0;
    let lowIdx = 0;
    for (const highIdx of cuts) {
      width = Math.max(width, this.determineChunkWidth(lowIdx, highIdx));
      lowIdx = highIdx;
    }
    width = Math.max(width, this.determineChunkWidth(lowIdx, this.graph.getLayers().length));
    return width;
  }

  /** @returns the sum of the layer's node heights. */
  getApproximateLayerHeight(l: Layer): number {
    return this.determineLayerHeight(l);
  }

  /** @returns the approximate height of the _current_ layering (the max height of any layer). */
  getApproximateLayeringHeight(): number {
    return this.getMaxHeight();
  }

  /** @returns the approximate height of the _new_ layering that would be created if the `cuts` were applied. */
  getApproximateChunkBasedLayeringHeight(cuts: readonly number[]): number {
    if (cuts.length === 0) {
      return 0;
    }
    let height = 0;
    let lowIdx = 0;
    for (const highIdx of cuts) {
      height += this.determineChunkHeight(lowIdx, highIdx);
      lowIdx = highIdx;
    }
    height += this.determineChunkHeight(lowIdx, this.graph.getLayers().length);
    return height;
  }

  // ------------------------------------------------------------------------------------------- //
  // Widths
  // ------------------------------------------------------------------------------------------- //

  /** @returns the maxWidth */
  getMaxWidth(): number {
    if (this.maxWidth === null) {
      this.maxWidth = this.determineWidth((a, b) => Math.max(a, b));
    }
    return this.maxWidth;
  }

  getSumWidth(): number {
    if (this.sumWidth === null) {
      this.sumWidth = this.determineWidth((a, b) => a + b);
    }
    return this.sumWidth;
  }

  /** @returns the widths */
  getWidths(): number[] {
    if (this.widths === null) {
      this.initWidthsAndHeights();
    }
    return this.widths!;
  }

  private initWidthsAndHeights(): void {
    const n = this.longestPath;
    const widths = new Array<number>(n).fill(0);
    const heights = new Array<number>(n).fill(0);
    this.widths = widths;
    this.heights = heights;

    for (let i = 0; i < n; i++) {
      const l = this.graph.getLayers()[i]!;
      widths[i] = this.determineLayerWidth(l);
      heights[i] = this.determineLayerHeight(l);
    }
  }

  private determineWidth(fun: (a: number, b: number) => number): number {
    return reduceGet(
      this.graph.getLayers().map((l) => this.determineLayerWidth(l)),
      fun,
    );
  }

  /** @returns max of any node width in the layer plus spacing */
  private determineLayerWidth(l: Layer): number {
    let maxW = 0;
    for (const n of l.getNodes()) {
      const nW = n.getSize().x + n.getMargin().right + n.getMargin().left + this.spacing;
      maxW = Math.max(maxW, nW);
    }
    return maxW;
  }

  /** @returns the sum of layer widths between lowIdx (inclusive) and highIdx (exclusive). */
  private determineChunkWidth(lowIdx: number, highIdx: number): number {
    const widths = subList(this.graph.getLayers(), lowIdx, highIdx).map((l) => this.determineLayerWidth(l));
    // `.reduce(Double::sum).orElse(0)`: a left fold, 0 for the empty chunk
    return widths.length === 0 ? 0 : reduceGet(widths, (a, b) => a + b);
  }

  // ------------------------------------------------------------------------------------------- //
  // Heights
  // ------------------------------------------------------------------------------------------- //

  /** @returns the maxHeight */
  getMaxHeight(): number {
    if (this.maxHeight === null) {
      this.maxHeight = this.determineHeight((a, b) => Math.max(a, b));
    }
    return this.maxHeight;
  }

  /** @returns the heights */
  getHeights(): number[] {
    if (this.heights === null) {
      this.initWidthsAndHeights();
    }
    return this.heights!;
  }

  private determineHeight(fun: (a: number, b: number) => number): number {
    return reduceGet(
      this.graph.getLayers().map((l) => this.determineLayerHeight(l)),
      fun,
    );
  }

  private determineLayerHeight(layer: Layer): number {
    let lH = 0;
    for (const n of layer.getNodes()) {
      lH += n.getSize().y + n.getMargin().bottom + n.getMargin().top + this.inLayerSpacing;

      for (const inc of n.getIncomingEdges()) {
        if (inc.getSource()!.getNode()!.getType() === NodeType.NORTH_SOUTH_PORT) {
          const src = inc.getSource()!.getNode()!;
          // Java `(LNode) src.getProperty(ORIGIN)`: the origin of a north/south port dummy is its LNode; a null
          // origin fails at the first dereference below as in Java
          const origin = src.getProperty(InternalProperties.ORIGIN) as LNode;
          lH += origin.getSize().y + origin.getMargin().bottom + origin.getMargin().top;
        }
      }
    }

    return lH;
  }

  /** @returns the maximum layer height between lowIdx (inclusive) and highIdx (exclusive). */
  private determineChunkHeight(lowIdx: number, highIdx: number): number {
    const heights = subList(this.graph.getLayers(), lowIdx, highIdx).map((l) => this.determineLayerHeight(l));
    // `.max().orElse(0)`: a left fold of `Math.max`, 0 for the empty chunk
    return heights.length === 0 ? 0 : reduceGet(heights, (a, b) => Math.max(a, b));
  }

  // ------------------------------------------------------------------------------------------- //
  // Cutting allowed?
  // ------------------------------------------------------------------------------------------- //

  /**
   * @param layerIndex the index of a layer.
   * @returns whether it is allowed to but _before_ `layerIndex`.
   */
  isCutAllowed(layerIndex: number): boolean {
    if (this.cutsAllowed === null) {
      this.initCutAllowed();
    }
    const allowed = this.cutsAllowed!;
    checkArrayIndex(layerIndex, allowed.length);
    return allowed[layerIndex]!;
  }

  private initCutAllowed(): void {
    if (this.cutsAllowed !== null) {
      return;
    }

    const layers = this.graph.getLayers();
    const cutsAllowed = new Array<boolean>(layers.length).fill(false);
    this.cutsAllowed = cutsAllowed;
    checkArrayIndex(0, cutsAllowed.length);
    cutsAllowed[0] = false;

    if (this.graph.hasProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES)) {
      // user-specified forbidden indices
      const forbidden = this.graph.getProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES);
      for (const f of forbidden) {
        if (f > 0 && f < cutsAllowed.length) {
          cutsAllowed[f] = false;
        }
      }
    } else {
      // 'default' behavior as implemented by 'isCutAllowed(..)'
      const layerIt = new ArrayListIterator<Layer>(layers);
      // skip the first layer
      if (layerIt.hasNext()) {
        layerIt.next();
      }
      // now check for valid cut indexes
      let i = 1; // plain number: bounded by layers.length
      while (layerIt.hasNext()) {
        const layer = layerIt.next();
        cutsAllowed[i++] = this.isCutAllowedForLayer(layer);
      }
    }
  }

  /** @returns the cutsAllowed */
  getCutsAllowed(): boolean[] {
    if (this.cutsAllowed === null) {
      this.initCutAllowed();
    }
    return this.cutsAllowed!;
  }

  /**
   * @returns whether it is allowed to cut _before_ the given layer. (Java's private overload `isCutAllowed(Layer)`;
   *   TypeScript has no overloading by type.)
   */
  private isCutAllowedForLayer(layer: Layer): boolean {
    // we only allow to cut between a pair of layers
    // if there is only one pair
    // of nodes that is connected by 1 or more edges
    let cutAllowed = true;
    let n1: LNode | null = null;
    let n2: LNode | null = null;
    check: for (const tgt of layer.getNodes()) {
      for (const e of tgt.getIncomingEdges()) {
        // check for different source
        if (n1 !== null && n1 !== tgt) {
          cutAllowed = false;
          break check;
        }
        n1 = tgt;
        // check for different target
        const src = e.getSource()!.getNode()!;
        if (n2 !== null && n2 !== src) {
          cutAllowed = false;
          break check;
        }
        n2 = src;
      }
    }
    return cutAllowed;
  }
}
