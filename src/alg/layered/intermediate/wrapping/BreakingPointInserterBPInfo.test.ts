// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LEdge } from '../../graph/LEdge.js';
import { LNode } from '../../graph/LNode.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { BPInfo } from './BreakingPointInserterBPInfo.js';

/** A `BPInfo` over fresh nodes and edges (the constructor argument order of the Java: start, end, three edges). */
function newInfo(): { info: BPInfo; start: LNode; end: LNode; edges: [LEdge, LEdge, LEdge] } {
  const start = new LNode(null);
  const end = new LNode(null);
  const edges: [LEdge, LEdge, LEdge] = [new LEdge(), new LEdge(), new LEdge()];
  return { info: new BPInfo(start, end, edges[0], edges[1], edges[2]), start, end, edges };
}

describe('BreakingPointInserter.BPInfo', () => {
  it('keeps the constructor arguments and leaves the in-layer and chain fields null (Java default)', () => {
    const { info, start, end, edges } = newInfo();
    expect(info.start).toBe(start);
    expect(info.end).toBe(end);
    expect(info.nodeStartEdge).toBe(edges[0]);
    expect(info.startEndEdge).toBe(edges[1]);
    expect(info.originalEdge).toBe(edges[2]);
    expect([
      info.startInLayerDummy,
      info.startInLayerEdge,
      info.endInLayerDummy,
      info.endInLayerEdge,
      info.prev,
      info.next,
    ]).toEqual([null, null, null, null, null, null]);
  });

  it('isStart and isEnd read BREAKING_POINT_INFO: a node without the property is neither', () => {
    const { info, start, end } = newInfo();
    expect([BPInfo.isStart(start), BPInfo.isEnd(start), BPInfo.isStart(end), BPInfo.isEnd(end)]).toEqual([
      false,
      false,
      false,
      false,
    ]);
    start.setProperty(InternalProperties.BREAKING_POINT_INFO, info);
    end.setProperty(InternalProperties.BREAKING_POINT_INFO, info);
    expect([BPInfo.isStart(start), BPInfo.isEnd(start), BPInfo.isStart(end), BPInfo.isEnd(end)]).toEqual([
      true,
      false,
      false,
      true,
    ]);
  });

  it('a node that holds the info of another breaking point is neither its start nor its end', () => {
    const { info } = newInfo();
    const other = new LNode(null);
    other.setProperty(InternalProperties.BREAKING_POINT_INFO, info);
    expect([BPInfo.isStart(other), BPInfo.isEnd(other)]).toEqual([false, false]);
  });

  it('toString lists the fields in the Java order, one per line', () => {
    const { info, start, end, edges } = newInfo();
    expect(info.toString()).toBe(
      [
        'BPInfo[',
        `\tstart=${String(start)}`,
        `\tend=${String(end)}`,
        `\tnodeStartEdge=${String(edges[0])}`,
        `\tstartEndEdge=${String(edges[1])}`,
        `\toriginalEdge=${String(edges[2])}`,
        '\tstartInLayerDummy=null',
        '\tstartInLayerEdge=null',
        '\tendInLayerDummy=null',
        '\tendInLayerEdge=null',
      ].join('\n'),
    );
  });
});
