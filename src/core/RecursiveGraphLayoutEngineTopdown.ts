// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../graph/ElkNode.js';
import { toString as doubleToString } from '../java/lang/DoubleToString.js';
import type { EnumSet } from '../java/util/EnumSet.js';
import type { AbstractLayoutProvider } from './AbstractLayoutProvider.js';
import type { LayoutAlgorithmData } from './data/LayoutAlgorithmData.js';
import type { ITopdownLayoutProvider } from './ITopdownLayoutProvider.js';
import type { ElkPadding } from './math/ElkPadding.js';
import { KVector } from './math/KVector.js';
import { ContentAlignment } from './options/ContentAlignment.js';
import { CoreOptions } from './options/CoreOptions.js';
import type { ITopdownSizeApproximator } from './options/ITopdownSizeApproximator.js';
import { TopdownNodeTypes } from './options/TopdownNodeTypes.js';
import { UnsupportedConfigurationException } from './UnsupportedConfigurationException.js';
import { ElkUtil } from './util/ElkUtil.js';
import type { IElkProgressMonitor } from './util/IElkProgressMonitor.js';

/*
 * The topdown section of `RecursiveGraphLayoutEngine.layoutRecursively` (Java `:224-404`), split out of the engine
 * because the port exceeds the 500-line file cap (M17). Module functions in Java order; the engine keeps a private
 * `layoutTopdown` delegate so the Java method boundary stays visible.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/RecursiveGraphLayoutEngine.java
 */

/** Java `instanceof ITopdownLayoutProvider`: TypeScript interfaces are structural, so test for the method. */
function isTopdownLayoutProvider(
  provider: AbstractLayoutProvider,
): provider is AbstractLayoutProvider & ITopdownLayoutProvider {
  return typeof (provider as Partial<ITopdownLayoutProvider>).getPredictedGraphSize === 'function';
}

/** Java `receiver.equals(other)` on a node type: a `null` receiver is a `NullPointerException` (D10: `TypeError`). */
function nodeTypeEquals(receiver: TopdownNodeTypes | null, other: TopdownNodeTypes): boolean {
  if (receiver === null) {
    throw new TypeError('Cannot invoke "TopdownNodeTypes.equals(Object)" because the top-down node type is null');
  }
  return receiver === other;
}

/**
 * Java auto-unboxing of a `Double` property without a default: an unset value is a `NullPointerException` (D10:
 * `TypeError`), where TypeScript arithmetic would silently treat `null` as `0`.
 */
function unboxDouble(value: number | null): number {
  if (value === null) {
    throw new TypeError('Cannot unbox a null Double');
  }
  return value;
}

/** Java `subTask(work)` passed on unchecked: a closed monitor's `null` fails where it is first used, as in Java. */
export function subTask(progressMonitor: IElkProgressMonitor, work: number): IElkProgressMonitor {
  return progressMonitor.subTask(work) as IElkProgressMonitor;
}

/** The available and desired child area of a hierarchical node (the Java locals of the same names). */
interface ChildArea {
  readonly childAreaAvailableWidth: number;
  readonly childAreaAvailableHeight: number;
  readonly childAreaDesiredWidth: number;
  readonly childAreaDesiredHeight: number;
}

/** The scale factors of a hierarchical node (the Java locals of the same names). */
interface ScaleFactors {
  readonly scaleFactorX: number;
  readonly scaleFactorY: number;
  readonly scaleFactor: number;
}

/**
 * The topdown layout of `layoutRecursively` (Java `:224-404`): layout of this node first, then scale factors.
 * `execute` is the engine's `executeAlgorithm` bound to this node, so an overriding engine is still called.
 */
export function layoutTopdown(
  layoutNode: ElkNode,
  progressMonitor: IElkProgressMonitor,
  nodeCount: number,
  execute: (monitor: IElkProgressMonitor) => void,
): void {
  const topdownLayoutMonitor = subTask(progressMonitor, 1);
  topdownLayoutMonitor.begin('Topdown Layout', 1);

  precomputeChildSizes(layoutNode);

  const padding = layoutNode.getProperty(CoreOptions.PADDING);

  const childAreaAvailableWidth = layoutNode.getWidth() - (padding.left + padding.right);
  const childAreaAvailableHeight = layoutNode.getHeight() - (padding.top + padding.bottom);

  topdownLayoutMonitor.log(
    `Available Child Area: (${doubleToString(childAreaAvailableWidth)}|${doubleToString(childAreaAvailableHeight)})`,
  );

  layoutNode.setProperty(CoreOptions.ASPECT_RATIO, childAreaAvailableWidth / childAreaAvailableHeight);

  execute(subTask(progressMonitor, nodeCount));
  // root node needs its size to be set manually
  setRootNodeSize(layoutNode, padding);
  topdownLayoutMonitor.log(
    `Executed layout algorithm: ${layoutNode.getProperty(CoreOptions.ALGORITHM)}` +
      ` on node ${layoutNode.getIdentifier()}`,
  );

  if (nodeTypeEquals(layoutNode.getProperty(CoreOptions.TOPDOWN_NODE_TYPE), TopdownNodeTypes.HIERARCHICAL_NODE)) {
    scaleHierarchicalNode(layoutNode, padding, childAreaAvailableWidth, childAreaAvailableHeight, topdownLayoutMonitor);
  }
  topdownLayoutMonitor.done();
}

/** The child size pre-computation of the topdown layout (Java `:227-277`). */
function precomputeChildSizes(layoutNode: ElkNode): void {
  // If we are currently in a hierarchical node and about to produce a child layout,
  // then we need to step through the chidren and set their sizes
  // only if their layout is performed by a topdown layout provider
  if ((layoutNode.getProperty(CoreOptions.TOPDOWN_NODE_TYPE) as TopdownNodeTypes | null) === null) {
    throw new UnsupportedConfigurationException(
      `${layoutNode.getIdentifier()} has not been assigned a top-down node type.`,
    );
  }
  if (
    nodeTypeEquals(layoutNode.getProperty(CoreOptions.TOPDOWN_NODE_TYPE), TopdownNodeTypes.HIERARCHICAL_NODE) ||
    nodeTypeEquals(layoutNode.getProperty(CoreOptions.TOPDOWN_NODE_TYPE), TopdownNodeTypes.ROOT_NODE)
  ) {
    for (const childNode of layoutNode.getChildren()) {
      precomputeChildSize(childNode);
    }
  }
}

/** One iteration of the child loop of the size pre-computation (Java `:239-275`). */
function precomputeChildSize(childNode: ElkNode): void {
  // check if child has children and whether it will be laid out with a topdown layout
  // provider if yes its size needs to be pre-computed before computing the layout
  const localAlgorithmData = childNode.getProperty(CoreOptions.RESOLVED_ALGORITHM);
  const padding = childNode.getProperty(CoreOptions.PADDING);
  if (childNode.getChildren().size() > 0 && isTopdownLayoutProvider(localAlgorithmData.getInstancePool().fetch())) {
    applyPredictedGraphSize(childNode, localAlgorithmData);
  } else if (
    (childNode.getProperty(CoreOptions.TOPDOWN_SIZE_APPROXIMATOR) as ITopdownSizeApproximator | null) !== null &&
    childNode.getChildren() !== null &&
    childNode.getChildren().size() > 0
  ) {
    const approximator = childNode.getProperty(CoreOptions.TOPDOWN_SIZE_APPROXIMATOR);
    const size = approximator.getSize(childNode);
    setPaddedSize(childNode, size, padding);
  } else {
    // If no approximator is set, use the set sizes for atomic nodes and use the properties
    // that have been set for nodes containing further children
    if (childNode.getChildren().size() !== 0) {
      const size = new KVector(
        childNode.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH),
        childNode.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH) /
          childNode.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO),
      );
      setPaddedSize(childNode, size, padding);
    }
  }
}

/** The topdown layout provider branch of the size pre-computation (Java `:246-257`). */
function applyPredictedGraphSize(childNode: ElkNode, localAlgorithmData: LayoutAlgorithmData): void {
  // topdownlayout providers should not be used on hierarchical nodes
  if (nodeTypeEquals(childNode.getProperty(CoreOptions.TOPDOWN_NODE_TYPE), TopdownNodeTypes.HIERARCHICAL_NODE)) {
    throw new UnsupportedConfigurationException('Topdown Layout Providers should only be used on parallel nodes.');
  }
  // A second instance is fetched, as in Java; neither is released to the pool
  const topdownLayoutProvider = localAlgorithmData.getInstancePool().fetch() as AbstractLayoutProvider &
    ITopdownLayoutProvider;

  const requiredSize = topdownLayoutProvider.getPredictedGraphSize(childNode);
  childNode.setDimensions(
    Math.max(childNode.getWidth(), requiredSize.x),
    Math.max(childNode.getHeight(), requiredSize.y),
  );
}

/** The `setDimensions` call the approximator and default branches share (Java `:263-264`, `:272-273`). */
function setPaddedSize(childNode: ElkNode, size: KVector, padding: ElkPadding): void {
  childNode.setDimensions(
    Math.max(childNode.getWidth(), size.x + padding.left + padding.right),
    Math.max(childNode.getHeight(), size.y + padding.top + padding.bottom),
  );
}

/** "root node needs its size to be set manually" (Java `:291-299`). */
function setRootNodeSize(layoutNode: ElkNode, padding: ElkPadding): void {
  if (nodeTypeEquals(layoutNode.getProperty(CoreOptions.TOPDOWN_NODE_TYPE), TopdownNodeTypes.ROOT_NODE)) {
    ElkUtil.computeChildAreaDimensions(layoutNode);
    layoutNode.setDimensions(
      padding.left + layoutNode.getProperty(CoreOptions.CHILD_AREA_WIDTH) + padding.right,
      padding.top + layoutNode.getProperty(CoreOptions.CHILD_AREA_HEIGHT) + padding.bottom,
    );
  }
}

/** Scales the layout of a hierarchical node into the space its parent provides (Java `:307-402`). */
function scaleHierarchicalNode(
  layoutNode: ElkNode,
  padding: ElkPadding,
  childAreaAvailableWidth: number,
  childAreaAvailableHeight: number,
  topdownLayoutMonitor: IElkProgressMonitor,
): void {
  if (childAreaAvailableWidth < 0 || childAreaAvailableHeight < 0) {
    // Hierarchical node width and/or aspect ratio of parent set to be smaller than paddings
    // the current layout node, throw exception
    throw new UnsupportedConfigurationException(
      'The size defined by the parent parallel node' +
        ' is too small for the space provided by the paddings of the child hierarchical' +
        ` node. ${layoutNode.getIdentifier()}`,
    );
  }

  const area = determineChildArea(layoutNode, childAreaAvailableWidth, childAreaAvailableHeight);

  topdownLayoutMonitor.log(
    `Desired Child Area: (${doubleToString(area.childAreaDesiredWidth)}|${doubleToString(area.childAreaDesiredHeight)})`,
  );

  const scale = computeScaleFactor(layoutNode, area, topdownLayoutMonitor);
  alignAndShiftContent(layoutNode, padding, area, scale, topdownLayoutMonitor);
}

/** "check whether child area has been set" and the desired child area (Java `:316-325`). */
function determineChildArea(
  layoutNode: ElkNode,
  childAreaAvailableWidth: number,
  childAreaAvailableHeight: number,
): ChildArea {
  // check whether child area has been set, and if it hasn't run the util function
  // to determine the size of the area
  if (!(
    layoutNode.hasProperty(CoreOptions.CHILD_AREA_WIDTH) || layoutNode.hasProperty(CoreOptions.CHILD_AREA_HEIGHT)
  )) {
    // compute child area if it hasn't been set by the layout algorithm
    ElkUtil.computeChildAreaDimensions(layoutNode);
  }

  return {
    childAreaAvailableWidth,
    childAreaAvailableHeight,
    childAreaDesiredWidth: unboxDouble(layoutNode.getProperty(CoreOptions.CHILD_AREA_WIDTH)),
    childAreaDesiredHeight: unboxDouble(layoutNode.getProperty(CoreOptions.CHILD_AREA_HEIGHT)),
  };
}

/** "compute scaleFactor" (Java `:330-339`). */
function computeScaleFactor(
  layoutNode: ElkNode,
  area: ChildArea,
  topdownLayoutMonitor: IElkProgressMonitor,
): ScaleFactors {
  // compute scaleFactor
  const scaleFactorX = area.childAreaAvailableWidth / area.childAreaDesiredWidth;
  const scaleFactorY = area.childAreaAvailableHeight / area.childAreaDesiredHeight;

  const scaleFactor = Math.min(
    scaleFactorX,
    Math.min(scaleFactorY, layoutNode.getProperty(CoreOptions.TOPDOWN_SCALE_CAP)),
  );
  layoutNode.setProperty(CoreOptions.TOPDOWN_SCALE_FACTOR, scaleFactor);
  topdownLayoutMonitor.log(
    `${layoutNode.getIdentifier()} -- Local Scale Factor (X|Y): (` +
      `${doubleToString(scaleFactorX)}|${doubleToString(scaleFactorY)})`,
  );
  return { scaleFactorX, scaleFactorY, scaleFactor };
}

/** "content alignment" and the shift of the content (Java `:341-402`). */
function alignAndShiftContent(
  layoutNode: ElkNode,
  padding: ElkPadding,
  area: ChildArea,
  scale: ScaleFactors,
  topdownLayoutMonitor: IElkProgressMonitor,
): void {
  // content alignment
  const contentAlignment = layoutNode.getProperty(CoreOptions.CONTENT_ALIGNMENT);

  // horizontal alignment
  const alignmentShiftX = horizontalAlignmentShift(contentAlignment, area, scale);

  // vertical alignment
  const alignmentShiftY = verticalAlignmentShift(contentAlignment, area, scale);

  const xShift = alignmentShiftX + (padding.left / scale.scaleFactor - padding.left);
  const yShift = alignmentShiftY + (padding.top / scale.scaleFactor - padding.top);
  topdownLayoutMonitor.log(`Shift: (${doubleToString(xShift)}|${doubleToString(yShift)})`);
  shiftContent(layoutNode, xShift, yShift);
}

/** "horizontal alignment" (Java `:347-358`). */
function horizontalAlignmentShift(
  contentAlignment: EnumSet<ContentAlignment>,
  { childAreaAvailableWidth, childAreaDesiredWidth }: ChildArea,
  { scaleFactor, scaleFactorX }: ScaleFactors,
): number {
  let alignmentShiftX = 0;
  if (scaleFactor < scaleFactorX) {
    if (contentAlignment.contains(ContentAlignment.H_CENTER)) {
      alignmentShiftX = (childAreaAvailableWidth / 2 - (childAreaDesiredWidth * scaleFactor) / 2) / scaleFactor;
    } else if (contentAlignment.contains(ContentAlignment.H_RIGHT)) {
      alignmentShiftX = (childAreaAvailableWidth - childAreaDesiredWidth * scaleFactor) / scaleFactor;
    }
  }
  return alignmentShiftX;
}

/** "vertical alignment" (Java `:360-371`). */
function verticalAlignmentShift(
  contentAlignment: EnumSet<ContentAlignment>,
  { childAreaAvailableHeight, childAreaDesiredHeight }: ChildArea,
  { scaleFactor, scaleFactorY }: ScaleFactors,
): number {
  let alignmentShiftY = 0;
  if (scaleFactor < scaleFactorY) {
    if (contentAlignment.contains(ContentAlignment.V_CENTER)) {
      alignmentShiftY = (childAreaAvailableHeight / 2 - (childAreaDesiredHeight * scaleFactor) / 2) / scaleFactor;
    } else if (contentAlignment.contains(ContentAlignment.V_BOTTOM)) {
      alignmentShiftY = (childAreaAvailableHeight - childAreaDesiredHeight * scaleFactor) / scaleFactor;
    }
  }
  return alignmentShiftY;
}

/** Shifts the children and the contained edges of a scaled hierarchical node (Java `:376-402`). */
function shiftContent(layoutNode: ElkNode, xShift: number, yShift: number): void {
  // shift all nodes in layout
  for (const node of layoutNode.getChildren()) {
    // shift all nodes in layout
    node.setX(node.getX() + xShift);
    node.setY(node.getY() + yShift);
  }
  // shift all edges
  for (const edge of layoutNode.getContainedEdges()) {
    for (const section of edge.getSections()) {
      section.setStartLocation(section.getStartX() + xShift, section.getStartY() + yShift);
      section.setEndLocation(section.getEndX() + xShift, section.getEndY() + yShift);
      for (const bendPoint of section.getBendPoints()) {
        bendPoint.set(bendPoint.getX() + xShift, bendPoint.getY() + yShift);
      }
    }
    // shift edge labels
    for (const label of edge.getLabels()) {
      label.setLocation(label.getX() + xShift, label.getY() + yShift);
    }
    // shift junction points
    const junctionPoints = edge.getProperty(CoreOptions.JUNCTION_POINTS);
    for (const junctionPoint of junctionPoints) {
      junctionPoint.x += xShift;
      junctionPoint.y += yShift;
    }
    edge.setProperty(CoreOptions.JUNCTION_POINTS, junctionPoints);
  }
}
