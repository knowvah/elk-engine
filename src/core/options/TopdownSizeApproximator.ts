// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../graph/ElkEdge.js';
import { ElkGraphFactory } from '../../graph/ElkGraphFactory.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import { LayoutAlgorithmResolver } from '../data/LayoutAlgorithmResolver.js';
import { KVector } from '../math/KVector.js';
import { ElkUtil } from '../util/ElkUtil.js';
import { NullElkProgressMonitor } from '../util/NullElkProgressMonitor.js';
import { CoreOptions } from './CoreOptions.js';
import { FixedLayouterOptions } from './FixedLayouterOptions.js';
import type { ITopdownSizeApproximator } from './ITopdownSizeApproximator.js';
import { TopdownSizeApproximatorUtil } from './TopdownSizeApproximatorUtil.js';

/** The body of an enum constant: `getSize` of the Java constant-specific class body. */
type SizeFunction = (node: ElkNode) => KVector;

/**
 * Computes the square root of the number of children and uses that as a multiplier for the base size
 * of the node. Nodes with no children will have a resulting size of 0, which means any other factors
 * determining the size will be dominant. Uses {@link CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH} and
 * {@link CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO} as the base size.
 */
function countChildrenSize(node: ElkNode): KVector {
  const size = node.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH) * Math.sqrt(node.getChildren().size());
  return new KVector(size, size / node.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO));
}

/** Clones the current hierarchy level: the node, its children (sized by COUNT_CHILDREN) and the edges between them. */
function copyHierarchyLevel(originalGraph: ElkNode): ElkNode {
  const node = ElkGraphFactory.eINSTANCE.createElkNode();
  node.copyProperties(originalGraph);
  const oldToNewNodeMap = new Map<ElkNode, ElkNode>();
  // copy children
  for (const child of originalGraph.getChildren()) {
    const newChild = ElkGraphFactory.eINSTANCE.createElkNode();
    newChild.setParent(node);
    newChild.copyProperties(child);
    // set size according to microlayout or node count approximator
    const size = TopdownSizeApproximator.COUNT_CHILDREN.getSize(child);
    newChild.setDimensions(Math.max(child.getWidth(), size.x), Math.max(child.getHeight(), size.y));
    oldToNewNodeMap.set(child, newChild);
  }
  // copy edges, explicitly assuming no hyperedges here
  for (const child of originalGraph.getChildren()) {
    for (const edge of child.getOutgoingEdges()) {
      const newSrc = oldToNewNodeMap.get(child) as ElkNode;
      const newTar = oldToNewNodeMap.get(edge.getTargets().get(0) as ElkNode) as ElkNode;
      const newEdge: ElkEdge = ElkGraphFactory.eINSTANCE.createElkEdge();
      newEdge.getSources().add(newSrc);
      newEdge.getTargets().add(newTar);
      newEdge.setContainingNode(newSrc.getParent());
      newEdge.copyProperties(edge);
    }
  }
  return node;
}

/**
 * Lays out `node` with the provider of its resolved algorithm, fetched from the instance pool; a failing provider is
 * disposed instead of released.
 */
function layoutWithPooledProvider(algorithmData: LayoutAlgorithmData, node: ElkNode): void {
  const layoutProvider: AbstractLayoutProvider = algorithmData.getInstancePool().fetch();
  try {
    // Perform layout on the current hierarchy level
    layoutProvider.layout(node, new NullElkProgressMonitor());
    algorithmData.getInstancePool().release(layoutProvider);
  } catch (exception) {
    // The layout provider has failed - destroy it slowly and painfully
    layoutProvider.dispose();
    throw exception;
  }
}

/**
 * Computes the layout of a node to get an estimate of how much space it needs. In order to do this, the
 * node and its children are copied including the edges between the children. All edges must be simple edges
 * not hyperedges.
 * The nodes are assigned sizes for the layout algorithm according to the COUNT_CHILDREN approximator.
 */
function lookaheadLayoutSize(originalGraph: ElkNode): KVector {
  const algorithmData = originalGraph.getProperty(CoreOptions.RESOLVED_ALGORITHM);

  // clone the current hierarchy
  const node = copyHierarchyLevel(originalGraph);

  layoutWithPooledProvider(algorithmData, node);

  if (!(node.hasProperty(CoreOptions.CHILD_AREA_WIDTH) || node.hasProperty(CoreOptions.CHILD_AREA_HEIGHT))) {
    // compute child area if it hasn't been set by the layout algorithm
    ElkUtil.computeChildAreaDimensions(node);
  }

  const childAreaDesiredWidth = node.getProperty(CoreOptions.CHILD_AREA_WIDTH);
  const childAreaDesiredHeight = node.getProperty(CoreOptions.CHILD_AREA_HEIGHT);

  const childAreaDesiredAspectRatio = childAreaDesiredWidth / childAreaDesiredHeight;

  // square root approximation for base size
  const baseSize = node.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH) * Math.sqrt(node.getChildren().size());

  const padding = node.getProperty(CoreOptions.PADDING);
  const minWidth = padding.left + padding.right + 1;
  const minHeight = padding.top + padding.bottom + 1;

  // the alternative to this is to return the desired Size directly, in that case region scales are close
  // to the children, in this case on the other hand region scales are close to their parent
  return new KVector(Math.max(minWidth, baseSize), Math.max(minHeight, baseSize / childAreaDesiredAspectRatio));

  // ALTERNATE WAYS TO APPROXIMATE SIZES (kept from the Java):
  // alternative 1 (current): the return above
  // alternative 2: baseSize = TOPDOWN_HIERARCHICAL_NODE_WIDTH, then the same return
  // alternative 3: new KVector(Math.max(minWidth, childAreaDesiredWidth), Math.max(minHeight, childAreaDesiredHeight))
}

/**
 * Fixed Integer Ratio Approximator
 * Dependent on the size of the child graphs, rectangles of fixed ratios are produced.
 * The goal is to enable good packings and also give bigger subgraphs more space.
 */
function fixedIntegerRatioBoxesSize(originalGraph: ElkNode): KVector {
  const baseWidth = originalGraph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH);
  const baseHeight = baseWidth / originalGraph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO);

  // four categories of box sizes, tiny = half-width, small = base-width, medium = double-width, large = quadruple-width
  // how graph sizes are distributed into these categories has a great effect on the final result
  const multiplier = TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(originalGraph);

  // Combine multiplier, spacings and base size to compute final size
  const padding = originalGraph.getProperty(CoreOptions.PADDING);
  let nodeNodeSpacing = CoreOptions.SPACING_NODE_NODE.getDefault();
  const parent = originalGraph.getParent();
  if (parent !== null) {
    nodeNodeSpacing = parent.getProperty(CoreOptions.SPACING_NODE_NODE);
  }
  const resultSize = new KVector(baseWidth, baseHeight).scale(multiplier);
  return resultSize.add(
    new KVector(-(padding.left + padding.right) - nodeNodeSpacing, -(padding.top + padding.bottom) - nodeNodeSpacing),
  );
}

/** The size approximation of one child of a LAYOUT_NEXT_LEVEL parent: approximate it, or give it the base size. */
function approximateChildSize(childNode: ElkNode): void {
  const approximator = childNode.getProperty(CoreOptions.TOPDOWN_SIZE_APPROXIMATOR) as ITopdownSizeApproximator | null;
  if (approximator !== null && childNode.getChildren().size() > 0) {
    const size = approximator.getSize(childNode);
    const padding = childNode.getProperty(CoreOptions.PADDING);
    // never reuse the old size, always reset, otherwise calling layout multiple times leads to growing regions
    childNode.setDimensions(
      Math.max(childNode.getWidth(), size.x + padding.left + padding.right),
      Math.max(childNode.getHeight(), size.y + padding.top + padding.bottom),
    );
  } else if (childNode.getChildren().size() !== 0) {
    childNode.setDimensions(
      childNode.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH),
      childNode.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH) /
        childNode.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO),
    );
  }
}

/** This approximator simply lays out the next level and sets its algorithm to fixed so that it is later skipped. */
function layoutNextLevelSize(originalGraph: ElkNode): KVector {
  // do size approximations for children
  for (const childNode of originalGraph.getChildren()) {
    approximateChildSize(childNode);
  }

  // layout children
  // Get an instance of the layout provider
  const algorithmData = originalGraph.getProperty(CoreOptions.RESOLVED_ALGORITHM);
  layoutWithPooledProvider(algorithmData, originalGraph);

  // set layout to fixed layout
  originalGraph.setProperty(CoreOptions.ALGORITHM, FixedLayouterOptions.ALGORITHM_ID);
  new LayoutAlgorithmResolver().visit(originalGraph);

  ElkUtil.computeChildAreaDimensions(originalGraph);
  const childAreaDesiredWidth = originalGraph.getProperty(CoreOptions.CHILD_AREA_WIDTH);
  const childAreaDesiredHeight = originalGraph.getProperty(CoreOptions.CHILD_AREA_HEIGHT);

  // apply size to graph
  return new KVector(childAreaDesiredWidth, childAreaDesiredHeight);
}

/**
 * A size approximator is used to dynamically decide a size for a node to be used during topdown layout
 * of hierarchical nodes. This allows the use of a size approximation strategy to minimize white space
 * in the final result.
 *
 * Each Java constant has a body implementing `getSize`; here the bodies are the functions above, passed to the
 * private constructor (`docs/translation-rules.md` 6.3).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximator.java
 */
export class TopdownSizeApproximator implements ITopdownSizeApproximator {
  static readonly COUNT_CHILDREN: TopdownSizeApproximator = new TopdownSizeApproximator(
    'COUNT_CHILDREN',
    0,
    countChildrenSize,
  );
  static readonly LOOKAHEAD_LAYOUT: TopdownSizeApproximator = new TopdownSizeApproximator(
    'LOOKAHEAD_LAYOUT',
    1,
    lookaheadLayoutSize,
  );
  static readonly FIXED_INTEGER_RATIO_BOXES: TopdownSizeApproximator = new TopdownSizeApproximator(
    'FIXED_INTEGER_RATIO_BOXES',
    2,
    fixedIntegerRatioBoxesSize,
  );
  static readonly LAYOUT_NEXT_LEVEL: TopdownSizeApproximator = new TopdownSizeApproximator(
    'LAYOUT_NEXT_LEVEL',
    3,
    layoutNextLevelSize,
  );

  static readonly #VALUES: readonly TopdownSizeApproximator[] = [
    TopdownSizeApproximator.COUNT_CHILDREN,
    TopdownSizeApproximator.LOOKAHEAD_LAYOUT,
    TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES,
    TopdownSizeApproximator.LAYOUT_NEXT_LEVEL,
  ];

  readonly #name: string;
  readonly #ordinal: number;
  readonly #sizeFunction: SizeFunction;

  private constructor(name: string, ordinal: number, sizeFunction: SizeFunction) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#sizeFunction = sizeFunction;
  }

  /** The constants in declaration order. */
  static values(): readonly TopdownSizeApproximator[] {
    return TopdownSizeApproximator.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TopdownSizeApproximator {
    const found = TopdownSizeApproximator.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.options.TopdownSizeApproximator.${name}`,
      );
    }
    return found;
  }

  getSize(node: ElkNode): KVector {
    return this.#sizeFunction(node);
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

  compareTo(other: TopdownSizeApproximator): number {
    return this.#ordinal - other.#ordinal;
  }
}
