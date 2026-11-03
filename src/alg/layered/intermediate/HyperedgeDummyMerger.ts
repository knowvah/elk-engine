// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { HyperedgeDummyMergerMergeState as MergeState } from './HyperedgeDummyMergerMergeState.js';

/** `iterator().next()` of a Java `Iterable<LPort>`: the first port; Java throws `NoSuchElementException` when empty. */
function firstPort(ports: Iterable<LPort>): LPort {
  const next = ports[Symbol.iterator]().next();
  if (next.done === true) {
    throw new NoSuchElementException();
  }
  return next.value;
}

/** One level of the explicit stack of {@link HyperedgeDummyMerger.dfs}: the port and its two lazy port iterators. */
interface DfsFrame {
  readonly port: LPort;
  /** The ports of the first Java loop (`p.getConnectedPorts()`). */
  readonly connected: Iterator<LPort>;
  /** The ports of the second Java loop (`p.getNode().getPorts()`); null until the first loop is exhausted. */
  nodePorts: Iterator<LPort> | null;
}

/** The label-dummy test of the source side: not a label edge, or in front of the label dummy. */
function inFrontOfLabelDummyIfAny(node: LNode): boolean {
  return (
    !node.getProperty(InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES) ||
    node.getProperty(InternalProperties.LONG_EDGE_BEFORE_LABEL_DUMMY)
  );
}

/** The label-dummy test of the target side: not a label edge, or behind the label dummy. */
function behindLabelDummyIfAny(node: LNode): boolean {
  return (
    !node.getProperty(InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES) ||
    !node.getProperty(InternalProperties.LONG_EDGE_BEFORE_LABEL_DUMMY)
  );
}

/**
 * Looks for long edge dummy nodes that can be joined together. The aim is to reduce the number of edges by having
 * edges originating from the same port or going into the same port joined. This should be done after crossing
 * minimization. Only those dummy nodes are joined that the crossing minimizer placed right next to each other.
 *
 * Merging the adjacent long edge dummies is allowed if one of the following holds true:
 * - Neither of the two originating edges has `NodeType.LABEL` dummies **and** the two label dummies belong to the
 *   same hyperedge as computed by `identifyHyperedges`
 * - The two long edge dummies have the same `InternalProperties.LONG_EDGE_SOURCE` **and** neither of the two has
 *   `NodeType.LABEL` dummies in a preceeding layer of the current long edge dummy. **OR** the symmetric case for
 *   `InternalProperties.LONG_EDGE_TARGET` and label dummies in suceeding layers.
 *
 * Precondition: a layered graph, node orders are fixed, for long edge dummies `LONG_EDGE_SOURCE` and
 * `LONG_EDGE_TARGET` properties must be set. Postcondition: long edge dummy nodes belonging to the same hyperedge and
 * being directly next to each other are merged subject to the condition discussed above. Slots: before phase 4.
 * Same-slot dependencies: `InLayerConstraintProcessor`, `LabelDummySwitcher`.
 *
 * R8 (mission 7e): `dfs` (`HyperedgeDummyMerger.java:238`, self-calls `:243,:250`) is an explicit-stack loop that
 * reproduces the visit and `index` order of the recursion; its verbatim recursive twin is in the test file.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HyperedgeDummyMerger.java
 */
export class HyperedgeDummyMerger implements ILayoutProcessor<LGraph> {
  /** @see HyperedgeDummyMerger.java:67 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Hyperedge merging', 1);

    this.identifyHyperedges(layeredGraph);

    // Iterate through the layers
    for (const layer of layeredGraph.getLayers()) {
      const nodes = layer.getNodes();

      // If there are no nodes anyway, just move on to the next layer
      if (nodes.length === 0) {
        continue;
      }

      this.mergeLayer(nodes);
    }

    monitor.done();
  }

  /**
   * The node loop of `process` for one non-empty layer (split out for the complexity limits).
   *
   * @see HyperedgeDummyMerger.java:81-114
   */
  private mergeLayer(nodes: LNode[]): void {
    let currNode: LNode | null = null;
    let currNodeType: NodeType | null = null;
    let lastNode: LNode | null = null;
    let lastNodeType: NodeType | null = null;

    // Iterate through the remaining nodes
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      // Get the next node
      currNode = nodes[nodeIndex]!;
      currNodeType = currNode.getType();

      // We're only interested if the current and last nodes are long edge dummies
      if (currNodeType === NodeType.LONG_EDGE && lastNodeType === NodeType.LONG_EDGE) {
        // If the source or the target are identical and we are allowed to merge, merge the current node
        // into the last
        const state = this.checkMergeAllowed(currNode, lastNode!);
        if (state.allowMerge) {
          this.mergeNodes(currNode, lastNode!, state.sameSource, state.sameTarget);

          // Remove the current node and make the last node the current node
          nodes.splice(nodeIndex, 1);
          nodeIndex--;
          currNode = lastNode;
          currNodeType = lastNodeType;
        }
      }

      // Remember this node for the next iteration
      lastNode = currNode;
      lastNodeType = currNodeType;
    }
  }

  /**
   * The two `LONG_EDGE_HAS_LABEL_DUMMIES` / `LONG_EDGE_BEFORE_LABEL_DUMMY` tests of the Java body are the pure reads
   * `inFrontOfLabelDummyIfAny` and `behindLabelDummyIfAny` (split out for the complexity limits).
   *
   * @return whether merging the two long edge dummies is eligible as specified in the class's javadoc.
   * @see HyperedgeDummyMerger.java:123
   */
  private checkMergeAllowed(currNode: LNode, lastNode: LNode): MergeState {
    const currHasLabelDummies = currNode.getProperty(InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES);
    const lastHasLabelDummies = lastNode.getProperty(InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES);

    // Get long edge source and target ports (both default to null)
    const currNodeSource = currNode.getProperty(InternalProperties.LONG_EDGE_SOURCE) as LPort | null;
    const lastNodeSource = lastNode.getProperty(InternalProperties.LONG_EDGE_SOURCE) as LPort | null;
    const currNodeTarget = currNode.getProperty(InternalProperties.LONG_EDGE_TARGET) as LPort | null;
    const lastNodeTarget = lastNode.getProperty(InternalProperties.LONG_EDGE_TARGET) as LPort | null;

    // Find out whether the two long edges come from the same source or target (non-null!)
    const sameSource = currNodeSource !== null && currNodeSource === lastNodeSource;
    const sameTarget = currNodeTarget !== null && currNodeTarget === lastNodeTarget;

    if (!currHasLabelDummies && !lastHasLabelDummies) {
      // assumption: long edge dummies always have two ports, both have the same id
      return new MergeState(
        firstPort(currNode.getPorts()).id === firstPort(lastNode.getPorts()).id,
        sameSource,
        sameTarget,
      );
    }

    // If we can merge on grounds of the two long edges having the same source, we need to be
    // in front of the label dummy of each of the two edges (if any)
    const eligibleForSourceMerging = inFrontOfLabelDummyIfAny(currNode) && inFrontOfLabelDummyIfAny(lastNode);

    // If we can merge on grounds of the two long edges having the same target, we need to be
    // behind the label dummy of each of the two edges (if any)
    const eligibleForTargetMerging = behindLabelDummyIfAny(currNode) && behindLabelDummyIfAny(lastNode);

    return new MergeState(
      (sameSource && eligibleForSourceMerging) || (sameTarget && eligibleForTargetMerging),
      sameSource,
      sameTarget,
    );
  }

  /**
   * Merges the merge source node into the merge target node. All edges that were previously connected to the merge
   * source's ports are rerouted to the merge target. The merge target's long edge source and target ports can be set to
   * `null`.
   *
   * @param mergeSource the merge source node.
   * @param mergeTarget the merge target node.
   * @param keepSourcePort if `false`, the long edge source property is set to `null`. This should be done if the long
   *   edge sources of the two nodes to be merged are different.
   * @param keepTargetPort if `false`, the long edge target property is set to `null`. This should be done if the long
   *   edge targets of the two nodes to be merged are different.
   * @see HyperedgeDummyMerger.java:195
   */
  private mergeNodes(mergeSource: LNode, mergeTarget: LNode, keepSourcePort: boolean, keepTargetPort: boolean): void {
    // We assume that the input port is west, and the output port east
    const mergeTargetInputPort = firstPort(mergeTarget.getPorts(PortSide.WEST));
    const mergeTargetOutputPort = firstPort(mergeTarget.getPorts(PortSide.EAST));

    for (const port of mergeSource.getPorts()) {
      while (port.getIncomingEdges().length !== 0) {
        port.getIncomingEdges()[0]!.setTarget(mergeTargetInputPort);
      }

      while (port.getOutgoingEdges().length !== 0) {
        port.getOutgoingEdges()[0]!.setSource(mergeTargetOutputPort);
      }
    }

    // Possibly reset source and target ports
    if (!keepSourcePort) {
      mergeTarget.setProperty(InternalProperties.LONG_EDGE_SOURCE, null);
    }

    if (!keepTargetPort) {
      mergeTarget.setProperty(InternalProperties.LONG_EDGE_TARGET, null);
    }
  }

  /** @see HyperedgeDummyMerger.java:222 */
  private identifyHyperedges(lGraph: LGraph): void {
    // the Java stream over layers, nodes and ports
    const ports: LPort[] = [];
    for (const layer of lGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        ports.push(...node.getPorts());
      }
    }

    ports.forEach((p) => {
      p.id = -1;
    });

    let index = 0;
    for (const p of ports) {
      if (p.id === -1) {
        this.dfs(p, index++);
      }
    }
  }

  /**
   * Marks all ports reachable from `p` over connected ports and over the ports of a long edge dummy with the given
   * index. The Java recursion (`:238`, self-calls `:243,:250`) is a loop over an explicit stack of {@link DfsFrame}s:
   * each frame resumes its two Java loops exactly where the recursive call returned, so the ports are visited, and
   * their ids set, in the order of the recursion.
   *
   * @see HyperedgeDummyMerger.java:238
   */
  private dfs(p: LPort, index: number): void {
    const stack: DfsFrame[] = [];
    const enter = (port: LPort): void => {
      port.id = index;
      stack.push({ port, connected: port.getConnectedPorts()[Symbol.iterator](), nodePorts: null });
    };

    enter(p);
    while (stack.length !== 0) {
      const next = HyperedgeDummyMerger.nextUnvisited(stack[stack.length - 1]!);
      if (next === null) {
        stack.pop();
      } else {
        enter(next);
      }
    }
  }

  /**
   * Advances the Java loops of one frame to the next port that still has the id -1 (the `dfs(p2, index)` call), or
   * `null` when both loops are exhausted.
   *
   * @see HyperedgeDummyMerger.java:241-253
   */
  private static nextUnvisited(frame: DfsFrame): LPort | null {
    if (frame.nodePorts === null) {
      // follow edges connected to the same port
      for (let step = frame.connected.next(); step.done !== true; step = frame.connected.next()) {
        if (step.value.id === -1) {
          return step.value;
        }
      }

      // follow edges connected to the same long edge dummy
      if (frame.port.getNode()!.getType() !== NodeType.LONG_EDGE) {
        return null;
      }
      frame.nodePorts = frame.port.getNode()!.getPorts()[Symbol.iterator]();
    }

    for (let step = frame.nodePorts.next(); step.done !== true; step = frame.nodePorts.next()) {
      if (step.value !== frame.port && step.value.id === -1) {
        return step.value;
      }
    }
    return null;
  }
}
