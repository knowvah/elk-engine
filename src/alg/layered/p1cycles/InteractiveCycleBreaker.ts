// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { PortType } from '../options/PortType.js';

/** One suspended activation of the Java recursive method `findCycles` (B8): its node and the edge iteration. */
interface Frame {
  readonly node: LNode;
  readonly edges: Iterator<LEdge>;
}

/** The nested Java loops `for (port : node.getPorts(OUTPUT)) for (edge : port.getOutgoingEdges())`, lazily. */
function* outputEdges(node: LNode): Generator<LEdge> {
  for (const port of node.getPorts(PortType.OUTPUT)) {
    yield* port.getOutgoingEdges();
  }
}

/**
 * A cycle breaker that responds to user interaction by respecting the direction of edges as given in the original
 * drawing.
 *
 * <dl>
 *   <dt>Precondition:</dt><dd>none</dd>
 *   <dt>Postcondition:</dt><dd>the graph has no cycles</dd>
 * </dl>
 *
 * B8: the recursion of `findCycles` (Java `:107`) is an explicit-stack loop with the same visit and side-effect order.
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/InteractiveCycleBreaker.java
 */
export class InteractiveCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (InteractiveCycleBreaker.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.INTERACTIVE_EXTERNAL_PORT_POSITIONER)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER));
  }

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return InteractiveCycleBreaker.INTERMEDIATE_PROCESSING_CONFIGURATION;
  }

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Interactive cycle breaking', 1);

    // gather edges that point to the wrong direction
    const revEdges: LEdge[] = [];
    InteractiveCycleBreaker.gatherWrongDirectionEdges(layeredGraph, revEdges);
    // reverse the gathered edges
    for (const edge of revEdges) {
      edge.reverse(layeredGraph, true);
    }

    // perform an additional check for cycles - maybe we missed something
    // (could happen if some nodes have the same horizontal position)
    revEdges.length = 0;
    for (const node of layeredGraph.getLayerlessNodes()) {
      // unvisited nodes have id = 1
      if (node.id > 0) {
        this.findCycles(node, revEdges);
      }
    }
    // again, reverse the edges that were marked
    for (const edge of revEdges) {
      edge.reverse(layeredGraph, true);
    }

    revEdges.length = 0;
    monitor.done();
  }

  /** `:62-77`: the edges whose target lies left of their source in the original drawing; unvisited nodes get id 1. */
  private static gatherWrongDirectionEdges(layeredGraph: LGraph, revEdges: LEdge[]): void {
    for (const source of layeredGraph.getLayerlessNodes()) {
      source.id = 1;
      const sourcex = source.getInteractiveReferencePoint()!.x;
      for (const port of source.getPorts(PortType.OUTPUT)) {
        for (const edge of port.getOutgoingEdges()) {
          const target = edge.getTarget()!.getNode()!;
          if (target !== source) {
            const targetx = target.getInteractiveReferencePoint()!.x;
            if (targetx < sourcex) {
              revEdges.push(edge);
            }
          }
        }
      }
    }
  }

  /**
   * Perform a DFS starting on the given node and mark back edges in order to break cycles.
   *
   * @param node1 a node
   * @param revEdges list of edges that will be reversed
   */
  private findCycles(node1: LNode, revEdges: LEdge[]): void {
    const frames: Frame[] = [InteractiveCycleBreaker.enter(node1)];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        // nodes with id = 0 have been already visited and are ignored if encountered again
        frame.node.id = 0;
        frames.pop();
        continue;
      }
      const edge = next.value;
      const node2 = edge.getTarget()!.getNode()!;
      if (frame.node !== node2) {
        if (node2.id < 0) {
          // a node of the current path is found --> cycle
          revEdges.push(edge);
        } else if (node2.id > 0) {
          // the node has not been visited yet --> expand the current path
          frames.push(InteractiveCycleBreaker.enter(node2));
        }
      }
    }
  }

  /** The start of the Java method `findCycles`, up to its loops: nodes with negative id are on the current path. */
  private static enter(node: LNode): Frame {
    node.id = -1;
    return { node, edges: outputEdges(node) };
  }
}
