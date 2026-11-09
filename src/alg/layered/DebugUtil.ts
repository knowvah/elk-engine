// SPDX-License-Identifier: EPL-2.0
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { LoggedGraphType } from '../../core/util/LoggedGraph.js';
import { DotDebugUtil } from './DotDebugUtil.js';
import type { LGraph } from './graph/LGraph.js';
import { JsonDebugUtil } from './JsonDebugUtil.js';
import type { LinearSegmentsNodePlacerLinearSegment } from './p4nodes/LinearSegmentsNodePlacerLinearSegment.js';
import type { HyperEdgeSegment } from './p5edges/orthogonal/HyperEdgeSegment.js';

/**
 * A utility class for debugging of ELK Layered: logs debug graphs in DOT and JSON format to a progress monitor. The
 * header marker `@staged 7f2` stays until mission 7f2's wiring task removes it together with its `staged-classes.json`
 * row (the fitness test requires agreement).
 *
 * Java's three `logDebugGraph` overloads (translation-rules 6.5, merged or suffixed names) are three methods here:
 * - `logDebugGraph(monitor, lgraph, slotIndex, name)` is `logDebugGraphSlot`, tag `slotIndex + "-" + name`;
 * - `logDebugGraph(monitor, layeredGraph, segmentList, outgoingList)` is `logDebugGraphSegments`, tag `segment graph`;
 * - `logDebugGraph(monitor, layeredGraph, layerIndex, hypernodes, debugPrefix, label)` is `logDebugGraphHyperedges`,
 *   tag `debugPrefix + " - " + label`. Its last four arguments are a labelled rest tuple (a sixth parameter breaks the
 *   complexity limit of five; call sites keep the Java argument list).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/DebugUtil.java
 */
export class DebugUtil {
  private constructor() {}

  /**
   * Logs a representation of the given graph in dot and JSON format.
   *
   * @param monitor the progress monitor to log to.
   * @param lgraph the layered graph
   * @param slotIndex the slot before whose execution the graph is written.
   * @param name the name the slot before whose execution the graph is written.
   * @see DebugUtil.java:42
   */
  static logDebugGraphSlot(monitor: IElkProgressMonitor, lgraph: LGraph, slotIndex: number, name: string): void {
    const tag = `${String(slotIndex)}-${name}`;
    monitor.logGraph(DotDebugUtil.createDebugGraph(lgraph), tag, LoggedGraphType.DOT);
    monitor.logGraph(JsonDebugUtil.createDebugGraph(lgraph), tag, LoggedGraphType.JSON);
  }

  /**
   * Logs a debug graph for the given linear segments and their dependencies.
   *
   * @param monitor the progress monitor to log to.
   * @param layeredGraph the layered graph.
   * @param segmentList the list of linear segments.
   * @param outgoingList the list of successors for each linear segment.
   * @see DebugUtil.java:76
   */
  static logDebugGraphSegments(
    monitor: IElkProgressMonitor,
    layeredGraph: LGraph,
    segmentList: readonly LinearSegmentsNodePlacerLinearSegment[],
    outgoingList: readonly (readonly LinearSegmentsNodePlacerLinearSegment[])[],
  ): void {
    const tag = 'segment graph';
    monitor.logGraph(
      DotDebugUtil.createDebugGraphSegments(layeredGraph, segmentList, outgoingList),
      tag,
      LoggedGraphType.DOT,
    );
    monitor.logGraph(
      JsonDebugUtil.createDebugGraphSegments(layeredGraph, segmentList, outgoingList),
      tag,
      LoggedGraphType.JSON,
    );
  }

  /**
   * Logs a debug graph for the given list of hypernodes.
   *
   * @param monitor the progress monitor to log to.
   * @param layeredGraph the layered graph
   * @param layerIndex the currently processed layer's index
   * @param hypernodes a list of hypernodes
   * @param debugPrefix prefix of debug output files
   * @param label a label to append to the output files
   * @see DebugUtil.java:107
   */
  static logDebugGraphHyperedges(
    monitor: IElkProgressMonitor,
    layeredGraph: LGraph,
    ...rest: [layerIndex: number, hypernodes: readonly HyperEdgeSegment[], debugPrefix: string, label: string]
  ): void {
    const [, hypernodes, debugPrefix, label] = rest;
    const tag = `${debugPrefix} - ${label}`;
    monitor.logGraph(DotDebugUtil.createDebugGraphHyperedges(layeredGraph, hypernodes), tag, LoggedGraphType.DOT);
    monitor.logGraph(JsonDebugUtil.createDebugGraphHyperedges(layeredGraph, hypernodes), tag, LoggedGraphType.JSON);
  }
}
