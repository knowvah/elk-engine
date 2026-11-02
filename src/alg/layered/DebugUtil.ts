// SPDX-License-Identifier: EPL-2.0
// @staged 7f
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from './graph/LGraph.js';
import type { LinearSegmentsNodePlacerLinearSegment } from './p4nodes/LinearSegmentsNodePlacerLinearSegment.js';

/**
 * Staged class (L1, mission 7d decision N8): the Java class delegates to `DotDebugUtil` (233 lines) and
 * `JsonDebugUtil` (653 lines), both ported in mission 7f. Mission 7d references only the segment-graph overload
 * (`LinearSegmentsNodePlacer.java:450`, behind `monitor.isLoggingEnabled()`); every overload throws
 * `UnsupportedOperationException` naming the missing helper and 7f until then.
 *
 * Java's three `logDebugGraph` overloads (translation-rules § 6.5, merged or suffixed names) are three methods here:
 * - `logDebugGraph(monitor, lgraph, slotIndex, name)` is `logDebugGraphSlot`, tag `slotIndex + "-" + name`;
 * - `logDebugGraph(monitor, layeredGraph, segmentList, outgoingList)` is `logDebugGraphSegments`, tag `segment graph`;
 * - `logDebugGraph(monitor, layeredGraph, layerIndex, hypernodes, debugPrefix, label)` is `logDebugGraphHyperedges`,
 *   tag `debugPrefix + " - " + label`. Its last four arguments are a labelled rest tuple (a sixth parameter breaks the
 *   complexity limit of five; call sites keep the Java argument list), and its `HyperEdgeSegment` list is
 *   `readonly unknown[]` until that class exists (`p5edges/orthogonal`, mission 7e).
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
  static logDebugGraphSlot(_monitor: IElkProgressMonitor, _lgraph: LGraph, _slotIndex: number, _name: string): never {
    throw notPorted('DotDebugUtil', '7f');
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
    _monitor: IElkProgressMonitor,
    _layeredGraph: LGraph,
    _segmentList: readonly LinearSegmentsNodePlacerLinearSegment[],
    _outgoingList: readonly (readonly LinearSegmentsNodePlacerLinearSegment[])[],
  ): never {
    throw notPorted('DotDebugUtil', '7f');
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
    _monitor: IElkProgressMonitor,
    _layeredGraph: LGraph,
    ..._rest: [layerIndex: number, hypernodes: readonly unknown[], debugPrefix: string, label: string]
  ): never {
    throw notPorted('DotDebugUtil', '7f');
  }
}

/** The L1 placeholder for a Java member whose helper class is not ported yet. */
function notPorted(className: string, mission: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${className} is ported in mission ${mission}`);
}
