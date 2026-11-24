// SPDX-License-Identifier: EPL-2.0
// The hex of the pipeline and labels sweep hashes (issue #72): the recorder's `hx` writes `Double.doubleToLongBits`, so both NaN signs
// encode and hash alike and every other value keeps its raw bits.
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import { elkDump, hex, pipelineHash } from './layered-pipeline-sweep.js';

const NEGATIVE_ZERO_HEX = '8000000000000000';

function nodeAt(x: number): ReturnType<typeof ElkGraphUtil.createGraph> {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('root');
  const child = ElkGraphUtil.createNode(root);
  child.setIdentifier('n1');
  child.setX(x);
  return root;
}

describe('hex (the pipeline sweep encoder)', () => {
  it('encodes both NaN signs as the one canonical NaN', () => {
    expect(hex(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(hex(NaN)).toBe(CANONICAL_NAN_HEX);
  });

  it('keeps the raw bits of every other value', () => {
    expect(hex(-0)).toBe(NEGATIVE_ZERO_HEX);
    expect(hex(Infinity)).toBe('7ff0000000000000');
    expect(hex(-Infinity)).toBe('fff0000000000000');
    expect(hex(1.5)).toBe('3ff8000000000000');
  });
});

describe('pipelineHash over elkDump', () => {
  it('hashes a graph alike whichever sign its NaN coordinate has', () => {
    const negative = elkDump(nodeAt(NEGATIVE_NAN));
    const positive = elkDump(nodeAt(NaN));
    expect(negative).toEqual(positive);
    expect(pipelineHash(negative)).toBe(pipelineHash(positive));
  });

  it('still tells a NaN from an infinity and 0.0 from -0.0', () => {
    expect(pipelineHash(elkDump(nodeAt(Infinity)))).not.toBe(pipelineHash(elkDump(nodeAt(NaN))));
    expect(pipelineHash(elkDump(nodeAt(0)))).not.toBe(pipelineHash(elkDump(nodeAt(-0))));
  });
});
