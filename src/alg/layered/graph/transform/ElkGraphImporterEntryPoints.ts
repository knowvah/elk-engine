// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import { ElkGraphAdapters } from '../../../../core/util/adapters/ElkGraphAdapters.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { NodeLabelAndSizeCalculator } from '../../../common/nodespacing/NodeLabelAndSizeCalculator.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { LGraph } from '../LGraph.js';
import { calculateNetFlow } from './ElkGraphImporterExternalPorts.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Import Entry Points (the helpers of `importGraph` that need neither the node map nor the model order)

/**
 * Ensures that the given port has a defined port side.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function ensureDefinedPortSide(lgraph: LGraph, elkport: ElkPort): void {
  const layoutDirection: Direction = lgraph.getProperty(LayeredOptions.DIRECTION);
  let portSide = elkport.getProperty(LayeredOptions.PORT_SIDE);
  const portConstraints = lgraph.getProperty(LayeredOptions.PORT_CONSTRAINTS);

  if (!portConstraints.isSideFixed()) {
    // We are free to assign ports to sides, so the port side will depend on the layout direction and the
    // port's net flow
    const netFlow = calculateNetFlow(elkport);

    if (netFlow > 0) {
      portSide = PortSide.fromDirection(layoutDirection);
    } else {
      portSide = PortSide.fromDirection(layoutDirection).opposed();
    }
  } else if (portSide === PortSide.UNDEFINED) {
    // We are not free to assign port sides. If none is set, try inferring it from the port's position
    portSide = ElkUtil.calcPortSide(elkport, layoutDirection);

    // There are cases where ELK may have failed to infer the port side
    if (portSide === PortSide.UNDEFINED) {
      portSide = PortSide.fromDirection(layoutDirection);
    }
  }

  elkport.setProperty(LayeredOptions.PORT_SIDE, portSide);
}

/**
 * Checks whether {@link calculateMinimumGraphSize} should be called on the given graph.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function shouldCalculateMinimumGraphSize(elkgraph: ElkNode): boolean {
  return !elkgraph.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS).isEmpty();
}

/**
 * Asks the label and node size thing to calculate the minimum size necessary for the graph to be large enough for
 * its ports and stuff (if it's not the top level graph).
 *
 * @param elkgraph the original ELK graph.
 * @param lgraph the imported LGraph. Its properties may be updated over the course of this method.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function calculateMinimumGraphSize(elkgraph: ElkNode, lgraph: LGraph): void {
  // If the graph is on the top level, don't bother
  const parent = elkgraph.getParent();
  if (parent === null) {
    return;
  }

  // If the graph has no size constraints, don't bother either
  const sizeConstraints = lgraph.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS);

  // The method should only be called if shouldCalculateMinimumGraphSize(...) returns true
  // (Java: assert !sizeConstraints.isEmpty(); no devAssert helper exists, the JVM runs without -ea)

  // Ensure that the port constraints are not UNDEFINED
  if (elkgraph.getProperty(LayeredOptions.PORT_CONSTRAINTS) === PortConstraints.UNDEFINED) {
    elkgraph.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
  }

  // Size constraints are not empty, so calculate the size the node and label placement code thing would like to
  // give the graph
  const graphAdapter = ElkGraphAdapters.adapt(parent);
  const nodeAdapter = ElkGraphAdapters.adaptSingleNode(elkgraph);

  const minSize = NodeLabelAndSizeCalculator.process(graphAdapter, nodeAdapter, false, true);

  // Apply the minimum size a sa property and make sure the minimum size is respected by ELK Layered by making
  // sure the necessary size constraint exists
  sizeConstraints.add(SizeConstraint.MINIMUM_SIZE);

  const configuredMinSize = lgraph.getProperty(LayeredOptions.NODE_SIZE_MINIMUM);
  configuredMinSize.x = Math.max(minSize.x, configuredMinSize.x);
  configuredMinSize.y = Math.max(minSize.y, configuredMinSize.y);
}
