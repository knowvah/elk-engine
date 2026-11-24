// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import { addNode } from './lgraph-builders.js';
import { dumpLGraph, encodeHex } from './layered-framework-replay.js';

const CHAIN_PROPERTY_ID = InternalProperties.ORIGINAL_BENDPOINTS.getId();

/** The properties the dump holds for the only node of a graph whose node carries `chain`. */
function nodeProperties(chain: KVectorChain): Record<string, unknown> {
  const graph = new LGraph();
  const node = addNode(graph);
  node.setProperty(InternalProperties.ORIGINAL_BENDPOINTS, chain);
  return dumpLGraph(graph).graphs[0]?.layerlessNodes[0]?.properties as Record<string, unknown>;
}

describe('dumpLGraph: KVectorChain property values', () => {
  it("encodes a two-point chain as a list of KVector objects, the recorder's shape", () => {
    const chain = new KVectorChain(new KVector(1.5, -2), new KVector(0, 4.25));
    expect(nodeProperties(chain)[CHAIN_PROPERTY_ID]).toEqual({
      t: 'list',
      c: 'KVectorChain',
      items: [
        { t: 'obj', c: 'KVector', fields: { x: { t: 'number', v: 1.5 }, y: { t: 'number', v: -2 } } },
        { t: 'obj', c: 'KVector', fields: { x: { t: 'number', v: 0 }, y: { t: 'number', v: 4.25 } } },
      ],
    });
  });

  it('encodes an empty chain with no items', () => {
    expect(nodeProperties(new KVectorChain())[CHAIN_PROPERTY_ID]).toEqual({ t: 'list', c: 'KVectorChain', items: [] });
  });
});

describe('NaN sign (issue #72)', () => {
  it('encodes both NaN signs as the one canonical NaN', () => {
    expect(encodeHex(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(encodeHex(NaN)).toBe(CANONICAL_NAN_HEX);
  });
});
