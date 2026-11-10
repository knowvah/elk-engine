// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import { InternalProperties } from '../../options/InternalProperties.js';

/**
 * Holds information about a single breaking point. Java's nested `BreakingPointInserter.BPInfo` (M15 file naming). The
 * fields keep the Java declaration order: the oracle recorder reflects them in that order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointInserter.java
 */
export class BPInfo {
  readonly start: LNode;
  readonly end: LNode;

  readonly nodeStartEdge: LEdge;
  readonly startEndEdge: LEdge;
  readonly originalEdge: LEdge;

  startInLayerDummy: LNode | null = null;
  startInLayerEdge: LEdge | null = null;
  endInLayerDummy: LNode | null = null;
  endInLayerEdge: LEdge | null = null;

  prev: BPInfo | null = null;
  next: BPInfo | null = null;

  constructor(startDummy: LNode, endDummy: LNode, nodeStartEdge: LEdge, startEndEdge: LEdge, originalEdge: LEdge) {
    this.start = startDummy;
    this.end = endDummy;
    this.nodeStartEdge = nodeStartEdge;
    this.startEndEdge = startEndEdge;
    this.originalEdge = originalEdge;
  }

  /** @returns `true` if `n` equals the start dummy of this breaking point. */
  static isStart(n: LNode): boolean {
    // the property has no default: null when unset
    const bpi = n.getProperty(InternalProperties.BREAKING_POINT_INFO) as BPInfo | null;
    if (bpi !== null) {
      return bpi.start === n;
    }
    return false;
  }

  /** @returns `true` if `n` equals the end dummy of this breaking point. */
  static isEnd(n: LNode): boolean {
    // the property has no default: null when unset
    const bpi = n.getProperty(InternalProperties.BREAKING_POINT_INFO) as BPInfo | null;
    if (bpi !== null) {
      return bpi.end === n;
    }
    return false;
  }

  toString(): string {
    let sb = '';
    sb += 'BPInfo[';
    sb += '\n\tstart=';
    sb += String(this.start);
    sb += '\n\tend=';
    sb += String(this.end);
    sb += '\n\tnodeStartEdge=';
    sb += String(this.nodeStartEdge);
    sb += '\n\tstartEndEdge=';
    sb += String(this.startEndEdge);
    sb += '\n\toriginalEdge=';
    sb += String(this.originalEdge);
    sb += '\n\tstartInLayerDummy=';
    sb += String(this.startInLayerDummy);
    sb += '\n\tstartInLayerEdge=';
    sb += String(this.startInLayerEdge);
    sb += '\n\tendInLayerDummy=';
    sb += String(this.endInLayerDummy);
    sb += '\n\tendInLayerEdge=';
    sb += String(this.endInLayerEdge);
    return sb;
  }
}
