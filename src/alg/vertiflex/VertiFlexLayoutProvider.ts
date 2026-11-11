// SPDX-License-Identifier: EPL-2.0
import { NodeMicroLayout } from '../common/NodeMicroLayout.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import type { ElkMargin } from '../../core/math/ElkMargin.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { UnsupportedConfigurationException } from '../../core/UnsupportedConfigurationException.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { EdgeRoutingStrategy } from './EdgeRoutingStrategy.js';
import { InternalProperties } from './InternalProperties.js';
import { findRoot } from './VertiFlexUtil.js';
import { VertiFlexLayoutPhases } from './VertiFlexLayoutPhases.js';
import { VertiFlexOptions } from './options/VertiFlexOptions.js';
import { NodeYPlacerStrategy } from './p1yplacement/NodeYPlacerStrategy.js';
import { castToElkNode } from './p2relative/RelativeXPlacerChildren.js';
import { RelativeXPlacerStrategy } from './p2relative/RelativeXPlacerStrategy.js';
import { AbsoluteXPlacerStrategy } from './p3absolute/AbsoluteXPlacerStrategy.js';
import { EdgerouterStrategy } from './p4edgerouting/EdgerouterStrategy.js';

/**
 * Layout provider for the y constraint tree layout algorithms.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/VertiFlexLayoutProvider.java
 */
export class VertiFlexLayoutProvider extends AbstractLayoutProvider {
  private readonly algorithmAssembler: AlgorithmAssembler<VertiFlexLayoutPhases, ElkNode> = AlgorithmAssembler.create<
    VertiFlexLayoutPhases,
    ElkNode
  >(VertiFlexLayoutPhases);

  private nodeNodeSpacing: number = 0;

  layout(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    const algorithm = this.assembleAlgorithm(graph);

    progressMonitor.begin('Tree layout', algorithm.length);

    this.nodeNodeSpacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);

    // if requested, compute nodes's dimensions, place node labels, ports, port labels, etc.
    if (!graph.getProperty(VertiFlexOptions.OMIT_NODE_MICRO_LAYOUT)) {
      NodeMicroLayout.forGraph(graph).execute();
    }

    // pre calculate the root node and save it
    const root = findRoot(graph);
    graph.setProperty(InternalProperties.ROOT_NODE, root);
    if (root === null) {
      throw new UnsupportedConfigurationException('The given graph is not a tree!');
    }

    this.checkParentsAndResetPositions(graph);

    // check that vertical constraints are ordered in valid manner i.e. children always have higher vertical
    // constraints than their parents
    this.checkVerticalConstraintValidity(root, 0);

    // store model order
    let count = 0;
    for (const node of graph.getChildren()) {
      node.setProperty(InternalProperties.NODE_MODEL_ORDER, count);
      count += 1;
    }

    for (const processor of algorithm) {
      processor.process(graph, progressMonitor.subTask(1)!);
    }

    this.setGraphSize(graph);

    progressMonitor.done();
  }

  /**
   * The loop of `layout` that rejects a child with more than one incoming edge and resets every child's position
   * (VertiFlexLayoutProvider.java:69-77); split out of `layout` for the function-size limit, order of effects unchanged.
   */
  private checkParentsAndResetPositions(graph: ElkNode): void {
    for (const child of graph.getChildren()) {
      const numberOfParents = child.getIncomingEdges().size();
      if (numberOfParents > 1) {
        throw new UnsupportedConfigurationException('The given graph is not an acyclic tree!');
      }

      // reset position
      child.setLocation(0, 0);
    }
  }

  /**
   * Configure the layout provider by assembling different layout processors.
   *
   * @param graph The graph which shall be laid out.
   * @returns The list of assembled layout processors.
   * @see VertiFlexLayoutProvider.java:101
   */
  assembleAlgorithm(graph: ElkNode): ILayoutProcessor<ElkNode>[] {
    this.algorithmAssembler.reset();

    // Configure phases
    this.algorithmAssembler.setPhase(VertiFlexLayoutPhases.P1_NODE_Y_PLACEMENT, NodeYPlacerStrategy.SIMPLE_Y_PLACING);
    this.algorithmAssembler.setPhase(
      VertiFlexLayoutPhases.P2_NODE_RELATIVE_PLACEMENT,
      RelativeXPlacerStrategy.SIMPLE_X_PLACING,
    );
    this.algorithmAssembler.setPhase(
      VertiFlexLayoutPhases.P3_NODE_ABSOLUTE_PLACEMENT,
      AbsoluteXPlacerStrategy.ABSOLUTE_XPLACING,
    );

    let routerStrategy: EdgerouterStrategy;
    switch (graph.getProperty(VertiFlexOptions.LAYOUT_STRATEGY)) {
      case EdgeRoutingStrategy.BEND:
        routerStrategy = EdgerouterStrategy.BEND_ROUTING;
        break;
      case EdgeRoutingStrategy.STRAIGHT:
      default:
        routerStrategy = EdgerouterStrategy.DIRECT_ROUTING;
        break;
    }
    this.algorithmAssembler.setPhase(VertiFlexLayoutPhases.P4_EDGE_ROUTING, routerStrategy);

    // Assemble the algorithm
    return this.algorithmAssembler.build(graph);
  }

  /**
   * Checks whether a vertical constraint is larger than the constraints set by any ancestor nodes.
   *
   * @see VertiFlexLayoutProvider.java:134
   */
  private checkVerticalConstraintValidity(root: ElkNode, currentMinConstraint: number): void {
    let rootHeight: number;
    if (root.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
      rootHeight = root.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT);
    } else {
      rootHeight = currentMinConstraint;
    }

    const newMinConstraint =
      rootHeight + root.getHeight() + Math.max(root.getProperty(CoreOptions.MARGINS).bottom, this.nodeNodeSpacing);

    for (const outgoingEdge of root.getOutgoingEdges()) {
      const child = castToElkNode(outgoingEdge.getTargets().get(0)!);
      if (child.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
        if (
          newMinConstraint >
          child.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT) + child.getProperty(CoreOptions.MARGINS).top
        ) {
          throw new UnsupportedConfigurationException(
            `Invalid vertical constraints. Node ${String(child.getIdentifier())} has a vertical constraint that is too low for its ancestors.`,
          );
        }
      }
    }
    for (const outgoingEdge of root.getOutgoingEdges()) {
      const child = castToElkNode(outgoingEdge.getTargets().get(0)!);
      this.checkVerticalConstraintValidity(child, newMinConstraint);
    }
  }

  /** Computes the space occupied by the layout and sets the graph size accordingly. @see VertiFlexLayoutProvider.java:167 */
  private setGraphSize(graph: ElkNode): void {
    const padding = graph.getProperty(CoreOptions.PADDING);

    let maxX = 0.0;
    let maxY = 0.0;
    for (const node of graph.getChildren()) {
      const margin: ElkMargin = node.getProperty(CoreOptions.MARGINS);

      if (maxX < node.getX() + node.getWidth() + margin.right) {
        maxX = node.getX() + node.getWidth() + margin.right;
      }
      if (maxY < node.getY() + node.getHeight() + margin.bottom) {
        maxY = node.getY() + node.getHeight() + margin.bottom;
      }
    }

    graph.setWidth(maxX + padding.right);
    graph.setHeight(maxY + padding.bottom);
  }
}
