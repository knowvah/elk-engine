// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import { type ElkNode, isElkNode } from '../../../../graph/ElkNode.js';
import { type ElkPort, isElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { BlindTextGenerator } from './BlindTextGenerator.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { createPort } from './RandomGraphGeneratorElements.js';
import { nonNull, RandomGraphGenerator } from './RandomGraphGenerator.js';

/** The nodes and ports `connect` resolves its two end points to (the four locals of the Java method). */
interface ConnectEnds {
  readonly sourceNode: ElkNode | null;
  readonly targetNode: ElkNode | null;
  readonly sourcePort: ElkPort | null;
  readonly targetPort: ElkPort | null;
}

/** The first part of Java `connect`: resolves the nodes and ports behind the two shapes, in Java order. */
function resolveEnds(source: ElkConnectableShape, target: ElkConnectableShape): ConnectEnds {
  let sourceNode: ElkNode | null = null;
  let targetNode: ElkNode | null = null;
  let sourcePort: ElkPort | null = null;
  let targetPort: ElkPort | null = null;

  if (isElkNode(source)) {
    sourceNode = source;
  }
  if (isElkPort(source)) {
    sourcePort = source;
    sourceNode = sourcePort.getParent();
  }
  if (isElkPort(target)) {
    targetPort = target;
    targetNode = targetPort.getParent();
  }
  if (isElkNode(target)) {
    targetNode = target;
  }
  return { sourceNode, targetNode, sourcePort, targetPort };
}

/** The `if (get(ENABLE_PORTS))` branch of Java `connect`. */
function connectViaPorts(
  gen: RandomGraphGenerator,
  edge: ElkEdge,
  source: ElkConnectableShape,
  target: ElkConnectableShape,
  ends: ConnectEnds,
): void {
  const { sourceNode, targetNode } = ends;
  let { sourcePort, targetPort } = ends;
  if (isElkNode(source)) {
    sourcePort = retrievePort(gen, nonNull(sourceNode), true);
  }

  if (!RandomGraphGenerator.isHypernode(nonNull(sourceNode))) {
    // remove node
    if (edge.getSources().contains(nonNull(sourceNode))) {
      edge.getSources().remove(nonNull(sourceNode));
    }
    edge.getSources().add(nonNull(sourcePort));
    // edge.setSourcePort(sourcePort);
  }

  if (!RandomGraphGenerator.isHypernode(nonNull(targetNode))) {
    if (targetPort === null) {
      targetPort = retrievePort(gen, nonNull(targetNode), false);
    }
    if (edge.getTargets().contains(nonNull(targetNode))) {
      edge.getTargets().remove(nonNull(targetNode));
    }
    edge.getTargets().remove(target);
    edge.getTargets().add(targetPort);
    // edge.setTargetPort(targetPort);
  }
}

/**
 * Connects two nodes with an edge.
 *
 * @param gen the generator
 * @param source the source node
 * @param target the target node
 * @returns the edge
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function connect(gen: RandomGraphGenerator, source: ElkConnectableShape, target: ElkConnectableShape): ElkEdge {
  const ends = resolveEnds(source, target);

  const edge = ElkGraphUtil.createEdge(null);

  if (gen.get(GeneratorOptions.ENABLE_PORTS)) {
    connectViaPorts(gen, edge, source, target, ends);
  } else {
    edge.getSources().add(nonNull(ends.sourceNode));
    edge.getTargets().add(nonNull(ends.targetNode));
  }

  if (gen.get(GeneratorOptions.EDGE_LABELS)) {
    addEdgeLabel(edge);
  }

  ElkGraphUtil.updateContainment(edge);
  return edge;
}

/**
 * Creates a label with random text and adds it to the edge.
 *
 * @param edge the edge to add the label to.
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function addEdgeLabel(edge: ElkEdge): void {
  const label = ElkGraphUtil.createLabelWithText(BlindTextGenerator.generate(), edge);
  edge.getLabels().add(label);
}

/**
 * Collects the ports of the node that only have edges in the direction of the new edge (the
 * candidate loop of Java `retrievePort`).
 */
function findReuseCandidates(node: ElkNode, source: boolean): ElkPort[] {
  const reuseCandidates: ElkPort[] = [];

  for (const port of node.getPorts()) {
    // Two flags indicating whether the port already has edges pointing in the right
    // or wrong direction connected to it
    // TODO -apo- not exactly the same, but makes more sense...
    const connectedToDesiredEdges =
      (!port.getIncomingEdges().isEmpty() && !source) || (!port.getOutgoingEdges().isEmpty() && source);

    const connectedToBadEdges =
      (!port.getIncomingEdges().isEmpty() && source) || (!port.getOutgoingEdges().isEmpty() && !source);
    // If there are only edges pointing in the same direction as the new edge connected
    // to
    // the port, it qualifies as a candidate for reuse
    if (connectedToDesiredEdges && !connectedToBadEdges) {
      reuseCandidates.push(port);
    }
  }
  return reuseCandidates;
}

/**
 * Retrieves a port for a new edge to connect to the given node through. This can either be a
 * newly created port, or an existing one. Which one it is depends on the chance of ports to be
 * reused.
 *
 * An outgoing edge will only ever try to reuse ports that only have outgoing edges connected to
 * them. The same is true for incoming edges and ports with only incoming edges.
 *
 * @param gen the generator
 * @param node the node to add the port to.
 * @param source `true` if the port will be used as a source port, `false` if it will be used as a
 *     target port.
 * @returns the new or existing port.
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function retrievePort(gen: RandomGraphGenerator, node: ElkNode, source: boolean): ElkPort {
  // We might want to reuse an existing port
  const reusePortsChance = gen.get(GeneratorOptions.USE_EXISTING_PORTS_CHANCE).floatVal(gen.random);
  if (reusePortsChance > 0.0 && gen.random.nextFloat() < reusePortsChance) {
    // Collect candidate ports for reuse
    const reuseCandidates = findReuseCandidates(node, source);

    // If there are candidates for reuse, choose one at random
    if (reuseCandidates.length > 0) {
      return nonNull(reuseCandidates[gen.randomInt(0, reuseCandidates.length - 1)] ?? null);
    }
  }

  // We were unable to reuse an existing port, so create a new one and return that
  return createPort(gen, node, source);
}
