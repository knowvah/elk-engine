// SPDX-License-Identifier: EPL-2.0
// The correspondence rule of a throw row (layered-compound-replay-sites.ts header) on hand-made errors: a TS run that completes, throws
// another class, another message of an ELK exception, or throws from another file or function is a mismatch. Stacks are strings in
// V8's format, so each case names the one property it changes.
import { describe, expect, it } from 'vitest';
import { compoundRefExists, loadCompoundRowsIfPresent } from './layered-compound-replay-rows.js';
import { UnsupportedGraphException } from '../../src/core/UnsupportedGraphException.js';
import {
  NPE_CLASS,
  parseFrame,
  replayThrow,
  portedNamedTop,
  portedTop,
  throwDiffs,
  type JavaThrow,
} from './layered-compound-replay-sites.js';

const SRC = '/work/elk-engine/src/alg/layered';

const stackOf = (...frames: string[]): string => ['Error: x', ...frames.map((frame) => `    at ${frame}`)].join('\n');
const errorWith = <E extends Error>(error: E, stack: string): E => Object.assign(error, { stack });

const ANCHOR: JavaThrow = { class: NPE_CLASS, message: 'JDK text', frame: 'SplineSegment.java:247' };
const ANCHOR_STACK = stackOf(
  `SplineSegment.anchorY (${SRC}/p5edges/splines/SplineSegment.ts:294:15)`,
  `SplineSegment.addEdge (${SRC}/p5edges/splines/SplineSegment.ts:281:20)`,
);

describe('parseFrame / portedTop', () => {
  it('reads a named and an anonymous frame', () => {
    expect(parseFrame(`    at SplineSegment.anchorY (${SRC}/a/SplineSegment.ts:294:15)`)).toEqual({
      fn: 'SplineSegment.anchorY',
      file: `${SRC}/a/SplineSegment.ts`,
    });
    expect(parseFrame(`    at ${SRC}/a/B.ts:50:13`)).toEqual({ fn: '', file: `${SRC}/a/B.ts` });
    expect(parseFrame('TypeError: x')).toBeNull();
  });

  it('skips constructor frames, shims and node frames, and takes the named frame of an anonymous top', () => {
    const stack = stackOf(
      `new UnsupportedGraphException (/work/elk-engine/src/core/UnsupportedGraphException.ts:10:5)`,
      `/work/elk-engine/src/java/util/Objects.ts:3:1`,
      `${SRC}/ElkLayeredHierarchy.ts:50:13`,
      'Array.forEach (<anonymous>)',
      `reviewAndCorrectHierarchicalProcessors (${SRC}/ElkLayeredHierarchy.ts:47:10)`,
    );
    expect(portedTop(stack)).toEqual({ fn: '', file: `${SRC}/ElkLayeredHierarchy.ts` });
    expect(portedNamedTop(stack)?.fn).toBe('reviewAndCorrectHierarchicalProcessors');
  });
});

describe('throwDiffs', () => {
  it('accepts a TypeError raised in the ported function of a NullPointerException frame', () => {
    expect(throwDiffs(ANCHOR, errorWith(new TypeError('other text'), ANCHOR_STACK), { fn: 'anchorY' })).toEqual([]);
  });

  it('rejects a class other than TypeError for a NullPointerException', () => {
    expect(throwDiffs(ANCHOR, errorWith(new RangeError('x'), ANCHOR_STACK), { fn: 'anchorY' })).toEqual([
      `throw: expected a TypeError (${NPE_CLASS}), got RangeError`,
    ]);
  });

  it('rejects a throw raised from another file or another function', () => {
    const elsewhere = stackOf(`Other.read (${SRC}/p5edges/Other.ts:9:9)`);
    expect(throwDiffs(ANCHOR, errorWith(new TypeError('x'), elsewhere), { fn: 'anchorY' })).toEqual([
      `throw: raised in ${SRC}/p5edges/Other.ts, expected a port of SplineSegment.java:247`,
      'throw: raised in function Other.read, expected anchorY (SplineSegment.java:247)',
    ]);
    const sameFile = stackOf(`SplineSegment.addEdge (${SRC}/p5edges/splines/SplineSegment.ts:281:20)`);
    expect(throwDiffs(ANCHOR, errorWith(new TypeError('x'), sameFile), { fn: 'anchorY' })).toEqual([
      'throw: raised in function SplineSegment.addEdge, expected anchorY (SplineSegment.java:247)',
    ]);
  });

  it('accepts a prefixed port file of the Java class and rejects a stack with no frame of src/', () => {
    const split = stackOf(`positionInformation (${SRC}/graph/LGraphUtilExternalPorts.ts:301:49)`);
    const java: JavaThrow = { class: NPE_CLASS, message: null, frame: 'LGraphUtil.java:944' };
    expect(throwDiffs(java, errorWith(new TypeError('x'), split), { fn: 'positionInformation' })).toEqual([]);
    expect(throwDiffs(java, errorWith(new TypeError('x'), stackOf('Array.forEach (<anonymous>)')))).toEqual([
      'throw: no frame of src/ on the stack of TypeError, expected one in LGraphUtil (LGraphUtil.java:944)',
    ]);
  });

  const elk: JavaThrow = {
    class: 'org.eclipse.elk.core.UnsupportedGraphException',
    message: 'the message',
    frame: 'ElkLayered.java:344',
  };
  const elkStack = stackOf(`reviewAndCorrectHierarchicalProcessors (${SRC}/ElkLayeredHierarchy.ts:47:10)`);

  it('accepts the same ELK exception class with the same message', () => {
    expect(throwDiffs(elk, errorWith(new UnsupportedGraphException('the message'), elkStack))).toEqual([]);
  });

  it('rejects another message, another class and an unmapped Java class', () => {
    expect(throwDiffs(elk, errorWith(new UnsupportedGraphException('another'), elkStack))).toEqual([
      'throw: message "another" != "the message"',
    ]);
    expect(throwDiffs(elk, errorWith(new TypeError('the message'), elkStack))).toEqual([
      'throw: expected class org.eclipse.elk.core.UnsupportedGraphException, got TypeError',
    ]);
    expect(throwDiffs({ ...elk, class: 'org.eclipse.elk.core.Unknown' }, new TypeError('x'))[0]).toBe(
      'throw: no TS class is mapped to org.eclipse.elk.core.Unknown',
    );
  });

  it('rejects a thrown non-Error', () => {
    expect(throwDiffs(elk, 'boom')).toEqual(['throw: a non-Error value was thrown: boom']);
  });
});

describe.skipIf(!compoundRefExists())('replayThrow', () => {
  it('reports a run that completes where the oracle threw', () => {
    const [run] = loadCompoundRowsIfPresent('sites').filter((row) => 'layout' in row.expected);
    const asThrow = { ...run!, expected: { throws: ANCHOR } } as unknown as Parameters<typeof replayThrow>[0];
    expect(replayThrow(asThrow)).toEqual([
      `throw: the run completed, the oracle threw ${NPE_CLASS} at SplineSegment.java:247`,
    ]);
  });
});
