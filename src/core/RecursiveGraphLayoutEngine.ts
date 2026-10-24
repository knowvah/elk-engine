// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../graph/ElkEdge.js';
import type { ElkNode } from '../graph/ElkNode.js';
import { GraphFeature } from '../graph/properties/GraphFeature.js';
import { ElkGraphUtil } from '../graph/util/ElkGraphUtil.js';
import { DeprecatedLayoutOptionReplacer } from './data/DeprecatedLayoutOptionReplacer.js';
import type { LayoutAlgorithmData } from './data/LayoutAlgorithmData.js';
import { LayoutAlgorithmResolver } from './data/LayoutAlgorithmResolver.js';
import type { IGraphLayoutEngine } from './IGraphLayoutEngine.js';
import { CoreOptions } from './options/CoreOptions.js';
import { HierarchyHandling } from './options/HierarchyHandling.js';
import { layoutTopdown, subTask } from './RecursiveGraphLayoutEngineTopdown.js';
import type { TestController } from './testing/TestController.js';
import { UnsupportedConfigurationException } from './UnsupportedConfigurationException.js';
import { ElkUtil } from './util/ElkUtil.js';
import type { IElkProgressMonitor } from './util/IElkProgressMonitor.js';

/**
 * The parameters and locals of one `layoutRecursively` call that its section helpers share. The helpers exist only
 * because the Java method exceeds the complexity limits; they run in the Java order.
 */
interface RecursionLevel {
  readonly layoutNode: ElkNode;
  readonly algorithmData: LayoutAlgorithmData;
  readonly testController: TestController | null;
  readonly progressMonitor: IElkProgressMonitor;
  /** Java local `childrenInsideSelfLoops`: inside self loops of children, post-processed later. */
  readonly childrenInsideSelfLoops: ElkEdge[];
}

/** Java `Collections.emptyList()`; callers only read the result. */
function emptyList(): ElkEdge[] {
  return [];
}

/** "Fetch the layout algorithm that should be used to compute a layout for its content" (Java `:152-157`). */
function fetchAlgorithmData(layoutNode: ElkNode): LayoutAlgorithmData {
  // Fetch the layout algorithm that should be used to compute a layout for its content
  const algorithmData = layoutNode.getProperty(CoreOptions.RESOLVED_ALGORITHM) as LayoutAlgorithmData | null;
  if (algorithmData === null) {
    throw new UnsupportedConfigurationException(
      'Resolved algorithm is not set;' + ' apply a LayoutAlgorithmResolver before computing layout.',
    );
  }
  return algorithmData;
}

/**
 * Performs layout on a graph with hierarchy by executing a layout algorithm on each level of the hierarchy. This is
 * done recursively from the leafs to the root of the nodes in the graph, using size information from lower levels in
 * the levels above.
 *
 * The actual layout algorithms to execute are determined with the {@link CoreOptions.RESOLVED_ALGORITHM} option. This
 * option is configured by the {@link LayoutAlgorithmResolver}. If it is not yet set on the top-level node, this
 * implementation applies the default algorithm resolver by running
 * `ElkUtil.applyVisitors(layoutGraph, new LayoutAlgorithmResolver())`. If you need to customize the algorithm
 * resolution or apply validation, you should run the algorithm resolver before invoking this class.
 *
 * Layout can be performed either as usual (`layout(ElkNode, IElkProgressMonitor)`) or as part of a unit test
 * (`layout(ElkNode, TestController, IElkProgressMonitor)`). The latter should usually not be called directly, but is
 * used by ELK's unit test framework for layout algorithms.
 *
 * MIGRATE Extend the graph layout engine to offset edge coordinates properly
 *
 * `layoutRecursively` is split into private helpers at its commented sections (complexity limits), in the Java
 * order; the helpers share the call's parameters and locals through a {@link RecursionLevel}. The topdown section
 * lives in `RecursiveGraphLayoutEngineTopdown.ts` (M17).
 *
 * @author ars
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/RecursiveGraphLayoutEngine.java
 */
export class RecursiveGraphLayoutEngine implements IGraphLayoutEngine {
  /**
   * Performs recursive layout on the given layout graph, possibly in a test setting.
   *
   * @param layoutGraph top-level node of the graph to be laid out.
   * @param testController an optional test controller if the layout run is performed as part of a unit test.
   * @param progressMonitor monitor to which progress of the layout algorithms is reported.
   */
  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void;
  layout(layoutGraph: ElkNode, testController: TestController | null, progressMonitor: IElkProgressMonitor): void;
  layout(layoutGraph: ElkNode, ...args: [IElkProgressMonitor] | [TestController | null, IElkProgressMonitor]): void {
    if (args.length === 1) {
      this.layout(layoutGraph, null, args[0]);
      return;
    }
    const [testController, progressMonitor] = args;

    const nodeCount = this.countNodesRecursively(layoutGraph, true);
    progressMonitor.begin('Recursive Graph Layout', nodeCount);

    ElkUtil.applyVisitors(layoutGraph, new DeprecatedLayoutOptionReplacer());

    if (!layoutGraph.hasProperty(CoreOptions.RESOLVED_ALGORITHM)) {
      // Apply the default algorithm resolver to the graph in order to obtain algorithm meta data
      ElkUtil.applyVisitors(layoutGraph, new LayoutAlgorithmResolver());
    }

    // Perform recursive layout of the whole substructure of the given node
    this.layoutRecursively(layoutGraph, testController, progressMonitor);

    progressMonitor.done();
  }

  /**
   * Recursive function to enable layout of hierarchy. The leafs are laid out first to use their layout information in
   * the levels above.
   *
   * If the 'Topdown Layout' option is enabled, root nodes are laid out first and inner layouts are scaled down so the
   * respective parent nodes can accommodate their children.
   *
   * This method returns self loops routed inside the given layout node. Those will have coordinates relative to the
   * node's top left corner, which is incorrect. Once the node's final coordinates in its container are determined, any
   * inside self loops will have to be offset by the node's position.
   *
   * @param layoutNode the node with children to be laid out
   * @param testController an optional test controller if this layout run is part of a unit test
   * @param progressMonitor monitor used to keep track of progress
   * @returns list of self loops routed inside the node.
   */
  protected layoutRecursively(
    layoutNode: ElkNode,
    testController: TestController | null,
    progressMonitor: IElkProgressMonitor,
  ): ElkEdge[] {
    if (progressMonitor.isCanceled()) {
      return emptyList();
    }

    // Check if the node should be laid out at all
    if (layoutNode.getProperty(CoreOptions.NO_LAYOUT)) {
      return emptyList();
    }

    // We have to process the node if it has children...
    const hasChildren = !layoutNode.getChildren().isEmpty();

    // ...or if inside self loop processing is enabled and it actually has inside self loops
    const insideSelfLoops = this.gatherInsideSelfLoops(layoutNode);
    const hasInsideSelfLoops = insideSelfLoops.length !== 0;

    if (hasChildren || hasInsideSelfLoops) {
      return this.layoutContent(layoutNode, testController, progressMonitor, hasChildren, insideSelfLoops);
    } else {
      return emptyList();
    }
  }

  /** The body of `layoutRecursively` for a node with children or inside self loops (Java `:152-439`). */
  private layoutContent(
    layoutNode: ElkNode,
    testController: TestController | null,
    progressMonitor: IElkProgressMonitor,
    hasChildren: boolean,
    insideSelfLoops: ElkEdge[],
  ): ElkEdge[] {
    const hasInsideSelfLoops = insideSelfLoops.length !== 0;

    const algorithmData = fetchAlgorithmData(layoutNode);
    const supportsInsideSelfLoops = algorithmData.supportsFeature(GraphFeature.INSIDE_SELF_LOOPS);

    // Persist the Hierarchy Handling in the nodes by querying the parent node
    this.evaluateHierarchyHandlingInheritance(layoutNode);

    // If the node contains inside self loops, but no regular children and if the layout
    // algorithm doesn't actually support inside self loops, we cancel
    if (!hasChildren && hasInsideSelfLoops && !supportsInsideSelfLoops) {
      return emptyList();
    }

    // We collect inside self loops of children and post-process them later
    const level: RecursionLevel = {
      layoutNode,
      algorithmData,
      testController,
      progressMonitor,
      childrenInsideSelfLoops: [],
    };

    // If the layout provider supports hierarchy, it is expected to layout the node's compound
    // node children as well
    const nodeCount = this.includesChildren(layoutNode, algorithmData)
      ? this.layoutIncludedChildren(level)
      : this.layoutSeparateChildren(level);

    return this.layoutOwnContent(level, nodeCount, insideSelfLoops, hasInsideSelfLoops, supportsInsideSelfLoops);
  }

  /** The hierarchy-handling condition of `layoutRecursively` (Java `:175-177`). */
  private includesChildren(layoutNode: ElkNode, algorithmData: LayoutAlgorithmData): boolean {
    return (
      layoutNode.getProperty(CoreOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN &&
      (algorithmData.supportsFeature(GraphFeature.COMPOUND) || algorithmData.supportsFeature(GraphFeature.CLUSTERS))
    );
  }

  /** The `INCLUDE_CHILDREN` branch of `layoutRecursively` (Java `:178-216`); returns `nodeCount`. */
  private layoutIncludedChildren(level: RecursionLevel): number {
    const { layoutNode, algorithmData, testController, progressMonitor, childrenInsideSelfLoops } = level;
    // Topdown layout and hierarchy handling are incompatible
    if (layoutNode.getProperty(CoreOptions.TOPDOWN_LAYOUT)) {
      throw new UnsupportedConfigurationException('Topdown layout cannot be used together with hierarchy handling.');
    }

    // The layout algorithm will compute a layout for multiple levels of hierarchy under the current one
    const nodeCount = this.countNodesWithHierarchy(layoutNode);

    // Look for nodes that stop the hierarchy handling, evaluating the inheritance on the way
    const nodeQueue: ElkNode[] = [...layoutNode.getChildren()];

    while (nodeQueue.length !== 0) {
      const node = nodeQueue.shift() as ElkNode;
      // Persist the Hierarchy Handling in every case. (Won't hurt with nodes that are
      // evaluated in the next recursion)
      this.evaluateHierarchyHandlingInheritance(node);
      const stopHierarchy = node.getProperty(CoreOptions.HIERARCHY_HANDLING) === HierarchyHandling.SEPARATE_CHILDREN;

      // Hierarchical layout is stopped by explicitly disabling or switching the algorithm.
      // In that case, a separate recursive call is used for child nodes
      if (
        stopHierarchy ||
        (node.hasProperty(CoreOptions.ALGORITHM) &&
          !algorithmData.equals(node.getProperty(CoreOptions.RESOLVED_ALGORITHM)))
      ) {
        const childLayoutSelfLoops = this.layoutRecursively(node, testController, progressMonitor);
        childrenInsideSelfLoops.push(...childLayoutSelfLoops);
        // Explicitly disable hierarchical layout for the child node. Simplifies the
        // handling of switching algorithms in the layouter.
        node.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.SEPARATE_CHILDREN);

        // Apply the LayoutOptions.SCALE_FACTOR if present
        ElkUtil.applyConfiguredNodeScaling(node);
      } else {
        // Child should be included in current layout, possibly adding its own children
        nodeQueue.push(...node.getChildren());
      }
    }
    return nodeCount;
  }

  /** The separate-children branch of `layoutRecursively` (Java `:219-414`); returns `nodeCount`. */
  private layoutSeparateChildren(level: RecursionLevel): number {
    const { layoutNode, testController, progressMonitor, childrenInsideSelfLoops } = level;
    const nodeCount = layoutNode.getChildren().size();
    // If performing topdown layout, layout this node first, then compute scale factors and layout children
    // recursively
    if (layoutNode.getProperty(CoreOptions.TOPDOWN_LAYOUT)) {
      this.layoutTopdown(level, nodeCount);
    }

    // Layout each compound node contained in this node separately
    for (const child of layoutNode.getChildren()) {
      const childLayoutSelfLoops = this.layoutRecursively(child, testController, progressMonitor);
      childrenInsideSelfLoops.push(...childLayoutSelfLoops);

      // Apply the LayoutOptions.SCALE_FACTOR if present
      ElkUtil.applyConfiguredNodeScaling(child);
    }
    return nodeCount;
  }

  /** The topdown layout of `layoutRecursively` (Java `:224-404`), in `RecursiveGraphLayoutEngineTopdown.ts` (M17). */
  private layoutTopdown(level: RecursionLevel, nodeCount: number): void {
    const { layoutNode, algorithmData, testController, progressMonitor } = level;
    layoutTopdown(layoutNode, progressMonitor, nodeCount, (monitor) =>
      this.executeAlgorithm(layoutNode, algorithmData, testController, monitor),
    );
  }

  /** The end of `layoutRecursively`: layout of the node itself and self loop handling (Java `:417-439`). */
  private layoutOwnContent(
    level: RecursionLevel,
    nodeCount: number,
    insideSelfLoops: ElkEdge[],
    hasInsideSelfLoops: boolean,
    supportsInsideSelfLoops: boolean,
  ): ElkEdge[] {
    const { layoutNode, algorithmData, testController, progressMonitor, childrenInsideSelfLoops } = level;
    if (progressMonitor.isCanceled()) {
      return emptyList();
    }

    // Before running layout on our node, we need to exclude any inside self loops of children
    // from being laid out again
    for (const selfLoop of childrenInsideSelfLoops) {
      selfLoop.setProperty(CoreOptions.NO_LAYOUT, true);
    }

    if (!layoutNode.getProperty(CoreOptions.TOPDOWN_LAYOUT)) {
      this.executeAlgorithm(layoutNode, algorithmData, testController, subTask(progressMonitor, nodeCount));
    }

    // Post-process the inner self loops we collected
    this.postProcessInsideSelfLoops(childrenInsideSelfLoops);

    // Return our own inside self loops to be processed later
    if (hasInsideSelfLoops && supportsInsideSelfLoops) {
      return insideSelfLoops;
    } else {
      return emptyList();
    }
  }

  /**
   * Execute the given layout algorithm on a parent node. Java catches `Exception`; every thrown value is caught here.
   */
  protected executeAlgorithm(
    layoutNode: ElkNode,
    algorithmData: LayoutAlgorithmData,
    testController: TestController | null,
    progressMonitor: IElkProgressMonitor,
  ): void {
    // Get an instance of the layout provider
    const layoutProvider = algorithmData.getInstancePool().fetch();

    // If we have a test controller and the layout algorithm supports test controllers, setup the test
    if (testController !== null && testController.targets(algorithmData)) {
      testController.install(layoutProvider);
    }

    try {
      // Perform layout on the current hierarchy level
      layoutProvider.layout(layoutNode, progressMonitor);
      algorithmData.getInstancePool().release(layoutProvider);
    } catch (exception) {
      // The layout provider has failed - destroy it slowly and painfully
      layoutProvider.dispose();
      throw exception;
    } finally {
      if (testController !== null) {
        testController.uninstall();
      }
    }
  }

  /**
   * Determines the total number of layout nodes in the given layout graph.
   *
   * @param layoutNode parent layout node to examine
   * @param countAncestors if true, the nodes on the ancestors path are also counted
   * @returns total number of child layout nodes
   */
  protected countNodesRecursively(layoutNode: ElkNode, countAncestors: boolean): number {
    // count the content of the given node
    let count = layoutNode.getChildren().size();
    for (const childNode of layoutNode.getChildren()) {
      if (!childNode.getChildren().isEmpty()) {
        count += this.countNodesRecursively(childNode, false);
      }
    }
    // count the ancestors path
    if (countAncestors) {
      let parent = layoutNode.getParent();
      while (parent !== null) {
        count += parent.getChildren().size();
        parent = parent.getParent();
      }
    }
    return count;
  }

  // Hierarchy Handling

  /**
   * Evaluates one level of inheritance for property {@link CoreOptions.HIERARCHY_HANDLING}. If the root node is
   * evaluated and it is set to inherit (or not set at all) the property is set to
   * {@link HierarchyHandling.SEPARATE_CHILDREN}.
   *
   * @param layoutNode The current node which should be evaluated
   */
  private evaluateHierarchyHandlingInheritance(layoutNode: ElkNode): void {
    // Pre-process the hierarchy handling to substitute inherited handling by the parent
    // value. If the root node is set to inherit, it is set to separate the children.
    if (layoutNode.getProperty(CoreOptions.HIERARCHY_HANDLING) === HierarchyHandling.INHERIT) {
      const parent = layoutNode.getParent();
      if (parent === null) {
        // Set root node to separate children handling
        layoutNode.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.SEPARATE_CHILDREN);
      } else {
        // Set hierarchy handling to the value of the parent.
        // It is safe to assume that the parent has been handled before and is not set to
        // INHERIT anymore.
        const parentHandling = parent.getProperty(CoreOptions.HIERARCHY_HANDLING);
        layoutNode.setProperty(CoreOptions.HIERARCHY_HANDLING, parentHandling);
      }
    }
  }

  /**
   * Determines the number of layout nodes in the given layout graph across multiple levels of hierarchy. Counting is
   * stopped at nodes which disable the hierarchical layout or are configured to use a different layout algorithm.
   *
   * @param parentNode parent layout node to examine
   * @returns total number of child layout nodes
   */
  private countNodesWithHierarchy(parentNode: ElkNode): number {
    // Count the content of the given node
    let count = parentNode.getChildren().size();
    for (const childNode of parentNode.getChildren()) {
      if (childNode.getProperty(CoreOptions.HIERARCHY_HANDLING) !== HierarchyHandling.SEPARATE_CHILDREN) {
        const parentData = parentNode.getProperty(CoreOptions.RESOLVED_ALGORITHM) as LayoutAlgorithmData | null;
        const childData = childNode.getProperty(CoreOptions.RESOLVED_ALGORITHM) as LayoutAlgorithmData | null;
        // Only count nodes that don't abort the hierarchical layout
        if (
          (parentData === childData || (parentData !== null && parentData.equals(childData))) &&
          !childNode.getChildren().isEmpty()
        ) {
          count += this.countNodesWithHierarchy(childNode);
        }
      }
    }
    return count;
  }

  // Inside Self Loops

  /**
   * Returns a list of self loops of the given node that should be routed inside that node instead of around it. For
   * the node to even be considered for inside self loop processing, its {@link CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE}
   * property must be set to `true`. The returned list will then consist of those of its outgoing edges that are self
   * loops and that have that property set to `true` as well.
   *
   * @param node the node whose inside self loops to return.
   * @returns possibly empty list of inside self loops.
   */
  protected gatherInsideSelfLoops(node: ElkNode): ElkEdge[] {
    if (node.getProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE)) {
      const insideSelfLoops: ElkEdge[] = [];

      for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
        // MIGRATE Adapt to hyperedges and make error-safe
        if (edge.isSelfloop()) {
          if (edge.getProperty(CoreOptions.INSIDE_SELF_LOOPS_YO)) {
            insideSelfLoops.push(edge);
          }
        }
      }

      return insideSelfLoops;
    } else {
      return emptyList();
    }
  }

  /**
   * Post-processes self loops routed inside by offsetting their coordinates by the coordinates of their parent node.
   * The post processing is necessary since the self loop coordinates are relative to their parent node's upper left
   * corner since, at that point, the parent node's final coordinates are not determined yet.
   *
   * @param insideSelfLoops list of inside self loops to post-process.
   */
  protected postProcessInsideSelfLoops(insideSelfLoops: readonly ElkEdge[]): void {
    for (const selfLoop of insideSelfLoops) {
      // MIGRATE Adapt to hyperedges and make error-safe
      // Java's NullPointerException on a parentless port is a TypeError here (D10)
      const node = ElkGraphUtil.connectableShapeToNode(selfLoop.getSources().get(0)) as ElkNode;

      const xOffset = node.getX();
      const yOffset = node.getY();

      // Offset the edge coordinates by the node's position
      // MIGRATE Adapt to hyperedges. Also, what about multiple edge sections?
      const section = selfLoop.getSections().get(0);
      section.setStartLocation(section.getStartX() + xOffset, section.getStartY() + yOffset);
      section.setEndLocation(section.getEndX() + xOffset, section.getEndY() + yOffset);

      for (const bend of section.getBendPoints()) {
        bend.set(bend.getX() + xOffset, bend.getY() + yOffset);
      }

      // Offset junction points by the node position
      selfLoop.getProperty(CoreOptions.JUNCTION_POINTS).offset(xOffset, yOffset);
    }
  }
}
